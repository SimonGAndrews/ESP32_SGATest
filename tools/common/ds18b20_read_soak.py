#!/usr/bin/env python3
"""Run a DS18B20 conversion/read soak test against an Espruino REPL."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time

import serial


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


def query_value(ser: serial.Serial, expr: str, label: str) -> str:
    output = send_and_capture(ser, f'print("{label}="+({expr}))\n', settle=0.35)
    for line in output.splitlines():
        line = line.strip()
        if line.startswith(label + "="):
            return line[len(label) + 1 :]
    return output.strip()


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


def make_setup_js(pin: str, family_prefix: str) -> str:
    return f"""
echo(false);
pinMode({pin}, 'input');
var ow = new OneWire({pin});
var __OW_FAMILY_PREFIX = {json.dumps(family_prefix.lower())};
function bytesToHex(a) {{
  return a.map(function(x) {{ return ("0" + x.toString(16)).slice(-2); }}).join("");
}}
function readScratch(rom) {{
  ow.reset();
  ow.select(rom);
  ow.write(0xBE);
  var data = [];
  for (var i = 0; i < 9; i++) data.push(ow.read());
  return data;
}}
function ds18b20Run(roms) {{
  var result = {{
    roms: roms,
    convertReset: ow.reset()
  }};
  ow.skip();
  ow.write(0x44, 1);
  var t = getTime();
  while ((getTime() - t) < 1.0) {{}}
  result.scratch = [];
  for (var i = 0; i < roms.length; i++) {{
    result.scratch.push(bytesToHex(readScratch(roms[i])));
  }}
  return result;
}}
function familyMatch(rom) {{
  return typeof rom === "string" &&
    rom.slice(0, __OW_FAMILY_PREFIX.length).toLowerCase() === __OW_FAMILY_PREFIX;
}}
var __OW_ALL_ROMS = ow.search();
var __OW_ROMS = __OW_ALL_ROMS.filter(familyMatch);
print("OW_INIT_ALL=" + JSON.stringify(__OW_ALL_ROMS));
print("OW_INIT=" + JSON.stringify(__OW_ROMS));
echo(true);
print("READY_DS18B20_SOAK");
"""


def parse_run_payload(output: str, run: int) -> dict | None:
    match = re.search(rf"^OW_RUN_{run}=(.+)$", output, re.M)
    if not match:
        return None
    try:
        payload = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default="/dev/ttyUSB0")
    parser.add_argument("--pin", default="D0")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--runs", type=int, default=20)
    parser.add_argument(
        "--family-prefix",
        default="28",
        help="ROM family prefix to keep from the initial OneWire search (default: 28 for DS18B20)",
    )
    args = parser.parse_args()

    setup_js = make_setup_js(args.pin, args.family_prefix)

    with serial.Serial(args.port, args.baud, timeout=0.1) as ser:
        ser.reset_input_buffer()
        ser.reset_output_buffer()

        send_and_capture(ser, "\x03\n", settle=0.25)
        send_and_capture(ser, "echo(true);\n", settle=0.1)

        board = query_value(ser, "process.env.BOARD", "BOARD")
        version = query_value(ser, "process.version", "VERSION")

        print(f"Board: {board}")
        print(f"Version: {version}")
        print(f"Pin: {args.pin}")
        print(f"Runs: {args.runs}")
        print(f"Family prefix: {args.family_prefix.lower()}")

        ser.reset_input_buffer()
        ser.write((setup_js + "\n").encode("utf-8"))
        ser.flush()
        output = read_until_marker(ser, "READY_DS18B20_SOAK", timeout=5.0)
        print(output.rstrip())

        if "READY_DS18B20_SOAK" not in output:
          print("Missing setup completion marker from REPL.", file=sys.stderr)
          return 2

        init_all_match = re.search(r"^OW_INIT_ALL=(.+)$", output, re.M)
        init_match = re.search(r"^OW_INIT=(.+)$", output, re.M)
        if not init_match:
            print("Missing OW_INIT payload.", file=sys.stderr)
            return 2
        if not init_all_match:
            print("Missing OW_INIT_ALL payload.", file=sys.stderr)
            return 2
        try:
            all_roms = json.loads(init_all_match.group(1))
        except json.JSONDecodeError:
            print("Bad OW_INIT_ALL payload.", file=sys.stderr)
            return 2
        try:
            roms = json.loads(init_match.group(1))
        except json.JSONDecodeError:
            print("Bad OW_INIT payload.", file=sys.stderr)
            return 2
        if not isinstance(all_roms, list) or not isinstance(roms, list):
            print("OW_INIT payloads are not lists.", file=sys.stderr)
            return 2
        print(f"Initial all ROMs: {all_roms}")
        print(f"Initial filtered ROMs: {roms}")
        if not roms:
            print("No filtered ROMs found for requested family prefix.", file=sys.stderr)
            return 2

        failed_runs = 0
        all_temps: list[tuple[float, ...]] = []
        for run in range(args.runs):
            ser.reset_input_buffer()
            ser.write(f'print("OW_RUN_{run}="+JSON.stringify(ds18b20Run(__OW_ROMS)))\n'.encode("utf-8"))
            ser.flush()
            output = read_until_marker(ser, f"OW_RUN_{run}=", timeout=2.0)
            output += read_available(ser, 1.4)
            print(output.rstrip())

            payload = parse_run_payload(output, run)
            if not payload:
                print(f"Run {run}: missing or invalid payload")
                failed_runs += 1
                continue

            run_roms = payload.get("roms", [])
            convert_reset = payload.get("convertReset")
            scratch_list = payload.get("scratch", [])

            good = True
            temps: list[float] = []
            print(
                f"Run {run}: convertReset={convert_reset} romCount={len(run_roms)} "
                f"scratchCount={len(scratch_list)}"
            )
            if convert_reset is not True:
                print(f"  FAIL convert reset value={convert_reset}")
                good = False
            if run_roms != roms:
                print(f"  FAIL rom list changed init={roms} run={run_roms}")
                good = False
            if len(scratch_list) != len(roms):
                print(f"  FAIL scratch count expected={len(roms)} got={len(scratch_list)}")
                good = False

            for idx, scratch_hex in enumerate(scratch_list):
                try:
                    scratch = bytes.fromhex(scratch_hex)
                except ValueError:
                    print(f"  FAIL sensor {idx} bad hex={scratch_hex}")
                    good = False
                    continue
                if len(scratch) != 9:
                    print(f"  FAIL sensor {idx} len={len(scratch)} hex={scratch_hex}")
                    good = False
                    continue
                crc_ok = crc8_maxim(scratch[:-1]) == scratch[-1]
                temp_c = decode_temp_c(scratch)
                temps.append(temp_c)
                plausible = -40.0 < temp_c < 125.0
                not_ff = scratch != b"\xff" * 9
                print(
                    f"  Sensor {idx}: crcOk={crc_ok} plausible={plausible} "
                    f"temp_c={temp_c:.4f} hex={scratch_hex}"
                )
                if not crc_ok or not plausible or not not_ff:
                    good = False
            if len(temps) == len(roms):
                all_temps.append(tuple(temps))
            if not good:
                failed_runs += 1

    print("DS18B20 soak summary:")
    print(f"  runs={args.runs}")
    print(f"  failures={failed_runs}")
    if all_temps:
        for idx in range(len(all_temps[0])):
            sensor_temps = [run[idx] for run in all_temps]
            print(
                f"  sensor {idx} temp range {min(sensor_temps):.4f}..{max(sensor_temps):.4f} "
                f"across {len(sensor_temps)} runs"
            )

    return 1 if failed_runs else 0


if __name__ == "__main__":
    raise SystemExit(main())
