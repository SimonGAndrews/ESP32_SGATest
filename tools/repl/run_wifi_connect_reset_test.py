#!/usr/bin/env python3
"""Verify that reset detaches an active ESP32 Wifi.connect() callback."""

from __future__ import annotations

import argparse
from pathlib import Path
import time

import serial

from run_test import (
    query_value,
    read_available,
    send_and_capture,
    send_script_paced,
    sync_repl,
)
from run_wifi_peer_test import clean_repl_line


DEFAULT_SCRIPT = Path(
    "docs/investigations/wifi/repros/esp32_wifi_connect_reset.js"
)
MARKER = ".wifi-connect-reset-callback"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", required=True)
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--script", type=Path, default=DEFAULT_SCRIPT)
    args = parser.parse_args()

    with serial.Serial(args.port, args.baud, timeout=0.1) as repl:
        sync_repl(repl)
        metadata = {
            "board": query_value(repl, "process.env.BOARD", "BOARD"),
            "version": query_value(repl, "process.version", "VERSION"),
            "git_commit": query_value(
                repl, "process.env.GIT_COMMIT", "GIT_COMMIT"
            ),
        }
        send_script_paced(repl, args.script.read_text())
        time.sleep(10.0)
        try:
            reset_output = read_available(repl, 0.5)
        except (OSError, serial.SerialException):
            # Some USB/UART bridges briefly invalidate an open descriptor
            # while the target resets. Reopen the same stable by-path device.
            repl.close()
            time.sleep(2.0)
            repl.open()
            reset_output = ""
        sync_repl(repl)
        callback_marker = query_value(
            repl,
            f'require("Storage").read({MARKER!r})',
            "RESET_CALLBACK_MARKER",
        )

        # A fresh operation after the late native events have settled must own
        # and complete its own callback normally.
        recovery = (
            '(function(){var n=0;require("Wifi").connect('
            '"XFSM-NO-SUCH-AP-AFTER-RESET",'
            '{password:"not-a-real-password"},function(e){n++;'
            'print("PASS post_reset_connect_callback error="+JSON.stringify(e));'
            'setTimeout(function(){print("METRIC post_reset_callback_count="+n);'
            'print("DONE="+(n===1&&e?"PASS":"FAIL"))},500)})})();\n'
        )
        send_and_capture(repl, "echo(false);\n", settle=0.2)
        output = send_and_capture(repl, recovery, settle=0.2)
        deadline = time.monotonic() + 45.0
        while "DONE=" not in output and time.monotonic() < deadline:
            output += read_available(repl, 0.5)

        send_and_capture(
            repl,
            f'require("Storage").erase({MARKER!r});\n',
            settle=0.2,
        )

    print(f"RUNNER test={args.script}")
    print(f"RUNNER port={args.port}")
    print(f"RUNNER board={metadata['board']}")
    print(f"RUNNER version={metadata['version']}")
    print(f"RUNNER git_commit={metadata['git_commit']}")
    marker_absent = callback_marker in ("None", "undefined")
    if marker_absent:
        print("PASS active_connect_callback_detached_by_reset")
    else:
        print(f"FAIL active_connect_callback_detached_by_reset marker={callback_marker}")
    for line in output.splitlines():
        cleaned = clean_repl_line(line)
        if cleaned.startswith(("PASS ", "FAIL ", "METRIC ", "DONE=")):
            print(cleaned)

    passed = marker_absent and "DONE=PASS" in output
    if not passed:
        print("RUNNER reset_output_begin")
        print(reset_output.rstrip())
        print("RUNNER reset_output_end")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
