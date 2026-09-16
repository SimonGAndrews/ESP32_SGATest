#!/usr/bin/env python3
"""Run a two-board BLE Supervisor Peer GATT transaction test."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

import serial

from run_ble_peer_test import ble_runtime_cleanup, print_role_output
from run_test import read_available, send_and_capture, sync_repl
from run_wifi_peer_test import (
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
PEER_SCRIPT = Path("tests/WIFI_BLE/ble/ble_supervisor_gatt_peer.js")
TARGET_SCRIPT = Path("tests/WIFI_BLE/ble/ble_target_gatt_client.js")


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
    parser.add_argument(
        "--service-replacements",
        type=int,
        default=0,
        help=(
            "Replace the peripheral GATT service this many times before "
            "advertising it (default: one normal service setup)"
        ),
    )
    parser.add_argument(
        "--service-replacement-delay-ms",
        type=int,
        default=500,
        help="Delay between repeated service setups (default: 500 ms)",
    )
    args = parser.parse_args()

    if args.service_replacements < 0:
        parser.error("--service-replacements must be zero or greater")
    if args.service_replacement_delay_ms < 1:
        parser.error("--service-replacement-delay-ms must be positive")

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
        "name": "SGA-GATT-" + suffix,
        "challenge": "Q" + suffix,
        "ack": "A" + suffix,
        "complete": "D" + suffix,
        "serviceReplacements": args.service_replacements,
        "serviceReplacementDelayMs": args.service_replacement_delay_ms,
    }

    print("RUNNER test=ble_supervisor_peer_gatt")
    print(f"RUNNER config={args.config}")
    print(f"RUNNER run_id={run_id}")
    print(f"RUNNER direction={args.direction}")
    print(f"RUNNER peer_position={peer_position_id}")
    print("RUNNER peer_radio_role=gatt_peripheral")
    print(f"RUNNER peer_path={peer_path}")
    print(f"RUNNER target_position={target_position_id}")
    print("RUNNER target_radio_role=gatt_central")
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
            # A chip reboot is the clean precondition. Calling NRF.sleep()
            # here and NRF.wake() at the start of each role creates an
            # unnecessary asynchronous controller transition immediately
            # before NRF.setServices(). Keep BLE cleanup at the end instead.

            peer_output = upload_role(
                peer_repl,
                PEER_SCRIPT,
                role_config,
                ("BLE_GATT_PEER_READY=",),
                10.0
                + (
                    args.service_replacements
                    * args.service_replacement_delay_ms
                    / 1000.0
                ),
            )
            ready = marker_payload(peer_output, "BLE_GATT_PEER_READY")
            if not ready:
                print("BLE GATT peer did not report ready.", file=sys.stderr)
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
                    20.0,
                )
                peer_output += read_available(peer_repl, 0.5)
                initial_stop = send_and_capture(
                    peer_repl,
                    "bleGattPeerStop();\n",
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
                client_summary = marker_payload(
                    target_output,
                    "BLE_GATT_CLIENT_SUMMARY",
                )
                peer_summary = marker_payload(
                    peer_stop_output,
                    "BLE_GATT_PEER_SUMMARY",
                )
                replacement_count = count_output_marker(
                    peer_output,
                    "BLE_GATT_REPLACEMENT=",
                )
                final_replacement = marker_payload(
                    peer_output,
                    "BLE_GATT_REPLACEMENT",
                )
                replacements_ok = args.service_replacements == 0 or bool(
                    replacement_count == args.service_replacements
                    and final_replacement
                    and final_replacement.get("runId") == run_id
                    and final_replacement.get("iteration")
                    == args.service_replacements
                    and final_replacement.get("final") is True
                    and final_replacement.get("challenge")
                    == role_config["challenge"]
                )
                over_air_correlated = bool(
                    peer_summary
                    and peer_summary.get("runId") == run_id
                    and peer_summary.get("written") == role_config["ack"]
                    and peer_summary.get("completed") == role_config["complete"]
                    and peer_summary.get("serviceReplacements")
                    == args.service_replacements
                )
                if args.service_replacements:
                    print(
                        "PASS ble_peer_service_replacements "
                        f"count={replacement_count}"
                        if replacements_ok
                        else "FAIL ble_peer_service_replacements "
                        f"expected={args.service_replacements} "
                        f"observed={replacement_count}"
                    )
                print(
                    "PASS ble_host_correlated_gatt_over_air"
                    if over_air_correlated
                    else "FAIL ble_host_correlated_gatt_over_air"
                )
                print(
                    "PASS ble_target_reported_gatt_transaction"
                    if target_pass and client_summary
                    else "FAIL ble_target_reported_gatt_transaction"
                )
                result = 0 if all(
                    (target_pass, peer_pass, replacements_ok, over_air_correlated)
                ) else 1

            _, peer_security, peer_connected = ble_runtime_cleanup(
                peer_repl,
                "BLE_GATT_PEER_POST",
            )
            _, target_security, target_connected = ble_runtime_cleanup(
                target_repl,
                "BLE_GATT_TARGET_POST",
            )
            print(f"RUNNER peer_final_security={peer_security}")
            print(f"RUNNER target_final_security={target_security}")
            print(f"RUNNER peer_final_connected={peer_connected}")
            print(f"RUNNER target_final_connected={target_connected}")
            cleanup_ok = peer_connected == "False" and target_connected == "False"
            print(
                "PASS ble_runtime_cleanup"
                if cleanup_ok
                else "FAIL ble_runtime_cleanup connected_after_cleanup"
            )
            if not cleanup_ok:
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
