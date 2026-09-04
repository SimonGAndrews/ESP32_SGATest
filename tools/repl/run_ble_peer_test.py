#!/usr/bin/env python3
"""Run the two-board BLE Supervisor Peer functional test."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

import serial

from run_test import filter_structured_lines, query_value, read_available, send_and_capture, sync_repl
from run_wifi_peer_test import (
    clean_repl_line,
    collect_until,
    control_connection,
    count_output_marker,
    get_position,
    hardware_reboot,
    marker_payload,
    upload_role,
    verify_identity,
)
from verify_bench_config import load_config


DIRECTION_POSITIONS = {
    "c3-peer": ("esp32_c3_v1", "esp32_v1"),
    "esp32-peer": ("esp32_v1", "esp32_c3_v1"),
    "c3-idf4-peer": ("esp32_c3_peer", "esp32_c3_v1"),
    "c3-idf5-peer": ("esp32_c3_v1", "esp32_c3_peer"),
}
CONFIG_PATH = Path("tests/WIFI_BLE/standalone_bench_config.json")
PEER_SCRIPT = Path("tests/WIFI_BLE/ble/ble_supervisor_advertiser.js")
TARGET_SCRIPT = Path("tests/WIFI_BLE/ble/ble_target_filtered_scan.js")


def ble_runtime_cleanup(repl: serial.Serial, label: str) -> tuple[str, str]:
    send_and_capture(repl, "\x03", settle=0.15)
    send_and_capture(repl, "echo(true);\n", settle=0.15)
    cleanup = (
        '(function(){clearInterval();clearWatch();NRF.setScan();'
        "NRF.removeAllListeners();NRF.disconnect();NRF.sleep();"
        'E.setConsole(E.getConsole(),{force:false});'
        'setTimeout(function(){print("'
        + label
        + '_CLEAN=1")},300)})();\n'
    )
    initial = send_and_capture(repl, cleanup, settle=0.2)
    output = collect_until(repl, initial, (label + "_CLEAN=1",), 3.0)
    security = query_value(repl, "NRF.getSecurityStatus()", label + "_SECURITY")
    return output, security


def print_role_output(label: str, output: str) -> None:
    print(f"RUNNER {label}_output_begin")
    normalized = "\n".join(clean_repl_line(line) for line in output.splitlines())
    for line in filter_structured_lines(normalized):
        print(line)
    for line in normalized.splitlines():
        if line.startswith("BLE_"):
            print(line)
    print(f"RUNNER {label}_output_end")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config",
        type=Path,
        default=CONFIG_PATH,
    )
    parser.add_argument(
        "--direction",
        choices=tuple(DIRECTION_POSITIONS),
        default="c3-peer",
    )
    args = parser.parse_args()

    config = load_config(args.config)
    peer_position_id, target_position_id = DIRECTION_POSITIONS[args.direction]
    peer_position = get_position(config, peer_position_id)
    target_position = get_position(config, target_position_id)
    peer_path, peer_baud = control_connection(peer_position)
    target_path, target_baud = control_connection(target_position)

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    suffix = run_id[9:15]
    role_config = {
        "runId": run_id,
        "name": "SGA-BLE-" + suffix,
        "serviceUUID": "fff0",
        "serviceData": [ord(char) for char in suffix],
    }

    print("RUNNER test=ble_supervisor_peer_advertising_scan")
    print(f"RUNNER config={args.config}")
    print(f"RUNNER run_id={run_id}")
    print(f"RUNNER direction={args.direction}")
    print(f"RUNNER peer_position={peer_position_id}")
    print("RUNNER peer_radio_role=advertiser")
    print(f"RUNNER peer_path={peer_path}")
    print(f"RUNNER target_position={target_position_id}")
    print("RUNNER target_radio_role=scanner")
    print(f"RUNNER target_path={target_path}")

    peer_output = ""
    target_output = ""
    peer_stop_output = ""
    result = 2

    try:
        with serial.Serial(peer_path, peer_baud, timeout=0.1) as peer_repl, \
             serial.Serial(target_path, target_baud, timeout=0.1) as target_repl:
            sync_repl(peer_repl)
            sync_repl(target_repl)
            peer_identity = verify_identity(peer_repl, peer_position)
            target_identity = verify_identity(target_repl, target_position)
            print("RUNNER peer_identity=" + json.dumps(peer_identity, sort_keys=True))
            print(
                "RUNNER target_identity="
                + json.dumps(target_identity, sort_keys=True)
            )

            hardware_reboot(peer_repl)
            hardware_reboot(target_repl)
            ble_runtime_cleanup(peer_repl, "BLE_PEER_PRE")
            ble_runtime_cleanup(target_repl, "BLE_TARGET_PRE")

            peer_output = upload_role(
                peer_repl,
                PEER_SCRIPT,
                role_config,
                ("BLE_PEER_READY=",),
                8.0,
            )
            ready = marker_payload(peer_output, "BLE_PEER_READY")
            if not ready:
                print("BLE peer did not report ready.", file=sys.stderr)
                print("RUNNER peer_diagnostic_begin")
                print(peer_output.rstrip())
                print("RUNNER peer_diagnostic_end")
                result = 2
            else:
                target_output = upload_role(
                    target_repl,
                    TARGET_SCRIPT,
                    role_config,
                    ("DONE=PASS", "DONE=FAIL"),
                    14.0,
                )
                peer_output += read_available(peer_repl, 0.4)
                initial_stop = send_and_capture(
                    peer_repl,
                    "bleSupervisorStop();\n",
                    settle=0.2,
                )
                peer_stop_output = collect_until(
                    peer_repl,
                    initial_stop,
                    ("DONE=PASS", "DONE=FAIL"),
                    5.0,
                )

                target_pass = (
                    count_output_marker(target_output, "DONE=PASS") == 1
                    and count_output_marker(target_output, "DONE=FAIL") == 0
                )
                peer_pass = (
                    count_output_marker(peer_stop_output, "DONE=PASS") == 1
                    and count_output_marker(peer_stop_output, "DONE=FAIL") == 0
                )
                scan_summary = marker_payload(target_output, "BLE_SCAN_SUMMARY")
                observed = scan_summary.get("observed", []) if scan_summary else []
                host_match = bool(
                    len(observed) == 1
                    and observed[0].get("name") == role_config["name"]
                    and observed[0].get("id")
                    and observed[0].get("id") != "de:ad:de:ad:de:ad"
                )
                print(
                    "PASS ble_host_correlated_unique_peer"
                    if host_match
                    else "FAIL ble_host_correlated_unique_peer"
                )
                result = 0 if all((target_pass, peer_pass, host_match)) else 1

            _, peer_security = ble_runtime_cleanup(peer_repl, "BLE_PEER_POST")
            _, target_security = ble_runtime_cleanup(
                target_repl,
                "BLE_TARGET_POST",
            )
            print(f"RUNNER peer_final_security={peer_security}")
            print(f"RUNNER target_final_security={target_security}")
            cleanup_ok = (
                "'connected': True" not in peer_security
                and "'connected': True" not in target_security
            )
            if cleanup_ok:
                print("PASS ble_runtime_cleanup")
            else:
                print("FAIL ble_runtime_cleanup connected_after_cleanup")
                result = 1

    except (OSError, ValueError, serial.SerialException) as exc:
        print(f"Runner error: {exc}", file=sys.stderr)
        result = 2

    print_role_output("target", target_output)
    print_role_output("peer", peer_output + peer_stop_output)
    print("RUNNER_RESULT=" + ("PASS" if result == 0 else "FAIL"))
    return result


if __name__ == "__main__":
    raise SystemExit(main())
