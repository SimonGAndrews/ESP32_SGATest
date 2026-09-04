#!/usr/bin/env python3
"""Run positive or negative two-board Wi-Fi Supervisor Peer tests."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys
import time

import serial

from run_test import (
    filter_structured_lines,
    query_value,
    read_available,
    send_and_capture,
    send_script_paced,
    sync_repl,
)
from verify_bench_config import load_config, validate_position


DIRECTION_POSITIONS = {
    "c3-peer": ("esp32_c3_v1", "esp32_v1"),
    "esp32-peer": ("esp32_v1", "esp32_c3_v1"),
    "c3-idf4-peer": ("esp32_c3_peer", "esp32_c3_v1"),
    "c3-idf5-peer": ("esp32_c3_v1", "esp32_c3_peer"),
}
ANSI_ESCAPE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")


def clean_repl_line(line: str) -> str:
    return ANSI_ESCAPE.sub("", line).strip()


def has_output_marker(output: str, markers: tuple[str, ...]) -> bool:
    return any(
        clean_repl_line(line).startswith(marker)
        for line in output.splitlines()
        for marker in markers
    )


def count_output_marker(output: str, marker: str) -> int:
    return sum(
        clean_repl_line(line).startswith(marker)
        for line in output.splitlines()
    )


def get_position(config: dict, position_id: str) -> dict:
    for position in config["positions"]:
        if position.get("position_id") == position_id:
            return position
    raise ValueError(f"missing configured position: {position_id}")


def control_connection(position: dict) -> tuple[str, int]:
    _, control_role, role, _ = validate_position(position)
    if control_role != "console":
        raise ValueError(
            f"{position['position_id']}: expected console control role"
        )
    return role["path"], role.get("baud", 115200)


def verify_identity(repl: serial.Serial, position: dict) -> dict[str, str]:
    expected = position["expected_firmware"]
    observed = {
        "board": query_value(repl, "process.env.BOARD", "BOARD"),
        "version": query_value(repl, "process.version", "VERSION"),
        "git_commit": query_value(repl, "process.env.GIT_COMMIT", "GIT_COMMIT"),
    }
    for field in ("board", "version", "git_commit"):
        if observed[field] != expected[field]:
            raise ValueError(
                f"{position['position_id']}: {field} mismatch: "
                f"expected {expected[field]}, observed {observed[field]}"
            )
    return observed


def collect_until(
    repl: serial.Serial,
    initial: str,
    markers: tuple[str, ...],
    timeout: float,
) -> str:
    output = initial
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if has_output_marker(output, markers):
            return output + read_available(repl, 0.25)
        waiting = repl.in_waiting
        if waiting:
            output += repl.read(waiting).decode("utf-8", "replace")
        else:
            time.sleep(0.02)
    return output


def marker_payload(output: str, marker: str) -> dict | None:
    prefix = marker + "="
    payload = None
    for line in output.splitlines():
        stripped = clean_repl_line(line)
        position = stripped.find(prefix)
        if position >= 0:
            try:
                payload = json.loads(stripped[position + len(prefix) :])
            except json.JSONDecodeError:
                continue
    return payload


def upload_role(
    repl: serial.Serial,
    role_path: Path,
    role_config: dict,
    markers: tuple[str, ...],
    timeout: float,
) -> str:
    # Keep echo enabled for reliable paced multiline uploads. collect_until()
    # only accepts markers at the start of normalized output lines, so marker
    # text echoed inside source code cannot complete a phase early.
    send_and_capture(repl, "echo(true);\n", settle=0.15)
    send_and_capture(
        repl,
        "global.WIFI_TEST_CONFIG=" + json.dumps(role_config) + ";\n",
        settle=0.2,
    )
    initial = send_script_paced(repl, role_path.read_text())
    return collect_until(repl, initial, markers, timeout)


def runtime_cleanup(repl: serial.Serial, label: str) -> tuple[str, str]:
    send_and_capture(repl, "\x03", settle=0.15)
    send_and_capture(repl, "echo(true);\n", settle=0.15)
    cleanup = (
        '(function(){var w=require("Wifi");'
        'if(global.WIFI_PEER_SERVER){try{global.WIFI_PEER_SERVER.close();}'
        'catch(e){}delete global.WIFI_PEER_SERVER;}'
        'if(global.WIFI_TARGET_SOCKET){try{global.WIFI_TARGET_SOCKET.close();}'
        'catch(e){}delete global.WIFI_TARGET_SOCKET;}'
        "clearInterval();clearWatch();"
        "w.removeAllListeners();w.disconnect();w.stopAP();"
        'setTimeout(function(){print("'
        + label
        + '_CLEAN=1")},500)})();\n'
    )
    initial = send_and_capture(repl, cleanup, settle=0.2)
    output = collect_until(repl, initial, (label + "_CLEAN=1",), 4.0)
    status = query_value(repl, 'require("Wifi").getStatus()', label + "_STATUS")
    return output, status


def runtime_is_inactive(status: str, ip: str) -> bool:
    lowered = status.lower()
    return (
        "'ip': '0.0.0.0'" in ip
        and "'mode': 'ap'" not in lowered
        and "'mode': 'sta+ap'" not in lowered
    )


def hardware_reboot(repl: serial.Serial) -> None:
    send_and_capture(repl, "ESP32.reboot();\n", settle=0.2)
    time.sleep(2.0)
    sync_repl(repl)


def final_runtime_cleanup(
    repl: serial.Serial,
    label: str,
) -> tuple[str, str, bool]:
    _, status = runtime_cleanup(repl, label + "_POST")
    ip = query_value(repl, 'require("Wifi").getIP()', label + "_POST_IP")
    recovered = False
    if not runtime_is_inactive(status, ip):
        # The legacy ESP32 build can acknowledge disconnect while retaining a
        # stale connected/IP snapshot. A chip reboot clears the Wi-Fi driver;
        # the subsequent cleanup disables its boot-time AP again.
        recovered = True
        hardware_reboot(repl)
        _, status = runtime_cleanup(repl, label + "_RESET")
        ip = query_value(repl, 'require("Wifi").getIP()', label + "_RESET_IP")
    return status, ip, recovered


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("tests/WIFI_BLE/standalone_bench_config.json"),
    )
    parser.add_argument(
        "--peer-script",
        type=Path,
        default=Path("tests/WIFI_BLE/wifi/wifi_supervisor_peer.js"),
    )
    parser.add_argument(
        "--target-script",
        type=Path,
        default=None,
    )
    parser.add_argument(
        "--scenario",
        choices=("positive", "negative"),
        default="positive",
    )
    parser.add_argument(
        "--direction",
        choices=tuple(DIRECTION_POSITIONS),
        default="c3-peer",
    )
    args = parser.parse_args()

    if args.target_script is None:
        if args.scenario == "positive":
            args.target_script = Path(
                "tests/WIFI_BLE/wifi/wifi_station_peer_exchange.js"
            )
        else:
            args.target_script = Path(
                "tests/WIFI_BLE/wifi/wifi_station_negative_cases.js"
            )

    config = load_config(args.config)
    peer_position_id, target_position_id = DIRECTION_POSITIONS[args.direction]
    peer_position = get_position(config, peer_position_id)
    target_position = get_position(config, target_position_id)
    peer_path, peer_baud = control_connection(peer_position)
    target_path, target_baud = control_connection(target_position)

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    role_config = {
        "runId": run_id,
        "ssid": "ESPRUINO_V2_" + run_id[-7:-1],
        "password": "V2Peer_" + run_id[-7:-1],
        "channel": 6,
        "udpPort": 41234,
    }
    if args.direction in ("esp32-peer", "c3-idf5-peer") and args.scenario == "positive":
        role_config["pingClientOnReceive"] = True
        role_config["holdAfterExchangeMs"] = 4000

    print(f"RUNNER test=wifi_station_peer_{args.scenario}")
    print(f"RUNNER config={args.config}")
    print(f"RUNNER run_id={run_id}")
    print(f"RUNNER direction={args.direction}")
    print(f"RUNNER peer_position={peer_position_id}")
    print(f"RUNNER peer_path={peer_path}")
    print(f"RUNNER target_position={target_position_id}")
    print(f"RUNNER target_path={target_path}")

    peer_output = ""
    target_output = ""
    peer_stop_output = ""
    cleanup_ok = True
    result = 2

    try:
        with serial.Serial(peer_path, peer_baud, timeout=0.1) as peer_repl, \
             serial.Serial(target_path, target_baud, timeout=0.1) as target_repl:
            sync_repl(peer_repl)
            sync_repl(target_repl)
            peer_identity = verify_identity(peer_repl, peer_position)
            target_identity = verify_identity(target_repl, target_position)
            print("RUNNER peer_identity=" + json.dumps(peer_identity, sort_keys=True))
            print("RUNNER target_identity=" + json.dumps(target_identity, sort_keys=True))

            hardware_reboot(peer_repl)
            hardware_reboot(target_repl)
            runtime_cleanup(peer_repl, "PEER_PRE")
            runtime_cleanup(target_repl, "TARGET_PRE")

            peer_output = upload_role(
                peer_repl,
                args.peer_script,
                role_config,
                ("PEER_READY=", "PEER_ERROR="),
                10.0,
            )
            peer_ready = marker_payload(peer_output, "PEER_READY")
            if not peer_ready:
                print("Peer did not report PEER_READY.", file=sys.stderr)
                print("RUNNER peer_startup_diagnostic_begin")
                print(peer_output.rstrip())
                print("RUNNER peer_startup_diagnostic_end")
                result = 2
            else:
                peer_ip = peer_ready["apIP"]["ip"]
                target_config = dict(role_config)
                target_config["peerIP"] = peer_ip
                if args.scenario == "negative":
                    target_config["wrongPassword"] = (
                        "Wrong_" + run_id[-7:-1]
                    )
                    target_config["absentSSID"] = (
                        "ESPRUINO_ABSENT_" + run_id[-7:-1]
                    )
                print(f"RUNNER peer_ip={peer_ip}")

                if args.scenario == "positive":
                    target_output = upload_role(
                        target_repl,
                        args.target_script,
                        target_config,
                        ("DONE=PASS", "DONE=FAIL"),
                        30.0,
                    )
                    expected_target_passes = 1
                else:
                    expected_target_passes = 2
                    case_outputs = []
                    for case_name in ("wrong_password", "unavailable_ssid"):
                        hardware_reboot(target_repl)
                        runtime_cleanup(
                            target_repl,
                            "TARGET_" + case_name.upper() + "_PRE",
                        )
                        case_config = dict(target_config)
                        case_config["caseName"] = case_name
                        print(f"RUNNER negative_case={case_name}")
                        case_output = upload_role(
                            target_repl,
                            args.target_script,
                            case_config,
                            ("DONE=PASS", "DONE=FAIL"),
                            30.0,
                        )
                        if not has_output_marker(
                            case_output,
                            ("DONE=PASS", "DONE=FAIL"),
                        ):
                            print(
                                "RUNNER negative_case_diagnostic_begin="
                                + case_name
                            )
                            print(case_output.rstrip())
                            print(
                                "RUNNER negative_case_diagnostic_end="
                                + case_name
                            )
                        case_outputs.append(case_output)
                    target_output = "\n".join(case_outputs)
                if not has_output_marker(
                    target_output,
                    ("DONE=PASS", "DONE=FAIL"),
                ):
                    print("RUNNER target_startup_diagnostic_begin")
                    print(target_output.rstrip())
                    print("RUNNER target_startup_diagnostic_end")
                peer_output += read_available(peer_repl, 0.5)

                initial_stop = send_and_capture(
                    peer_repl,
                    "wifiPeerStop();\n",
                    settle=0.2,
                )
                peer_stop_output = collect_until(
                    peer_repl,
                    initial_stop,
                    ("PEER_DONE=",),
                    6.0,
                )

                target_pass = (
                    count_output_marker(target_output, "DONE=PASS")
                    == expected_target_passes
                    and count_output_marker(target_output, "DONE=FAIL") == 0
                )
                peer_summary = marker_payload(
                    peer_output + peer_stop_output,
                    "PEER_SUMMARY",
                )
                peer_received_any = bool(
                    peer_summary and peer_summary.get("received")
                )
                peer_received = bool(
                    peer_received_any
                    and peer_summary["received"][0]["data"].startswith(run_id + "|")
                )
                peer_joined = bool(
                    peer_summary
                    and any(
                        event.get("name") == "sta_joined"
                        for event in peer_summary.get("events", [])
                    )
                )
                peer_left = bool(
                    peer_summary
                    and any(
                        event.get("name") == "sta_left"
                        for event in peer_summary.get("events", [])
                    )
                )
                peer_ping_succeeded = bool(
                    peer_summary
                    and peer_summary.get("pingResult")
                    and peer_summary["pingResult"].get("bytes", 0) > 0
                )
                peer_done = marker_payload(peer_stop_output, "PEER_DONE") is not None

                if args.scenario == "positive":
                    print(
                        "PASS wifi_peer_received_challenge"
                        if peer_received
                        else "FAIL wifi_peer_received_challenge"
                    )
                    print(
                        "PASS wifi_peer_observed_station_join"
                        if peer_joined
                        else "FAIL wifi_peer_observed_station_join"
                    )
                    print(
                        "PASS wifi_peer_observed_station_leave"
                        if peer_left
                        else "FAIL wifi_peer_observed_station_leave"
                    )
                    if role_config.get("pingClientOnReceive"):
                        print(
                            "PASS wifi_peer_pinged_target"
                            if peer_ping_succeeded
                            else "FAIL wifi_peer_pinged_target"
                        )
                    peer_evidence_ok = (
                        peer_received
                        and peer_joined
                        and peer_left
                        and (
                            not role_config.get("pingClientOnReceive")
                            or peer_ping_succeeded
                        )
                    )
                else:
                    print(
                        "PASS wifi_peer_received_no_negative_traffic"
                        if not peer_received_any
                        else "FAIL wifi_peer_received_no_negative_traffic"
                    )
                    print(
                        "PASS wifi_peer_observed_no_station_join"
                        if not peer_joined
                        else "FAIL wifi_peer_observed_no_station_join"
                    )
                    peer_evidence_ok = not peer_received_any and not peer_joined
                print(
                    "PASS wifi_peer_cleanup"
                    if peer_done
                    else "FAIL wifi_peer_cleanup"
                )
                result = 0 if all(
                    (
                        target_pass,
                        peer_evidence_ok,
                        peer_done,
                    )
                ) else 1

            peer_status, peer_ip, peer_recovered = final_runtime_cleanup(
                peer_repl,
                "PEER",
            )
            target_status, target_ip, target_recovered = final_runtime_cleanup(
                target_repl,
                "TARGET",
            )
            print(f"RUNNER peer_final_status={peer_status}")
            print(f"RUNNER target_final_status={target_status}")
            print(f"RUNNER peer_cleanup_runtime_reset={peer_recovered}")
            print(f"RUNNER target_cleanup_runtime_reset={target_recovered}")
            cleanup_ok = runtime_is_inactive(
                peer_status,
                peer_ip,
            ) and runtime_is_inactive(target_status, target_ip)
            print(f"RUNNER peer_final_ip={peer_ip}")
            print(f"RUNNER target_final_ip={target_ip}")
            if not cleanup_ok:
                print("FAIL wifi_runtime_cleanup status_not_off")
                result = 1
            else:
                print("PASS wifi_runtime_cleanup")

    except (OSError, ValueError, serial.SerialException) as exc:
        print(f"Runner error: {exc}", file=sys.stderr)
        result = 2

    print("RUNNER target_output_begin")
    normalized_target_output = "\n".join(
        clean_repl_line(line) for line in target_output.splitlines()
    )
    for line in filter_structured_lines(normalized_target_output):
        print(line)
    print("RUNNER target_output_end")
    print("RUNNER peer_output_begin")
    for line in (peer_output + peer_stop_output).splitlines():
        stripped = clean_repl_line(line)
        if stripped.startswith("PEER_"):
            print(stripped)
    print("RUNNER peer_output_end")
    print("RUNNER_RESULT=" + ("PASS" if result == 0 else "FAIL"))
    return result


if __name__ == "__main__":
    raise SystemExit(main())
