#!/usr/bin/env python3
"""Verify reset detaches an active IDF5 Wifi.disconnect() operation."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import time

import serial

from run_ble_https_test import load_credentials, warn_if_credentials_readable
from run_test import (
    query_value,
    read_available,
    read_until_prompt,
    send_and_capture,
    send_script_paced,
    sync_repl,
)
from run_wifi_peer_test import clean_repl_line


DEFAULT_SCRIPT = Path(
    "docs/investigations/wifi/repros/esp32_wifi_disconnect_reset.js"
)
DEFAULT_CREDENTIALS = Path("tests/WIFI_BLE/local_wifi_credentials.json")
MARKER = ".wifi-disconnect-reset-callback"


def inject_config(repl: serial.Serial, credentials: dict[str, str]) -> None:
    assignment = "global.WIFI_TEST_CONFIG=" + json.dumps(credentials) + ";\n"
    send_and_capture(repl, "echo(false);\n", settle=0.2)
    send_and_capture(repl, assignment, settle=0.2)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", required=True)
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--script", type=Path, default=DEFAULT_SCRIPT)
    parser.add_argument("--credentials", type=Path, default=DEFAULT_CREDENTIALS)
    args = parser.parse_args()

    credentials = load_credentials(args.credentials)
    warn_if_credentials_readable(args.credentials)
    with serial.Serial(args.port, args.baud, timeout=0.1) as repl:
        sync_repl(repl)
        metadata = {
            "board": query_value(repl, "process.env.BOARD", "BOARD"),
            "version": query_value(repl, "process.version", "VERSION"),
            "git_commit": query_value(
                repl, "process.env.GIT_COMMIT", "GIT_COMMIT"
            ),
        }
        initial_reset = send_and_capture(repl, "reset();\n", settle=0.2)
        if not initial_reset.rstrip().endswith(">"):
            read_until_prompt(repl, 8.0)
        inject_config(repl, credentials)
        send_script_paced(repl, args.script.read_text())
        reset_output = ""
        reset_deadline = time.monotonic() + 30.0
        while (
            "INFO reset_disconnect_started=1" not in reset_output
            and time.monotonic() < reset_deadline
        ):
            reset_output += read_available(repl, 0.5)
        reset_started = "INFO reset_disconnect_started=1" in reset_output
        time.sleep(2.0)
        try:
            reset_output += read_available(repl, 0.5)
        except (OSError, serial.SerialException):
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

        inject_config(repl, credentials)
        recovery = (
            "(function(){var w=require('Wifi'),cc=0,dc=0;"
            "w.connect(global.WIFI_TEST_CONFIG.ssid,"
            "{password:global.WIFI_TEST_CONFIG.password},function(e){cc++;"
            "if(e){print('FAIL post_reset_connect '+JSON.stringify(e));"
            "print('DONE=FAIL');return;}w.disconnect(function(){dc++;"
            "setTimeout(function(){print('METRIC post_reset_connect_callbacks='+cc);"
            "print('METRIC post_reset_disconnect_callbacks='+dc);"
            "print('DONE='+(cc===1&&dc===1?'PASS':'FAIL'))},500)})})})();\n"
        )
        output = send_and_capture(repl, recovery, settle=0.2)
        deadline = time.monotonic() + 30.0
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
    print("RUNNER credentials=loaded_without_logging")
    marker_absent = callback_marker in ("None", "undefined")
    no_callback_error = "Unknown type of callback" not in reset_output
    if reset_started:
        print("PASS active_disconnect_reset_started")
    else:
        print("FAIL active_disconnect_reset_started")
    if marker_absent:
        print("PASS active_disconnect_callback_detached_by_reset")
    else:
        print(f"FAIL active_disconnect_callback_detached_by_reset marker={callback_marker}")
    if no_callback_error:
        print("PASS no_late_callback_queue_error")
    else:
        print("FAIL no_late_callback_queue_error")
    for line in output.splitlines():
        cleaned = clean_repl_line(line)
        if cleaned.startswith(("PASS ", "FAIL ", "METRIC ", "DONE=")):
            print(cleaned)

    if "DONE=PASS" in output:
        print("PASS post_reset_connect_disconnect_recovery")

    passed = (
        reset_started
        and marker_absent
        and no_callback_error
        and "DONE=PASS" in output
    )
    if not passed:
        sanitized = (reset_output + output).replace(
            credentials["ssid"], "<SSID>"
        ).replace(credentials["password"], "<PASSWORD>")
        print("RUNNER sanitized_failure_output_begin")
        print(sanitized.rstrip())
        print("RUNNER sanitized_failure_output_end")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
