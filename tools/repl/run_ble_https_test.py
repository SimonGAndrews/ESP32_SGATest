#!/usr/bin/env python3
"""Run HTTPS on the classic ESP32 while a C3 GATT connection stays active."""

from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import http.server
import json
from pathlib import Path
import ssl
import stat
import subprocess
import sys
import tempfile
import threading
import time

import serial

from run_ble_peer_test import ble_runtime_cleanup, print_role_output
from run_test import read_available, send_and_capture, send_script_paced, sync_repl
from run_wifi_peer_test import (
    collect_until,
    control_connection,
    count_output_marker,
    get_position,
    marker_payload,
    runtime_cleanup,
    upload_role,
    verify_identity,
)
from verify_bench_config import load_config


CONFIG_PATH = Path("tests/WIFI_BLE/esp32_idf5_ping_70k_bench_config.json")
CREDENTIALS_PATH = Path("tests/WIFI_BLE/local_wifi_credentials.json")
PEER_SCRIPT = Path("tests/WIFI_BLE/ble_wifi/ble_gatt_hold_client.js")
TARGET_SCRIPT = Path(
    "tests/WIFI_BLE/ble_wifi/ble_https_peripheral_target.js"
)


def make_https_handler(expected_path: str, body: bytes, observed: dict):
    class ControlledHTTPSHandler(http.server.BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802 - stdlib callback name
            observed["requests"] = observed.get("requests", 0) + 1
            observed["path"] = self.path
            observed["client"] = self.client_address[0]
            if self.path != expected_path:
                self.send_response(404)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)
            observed["served"] = True

        def log_message(self, format: str, *args) -> None:
            return

    return ControlledHTTPSHandler


