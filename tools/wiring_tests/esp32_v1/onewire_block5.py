#!/usr/bin/env python3
"""Run OneWire DS18B20 checks against an ESP32_V1 Espruino REPL."""

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
function bytesToHex(a) {
  return a.map(function(x) { return ("0" + x.toString(16)).slice(-2); }).join("");
}
function emit(name, value) {
  print(name + "=" + value);
}
function readScratch(rom) {
  ow.reset();
  ow.select(rom);
  ow.write(0xBE);
  var data = [];
  for (var i = 0; i < 9; i++) data.push(ow.read());
  return data;
}
function finish() {
  echo(true);
  print("DONE ONEWIRE_BLOCK4");
}

emit("OW_RESET", ow.reset());
var scans = [];
var roms = [];
for (var i = 0; i < 6; i++) {
  ow.reset();
  var found = ow.search();
  scans.push(found);
  emit("OW_SCAN_" + i, JSON.stringify(found));
  if (found.length >= roms.length) roms = found;
}
emit("OW_ROMS", JSON.stringify(roms));
emit("OW_COUNT", roms.length);

ow.reset();
ow.skip();
ow.write(0x44, 1);

setTimeout(function() {
  for (var i = 0; i < roms.length; i++) {
    var data = readScratch(roms[i]);
    emit("OW_SCRATCH_" + i, bytesToHex(data));
  }
  finish();
}, 1000);
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


def crc8_maxim(data: bytes) -> int:
    crc = 0
    for byte in data:
        inbyte = byte
        for _ in range(8):
            mix = (crc ^ inbyte) & 0x01
            crc >>= 1
            if mix:
                crc ^= 0x8C
            inbyte >>= 1
    return crc


def decode_temp_c(scratch: bytes) -> float:
    raw = scratch[0] | (scratch[1] << 8)
    if raw & 0x8000:
        raw -= 0x10000
    return raw / 16.0


def parse_output(output: str) -> tuple[dict[str, str], list[str]]:
    values: dict[str, str] = {}
    roms: list[str] = []
    for line in output.splitlines():
        line = line.strip()
        if not line or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value
        if key == "OW_ROMS":
            try:
                roms = json.loads(value)
            except json.JSONDecodeError:
                roms = []
    return values, roms


def check(name: str, ok: bool, detail: str) -> bool:
    print(("PASS " if ok else "FAIL ") + name + " " + detail)
    return ok


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
        output = read_until_marker(ser, "DONE ONEWIRE_BLOCK4", timeout=5.0)
        print(output.rstrip())

    if "DONE ONEWIRE_BLOCK4" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    values, roms = parse_output(output)
    required = {"OW_RESET", "OW_ROMS", "OW_COUNT"}
    if not required.issubset(values):
        print("Missing required OneWire metrics.", file=sys.stderr)
        return 2

    try:
        count = int(values["OW_COUNT"])
    except ValueError:
        print("Invalid OW_COUNT value.", file=sys.stderr)
        return 2

    ok = True
    ok &= check("OneWire reset", values["OW_RESET"] == "true", f"value={values['OW_RESET']}")
    scans: list[list[str]] = []
    for idx in range(6):
        key = f"OW_SCAN_{idx}"
        if key in values:
            try:
                scans.append(json.loads(values[key]))
            except json.JSONDecodeError:
                scans.append([])

    two_rom_scans = sum(1 for scan in scans if len(scan) == 2)
    ok &= check("OneWire device count", count == 2, f"count={count}")
    ok &= check("OneWire search stability", two_rom_scans == len(scans), f"two_rom_scans={two_rom_scans}/{len(scans)} scans={scans}")
    ok &= check("Distinct ROMs", len(set(roms)) == len(roms) and len(roms) == count, f"roms={roms}")
    ok &= check(
        "DS18B20 family codes",
        count == 2 and all(isinstance(rom, str) and re.fullmatch(r"28[0-9a-f]{14}", rom) for rom in roms),
        f"roms={roms}",
    )

    temperatures: list[float] = []
    for idx in range(count):
        key = f"OW_SCRATCH_{idx}"
        scratch_hex = values.get(key)
        if not scratch_hex:
            ok &= check(f"Scratchpad {idx}", False, "missing")
            continue
        try:
            scratch = bytes.fromhex(scratch_hex)
        except ValueError:
            ok &= check(f"Scratchpad {idx}", False, f"badhex={scratch_hex}")
            continue
        if len(scratch) != 9:
            ok &= check(f"Scratchpad {idx}", False, f"len={len(scratch)}")
            continue
        crc_ok = crc8_maxim(scratch[:-1]) == scratch[-1]
        temp_c = decode_temp_c(scratch)
        temperatures.append(temp_c)
        ok &= check(f"Scratchpad {idx} CRC", crc_ok, f"hex={scratch_hex}")
        ok &= check(f"Scratchpad {idx} not all-ff", scratch != b"\xff" * 9, f"hex={scratch_hex}")
        ok &= check(f"Temperature {idx} plausible", -40.0 < temp_c < 125.0, f"temp_c={temp_c:.4f}")

    if len(temperatures) == 2:
        ok &= check("Temperature pair usable", abs(temperatures[0] - temperatures[1]) >= 0.0, f"temps={temperatures[0]:.4f},{temperatures[1]:.4f}")

    if not ok:
        print("Detected failing OneWire checks.", file=sys.stderr)
        return 1

    print("All Block 5 OneWire checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
