#!/usr/bin/env python3
"""Keep a credentialed manual AP-outage test attached to the target REPL."""

from __future__ import annotations

import argparse
from pathlib import Path
import select
import sys
import time

import serial

from run_ble_https_test import (
    load_credentials,
    upload_secret_role,
    warn_if_credentials_readable,
)
from run_test import query_value, read_until_prompt, send_and_capture, sync_repl


DEFAULT_CREDENTIALS = Path("tests/WIFI_BLE/local_wifi_credentials.json")
DEFAULT_SCRIPT = Path("tests/WIFI_BLE/wifi/wifi_manual_ap_recovery.js")


def sanitized(text: str, credentials: dict[str, str]) -> str:
    return text.replace(credentials["ssid"], "<SSID>").replace(
        credentials["password"], "<PASSWORD>"
    )


def emit(text: str, credentials: dict[str, str]) -> None:
    if text:
        print(sanitized(text, credentials), end="", flush=True)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)
        sys.stderr.reconfigure(line_buffering=True)

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", required=True)
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--credentials", type=Path, default=DEFAULT_CREDENTIALS)
    parser.add_argument("--script", type=Path, default=DEFAULT_SCRIPT)
    parser.add_argument("--timeout", type=float, default=600.0)
    args = parser.parse_args()

    credentials = load_credentials(args.credentials)
    warn_if_credentials_readable(args.credentials)
    started = time.monotonic()
    result = 2

    try:
        with serial.Serial(args.port, args.baud, timeout=0.1) as repl:
            time.sleep(0.5)
            sync_repl(repl)
            board = query_value(repl, "process.env.BOARD", "BOARD")
            version = query_value(repl, "process.version", "VERSION")
            commit = query_value(repl, "process.env.GIT_COMMIT", "GIT_COMMIT")
            reset_output = send_and_capture(repl, "reset();\n", settle=0.2)
            if not reset_output.rstrip().endswith(">"):
                read_until_prompt(repl, 8.0)
            output = upload_secret_role(
                repl,
                args.script,
                credentials,
                ("READY=DISABLE_AP", "DONE=FAIL"),
                45.0,
            )
            print(f"RUNNER board={board}")
            print(f"RUNNER version={version}")
            print(f"RUNNER git_commit={commit}")
            print("RUNNER commands=reconnect,summary,finish")
            emit(output, credentials)
            if "READY=DISABLE_AP" not in output:
                return 1 if "DONE=FAIL" in output else 2

            while time.monotonic() - started < args.timeout:
                readable, _, _ = select.select([sys.stdin], [], [], 0.05)
                if readable:
                    command = sys.stdin.readline().strip().lower()
                    expression = {
                        "reconnect": "manualWifiReconnect();\n",
                        "summary": "manualWifiSummary();\n",
                        "finish": "manualWifiFinish();\n",
                    }.get(command)
                    if expression:
                        repl.write(expression.encode("utf-8"))
                        repl.flush()
                    elif command:
                        print("RUNNER unknown_command=" + command)

                waiting = repl.in_waiting
                if waiting:
                    chunk = repl.read(waiting).decode("utf-8", "replace")
                    emit(chunk, credentials)
                    if "DONE=PASS" in chunk:
                        result = 0
                        break
                    if "DONE=FAIL" in chunk:
                        result = 1
                        break
            else:
                print("RUNNER timeout")
    except (OSError, ValueError, serial.SerialException) as error:
        print(f"Runner error: {error}", file=sys.stderr)
        return 2
    return result


if __name__ == "__main__":
    raise SystemExit(main())
