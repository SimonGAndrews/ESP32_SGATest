#!/usr/bin/env python3
"""Run a target-hosted AP test with the other configured board as station peer."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

import serial

from run_test import filter_structured_lines, read_available, send_and_capture, sync_repl
from run_wifi_peer_test import (
    clean_repl_line,
    collect_until,
    control_connection,
    count_output_marker,
    final_runtime_cleanup,
    get_position,
    hardware_reboot,
    marker_payload,
    runtime_cleanup,
    runtime_is_inactive,
    upload_role,
    verify_identity,
)
from verify_bench_config import load_config


TARGET_PAIRS = {
    "c3": ("esp32_c3_v1", "esp32_v1"),
    "esp32": ("esp32_v1", "esp32_c3_v1"),
}
CONFIG_PATH = Path("tests/WIFI_BLE/standalone_bench_config.json")
TARGET_SCRIPT = Path("tests/WIFI_BLE/wifi/wifi_target_ap_service.js")
STATION_SCRIPT = Path("tests/WIFI_BLE/wifi/wifi_station_peer_exchange.js")
STATIC_STATION_SCRIPT = Path("tests/WIFI_BLE/wifi/wifi_station_static_ip.js")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--target-board",
        choices=tuple(TARGET_PAIRS),
        default="c3",
    )
    parser.add_argument(
        "--station-address",
        choices=("dhcp", "static"),
        default="dhcp",
    )
    args = parser.parse_args()

    config = load_config(CONFIG_PATH)
    target_position_id, supervisor_position_id = TARGET_PAIRS[args.target_board]
    target_position = get_position(config, target_position_id)
    supervisor_position = get_position(config, supervisor_position_id)
    target_path, target_baud = control_connection(target_position)
    supervisor_path, supervisor_baud = control_connection(supervisor_position)

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    static_station = args.station_address == "static"
    role_config = {
        "runId": run_id,
        "ssid": "ESPRUINO_TARGET_AP_" + run_id[-7:-1],
        "password": "TargetAP_" + run_id[-7:-1],
        "channel": 6,
        "udpPort": 41235,
        "apIP": "192.168.4.1" if static_station else "192.168.47.1",
        "netmask": "255.255.255.0",
        "configureAPIP": not static_station,
    }
    if static_station:
        role_config.update({
            "stationIP": "192.168.4.77",
            "holdAfterExchangeMs": 2500,
        })

    print(
        "RUNNER test="
        + ("wifi_station_static_ip" if static_station else "wifi_target_ap_service")
    )
    print(f"RUNNER config={CONFIG_PATH}")
    print(f"RUNNER run_id={run_id}")
    print(f"RUNNER target_board={args.target_board}")
    print(f"RUNNER station_address={args.station_address}")
    print(f"RUNNER target_position={target_position_id}")
    print(f"RUNNER target_path={target_path}")
    print(f"RUNNER supervisor_position={supervisor_position_id}")
    print(f"RUNNER supervisor_path={supervisor_path}")

    target_output = ""
    station_output = ""
    target_stop_output = ""
    result = 2

    try:
        with serial.Serial(target_path, target_baud, timeout=0.1) as target_repl, \
             serial.Serial(
                 supervisor_path,
                 supervisor_baud,
                 timeout=0.1,
             ) as supervisor_repl:
            sync_repl(target_repl)
            sync_repl(supervisor_repl)
            target_identity = verify_identity(target_repl, target_position)
            supervisor_identity = verify_identity(
                supervisor_repl,
                supervisor_position,
            )
            print(
                "RUNNER target_identity="
                + json.dumps(target_identity, sort_keys=True)
            )
            print(
                "RUNNER supervisor_identity="
                + json.dumps(supervisor_identity, sort_keys=True)
            )

            hardware_reboot(target_repl)
            hardware_reboot(supervisor_repl)
            runtime_cleanup(target_repl, "TARGET_AP_PRE")
            runtime_cleanup(supervisor_repl, "SUPERVISOR_STA_PRE")

            target_output = upload_role(
                target_repl,
                TARGET_SCRIPT,
                role_config,
                ("TARGET_AP_READY=", "TARGET_AP_ERROR="),
                15.0,
            )
            ready = marker_payload(target_output, "TARGET_AP_READY")
            if not ready:
                print("Target AP did not report ready.", file=sys.stderr)
                print("RUNNER target_startup_diagnostic_begin")
                print(target_output.rstrip())
                print("RUNNER target_startup_diagnostic_end")
                result = 2
            else:
                peer_ip = ready["apIP"]["ip"]
                station_config = dict(role_config)
                station_config["peerIP"] = peer_ip
                print(f"RUNNER target_ap_ip={peer_ip}")
                station_output = upload_role(
                    supervisor_repl,
                    STATIC_STATION_SCRIPT if static_station else STATION_SCRIPT,
                    station_config,
                    ("DONE=PASS", "DONE=FAIL"),
                    35.0,
                )
                if not (
                    count_output_marker(station_output, "DONE=PASS")
                    or count_output_marker(station_output, "DONE=FAIL")
                ):
                    print("RUNNER station_diagnostic_begin")
                    print(station_output.rstrip())
                    print("RUNNER station_diagnostic_end")
                target_output += read_available(target_repl, 0.5)

                initial_stop = send_and_capture(
                    target_repl,
                    "wifiTargetAPStop();\n",
                    settle=0.2,
                )
                target_stop_output = collect_until(
                    target_repl,
                    initial_stop,
                    ("DONE=PASS", "DONE=FAIL"),
                    8.0,
                )

                station_pass = (
                    count_output_marker(station_output, "DONE=PASS") == 1
                    and count_output_marker(station_output, "DONE=FAIL") == 0
                )
                target_pass = (
                    count_output_marker(target_stop_output, "DONE=PASS") == 1
                    and count_output_marker(target_stop_output, "DONE=FAIL") == 0
                )
                summary = marker_payload(
                    target_output + target_stop_output,
                    "TARGET_AP_SUMMARY",
                )
                received = bool(
                    summary
                    and summary.get("received")
                    and summary["received"][0]["data"].startswith(run_id + "|")
                )
                received_from_static_ip = bool(
                    not static_station
                    or (
                        summary
                        and summary.get("received")
                        and summary["received"][0]["address"]
                        == role_config["stationIP"]
                    )
                )
                joined = bool(
                    summary
                    and any(
                        event.get("name") == "sta_joined"
                        for event in summary.get("events", [])
                    )
                )
                left = bool(
                    summary
                    and any(
                        event.get("name") == "sta_left"
                        for event in summary.get("events", [])
                    )
                )
                print(
                    "PASS wifi_target_ap_received_challenge"
                    if received
                    else "FAIL wifi_target_ap_received_challenge"
                )
                if static_station:
                    print(
                        "PASS wifi_target_ap_observed_static_station_ip"
                        if received_from_static_ip
                        else "FAIL wifi_target_ap_observed_static_station_ip"
                    )
                print(
                    "PASS wifi_target_ap_observed_station_join"
                    if joined
                    else "FAIL wifi_target_ap_observed_station_join"
                )
                print(
                    "PASS wifi_target_ap_observed_station_leave"
                    if left
                    else "FAIL wifi_target_ap_observed_station_leave"
                )
                result = 0 if all(
                    (
                        station_pass,
                        target_pass,
                        received,
                        received_from_static_ip,
                        joined,
                        left,
                    )
                ) else 1

            target_status, target_ip, target_recovered = final_runtime_cleanup(
                target_repl,
                "TARGET_AP",
            )
            supervisor_status, supervisor_ip, supervisor_recovered = (
                final_runtime_cleanup(supervisor_repl, "SUPERVISOR_STA")
            )
            print(f"RUNNER target_final_status={target_status}")
            print(f"RUNNER supervisor_final_status={supervisor_status}")
            print(f"RUNNER target_cleanup_runtime_reset={target_recovered}")
            print(
                "RUNNER supervisor_cleanup_runtime_reset="
                f"{supervisor_recovered}"
            )
            print(f"RUNNER target_final_ip={target_ip}")
            print(f"RUNNER supervisor_final_ip={supervisor_ip}")
            cleanup_ok = runtime_is_inactive(
                target_status,
                target_ip,
            ) and runtime_is_inactive(supervisor_status, supervisor_ip)
            if cleanup_ok:
                print("PASS wifi_runtime_cleanup")
            else:
                print("FAIL wifi_runtime_cleanup status_not_off")
                result = 1

    except (OSError, ValueError, serial.SerialException) as exc:
        print(f"Runner error: {exc}", file=sys.stderr)
        result = 2

    print("RUNNER station_output_begin")
    normalized_station = "\n".join(
        clean_repl_line(line) for line in station_output.splitlines()
    )
    for line in filter_structured_lines(normalized_station):
        print(line)
    print("RUNNER station_output_end")

    print("RUNNER target_output_begin")
    normalized_target = "\n".join(
        clean_repl_line(line)
        for line in (target_output + target_stop_output).splitlines()
    )
    for line in filter_structured_lines(normalized_target):
        print(line)
    for line in normalized_target.splitlines():
        if line.startswith("TARGET_AP_"):
            print(line)
    print("RUNNER target_output_end")
    print("RUNNER_RESULT=" + ("PASS" if result == 0 else "FAIL"))
    return result


if __name__ == "__main__":
    raise SystemExit(main())
