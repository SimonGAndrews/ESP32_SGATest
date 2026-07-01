#!/usr/bin/env python3
"""Run baseline GPIO loopback checks against an ESP32_V1 Espruino REPL."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time

import serial


JS_TEST = r"""
echo(false);
function report(name, ok, extra) {
  print((ok ? "PASS " : "FAIL ") + name + (extra ? " " + extra : ""));
}
function expectEq(name, actual, expected) {
  report(name, actual === expected, "got=" + actual + " expected=" + expected);
}
function finish() {
  echo(true);
  print("DONE GPIO_BLOCK1");
}

pinMode(D32, "output");
pinMode(D33, "input");
digitalWrite(D32, 0);
expectEq("LoopA low", digitalRead(D33), 0);
digitalWrite(D32, 1);
expectEq("LoopA high", digitalRead(D33), 1);

pinMode(D25, "output");
pinMode(D26, "input");
digitalWrite(D25, 0);
expectEq("LoopB low", digitalRead(D26), 0);
digitalWrite(D25, 1);
expectEq("LoopB high", digitalRead(D26), 1);

var wa;
var edgesA = [];
pinMode(D32, "output");
pinMode(D33, "input");
digitalWrite(D32, 0);
wa = setWatch(function(e) {
  edgesA.push(e.state ? 1 : 0);
}, D33, {repeat:true, edge:"both"});

var wb;
var statesB = [];
pinMode(D25, "output");
pinMode(D26, "input");
digitalWrite(D25, 0);
wb = setWatch(function(e) {
  statesB.push(e.state ? 1 : 0);
}, D26, {repeat:true, edge:"both"});

setTimeout(function() { digitalWrite(D32, 1); }, 10);
setTimeout(function() { digitalWrite(D32, 0); }, 40);
setTimeout(function() { digitalWrite(D32, 1); }, 70);
setTimeout(function() { digitalPulse(D25, 1, [20, 20, 20]); }, 100);

setTimeout(function() {
  clearWatch(wa);
  clearWatch(wb);
  print("LoopA edges " + JSON.stringify(edgesA));
  print("LoopB states " + JSON.stringify(statesB));
  report("LoopA edge count", edgesA.length >= 3, "count=" + edgesA.length);
  report(
    "LoopB pulse/watch",
    JSON.stringify(statesB) === JSON.stringify([1,0,1,0]),
    "states=" + JSON.stringify(statesB)
  );
  finish();
}, 320);
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
        output = read_until_marker(ser, "DONE GPIO_BLOCK1", timeout=2.5)
        print(output.rstrip())

    failures = [line for line in output.splitlines() if line.startswith("FAIL ")]
    if "DONE GPIO_BLOCK1" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2
    if failures:
        print(f"Detected {len(failures)} failing checks.", file=sys.stderr)
        return 1
    print("All Block 1 GPIO checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
