#!/usr/bin/env python3
"""Probe digitalPulse behavior on the ESP32-C3 harness."""

from __future__ import annotations

import argparse
import re
import sys
import time

import serial


JS_TEST = r"""
echo(false);
function emit(name, value) {
  print(name + "=" + value);
}
function finish() {
  echo(true);
  print("DONE DIGITALPULSE_CHECK");
}

pinMode(D3, "output");
pinMode(D4, "input");
digitalWrite(D3, 0);

var seenWrite = 0;
var seenPulse = 0;
var statesWrite = [];
var statesPulse = [];

var ww = setWatch(function() {
  seenWrite++;
  statesWrite.push(digitalRead(D4));
}, D4, {repeat:true, edge:"both", debounce:1});

setTimeout(function() { digitalWrite(D3, 1); }, 20);
setTimeout(function() { digitalWrite(D3, 0); }, 60);

setTimeout(function() {
  clearWatch(ww);
  emit("WRITE_SEEN", seenWrite);
  emit("WRITE_STATES", JSON.stringify(statesWrite));

  var wp = setWatch(function() {
    seenPulse++;
    statesPulse.push(digitalRead(D4));
  }, D4, {repeat:true, edge:"both", debounce:1});

  setTimeout(function() { digitalPulse(D3, 1, [20,20,20]); }, 20);

  setTimeout(function() {
    clearWatch(wp);
    emit("PULSE_SEEN", seenPulse);
    emit("PULSE_STATES", JSON.stringify(statesPulse));
    emit("D4_FINAL", digitalRead(D4));
    finish();
  }, 260);
}, 160);
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


def query_value(ser: serial.Serial, expr: str, label: str) -> str:
    output = send_and_capture(ser, f'print("{label}="+({expr}))\n', settle=0.35)
    for line in output.splitlines():
        line = line.strip()
        if line.startswith(label + "="):
            return line[len(label) + 1 :]
    return output.strip()


def metric(output: str, key: str) -> str | None:
    m = re.search(rf"^{re.escape(key)}=(.*)$", output, re.M)
    return m.group(1) if m else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default="/dev/ttyUSB0")
    parser.add_argument("--baud", type=int, default=115200)
    args = parser.parse_args()

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
        ser.write((JS_TEST + "\n").encode("utf-8"))
        ser.flush()
        output = read_until_marker(ser, "DONE DIGITALPULSE_CHECK", timeout=4.0)
        print(output.rstrip())

    if "DONE DIGITALPULSE_CHECK" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    write_seen = int(metric(output, "WRITE_SEEN") or "0")
    pulse_seen = int(metric(output, "PULSE_SEEN") or "0")

    print(f"Summary: write transitions seen={write_seen}, pulse transitions seen={pulse_seen}")

    if write_seen >= 2 and pulse_seen == 0:
        print("digitalPulse appears broken while digitalWrite transitions work.", file=sys.stderr)
        return 1
    if write_seen < 2:
        print("Baseline write transition test failed; check harness mode.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
