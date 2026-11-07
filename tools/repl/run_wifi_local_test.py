#!/usr/bin/env python3
"""Run one credentialed Wi-Fi role without exposing local credentials."""

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
    STRUCTURED_PREFIXES,
    query_value,
    read_until_prompt,
    send_and_capture,
    sync_repl,
)
from run_wifi_peer_test import clean_repl_line, has_output_marker


DEFAULT_CREDENTIALS = Path("tests/WIFI_BLE/local_wifi_credentials.json")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)
        sys.stderr.reconfigure(line_buffering=True)

    parser = argparse.ArgumentParser()
    parser.add_argument("script", type=Path)
    parser.add_argument("--port", required=True)
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--credentials", type=Path, default=DEFAULT_CREDENTIALS)
    parser.add_argument("--timeout", type=float, default=130.0)
    parser.add_argument("--show-sanitized-raw", action="store_true")
    args = parser.parse_args()

    if not args.script.is_file():
        print(f"Missing test file: {args.script}", file=sys.stderr)
        return 2

    try:
        credentials = load_credentials(args.credentials)
        warn_if_credentials_readable(args.credentials)
        role_config = dict(credentials)
        role_config["wrongPassword"] = "XFSM-INTENTIONAL-WRONG-20261105"
        role_config["absentSSID"] = "XFSM-NO-SUCH-AP-20261105"

        with serial.Serial(args.port, args.baud, timeout=0.1) as repl:
            time.sleep(0.5)
            sync_repl(repl)
            metadata = {
                "board": query_value(repl, "process.env.BOARD", "BOARD"),
                "version": query_value(repl, "process.version", "VERSION"),
                "git_commit": query_value(
                    repl, "process.env.GIT_COMMIT", "GIT_COMMIT"
                ),
            }
            # Isolate each role from callbacks, timers and listeners left by a
            # preceding bench test before injecting its ignored credentials.
            reset_output = send_and_capture(repl, "reset();\n", settle=0.2)
            if not reset_output.rstrip().endswith(">"):
                read_until_prompt(repl, min(args.timeout, 8.0))
            output = upload_secret_role(
                repl,
                args.script,
                role_config,
                ("DONE=PASS", "DONE=FAIL"),
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
    password_exposed = (
        credentials["password"] in output
        or role_config["wrongPassword"] in output
    )
    print("RUNNER password_exposed=" + ("yes" if password_exposed else "no"))
    structured = []
    for line in output.splitlines():
        cleaned = clean_repl_line(line)
        if cleaned.startswith(STRUCTURED_PREFIXES):
            structured.append(cleaned)
    for line in structured:
        print(line)

    if args.show_sanitized_raw:
        sanitized = output.replace(credentials["ssid"], "<SSID>")
        sanitized = sanitized.replace(credentials["password"], "<PASSWORD>")
        sanitized = sanitized.replace(role_config["wrongPassword"], "<WRONG_PASSWORD>")
        print("RUNNER sanitized_raw_output_begin")
        print(sanitized.rstrip())
        print("RUNNER sanitized_raw_output_end")

    if not has_output_marker(output, ("DONE=PASS", "DONE=FAIL")):
        print("Missing DONE marker.", file=sys.stderr)
        return 2
    if password_exposed:
        print("Password appeared in captured serial output.", file=sys.stderr)
        return 1
    return 1 if any(line.startswith("FAIL ") for line in structured) else 0


if __name__ == "__main__":
    raise SystemExit(main())
