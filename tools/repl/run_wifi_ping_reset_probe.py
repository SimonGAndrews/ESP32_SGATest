#!/usr/bin/env python3
"""Characterise an ESP32 Wifi.ping() session across JavaScript reset()."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
import time

import serial

from run_test import (
    query_value,
    read_available,
    send_and_capture,
    send_script_paced,
    sync_repl,
)


ANSI_ESCAPE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
MODES = ("active_success", "active_timeout", "queued_final")


def clean_line(line: str) -> str:
    return ANSI_ESCAPE.sub("", line).strip()


def marker_count(output: str, marker: str) -> int:
    prefix = marker + "="
    return sum(prefix in clean_line(line) for line in output.splitlines())


def collect_until(
    repl: serial.Serial,
    initial: str,
    marker: str,
    timeout: float,
) -> str:
    output = initial
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if marker in output:
            return output + read_available(repl, 0.25)
        waiting = repl.in_waiting
        if waiting:
            output += repl.read(waiting).decode("utf-8", "replace")
        else:
            time.sleep(0.02)
    return output


def collect_for(repl: serial.Serial, duration: float) -> str:
    """Collect serial output for a fixed wall-clock interval."""
    output = ""
    deadline = time.monotonic() + duration
    while time.monotonic() < deadline:
        waiting = repl.in_waiting
        if waiting:
            output += repl.read(waiting).decode("utf-8", "replace")
        else:
            time.sleep(0.02)
    waiting = repl.in_waiting
    if waiting:
        output += repl.read(waiting).decode("utf-8", "replace")
    return output


def hard_reboot(repl: serial.Serial) -> None:
    """Reinitialise native drivers so each lifecycle phase is independent."""
    repl.reset_input_buffer()
    repl.write(b"E.reboot();\n")
    repl.flush()
    collect_for(repl, 3.0)
    sync_repl(repl)


def recovery_command(mode: str) -> str:
    return (
        "(function(){var w=require('Wifi'),n=0;"
        "try{w.ping('127.0.0.1',function(r){n++;"
        f'print("RECOVERY_CALLBACK={mode}:"+n);'
        f'if(n===5)print("RECOVERY_DONE={mode}")'
        "});"
        f'print("RECOVERY_ACCEPTED={mode}")'
        "}catch(e){"
        f'print("RECOVERY_EXCEPTION={mode}:"+e)'
        "}})();\n"
    )


def run_mode(
    repl: serial.Serial,
    script: str,
    mode: str,
) -> tuple[str, int, int, int, bool, bool]:
    hard_reboot(repl)
    send_and_capture(repl, "echo(false);\n", settle=0.15)
    send_and_capture(
        repl,
        "global.PING_RESET_MODE=" + json.dumps(mode) + ";\n",
        settle=0.15,
    )
    repl.reset_input_buffer()
    output = send_script_paced(repl, script)

    # active_timeout needs the full five-timeout session to reach on_ping_end.
    observation_seconds = 10.0 if mode == "active_timeout" else 5.0
    output += collect_for(repl, observation_seconds)
    old_callbacks = marker_count(output, "OLD_CALLBACK")

    # reset() restores REPL echo. Disable it again so command source cannot be
    # mistaken for recovery markers in the serial transcript.
    send_and_capture(repl, "echo(false);\n", settle=0.15)
    recovery_initial = send_and_capture(
        repl,
        recovery_command(mode),
        settle=0.2,
    )
    recovery_output = collect_until(
        repl,
        recovery_initial,
        "RECOVERY_DONE=" + mode,
        9.0,
    )
    output += recovery_output
    unknown_callback_errors = output.count(
        "ERROR: Unknown type of callback in Event Queue"
    )
    recovery_callbacks = marker_count(
        recovery_output,
        "RECOVERY_CALLBACK",
    )
    recovery_accepted = "RECOVERY_ACCEPTED=" + mode in recovery_output
    recovery_done = "RECOVERY_DONE=" + mode in recovery_output
    return (
        output,
        old_callbacks,
        unknown_callback_errors,
        recovery_callbacks,
        recovery_accepted,
        recovery_done,
    )


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)
        sys.stderr.reconfigure(line_buffering=True)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", required=True)
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument(
        "--script",
        type=Path,
        default=Path(
            "docs/investigations/wifi/repros/esp32_wifi_ping_reset.js"
        ),
    )
    parser.add_argument(
        "--show-raw",
        action="store_true",
        help="show the complete serial transcript for each reset mode",
    )
    args = parser.parse_args()

    if not args.script.is_file():
        print(f"Missing test file: {args.script}", file=sys.stderr)
        return 2

    script = args.script.read_text()
    results = []
    try:
        with serial.Serial(args.port, args.baud, timeout=0.1) as repl:
            sync_repl(repl)
            metadata = {
                "board": query_value(repl, "process.env.BOARD", "BOARD"),
                "version": query_value(repl, "process.version", "VERSION"),
                "git_commit": query_value(
                    repl,
                    "process.env.GIT_COMMIT",
                    "GIT_COMMIT",
                ),
            }
            for mode in MODES:
                result = run_mode(repl, script, mode)
                results.append((mode,) + result)
    except (OSError, serial.SerialException) as error:
        print(f"Runner error: {error}", file=sys.stderr)
        return 2

    print(f"RUNNER test={args.script}")
    print(f"RUNNER port={args.port}")
    print(f"RUNNER board={metadata['board']}")
    print(f"RUNNER version={metadata['version']}")
    print(f"RUNNER git_commit={metadata['git_commit']}")
    print("TEST=esp32_wifi_ping_reset_probe")

    failed = False
    for (
        mode,
        output,
        old_callbacks,
        unknown_callback_errors,
        recovery_callbacks,
        recovery_accepted,
        recovery_done,
    ) in results:
        print(
            "METRIC ping_reset="
            + json.dumps(
                {
                    "mode": mode,
                    "oldCallbacksAfterResetRequested": old_callbacks,
                    "unknownCallbackErrors": unknown_callback_errors,
                    "recoveryCallbacks": recovery_callbacks,
                    "recoveryAccepted": recovery_accepted,
                    "recoveryCompleted": recovery_done,
                },
                separators=(",", ":"),
            )
        )
        if recovery_done and recovery_callbacks == 5:
            print("PASS " + mode + "_probe_completed")
        else:
            failed = True
            print("FAIL " + mode + "_recovery_incomplete")
        if args.show_raw:
            print("RUNNER raw_output_begin mode=" + mode)
            print(output.rstrip())
            print("RUNNER raw_output_end mode=" + mode)

    print("DONE=" + ("FAIL" if failed else "PASS"))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
