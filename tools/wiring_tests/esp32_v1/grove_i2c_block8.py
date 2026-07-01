#!/usr/bin/env python3
"""Run external Grove I2C checks against an ESP32_V1 Espruino REPL."""

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
function rd(addr, reg, n) {
  I2C1.writeTo(addr, reg);
  return I2C1.readFrom(addr, n || 1);
}
function wr(addr, reg, value) {
  I2C1.writeTo(addr, [reg, value]);
}
function finish() {
  echo(true);
  print("DONE GROVE_I2C_BLOCK8");
}

try {
  I2C1.setup({scl:D22, sda:D21, bitrate:100000});
  emit("I2C_SETUP", "true");
  emit("I2C_INFO", "ONBOARD=0x20 EXT=0x21 SDA=D21 SCL=D22");
  emit("ONBOARD_IODIR_BEFORE", rd(0x20, 0x00, 1)[0]);
  emit("EXT_IODIR_BEFORE", rd(0x21, 0x00, 1)[0]);
  emit("EXT_IOCON_BEFORE", rd(0x21, 0x05, 1)[0]);
  wr(0x21, 0x05, 0x20);
  emit("EXT_IOCON_SET", rd(0x21, 0x05, 1)[0]);
  wr(0x21, 0x00, 0xF0);
  emit("EXT_IODIR_SET", rd(0x21, 0x00, 1)[0]);
  wr(0x21, 0x00, 0xFF);
  emit("EXT_IODIR_RESTORE", rd(0x21, 0x00, 1)[0]);
  wr(0x21, 0x05, 0x00);
  emit("EXT_IOCON_RESTORE", rd(0x21, 0x05, 1)[0]);
  emit("ONBOARD_IODIR_AFTER", rd(0x20, 0x00, 1)[0]);
} catch (e) {
  emit("I2C_ERR", JSON.stringify("" + e));
}
finish();
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
    return m.group(1).strip()


def parse_metrics(output: str) -> dict[str, str]:
    metrics: dict[str, str] = {}
    for line in output.splitlines():
        line = line.strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        metrics[key] = value
    return metrics


def check(name: str, ok: bool, detail: str) -> bool:
    print(("PASS " if ok else "FAIL ") + name + " " + detail)
    return ok


def expect_int(metrics: dict[str, str], key: str) -> int:
    return int(metrics[key])


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
        output = read_until_marker(ser, "DONE GROVE_I2C_BLOCK8", timeout=3.0)
        print(output.rstrip())

    if "DONE GROVE_I2C_BLOCK8" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    metrics = parse_metrics(output)
    if "I2C_ERR" in metrics:
        print("External Grove I2C probe failed: " + metrics["I2C_ERR"], file=sys.stderr)
        return 1

    required = {
        "I2C_SETUP",
        "ONBOARD_IODIR_BEFORE",
        "EXT_IODIR_BEFORE",
        "EXT_IOCON_BEFORE",
        "EXT_IOCON_SET",
        "EXT_IODIR_SET",
        "EXT_IODIR_RESTORE",
        "EXT_IOCON_RESTORE",
        "ONBOARD_IODIR_AFTER",
    }
    missing = [key for key in required if key not in metrics]
    if missing:
        print("Missing Grove I2C metrics: " + ", ".join(missing), file=sys.stderr)
        return 2

    ok = True
    ok &= check("I2C setup", metrics["I2C_SETUP"] == "true", f"value={metrics['I2C_SETUP']}")
    ok &= check(
        "Onboard MCP23008 reachable",
        expect_int(metrics, "ONBOARD_IODIR_BEFORE") == 0xFF,
        f"value={expect_int(metrics, 'ONBOARD_IODIR_BEFORE')}",
    )
    ok &= check(
        "External MCP23008 initial IODIR",
        expect_int(metrics, "EXT_IODIR_BEFORE") == 0xFF,
        f"value={expect_int(metrics, 'EXT_IODIR_BEFORE')}",
    )
    ok &= check(
        "External MCP23008 initial IOCON",
        expect_int(metrics, "EXT_IOCON_BEFORE") == 0x00,
        f"value={expect_int(metrics, 'EXT_IOCON_BEFORE')}",
    )
    ok &= check(
        "External IOCON write/read",
        expect_int(metrics, "EXT_IOCON_SET") == 0x20,
        f"value={expect_int(metrics, 'EXT_IOCON_SET')}",
    )
    ok &= check(
        "External IODIR write/read",
        expect_int(metrics, "EXT_IODIR_SET") == 0xF0,
        f"value={expect_int(metrics, 'EXT_IODIR_SET')}",
    )
    ok &= check(
        "External IODIR restore",
        expect_int(metrics, "EXT_IODIR_RESTORE") == 0xFF,
        f"value={expect_int(metrics, 'EXT_IODIR_RESTORE')}",
    )
    ok &= check(
        "External IOCON restore",
        expect_int(metrics, "EXT_IOCON_RESTORE") == 0x00,
        f"value={expect_int(metrics, 'EXT_IOCON_RESTORE')}",
    )
    ok &= check(
        "Onboard MCP23008 unchanged",
        expect_int(metrics, "ONBOARD_IODIR_AFTER") == expect_int(metrics, "ONBOARD_IODIR_BEFORE"),
        f"before={expect_int(metrics, 'ONBOARD_IODIR_BEFORE')} after={expect_int(metrics, 'ONBOARD_IODIR_AFTER')}",
    )

    if not ok:
        print("Detected failing external Grove I2C checks.", file=sys.stderr)
        return 1

    print("All Block 8 Grove I2C checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
