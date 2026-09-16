#!/usr/bin/env python3
"""Prove saved ESP32 station restoration across a hardware reboot."""

from __future__ import annotations

import argparse
from contextlib import ExitStack
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

import serial

from run_test import (
    filter_structured_lines,
    read_available,
    send_and_capture,
    sync_repl,
)
from run_wifi_peer_test import (
    collect_until,
    control_connection,
    final_runtime_cleanup,
    get_position,
    hardware_reboot,
    has_output_marker,
    marker_payload,
    runtime_cleanup,
    upload_role,
    verify_identity,
)
from verify_bench_config import load_config


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)
        sys.stderr.reconfigure(line_buffering=True)

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config",
        type=Path,
        required=True,
        help="bench configuration with exact target and peer firmware identities",
    )
    parser.add_argument(
        "--peer-script",
        type=Path,
        default=Path("tests/WIFI_BLE/wifi/wifi_supervisor_peer.js"),
    )
    parser.add_argument(
        "--prepare-script",
        type=Path,
        default=Path("tests/WIFI_BLE/wifi/wifi_restore_prepare.js"),
    )
    parser.add_argument(
        "--verify-script",
        type=Path,
        default=Path("tests/WIFI_BLE/wifi/wifi_restore_verify.js"),
    )
    args = parser.parse_args()

    config = load_config(args.config)
    peer_position = get_position(config, "esp32_c3_v1")
    target_position = get_position(config, "esp32_v1")
    peer_path, peer_baud = control_connection(peer_position)
    target_path, target_baud = control_connection(target_position)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    role_config = {
        "runId": run_id,
        "ssid": "ESPRUINO_RESTORE_" + run_id[-7:-1],
        "password": "Restore_" + run_id[-7:-1],
        "channel": 6,
        "udpPort": 41234,
    }

    print("RUNNER test=wifi_saved_station_restore")
    print(f"RUNNER config={args.config}")
    print(f"RUNNER run_id={run_id}")
    print(f"RUNNER peer_path={peer_path}")
    print(f"RUNNER target_path={target_path}")

    peer_output = ""
    prepare_output = ""
    verify_output = ""
    peer_stop_output = ""
    result = 2
    cleanup_errors: list[str] = []

    try:
        with ExitStack() as stack:
            peer_repl = stack.enter_context(
                serial.Serial(peer_path, peer_baud, timeout=0.1)
            )
            target_repl = stack.enter_context(
                serial.Serial(target_path, target_baud, timeout=0.1)
            )

            # Register cleanup after opening both ports. ExitStack invokes this
            # before closing them, including when any test phase raises.
            def cleanup() -> None:
                try:
                    send_and_capture(
                        target_repl,
                        'require("Wifi").save("clear");'
                        'require("Wifi").disconnect();\n',
                        settle=0.5,
                    )
                except Exception as error:  # best-effort persistent cleanup
                    message = f"target persistent cleanup failed: {error}"
                    cleanup_errors.append(message)
                    print(f"RUNNER cleanup_warning={message}", file=sys.stderr)

                for label, repl in (("PEER", peer_repl), ("TARGET", target_repl)):
                    try:
                        status, ip, recovered = final_runtime_cleanup(repl, label)
                        print(f"RUNNER {label.lower()}_final_status={status}")
                        print(f"RUNNER {label.lower()}_final_ip={ip}")
                        print(
                            f"RUNNER {label.lower()}_cleanup_runtime_reset="
                            f"{recovered}"
                        )
                    except Exception as error:  # best-effort runtime cleanup
                        message = f"{label.lower()} runtime cleanup failed: {error}"
                        cleanup_errors.append(message)
                        print(f"RUNNER cleanup_warning={message}", file=sys.stderr)

            stack.callback(cleanup)

            sync_repl(peer_repl)
            sync_repl(target_repl)
            peer_identity = verify_identity(peer_repl, peer_position)
            target_identity = verify_identity(target_repl, target_position)
            print("RUNNER peer_identity=" + json.dumps(peer_identity, sort_keys=True))
            print("RUNNER target_identity=" + json.dumps(target_identity, sort_keys=True))

            # Establish a known persistent and volatile starting state.
            send_and_capture(
                target_repl,
                'require("Wifi").save("clear");\n',
                settle=0.3,
            )
            hardware_reboot(peer_repl)
            hardware_reboot(target_repl)
            runtime_cleanup(peer_repl, "PEER_PRE")
            runtime_cleanup(target_repl, "TARGET_PRE")

            peer_output = upload_role(
                peer_repl,
                args.peer_script,
                role_config,
                ("PEER_READY=", "PEER_ERROR="),
                12.0,
            )
            peer_ready = marker_payload(peer_output, "PEER_READY")
            if not peer_ready:
                raise ValueError("controlled peer did not report ready")
            role_config["peerIP"] = peer_ready["apIP"]["ip"]
            print(f"RUNNER peer_ip={role_config['peerIP']}")

            prepare_output = upload_role(
                target_repl,
                args.prepare_script,
                role_config,
                ("RESTORE_PREPARED=PASS", "RESTORE_PREPARED=FAIL"),
                20.0,
            )
            prepared = has_output_marker(prepare_output, ("RESTORE_PREPARED=PASS",))
            print("PASS restore_configuration_prepared" if prepared else
                  "FAIL restore_configuration_prepared")

            if prepared:
                # A hardware reboot is essential: jswrap_wifi_restore() runs during boot.
                hardware_reboot(target_repl)
                verify_output = upload_role(
                    target_repl,
                    args.verify_script,
                    role_config,
                    ("DONE=PASS", "DONE=FAIL"),
                    25.0,
                )

            peer_output += read_available(peer_repl, 0.75)
            peer_stop_initial = send_and_capture(
                peer_repl,
                "wifiPeerStop();\n",
                settle=0.2,
            )
            peer_stop_output = collect_until(
                peer_repl,
                peer_stop_initial,
                ("PEER_DONE=",),
                6.0,
            )

            verified = has_output_marker(verify_output, ("DONE=PASS",))
            peer_summary = marker_payload(peer_output + peer_stop_output, "PEER_SUMMARY")
            joins = [
                event for event in (peer_summary or {}).get("events", [])
                if event.get("name") == "sta_joined"
            ]
            traffic = [
                item for item in (peer_summary or {}).get("received", [])
                if "|restore|RESTORE_LIFECYCLE" in item.get("data", "")
            ]
            print("PASS restored_target_script" if verified else
                  "FAIL restored_target_script")
            print("PASS peer_observed_pre_and_post_reboot_joins" if len(joins) >= 2 else
                  "FAIL peer_observed_pre_and_post_reboot_joins")
            print("PASS peer_received_restored_udp" if traffic else
                  "FAIL peer_received_restored_udp")

            result = 0 if prepared and verified and len(joins) >= 2 and traffic else 1
    except (OSError, ValueError, serial.SerialException) as error:
        print(f"RUNNER error={error}", file=sys.stderr)
        result = 2

    if cleanup_errors and result == 0:
        result = 1

    for label, output in (
        ("prepare", prepare_output),
        ("verify", verify_output),
        ("peer", peer_output + peer_stop_output),
    ):
        print(f"RUNNER {label}_output_begin")
        for line in filter_structured_lines(output):
            print(line)
        print(f"RUNNER {label}_output_end")
    print("RUNNER_RESULT=" + ("PASS" if result == 0 else "FAIL"))
    return result


if __name__ == "__main__":
    raise SystemExit(main())
