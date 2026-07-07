#!/usr/bin/env python3
"""Run UART crosslink checks against an ESP32_V1 Espruino REPL."""

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
function finish() {
  try { Serial2.removeAllListeners("data"); } catch (e) {}
  try { Serial3.removeAllListeners("data"); } catch (e) {}
  try { Serial2.unsetup(); } catch (e) {}
  try { Serial3.unsetup(); } catch (e) {}
  echo(true);
  print("DONE UART_BLOCK7");
}
function drain(port) {
  var s = "";
  while (port.available && port.available()) s += port.read();
  return s;
}

emit("UART_INFO", JSON.stringify({
  selectors: "SEL_D35=UART JP_UART_LOOP2=closed",
  serial2: {tx:"D4", rx:"D35"},
  serial3: {tx:"D14", rx:"D36"}
}));

var s2 = "";
var s3 = "";
var serialErr = "";
try {
  Serial2.setup(115200, {tx:D4, rx:D35});
  Serial3.setup(115200, {tx:D14, rx:D36});
  Serial2.on("data", function(d) { s2 += d; });
  Serial3.on("data", function(d) { s3 += d; });
  drain(Serial2);
  drain(Serial3);
} catch (e) {
  serialErr = "" + e;
  emit("UART_SETUP_ERR", JSON.stringify(serialErr));
  finish();
}

setTimeout(function() {
  emit("UART_SETUP_OK", "true");
  Serial2.write("S2>ABC");
  setTimeout(function() {
    emit("UART_3_RX_1", JSON.stringify(s3));
    Serial3.write("S3>xyz");
    setTimeout(function() {
      emit("UART_2_RX_1", JSON.stringify(s2));
      Serial2.write("12");
      Serial3.write("34");
      setTimeout(function() {
        emit("UART_2_RX_FINAL", JSON.stringify(s2));
        emit("UART_3_RX_FINAL", JSON.stringify(s3));
        finish();
      }, 120);
    }, 120);
  }, 120);
}, 60);
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


def parse_values(output: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in output.splitlines():
        line = line.strip()
        if not line or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value
    return values


def check(name: str, ok: bool, detail: str) -> bool:
    print(("PASS " if ok else "FAIL ") + name + " " + detail)
    return ok


def parse_json_string(values: dict[str, str], key: str) -> str | None:
    raw = values.get(key)
    if raw is None:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, str) else None


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
        output = read_until_marker(ser, "DONE UART_BLOCK7", timeout=3.5)
        print(output.rstrip())

    if "DONE UART_BLOCK7" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    values = parse_values(output)
    if "UART_SETUP_ERR" in values:
        print("UART setup failed: " + values["UART_SETUP_ERR"], file=sys.stderr)
        return 1
    required = {"UART_SETUP_OK", "UART_3_RX_1", "UART_2_RX_1", "UART_2_RX_FINAL", "UART_3_RX_FINAL"}
    missing = [key for key in required if key not in values]
    if missing:
        print("Missing UART metrics: " + ", ".join(missing), file=sys.stderr)
        return 2

    s3_first = parse_json_string(values, "UART_3_RX_1")
    s2_first = parse_json_string(values, "UART_2_RX_1")
    s2_final = parse_json_string(values, "UART_2_RX_FINAL")
    s3_final = parse_json_string(values, "UART_3_RX_FINAL")

    ok = True
    ok &= check("UART setup", values["UART_SETUP_OK"] == "true", f"value={values['UART_SETUP_OK']}")
    ok &= check("Serial2 to Serial3", s3_first == "S2>ABC", f"rx={s3_first!r}")
    ok &= check("Serial3 to Serial2", s2_first == "S3>xyz", f"rx={s2_first!r}")
    ok &= check("Serial2 final buffer", s2_final == "S3>xyz34", f"rx={s2_final!r}")
    ok &= check("Serial3 final buffer", s3_final == "S2>ABC12", f"rx={s3_final!r}")

    if not ok:
        print("Detected failing UART crosslink checks.", file=sys.stderr)
        return 1

    print("All Block 7 UART checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
