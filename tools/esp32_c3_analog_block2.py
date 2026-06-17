#!/usr/bin/env python3
"""Run analog feedback checks against an ESP32-C3 Espruino REPL."""

from __future__ import annotations

import argparse
import re
import sys
import time

import serial


JS_TEST = r"""
echo(false);
function report(name, ok, extra) {
  print((ok ? "PASS " : "FAIL ") + name + (extra ? " " + extra : ""));
}
function emit(name, value) {
  print(name + "=" + value);
}
function finish() {
  digitalWrite(D8, 0);
  echo(true);
  print("DONE ANALOG_BLOCK2");
}

pinMode(D0, "input");
pinMode(D8, "output");

digitalWrite(D8, 0);
setTimeout(function() {
  emit("ADC_LOW", analogRead(D0));
  digitalWrite(D8, 1);
  setTimeout(function() {
    emit("ADC_HIGH", analogRead(D0));
    analogWrite(D8, 0.25);
    setTimeout(function() {
      emit("ADC_PWM_25", analogRead(D0));
      analogWrite(D8, 0.50);
      setTimeout(function() {
        emit("ADC_PWM_50", analogRead(D0));
        analogWrite(D8, 0.75);
        setTimeout(function() {
          emit("ADC_PWM_75", analogRead(D0));
          finish();
        }, 120);
      }, 120);
    }, 120);
  }, 120);
}, 120);
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


def parse_metrics(output: str) -> dict[str, float]:
    metrics: dict[str, float] = {}
    for line in output.splitlines():
        line = line.strip()
        m = re.match(r"^(ADC_[A-Z0-9_]+)=([0-9.]+)$", line)
        if m:
            metrics[m.group(1)] = float(m.group(2))
    return metrics


def check(name: str, ok: bool, detail: str) -> bool:
    print(("PASS " if ok else "FAIL ") + name + " " + detail)
    return ok


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
        output = read_until_marker(ser, "DONE ANALOG_BLOCK2", timeout=3.0)
        print(output.rstrip())

    if "DONE ANALOG_BLOCK2" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    metrics = parse_metrics(output)
    required = ["ADC_LOW", "ADC_HIGH", "ADC_PWM_25", "ADC_PWM_50", "ADC_PWM_75"]
    missing = [name for name in required if name not in metrics]
    if missing:
        print("Missing ADC metrics: " + ", ".join(missing), file=sys.stderr)
        return 2

    ok = True
    ok &= check("ADC low floor", metrics["ADC_LOW"] < 0.10, f"value={metrics['ADC_LOW']:.6f}")
    ok &= check("ADC high ceiling", metrics["ADC_HIGH"] > 0.90, f"value={metrics['ADC_HIGH']:.6f}")
    ok &= check(
        "ADC span",
        (metrics["ADC_HIGH"] - metrics["ADC_LOW"]) > 0.75,
        f"span={metrics['ADC_HIGH'] - metrics['ADC_LOW']:.6f}",
    )
    ok &= check(
        "PWM monotonic",
        metrics["ADC_LOW"] < metrics["ADC_PWM_25"] < metrics["ADC_PWM_50"] < metrics["ADC_PWM_75"] < metrics["ADC_HIGH"],
        "values="
        + ",".join(
            f"{metrics[name]:.6f}"
            for name in ["ADC_LOW", "ADC_PWM_25", "ADC_PWM_50", "ADC_PWM_75", "ADC_HIGH"]
        ),
    )
    ok &= check("PWM 25 useful", 0.10 < metrics["ADC_PWM_25"] < 0.45, f"value={metrics['ADC_PWM_25']:.6f}")
    ok &= check("PWM 50 useful", 0.35 < metrics["ADC_PWM_50"] < 0.75, f"value={metrics['ADC_PWM_50']:.6f}")
    ok &= check("PWM 75 useful", 0.55 < metrics["ADC_PWM_75"] < 0.95, f"value={metrics['ADC_PWM_75']:.6f}")

    if not ok:
        print("Detected failing analog checks.", file=sys.stderr)
        return 1

    print("All Block 2 analog checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
