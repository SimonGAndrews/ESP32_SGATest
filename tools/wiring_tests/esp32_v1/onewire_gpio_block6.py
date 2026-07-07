#!/usr/bin/env python3
"""Run DS2413 OneWire GPIO checks against an ESP32_V1 Espruino REPL."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time

import serial


JS_TEST = r"""
echo(false);
var ow = new OneWire(D13);
function hex2(n) {
  return ("0" + n.toString(16)).slice(-2);
}
function emit(name, value) {
  print(name + "=" + value);
}
function wrDs2413(rom, value) {
  ow.reset();
  ow.select(rom);
  ow.write(0x5A);
  ow.write(value);
  ow.write((~value) & 255);
  var confirm = ow.read();
  var status = ow.read();
  ow.reset();
  return {confirm: hex2(confirm), status: hex2(status)};
}
function finish() {
  echo(true);
  print("DONE ONEWIRE_GPIO_BLOCK6");
}

var ds2413 = [];
for (var i = 0; i < 5; i++) {
  ow.reset();
  var found = ow.search();
  emit("OW_SCAN_" + i, JSON.stringify(found));
  for (var j = 0; j < found.length; j++) {
    if (found[j].slice(0, 2) == "3a" && ds2413.indexOf(found[j]) < 0) ds2413.push(found[j]);
  }
}
emit("DS2413_ROMS", JSON.stringify(ds2413));
emit("DS2413_COUNT", ds2413.length);

