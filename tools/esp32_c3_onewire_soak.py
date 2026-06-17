#!/usr/bin/env python3
"""Run a OneWire search soak test against an ESP32-C3 Espruino REPL."""

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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default="/dev/ttyUSB0")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--scans", type=int, default=50)
    args = parser.parse_args()

    js = f"""
echo(false);
var ow = new OneWire(D0);
function emit(name, value) {{
  print(name + "=" + value);
}}
emit("OW_SOAK_RESET", ow.reset());
for (var i = 0; i < {args.scans}; i++) {{
  emit("OW_SOAK_SCAN_" + i, JSON.stringify(ow.search()));
}}
echo(true);
print("DONE ONEWIRE_SOAK");
"""

    with serial.Serial(args.port, args.baud, timeout=0.1) as ser:
        ser.reset_input_buffer()
        ser.reset_output_buffer()

        send_and_capture(ser, "\x03\n", settle=0.25)
        send_and_capture(ser, "echo(true);\n", settle=0.1)

        board = query_value(ser, "process.env.BOARD", "BOARD")
        version = query_value(ser, "process.version", "VERSION")

        print(f"Board: {board}")
        print(f"Version: {version}")

        ser.reset_input_buffer()
        ser.write((js + "\n").encode("utf-8"))
        ser.flush()
        output = read_until_marker(ser, "DONE ONEWIRE_SOAK", timeout=max(8.0, args.scans * 0.2))
        print(output.rstrip())

    if "DONE ONEWIRE_SOAK" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    scans: list[list[str]] = []
    for i in range(args.scans):
        m = re.search(rf"^OW_SOAK_SCAN_{i}=(.+)$", output, re.M)
        if not m:
            scans.append([])
            continue
        try:
            scan = json.loads(m.group(1))
            if isinstance(scan, list):
                scans.append(scan)
            else:
                scans.append([])
        except json.JSONDecodeError:
            scans.append([])

    zero = sum(1 for s in scans if len(s) == 0)
    one = sum(1 for s in scans if len(s) == 1)
    two = sum(1 for s in scans if len(s) == 2)
    more = sum(1 for s in scans if len(s) > 2)

    appearance: dict[str, int] = {}
    for scan in scans:
        for rom in scan:
            appearance[rom] = appearance.get(rom, 0) + 1

    all_roms = sorted(appearance)
    print("Soak summary:")
    print(f"  scans={args.scans}")
    print(f"  two_device={two}")
    print(f"  one_device={one}")
    print(f"  zero_device={zero}")
    print(f"  more_than_two={more}")
    for rom in all_roms:
        print(f"  rom {rom} seen {appearance[rom]}/{args.scans}")

    if zero or one or more or len(all_roms) != 2 or two != args.scans:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