@contextmanager
def controlled_https_endpoint(address: str, port: int, run_id: str):
    expected_path = "/ble-https/" + run_id
    body = (("SGA_BLE_HTTPS " + run_id + "\n") * 24).encode("ascii")
    observed: dict[str, object] = {
        "requests": 0,
        "path": None,
        "client": None,
        "served": False,
    }
    handler = make_https_handler(expected_path, body, observed)

    with tempfile.TemporaryDirectory(prefix="sga-ble-https-") as temp_dir:
        temp_path = Path(temp_dir)
        cert_path = temp_path / "certificate.pem"
        key_path = temp_path / "key.pem"
        subprocess.run(
            [
                "openssl",
                "req",
                "-x509",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-keyout",
                str(key_path),
                "-out",
                str(cert_path),
                "-days",
                "1",
                "-subj",
                "/CN=ESP32-SGA-Bench",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        server = http.server.ThreadingHTTPServer((address, port), handler)
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.maximum_version = ssl.TLSVersion.TLSv1_2
        context.load_cert_chain(cert_path, key_path)
        server.socket = context.wrap_socket(server.socket, server_side=True)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        selected_port = server.server_address[1]
        url = f"https://{address}:{selected_port}{expected_path}"
        try:
            yield url, len(body), observed
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2.0)


@contextmanager
def external_https_endpoint(url: str):
    yield url, None, None


def load_credentials(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise ValueError(
            f"credentials file not found: {path}; create it from "
            "tests/WIFI_BLE/local_wifi_credentials.example.json"
        )
    credentials = json.loads(path.read_text())
    for key in ("ssid", "password"):
        if not isinstance(credentials.get(key), str) or not credentials[key]:
            raise ValueError(f"credentials file requires a non-empty {key!r}")
    if credentials["ssid"] == "YOUR_2_4_GHZ_WIFI_NAME" or credentials[
        "password"
    ] == "YOUR_WIFI_PASSWORD":
        raise ValueError(
            "credentials file still contains example placeholder values"
        )
    return credentials


def warn_if_credentials_readable(path: Path) -> None:
    mode = path.stat().st_mode
    if mode & (stat.S_IRGRP | stat.S_IROTH):
        print(
            "RUNNER warning=credentials_file_is_group_or_world_readable",
            file=sys.stderr,
        )


def upload_secret_role(
    repl: serial.Serial,
    role_path: Path,
    role_config: dict,
    markers: tuple[str, ...],
    timeout: float,
) -> str:
    # Disable echo before injecting credentials so neither SSID nor password
    # appears in the captured serial transcript.
    send_and_capture(repl, "echo(false);\n", settle=0.15)
    send_and_capture(
        repl,
        "global.WIFI_TEST_CONFIG=" + json.dumps(role_config) + ";\n",
        settle=0.2,
    )
    send_and_capture(repl, "echo(true);\n", settle=0.15)
    initial = send_script_paced(repl, role_path.read_text())
    return collect_until(repl, initial, markers, timeout)


def reboot_pair(peer_repl: serial.Serial, target_repl: serial.Serial) -> None:
    """Reboot both independent boards with one shared startup wait."""
    send_and_capture(peer_repl, "ESP32.reboot();\n", settle=0.2)
    send_and_capture(target_repl, "ESP32.reboot();\n", settle=0.2)
    time.sleep(2.0)
    sync_repl(peer_repl)
    sync_repl(target_repl)


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True)
        sys.stderr.reconfigure(line_buffering=True)
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=CONFIG_PATH)
    parser.add_argument("--credentials", type=Path, default=CREDENTIALS_PATH)
    parser.add_argument("--peer-path", help="override the C3 peer serial path")
    parser.add_argument("--target-path", help="override the classic target serial path")
    endpoint = parser.add_mutually_exclusive_group(required=True)
    endpoint.add_argument(
        "--local-server-address",
        help="bench-PC IPv4 address reachable through the isolated router",
    )
    endpoint.add_argument("--https-url", help="externally managed HTTPS endpoint")
    parser.add_argument("--local-server-port", type=int, default=0)
    parser.add_argument("--expected-status", type=int, default=200)
    parser.add_argument("--minimum-bytes", type=int, default=100)
    parser.add_argument("--timeout", type=float, default=70.0)
    args = parser.parse_args()

    config = load_config(args.config)
    credentials = load_credentials(args.credentials)
    warn_if_credentials_readable(args.credentials)

    peer_position = get_position(config, "esp32_c3_v1")
    target_position = get_position(config, "esp32_v1")
    configured_peer_path, peer_baud = control_connection(peer_position)
    configured_target_path, target_baud = control_connection(target_position)
    peer_path = args.peer_path or configured_peer_path
    target_path = args.target_path or configured_target_path

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    suffix = run_id[9:15]
    public_config = {
        "runId": run_id,
        "name": "SGA-GATT-" + suffix,
        "challenge": "Q" + suffix,
        "ack": "A" + suffix,
        "complete": "D" + suffix,
    }
    print("RUNNER test=ble_https_concurrent")
    print(f"RUNNER config={args.config}")
    print(f"RUNNER run_id={run_id}")
    print("RUNNER peer_position=esp32_c3_v1")
    print("RUNNER peer_radio_role=gatt_central")
    print(f"RUNNER peer_path={peer_path}")
    print("RUNNER target_position=esp32_v1")
    print("RUNNER target_roles=gatt_peripheral,wifi_station,https_client")
    print(f"RUNNER target_path={target_path}")
    print("RUNNER credentials=loaded_without_logging")

    peer_output = ""
    target_output = ""
    peer_stop_output = ""
    result = 2

    endpoint_manager = (
        controlled_https_endpoint(
            args.local_server_address,
            args.local_server_port,
            run_id,
        )
        if args.local_server_address
        else external_https_endpoint(args.https_url)
    )

    try:
        with endpoint_manager as (https_url, local_body_length, endpoint_observed):
            expected_status = 200 if local_body_length is not None else args.expected_status
            minimum_bytes = (
                local_body_length
                if local_body_length is not None
                else args.minimum_bytes
            )
            target_config = {
                **public_config,
                "ssid": credentials["ssid"],
                "password": credentials["password"],
                "httpsURL": https_url,
                "expectedStatus": expected_status,
                "minimumBytes": minimum_bytes,
                "wifiTimeoutMs": 20000,
                "httpsTimeoutMs": 25000,
                "overallTimeoutMs": 60000,
            }
            print(f"RUNNER https_url={https_url}")
            result = run_test(
                peer_path,
                peer_baud,
                peer_position,
                target_path,
                target_baud,
                target_position,
                public_config,
                target_config,
                run_id,
                args.timeout,
                peer_output,
                target_output,
                peer_stop_output,
            )
            peer_output, target_output, peer_stop_output, result = result
            if endpoint_observed is not None:
                endpoint_pass = bool(
                    endpoint_observed.get("served")
                    and endpoint_observed.get("requests") == 1
                )
                print(
                    "PASS host_https_endpoint_served_target"
                    if endpoint_pass
                    else "FAIL host_https_endpoint_served_target"
                )
                print(
                    "RUNNER https_endpoint_observed="
                    + json.dumps(endpoint_observed, sort_keys=True)
                )
                if not endpoint_pass:
                    result = 1

    except (OSError, ValueError, serial.SerialException, subprocess.SubprocessError) as exc:
        print(f"Runner error: {exc}", file=sys.stderr)
        result = 2

    print_role_output("target", target_output)
    print_role_output("peer", peer_output + peer_stop_output)
    print("RUNNER_RESULT=" + ("PASS" if result == 0 else "FAIL"))
    return result


