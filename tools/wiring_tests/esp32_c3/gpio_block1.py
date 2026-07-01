#!/usr/bin/env python3
"""Run baseline GPIO loopback checks against an ESP32-C3 Espruino REPL."""

from __future__ import annotations

import argparse
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
pinMode(D1, "output");
pinMode(D2, "input");
digitalWrite(D1, 0);
expectEq("LoopA low", digitalRead(D2), 0);
digitalWrite(D1, 1);
expectEq("LoopA high", digitalRead(D2), 1);

pinMode(D3, "output");
pinMode(D4, "input");
digitalWrite(D3, 0);
expectEq("LoopB low", digitalRead(D4), 0);
digitalWrite(D3, 1);
expectEq("LoopB high", digitalRead(D4), 1);

var wa;
var edgesA = [];
pinMode(D1, "output");
pinMode(D2, "input");
digitalWrite(D1, 0);
wa = setWatch(function(e) {
  edgesA.push(digitalRead(D2));
}, D2, {repeat:true, edge:"both", debounce:1});

var wb;
var seenB = 0;
pinMode(D3, "output");
pinMode(D4, "input");
digitalWrite(D3, 0);
wb = setWatch(function() {
  seenB++;
}, D4, {repeat:true, edge:"rising", debounce:1});
setTimeout(function() { digitalWrite(D1, 1); }, 10);
setTimeout(function() { digitalWrite(D1, 0); }, 40);
setTimeout(function() { digitalWrite(D1, 1); }, 70);
setTimeout(function() { digitalPulse(D3, 1, [20, 20, 20]); }, 100);

setTimeout(function() {
  clearWatch(wa);
  clearWatch(wb);
  print("LoopA edges " + JSON.stringify(edgesA));
  report("LoopA edge count", edgesA.length >= 2, "count=" + edgesA.length);
  report("LoopB pulse/watch", seenB >= 2, "count=" + seenB);
  finish();
}, 320);
"""


def read_available(ser: serial.Serial, duration: float) -> str:
    """Collect everything available for a short window."""
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
    args = parser.parse_args()

    with serial.Serial(args.port, args.baud, timeout=0.1) as ser:
        ser.reset_input_buffer()
        ser.reset_output_buffer()

        # Interrupt any running code and re-enter a clean prompt.
        send_and_capture(ser, "\x03\n", settle=0.25)
        send_and_capture(ser, "echo(true);\n", settle=0.1)

        board = query_value(ser, "process.env.BOARD", "BOARD")
        version = query_value(ser, "process.version", "VERSION")

        print(f"Board: {board}")
        print(f"Version: {version}")

        ser.reset_input_buffer()
        ser.write((JS_TEST + "\n").encode("utf-8"))
        ser.flush()
        output = read_until_marker(ser, "DONE GPIO_BLOCK1", timeout=2.0)
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
