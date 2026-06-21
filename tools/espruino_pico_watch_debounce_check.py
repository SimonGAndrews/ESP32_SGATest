#!/usr/bin/env python3
"""Probe debounced setWatch behaviour on an Espruino Pico loopback."""

from __future__ import annotations

import argparse
import re
import sys
import time

import serial


def js_test(
    output_pin: str,
    input_pin: str,
    marker_pin: str,
    debounce_ms: int,
    pulse_expr: str,
    start_ms: int,
    trigger_ms: int,
    trigger_width_ms: int,
    busy_start_ms: int,
    busy_ms: int,
    stressed: bool,
) -> str:
    busy_block = ""
    if stressed:
        busy_secs = busy_ms / 1000.0
        busy_block = f"""
setTimeout(function() {{
  print("BUSY_ON");
  digitalWrite({marker_pin}, 1);
}}, {busy_start_ms});
setTimeout(function() {{
  var t = getTime() + {busy_secs:.6f};
  while (getTime() < t) {{}}
}}, {busy_start_ms + 1});
setTimeout(function() {{
  digitalWrite({marker_pin}, 0);
  print("BUSY_OFF");
}}, {busy_start_ms + busy_ms + 2});
"""

    return f"""
echo(false);
pinMode({output_pin}, "output");
pinMode({input_pin}, "input");
pinMode({marker_pin}, "output");
digitalWrite({output_pin}, 0);
digitalWrite({marker_pin}, 0);

var seen = [];
var edgeCount = 0;
var w = setWatch(function(e) {{
  edgeCount++;
  seen.push(e.state ? 1 : 0);
  print("EDGE_" + edgeCount + "=" + JSON.stringify({{
    state:e.state ? 1 : 0,
    time:e.time,
    lastTime:e.lastTime
  }}));
}}, {input_pin}, {{repeat:true, edge:"both", debounce:{debounce_ms}}});

setTimeout(function() {{
  digitalWrite({marker_pin}, 1);
}}, {trigger_ms});
setTimeout(function() {{
  digitalWrite({marker_pin}, 0);
}}, {trigger_ms + trigger_width_ms});

setTimeout(function() {{
  print("PULSE_START");
  digitalPulse({output_pin}, 1, {pulse_expr});
}}, {start_ms});
{busy_block}
setTimeout(function() {{
  clearWatch(w);
  print("EDGE_COUNT=" + edgeCount);
  print("SEEN=" + JSON.stringify(seen));
  print("FINAL=" + digitalRead({input_pin}));
  print("DONE PICO_WATCH");
  echo(true);
}}, {start_ms + busy_ms + 320});
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
    parser.add_argument("--port", required=True)
    parser.add_argument("--baud", type=int, default=9600)
    parser.add_argument("--mode", choices=["control", "stressed"], default="control")
    parser.add_argument("--output-pin", default="B3")
    parser.add_argument("--input-pin", default="B4")
    parser.add_argument("--marker-pin", default="B5")
    parser.add_argument("--debounce-ms", type=int, default=20)
    parser.add_argument("--pulse-ms", type=int, default=30)
    parser.add_argument("--pulse-seq-ms", default="")
    parser.add_argument("--start-ms", type=int, default=20)
    parser.add_argument("--trigger-ms", type=int, default=5)
    parser.add_argument("--trigger-width-ms", type=int, default=5)
    parser.add_argument("--busy-start-ms", type=int, default=30)
    parser.add_argument("--busy-ms", type=int, default=120)
    args = parser.parse_args()

    pulse_expr = str(args.pulse_ms)
    if args.pulse_seq_ms:
        parts = [p.strip() for p in args.pulse_seq_ms.split(",") if p.strip()]
        if not parts:
            print("--pulse-seq-ms was provided but empty after parsing.", file=sys.stderr)
            return 2
        pulse_expr = "[" + ",".join(parts) + "]"

    script = js_test(
        output_pin=args.output_pin,
        input_pin=args.input_pin,
        marker_pin=args.marker_pin,
        debounce_ms=args.debounce_ms,
        pulse_expr=pulse_expr,
        start_ms=args.start_ms,
        trigger_ms=args.trigger_ms,
        trigger_width_ms=args.trigger_width_ms,
        busy_start_ms=args.busy_start_ms,
        busy_ms=args.busy_ms,
        stressed=args.mode == "stressed",
    )

    with serial.Serial(args.port, args.baud, timeout=0.1) as ser:
        ser.reset_input_buffer()
        ser.reset_output_buffer()

        send_and_capture(ser, "\x03\n", settle=0.25)
        send_and_capture(ser, "echo(true);\n", settle=0.1)

        board = query_value(ser, "process.env.BOARD", "BOARD")
        version = query_value(ser, "process.version", "VERSION")

        print(f"Board: {board}")
        print(f"Version: {version}")
        print(f"Mode: {args.mode}")
        print(
            "Pins:"
            f" out={args.output_pin}"
            f" in={args.input_pin}"
            f" marker={args.marker_pin}"
        )
        print(
            "Timing:"
            f" debounce={args.debounce_ms}ms"
            f" pulse={pulse_expr}"
            f" trigger={args.trigger_ms}ms/{args.trigger_width_ms}ms"
            f" start={args.start_ms}ms"
            f" busy_start={args.busy_start_ms}ms"
            f" busy={args.busy_ms}ms"
        )

        ser.reset_input_buffer()
        ser.write((script + "\n").encode("utf-8"))
        ser.flush()
        output = read_until_marker(ser, "DONE PICO_WATCH", timeout=5.0)
        print(output.rstrip())

    if "DONE PICO_WATCH" not in output:
        print("Missing completion marker from REPL.", file=sys.stderr)
        return 2

    edge_count = int(metric(output, "EDGE_COUNT") or "0")
    seen = metric(output, "SEEN") or "[]"

    print(f"Summary: edge_count={edge_count} seen={seen}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