def run_test(
    peer_path: str,
    peer_baud: int,
    peer_position: dict,
    target_path: str,
    target_baud: int,
    target_position: dict,
    public_config: dict,
    target_config: dict,
    run_id: str,
    timeout: float,
    peer_output: str,
    target_output: str,
    peer_stop_output: str,
) -> tuple[str, str, str, int]:
    result = 2
    started = time.monotonic()

    def phase(name: str) -> None:
        print(f"RUNNER phase={name} elapsed_s={time.monotonic() - started:.2f}")

    try:
        with serial.Serial(peer_path, peer_baud, timeout=0.1) as peer_repl, \
             serial.Serial(target_path, target_baud, timeout=0.1) as target_repl:
            phase("serial_open")
            sync_repl(peer_repl)
            sync_repl(target_repl)
            peer_identity = verify_identity(peer_repl, peer_position)
            target_identity = verify_identity(target_repl, target_position)
            print("RUNNER peer_identity=" + json.dumps(peer_identity, sort_keys=True))
            print(
                "RUNNER target_identity="
                + json.dumps(target_identity, sort_keys=True)
            )
            phase("identity_verified")

            reboot_pair(peer_repl, target_repl)
            phase("both_rebooted")

            target_output = upload_secret_role(
                target_repl,
                TARGET_SCRIPT,
                target_config,
                ("BLE_HTTPS_TARGET_READY=",),
                12.0,
            )
            phase("classic_gatt_ready")
            target_ready = marker_payload(target_output, "BLE_HTTPS_TARGET_READY")
            if not target_ready:
                print("Classic GATT target did not report ready.", file=sys.stderr)
                result = 2
            else:
                peer_output = upload_role(
                    peer_repl,
                    PEER_SCRIPT,
                    public_config,
                    ("BLE_GATT_CLIENT_HOLD_READY=", "DONE=FAIL"),
                    18.0,
                )
                phase("c3_gatt_connected")
                peer_ready = marker_payload(
                    peer_output,
                    "BLE_GATT_CLIENT_HOLD_READY",
                )
                target_output += read_available(target_repl, 0.4)
                target_output = collect_until(
                    target_repl,
                    target_output,
                    ("BLE_HTTPS_PHASE_DONE=",),
                    timeout,
                )
                phase("https_phase_complete")
                https_phase = marker_payload(
                    target_output,
                    "BLE_HTTPS_PHASE_DONE",
                )
                initial_complete = send_and_capture(
                    peer_repl,
                    "bleGattClientComplete();\n",
                    settle=0.2,
                )
                peer_output += collect_until(
                    peer_repl,
                    initial_complete,
                    ("DONE=PASS", "DONE=FAIL"),
                    6.0,
                )
                phase("post_https_gatt_complete")
                target_output += collect_until(
                    target_repl,
                    "",
                    ("DONE=PASS", "DONE=FAIL"),
                    6.0,
                )

                target_summary = marker_payload(
                    target_output,
                    "BLE_HTTPS_TARGET_SUMMARY",
                )
                peer_summary = marker_payload(
                    peer_output,
                    "BLE_GATT_HOLD_CLIENT_SUMMARY",
                )
                target_pass = (
                    count_output_marker(target_output, "DONE=PASS") == 1
                    and count_output_marker(target_output, "DONE=FAIL") == 0
                    and target_summary
                    and target_summary.get("runId") == run_id
                    and target_summary.get("checksFailed") == 0
                    and target_summary.get("httpsComplete") is True
                    and target_summary.get("ackReceived") == public_config["ack"]
                    and target_summary.get("completeReceived")
                    == public_config["complete"]
                    and https_phase
                    and https_phase.get("success") is True
                )
                peer_pass = (
                    count_output_marker(peer_output, "DONE=PASS") == 1
                    and count_output_marker(peer_output, "DONE=FAIL") == 0
                    and peer_summary
                    and peer_summary.get("runId") == run_id
                    and peer_summary.get("checksFailed") == 0
                    and peer_ready
                )
                print(
                    "RUNNER target_correlation="
                    + json.dumps(
                        {
                            "donePassCount": count_output_marker(
                                target_output, "DONE=PASS"
                            ),
                            "doneFailCount": count_output_marker(
                                target_output, "DONE=FAIL"
                            ),
                            "summaryPresent": bool(target_summary),
                            "runIdMatches": bool(
                                target_summary
                                and target_summary.get("runId") == run_id
                            ),
                            "checksFailed": (
                                target_summary.get("checksFailed")
                                if target_summary
                                else None
                            ),
                        },
                        sort_keys=True,
                    )
                )
                print(
                    "RUNNER peer_correlation="
                    + json.dumps(
                        {
                            "donePassCount": count_output_marker(
                                peer_output, "DONE=PASS"
                            ),
                            "doneFailCount": count_output_marker(
                                peer_output, "DONE=FAIL"
                            ),
                            "readyPresent": bool(peer_ready),
                            "summaryPresent": bool(peer_summary),
                            "runIdMatches": bool(
                                peer_summary
                                and peer_summary.get("runId") == run_id
                            ),
                            "checksFailed": (
                                peer_summary.get("checksFailed")
                                if peer_summary
                                else None
                            ),
                        },
                        sort_keys=True,
                    )
                )
                print(
                    "PASS host_correlated_ble_https_target"
                    if target_pass
                    else "FAIL host_correlated_ble_https_target"
                )
                print(
                    "PASS host_correlated_gatt_central_before_and_after_https"
                    if peer_pass
                    else "FAIL host_correlated_gatt_central_before_and_after_https"
                )
                result = 0 if target_pass and peer_pass else 1

            ble_runtime_cleanup(peer_repl, "BLE_HTTPS_PEER_POST")
            ble_runtime_cleanup(target_repl, "BLE_HTTPS_TARGET_BLE_POST")
            runtime_cleanup(target_repl, "BLE_HTTPS_TARGET_WIFI_POST")
            phase("cleanup_complete")

    except (OSError, ValueError, serial.SerialException) as exc:
        print(f"Runner error: {exc}", file=sys.stderr)
        result = 2
    return peer_output, target_output, peer_stop_output, result


if __name__ == "__main__":
    raise SystemExit(main())
