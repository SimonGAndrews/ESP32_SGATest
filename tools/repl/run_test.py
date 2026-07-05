#!/usr/bin/env python3
"""Run one shared REPL functional test with direct or CLI transport."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time

import serial


STRUCTURED_PREFIXES = (
    "TEST=",
    "TARGET=",
    "INFO ",
    "PASS ",
    "FAIL ",
    "SKIP ",
    "METRIC ",
    "DONE=",
)


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


def send_script_paced(ser: serial.Serial, text: str) -> str:
    lines = text.splitlines()
    chunks: list[str] = []

    for idx, line in enumerate(lines):
        ser.write((line + "\n").encode("utf-8"))
        ser.flush()

        # Pace multi-line REPL uploads so larger tests do not overrun the console.
        if idx == len(lines) - 1 or idx % 8 == 7:
            chunks.append(read_available(ser, 0.04))
        else:
            time.sleep(0.005)

    return "".join(chunks)


def read_until_done(ser: serial.Serial, timeout: float) -> str:
    deadline = time.monotonic() + timeout
    chunks: list[bytes] = []
    while time.monotonic() < deadline:
        waiting = ser.in_waiting
        if waiting:
            chunks.append(ser.read(waiting))
            text = b"".join(chunks).decode("utf-8", "replace")
            if "DONE=" in text:
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
    value = None
    for line in output.splitlines():
        line = line.strip()
        if line.startswith(marker + "="):
            value = line[len(marker) + 1 :]
    if value is None:
        return "UNKNOWN"
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return value
    return str(parsed)


def collect_metadata(port: str, baud: int) -> dict[str, str]:
    with serial.Serial(port, baud, timeout=0.1) as ser:
        sync_repl(ser)
        return {
            "board": query_value(ser, "process.env.BOARD", "BOARD"),
            "version": query_value(ser, "process.version", "VERSION"),
            "git_commit": query_value(ser, "process.env.GIT_COMMIT", "GIT_COMMIT"),
        }


def run_direct(test_path: Path, port: str, baud: int, timeout: float) -> str:
    js_test = test_path.read_text()
    with serial.Serial(port, baud, timeout=0.1) as ser:
        sync_repl(ser)
        send_and_capture(ser, "reset();\n", settle=0.8)
        send_and_capture(ser, "echo(true);\n", settle=0.2)
        ser.reset_input_buffer()
        raw_output = send_script_paced(ser, js_test)
        if "DONE=" in raw_output:
            return raw_output
        return raw_output + read_until_done(ser, timeout)


def validate_cli_path(cli_path: str) -> Path:
    path = Path(cli_path)
    if not path.is_file():
        raise FileNotFoundError(f"Espruino CLI not found: {path}")
    return path


def run_cli(
    test_path: Path,
    port: str,
    baud: int,
    timeout: float,
    cli_path: str,
    board_hint: str | None,
) -> tuple[str, list[str]]:
    cli = validate_cli_path(cli_path)
    cmd = [
        "node",
        str(cli),
        "-q",
        "--no-ble",
        "-b",
        str(baud),
        "-p",
        port,
    ]
    if board_hint:
        cmd.extend(["--board", board_hint])
    cmd.append(str(test_path))
    completed = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    return completed.stdout + completed.stderr, cmd


def filter_structured_lines(raw_output: str) -> list[str]:
    lines: list[str] = []
    for line in raw_output.splitlines():
        stripped = line.strip()
        if stripped.startswith(STRUCTURED_PREFIXES):
            lines.append(stripped)
    return lines


def count_prefix(lines: list[str], prefix: str) -> int:
    return sum(1 for line in lines if line.startswith(prefix))


def print_runner_metadata(
    test_path: Path,
    port: str,
    baud: int,
    transport: str,
    metadata: dict[str, str],
    command: list[str] | None,
) -> None:
    print(f"RUNNER test={test_path}")
    print(f"RUNNER port={port}")
    print(f"RUNNER baud={baud}")
    print(f"RUNNER transport={transport}")
    print(f"RUNNER board={metadata.get('board', 'UNKNOWN')}")
    print(f"RUNNER version={metadata.get('version', 'UNKNOWN')}")
    print(f"RUNNER git_commit={metadata.get('git_commit', 'UNKNOWN')}")
    if command:
        print("RUNNER command=" + " ".join(command))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("test", help="Path to the shared REPL test file")
    parser.add_argument("--port", default="/dev/ttyUSB0")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--timeout", type=float, default=8.0)
    parser.add_argument(
        "--transport",
        choices=("direct", "cli"),
        default="direct",
        help="Transport backend to use",
    )
    parser.add_argument(
        "--cli-path",
        default=os.environ.get("ESPRUINO_CLI_PATH", ""),
        help="Explicit path to bin/espruino-cli.js for CLI transport",
    )
    parser.add_argument(
        "--board-hint",
        default="",
        help="Optional board hint to pass to EspruinoTools CLI",
    )
    parser.add_argument(
        "--show-raw",
        action="store_true",
        help="Print raw transport output after structured lines",
    )
    args = parser.parse_args()

    test_path = Path(args.test)
    if not test_path.is_file():
        print(f"Missing test file: {test_path}", file=sys.stderr)
        return 2

    metadata = collect_metadata(args.port, args.baud)
    command = None

    try:
        if args.transport == "direct":
            raw_output = run_direct(test_path, args.port, args.baud, args.timeout)
        else:
            if not args.cli_path:
                print(
                    "CLI transport selected but no --cli-path or ESPRUINO_CLI_PATH was provided.",
                    file=sys.stderr,
                )
                return 2
            raw_output, command = run_cli(
                test_path,
                args.port,
                args.baud,
                args.timeout,
                args.cli_path,
                args.board_hint or None,
            )
    except subprocess.TimeoutExpired as exc:
        print(f"CLI transport timed out after {args.timeout}s", file=sys.stderr)
        if exc.stdout:
            print(exc.stdout, end="", file=sys.stderr)
        if exc.stderr:
            print(exc.stderr, end="", file=sys.stderr)
        return 2
    except (FileNotFoundError, serial.SerialException) as exc:
        print(str(exc), file=sys.stderr)
        return 2

    structured_lines = filter_structured_lines(raw_output)

    print_runner_metadata(
        test_path,
        args.port,
        args.baud,
        args.transport,
        metadata,
        command,
    )
    for line in structured_lines:
        print(line)

    if args.show_raw:
        print("RUNNER raw_output_begin")
        print(raw_output.rstrip())
        print("RUNNER raw_output_end")

    if not any(line.startswith("DONE=") for line in structured_lines):
        print("Missing DONE marker in structured output.", file=sys.stderr)
        return 2

    failures = count_prefix(structured_lines, "FAIL ")
    if failures:
        print(f"Detected {failures} failing checks.", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
