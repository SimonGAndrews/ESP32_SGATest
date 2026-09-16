#!/usr/bin/env python3
"""Run the stateful ESP32 Wifi.scan() regression test without logging secrets."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
import time

import serial

from run_ble_https_test import (
    load_credentials,
    upload_secret_role,
    warn_if_credentials_readable,
)
from run_test import (
    filter_structured_lines,
    query_value,
    read_until_prompt,
    sync_repl,
)
from run_wifi_peer_test import has_output_marker


DEFAULT_SCRIPT = Path(
    "docs/investigations/wifi/repros/esp32_wifi_scan_after_disconnect.js"
)
DEFAULT_CREDENTIALS = Path("tests/WIFI_BLE/local_wifi_credentials.json")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)
        sys.stderr.reconfigure(line_buffering=True)
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", default="/dev/ttyUSB0")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--script", type=Path, default=DEFAULT_SCRIPT)
    parser.add_argument("--credentials", type=Path, default=DEFAULT_CREDENTIALS)
    parser.add_argument("--timeout", type=float, default=40.0)
    parser.add_argument(
        "--open-settle",
        type=float,
        default=0.5,
        help="quiet time before waiting for the post-reset REPL prompt",
    )
    parser.add_argument(
        "--startup-timeout",
        type=float,
        default=20.0,
        help="seconds to wait passively for a post-reset REPL prompt",
    )
    parser.add_argument(
        "--show-sanitized-raw",
        action="store_true",
        help="show raw output after replacing the configured SSID and password",
    )
    args = parser.parse_args()

    if not args.script.is_file():
        print(f"Missing test file: {args.script}", file=sys.stderr)
        return 2

    try:
        credentials = load_credentials(args.credentials)
        warn_if_credentials_readable(args.credentials)
        with serial.Serial(args.port, args.baud, timeout=0.1) as repl:
            time.sleep(args.open_settle)
            read_until_prompt(repl, args.startup_timeout)
            sync_repl(repl)
            metadata = {
                "board": query_value(repl, "process.env.BOARD", "BOARD"),
                "version": query_value(repl, "process.version", "VERSION"),
                "git_commit": query_value(
                    repl, "process.env.GIT_COMMIT", "GIT_COMMIT"
                ),
            }
            output = upload_secret_role(
                repl,
                args.script,
                credentials,
                ("DONE=esp32_wifi_scan_after_disconnect",),
                args.timeout,
            )
    except (OSError, ValueError, serial.SerialException) as error:
        print(f"Runner error: {error}", file=sys.stderr)
        return 2

    print(f"RUNNER test={args.script}")
    print(f"RUNNER port={args.port}")
    print(f"RUNNER board={metadata['board']}")
    print(f"RUNNER version={metadata['version']}")
    print(f"RUNNER git_commit={metadata['git_commit']}")
    print("RUNNER credentials=loaded_without_logging")
    structured = filter_structured_lines(output)
    for line in structured:
        print(line)
    if args.show_sanitized_raw:
        sanitized = output.replace(credentials["ssid"], "<SSID>")
        sanitized = sanitized.replace(credentials["password"], "<PASSWORD>")
        print("RUNNER sanitized_raw_output_begin")
        print(sanitized.rstrip())
        print("RUNNER sanitized_raw_output_end")

    if not has_output_marker(
        output, ("DONE=esp32_wifi_scan_after_disconnect",)
    ):
        print("Missing DONE marker.", file=sys.stderr)
        return 2
    return 1 if any(line.startswith("FAIL ") for line in structured) else 0


if __name__ == "__main__":
    raise SystemExit(main())
