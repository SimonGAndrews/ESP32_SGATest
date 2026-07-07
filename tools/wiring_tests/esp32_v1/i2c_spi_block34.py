#!/usr/bin/env python3
"""Run combined block 3/4 I2C plus SPI checks against an ESP32_V1 Espruino REPL."""

from __future__ import annotations

import argparse
import json
import re
import sys
import time

import serial


JS_TEST = r"""
echo(false);
function emit(name, value) {
  print(name + "=" + value);
}
function rdI2C(reg, n) {
  I2C1.writeTo(0x20, reg);
  return I2C1.readFrom(0x20, n || 1);
}
function wrI2C(reg, value) {
  I2C1.writeTo(0x20, [reg, value]);
}
function rdMcp3008() {
  var r = SPI1.send([1, 128, 0], D16);
  return ((r[1] & 3) << 8) | r[2];
}
function rdMcp3008Stable(pickHigh) {
  // Take a small burst of samples after each drive change and keep the
  // stable extreme. This avoids treating a one-off transient read as a
  // harness wiring failure.
  var best = rdMcp3008();
  for (var i = 0; i < 4; i++) {
    var value = rdMcp3008();
    if (pickHigh ? (value > best) : (value < best)) best = value;
  }
  return best;
}
function finish() {
  wrI2C(0x0A, 0x00);
  digitalWrite(D27, 0);
  echo(true);
  print("DONE I2C_SPI_BLOCK34");
}

I2C1.setup({scl:D22, sda:D21, bitrate:100000});
SPI1.setup({miso:D19, mosi:D23, sck:D18});
pinMode(D34, "input");
pinMode(D39, "input");
pinMode(D35, "input");
pinMode(D27, "output");

wrI2C(0x00, 0xFC); // GP0/1 outputs, GP2 input
wrI2C(0x06, 0x00); // no pullups
wrI2C(0x02, 0x04); // GP2 interrupt enable
wrI2C(0x03, 0x00); // compare to 0
wrI2C(0x04, 0x04); // compare against DEFVAL
wrI2C(0x0A, 0x00); // outputs low

emit("MCP23008_IODIR", rdI2C(0x00, 1)[0]);
emit("I2C_INT_IDLE", digitalRead(D35));

setTimeout(function() {
  emit("I2C_FB_LOW", digitalRead(D39));
  wrI2C(0x0A, 0x01);
  setTimeout(function() {
    emit("I2C_FB_HIGH", digitalRead(D39));
    wrI2C(0x0A, 0x03);
    setTimeout(function() {
      emit("I2C_INT_ASSERT", digitalRead(D35));
      emit("MCP23008_INTF", rdI2C(0x07, 1)[0]);
      wrI2C(0x0A, 0x01);
      rdI2C(0x08, 1);
      setTimeout(function() {
        emit("I2C_INT_CLEAR", digitalRead(D35));
        digitalWrite(D27, 0);
        setTimeout(function() {
          emit("ADC_SPI_LOW", rdMcp3008Stable(false));
          digitalWrite(D27, 1);
          setTimeout(function() {
            emit("ADC_SPI_HIGH", rdMcp3008Stable(true));
            finish();
          }, 150);
        }, 150);
      }, 40);
    }, 40);
  }, 40);
}, 40);
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


def parse_metrics(output: str) -> dict[str, float]:
    metrics: dict[str, float] = {}
    for line in output.splitlines():
        line = line.strip()
        m = re.match(r"^([A-Z0-9_]+)=([0-9.]+)$", line)
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
        sync_repl(ser)

        board = query_value(ser, "process.env.BOARD", "BOARD")
        version = query_value(ser, "process.version", "VERSION")

        print(f"Board: {board}")
        print(f"Version: {version}")

        ser.reset_input_buffer()
        ser.write((JS_TEST + "\n").encode("utf-8"))
        ser.flush()
        output = read_until_marker(ser, "DONE I2C_SPI_BLOCK34", timeout=4.0)
        print(output.rstrip())

    if "DONE I2C_SPI_BLOCK34" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    metrics = parse_metrics(output)
    required = [
        "MCP23008_IODIR",
        "I2C_INT_IDLE",
        "I2C_FB_LOW",
        "I2C_FB_HIGH",
        "I2C_INT_ASSERT",
        "MCP23008_INTF",
        "I2C_INT_CLEAR",
        "ADC_SPI_LOW",
        "ADC_SPI_HIGH",
    ]
    missing = [name for name in required if name not in metrics]
    if missing:
        print("Missing metrics: " + ", ".join(missing), file=sys.stderr)
        return 2

    ok = True
    ok &= check("MCP23008 register write/read", int(metrics["MCP23008_IODIR"]) == 0xFC, f"value={metrics['MCP23008_IODIR']:.0f}")
    ok &= check("I2C interrupt idle", int(metrics["I2C_INT_IDLE"]) == 1, f"value={metrics['I2C_INT_IDLE']:.0f}")
    ok &= check("I2C feedback low", int(metrics["I2C_FB_LOW"]) == 0, f"value={metrics['I2C_FB_LOW']:.0f}")
    ok &= check("I2C feedback high", int(metrics["I2C_FB_HIGH"]) == 1, f"value={metrics['I2C_FB_HIGH']:.0f}")
    ok &= check("I2C interrupt assert", int(metrics["I2C_INT_ASSERT"]) == 0, f"value={metrics['I2C_INT_ASSERT']:.0f}")
    ok &= check("I2C interrupt source", int(metrics["MCP23008_INTF"]) & 0x04 == 0x04, f"value={metrics['MCP23008_INTF']:.0f}")
    ok &= check("I2C interrupt clear", int(metrics["I2C_INT_CLEAR"]) == 1, f"value={metrics['I2C_INT_CLEAR']:.0f}")
    ok &= check("SPI ADC low", metrics["ADC_SPI_LOW"] < 50, f"value={metrics['ADC_SPI_LOW']:.0f}")
    ok &= check("SPI ADC high", metrics["ADC_SPI_HIGH"] > 950, f"value={metrics['ADC_SPI_HIGH']:.0f}")
    ok &= check(
        "SPI ADC span",
        (metrics["ADC_SPI_HIGH"] - metrics["ADC_SPI_LOW"]) > 900,
        f"span={metrics['ADC_SPI_HIGH'] - metrics['ADC_SPI_LOW']:.0f}",
    )

    if not ok:
        print("Detected failing combined bus checks.", file=sys.stderr)
        return 1

    print("All combined block 3/4 I2C+SPI checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
