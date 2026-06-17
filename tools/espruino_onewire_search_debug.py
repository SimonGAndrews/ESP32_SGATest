#!/usr/bin/env python3
"""Run and decode Espruino OneWire.searchDebug() traces."""

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


def make_js(pin: str, runs: int) -> str:
    return f"""
echo(false);
pinMode({pin}, 'input');
var ow = new OneWire({pin});
function emit(name, value) {{
  print(name + "=" + value);
}}
function exportPass(pass) {{
  var slots = [];
  for (var i = 0; i < pass.slots.length; i++) slots.push(pass.slots[i] >>> 0);
  return {{
    resetOk: pass.resetOk,
    abortedOn11: pass.abortedOn11,
    searchResult: pass.searchResult,
    rom0Valid: pass.rom0Valid,
    abortBit: pass.abortBit,
    idBitsRead: pass.idBitsRead,
    lastZero: pass.lastZero,
    lastDiscrepancyIn: pass.lastDiscrepancyIn,
    lastDiscrepancyOut: pass.lastDiscrepancyOut,
    lastDeviceFlagIn: pass.lastDeviceFlagIn,
    lastDeviceFlagOut: pass.lastDeviceFlagOut,
    rom: pass.rom,
    slots: slots
  }};
}}
function exportDebug(debug) {{
  return {{
    devices: debug.devices,
    passOverflow: debug.passOverflow,
    passes: debug.passes.map(exportPass)
  }};
}}
for (var run = 0; run < {runs}; run++) {{
  emit("OWDBG_RUN_" + run, JSON.stringify(exportDebug(ow.searchDebug())));
}}
echo(true);
print("DONE ONEWIRE_SEARCH_DEBUG");
"""


def decode_slot(value: int) -> dict[str, int]:
    return {
        "bit": value & 0x7F,
        "id": (value >> 7) & 1,
        "cmp": (value >> 8) & 1,
        "dir": (value >> 9) & 1,
        "discrepancy": (value >> 10) & 1,
        "rom_byte": (value >> 11) & 0x7,
        "last_zero": (value >> 14) & 0x7F,
        "rom_byte_value": (value >> 21) & 0xFF,
    }


def format_slot(slot: dict[str, int]) -> str:
    return (
        f"bit={slot['bit']:02d} pair={slot['id']}/{slot['cmp']} dir={slot['dir']} "
        f"disc={slot['discrepancy']} romByte={slot['rom_byte']} "
        f"lastZero={slot['last_zero']} romByteValue=0x{slot['rom_byte_value']:02x}"
    )


def print_failure_context(slots: list[int], abort_bit: int, context: int) -> None:
    decoded = [decode_slot(v) for v in slots]
    if abort_bit > 0:
        center = next((i for i, slot in enumerate(decoded) if slot["bit"] == abort_bit), len(decoded) - 1)
    else:
        center = len(decoded) - 1
    start = max(0, center - context)
    end = min(len(decoded), center + context + 1)
    for slot in decoded[start:end]:
        print("    " + format_slot(slot))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default="/dev/ttyUSB0")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--pin", required=True)
    parser.add_argument("--runs", type=int, default=10)
    parser.add_argument("--context", type=int, default=6)
    args = parser.parse_args()

    js = make_js(args.pin, args.runs)

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

        ser.reset_input_buffer()
        ser.write((js + "\n").encode("utf-8"))
        ser.flush()
        output = read_until_marker(ser, "DONE ONEWIRE_SEARCH_DEBUG", timeout=max(8.0, args.runs * 1.5))
        print(output.rstrip())

    if "DONE ONEWIRE_SEARCH_DEBUG" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    failed_runs = 0
    for run in range(args.runs):
        match = re.search(rf"^OWDBG_RUN_{run}=(.+)$", output, re.M)
        if not match:
            print(f"Run {run}: missing debug payload")
            failed_runs += 1
            continue

        try:
            payload = json.loads(match.group(1))
        except json.JSONDecodeError as exc:
            print(f"Run {run}: bad JSON: {exc}")
            failed_runs += 1
            continue

        devices = payload.get("devices", [])
        passes = payload.get("passes", [])
        overflow = payload.get("passOverflow", False)
        good = len(devices) == 2 and not overflow and all(p.get("searchResult") for p in passes)

        print(
            f"Run {run}: devices={len(devices)} passCount={len(passes)} "
            f"overflow={overflow} roms={devices}"
        )
        for idx, p in enumerate(passes):
            print(
                f"  Pass {idx}: resetOk={p.get('resetOk')} searchResult={p.get('searchResult')} "
                f"abortedOn11={p.get('abortedOn11')} abortBit={p.get('abortBit')} "
                f"idBitsRead={p.get('idBitsRead')} lastZero={p.get('lastZero')} "
                f"lastDisc={p.get('lastDiscrepancyIn')}->{p.get('lastDiscrepancyOut')} "
                f"rom={p.get('rom')}"
            )
            if p.get("abortedOn11") or not p.get("searchResult"):
                slots = p.get("slots", [])
                if isinstance(slots, list) and slots:
                    print("    Failure context:")
                    print_failure_context(slots, int(p.get("abortBit", 0) or 0), args.context)
        if not good:
            failed_runs += 1

    return 1 if failed_runs else 0


if __name__ == "__main__":
    raise SystemExit(main())