if (ds2413.length != 1) {
  finish();
} else {
  var rom = ds2413[0];
  pinMode(D33, "input");
  pinMode(D26, "input");
  var steps = [
    ["BOTH_RELEASED", 0xFF],
    ["PIOA_LOW", 0xFE],
    ["PIOB_LOW", 0xFD],
    ["BOTH_LOW", 0xFC],
    ["BOTH_RELEASED_AGAIN", 0xFF],
  ];
  var idx = 0;
  function runNext() {
    if (idx >= steps.length) {
      finish();
      return;
    }
    var name = steps[idx][0];
    var value = steps[idx][1];
    var result = wrDs2413(rom, value);
    setTimeout(function() {
      emit(name, JSON.stringify({
        write: hex2(value),
        confirm: result.confirm,
        status: result.status,
        d33: digitalRead(D33),
        d26: digitalRead(D26)
      }));
      idx++;
      runNext();
    }, 30);
  }
  runNext();
}
"""


def read_available(ser: serial.Serial, duration: float) -> str:
    deadline = time.monotonic() + duration
    chunks: list[bytes] = []
    while time.monotonic() < deadline:
        waiting = ser.in_waiting
        if waiting:
            chunks.append(ser.read(waiting))
            deadline = time.monotonic() + 0.15
        else:
            time.sleep(0.02)
    return b"".join(chunks).decode("utf-8", "replace")


def send_and_capture(ser: serial.Serial, text: str, settle: float = 0.2) -> str:
    ser.write(text.encode("utf-8"))
    ser.flush()
    return read_available(ser, settle)


def read_until_marker(ser: serial.Serial, marker: str, timeout: float) -> str:
    deadline = time.monotonic() + timeout
    chunks: list[bytes] = []
    while time.monotonic() < deadline:
        waiting = ser.in_waiting
        if waiting:
            chunks.append(ser.read(waiting))
            text = b"".join(chunks).decode("utf-8", "replace")
            if marker in text:
                return text
        else:
            time.sleep(0.02)
    return b"".join(chunks).decode("utf-8", "replace")


def sync_repl(ser: serial.Serial) -> None:
    ser.reset_input_buffer()
    ser.reset_output_buffer()
    send_and_capture(ser, "\x03", settle=0.2)
    send_and_capture(ser, "\x03", settle=0.2)
    send_and_capture(ser, "\n", settle=0.2)
    send_and_capture(ser, "echo(true);\n", settle=0.15)


def query_value(ser: serial.Serial, expr: str, label: str) -> str:
    marker = f"__{label}__"
    output = send_and_capture(
        ser,
        f'print("{marker}="+JSON.stringify({expr}))\n',
        settle=0.45,
    )
    m = re.search(rf"{re.escape(marker)}=(.*)", output)
    if not m:
        return "UNKNOWN"
    value = m.group(1).strip()
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return value
    return str(parsed)


def parse_output(output: str) -> tuple[dict[str, str], list[list[str]]]:
    values: dict[str, str] = {}
    scans: list[list[str]] = []
    for line in output.splitlines():
        line = line.strip()
        if not line or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value
        if key.startswith("OW_SCAN_"):
            try:
                scans.append(json.loads(value))
            except json.JSONDecodeError:
                scans.append([])
    return values, scans


def check(name: str, ok: bool, detail: str) -> bool:
    print(("PASS " if ok else "FAIL ") + name + " " + detail)
    return ok


def decode_step(values: dict[str, str], name: str) -> dict[str, object] | None:
    raw = values.get(name)
    if raw is None:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, dict):
        return None
    return parsed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default="/dev/ttyUSB0")
    parser.add_argument("--baud", type=int, default=115200)
    args = parser.parse_args()

    with serial.Serial(args.port, args.baud, timeout=0.1) as ser:
        sync_repl(ser)

        board = query_value(ser, "process.env.BOARD", "BOARD")
        version = query_value(ser, "process.version", "VERSION")

        print(f"Board: {board}")
        print(f"Version: {version}")

        ser.reset_input_buffer()
        ser.write((JS_TEST + "\n").encode("utf-8"))
        ser.flush()
        output = read_until_marker(ser, "DONE ONEWIRE_GPIO_BLOCK6", timeout=4.0)
        print(output.rstrip())

    if "DONE ONEWIRE_GPIO_BLOCK6" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    values, scans = parse_output(output)
    required = {"DS2413_ROMS", "DS2413_COUNT"}
    if not required.issubset(values):
        print("Missing required DS2413 metrics.", file=sys.stderr)
        return 2

    try:
        ds2413_roms = json.loads(values["DS2413_ROMS"])
    except json.JSONDecodeError:
        print("Bad DS2413_ROMS value.", file=sys.stderr)
        return 2
    try:
        ds2413_count = int(values["DS2413_COUNT"])
    except ValueError:
        print("Bad DS2413_COUNT value.", file=sys.stderr)
        return 2

    ok = True
    scans_with_ds2413 = sum(1 for scan in scans if any(isinstance(rom, str) and rom.startswith("3a") for rom in scan))
    ok &= check("DS2413 discovered", ds2413_count == 1, f"roms={ds2413_roms}")
    ok &= check(
        "DS2413 search stability",
        scans_with_ds2413 == len(scans) and len(scans) == 5,
        f"scans_with_ds2413={scans_with_ds2413}/{len(scans)} scans={scans}",
    )
    ok &= check(
        "DS2413 family code",
        ds2413_count == 1 and all(isinstance(rom, str) and re.fullmatch(r"3a[0-9a-f]{14}", rom) for rom in ds2413_roms),
        f"roms={ds2413_roms}",
    )

    expected_steps = {
        "BOTH_RELEASED": {"confirm": "aa", "status": "0f", "d33": 1, "d26": 1},
        "PIOA_LOW": {"confirm": "aa", "status": "3c", "d33": 0, "d26": 1},
        "PIOB_LOW": {"confirm": "aa", "status": "c3", "d33": 1, "d26": 0},
        "BOTH_LOW": {"confirm": "aa", "status": "f0", "d33": 0, "d26": 0},
        "BOTH_RELEASED_AGAIN": {"confirm": "aa", "status": "0f", "d33": 1, "d26": 1},
    }
    for name, expected in expected_steps.items():
        step = decode_step(values, name)
        if step is None:
            ok &= check(name, False, "missing")
            continue
        detail = json.dumps(step, sort_keys=True)
        ok &= check(f"{name} confirm", step.get("confirm") == expected["confirm"], detail)
        ok &= check(f"{name} status", step.get("status") == expected["status"], detail)
        ok &= check(f"{name} D33", step.get("d33") == expected["d33"], detail)
        ok &= check(f"{name} D26", step.get("d26") == expected["d26"], detail)

    if not ok:
        print("Detected failing DS2413 checks.", file=sys.stderr)
        return 1

    print("All Block 6 DS2413 checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
