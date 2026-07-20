#!/usr/bin/env python3
"""Verify fixed USB paths and target identities from a bench configuration."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import serial

from run_test import query_value, sync_repl


CAPABILITY_EXPRESSIONS = {
    "wifi": (
        '(function(){try{return typeof require("Wifi").connect}'
        'catch(e){return "error:"+e}})()'
    ),
    "ble": 'typeof NRF==="undefined"?"undefined":typeof NRF.setAdvertising',
}


class ConfigError(ValueError):
    """Raised when the bench configuration is malformed."""


def load_config(path: Path) -> dict:
    try:
        config = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        raise ConfigError(f"cannot read configuration: {exc}") from exc

    if config.get("schema_version") != 1:
        raise ConfigError("schema_version must be 1")
    if config.get("operating_mode") != "STANDALONE":
        raise ConfigError("this verifier currently requires STANDALONE mode")
    if not isinstance(config.get("positions"), list) or not config["positions"]:
        raise ConfigError("positions must be a non-empty list")
    return config


def validate_position(position: dict) -> tuple[str, str, dict, dict]:
    position_id = position.get("position_id")
    control_role = position.get("control_role")
    usb_roles = position.get("usb_roles")
    expected = position.get("expected_firmware")

    if not isinstance(position_id, str) or not position_id:
        raise ConfigError("every position requires a non-empty position_id")
    if not isinstance(usb_roles, dict) or not usb_roles:
        raise ConfigError(f"{position_id}: usb_roles must be a non-empty object")
    if control_role not in usb_roles:
        raise ConfigError(
            f"{position_id}: control_role {control_role!r} is not present in usb_roles"
        )
    if not isinstance(expected, dict):
        raise ConfigError(f"{position_id}: expected_firmware must be an object")
    for field in ("board", "version", "git_commit"):
        if not isinstance(expected.get(field), str) or not expected[field]:
            raise ConfigError(f"{position_id}: expected_firmware.{field} is required")

    role = usb_roles[control_role]
    if not isinstance(role, dict):
        raise ConfigError(f"{position_id}: control USB role must be an object")
    usb_path = role.get("path")
    if not isinstance(usb_path, str) or not usb_path.startswith(
        "/dev/serial/by-path/"
    ):
        raise ConfigError(
            f"{position_id}: control path must use /dev/serial/by-path/"
        )
    baud = role.get("baud", 115200)
    if not isinstance(baud, int) or baud <= 0:
        raise ConfigError(f"{position_id}: baud must be a positive integer")

    capabilities = position.get("required_capabilities", [])
    if not isinstance(capabilities, list):
        raise ConfigError(f"{position_id}: required_capabilities must be a list")
    unknown = sorted(set(capabilities) - set(CAPABILITY_EXPRESSIONS))
    if unknown:
        raise ConfigError(
            f"{position_id}: unknown required capabilities: {', '.join(unknown)}"
        )

    return position_id, control_role, role, expected


def resolve_configured_paths(config: dict) -> dict[str, Path]:
    resolved: dict[str, Path] = {}
    seen_position_ids: set[str] = set()

    for position in config["positions"]:
        position_id, _, role, _ = validate_position(position)
        if position_id in seen_position_ids:
            raise ConfigError(f"duplicate position_id: {position_id}")
        seen_position_ids.add(position_id)

        path = Path(role["path"])
        try:
            device = path.resolve(strict=True)
        except OSError:
            continue
        key = str(device)
        if key in resolved:
            raise ConfigError(
                f"duplicate device: {path} and {resolved[key]} both resolve to {device}"
            )
        resolved[key] = path

    return resolved


def collect_observed(path: str, baud: int, capabilities: list[str]) -> dict[str, str]:
    with serial.Serial(path, baud, timeout=0.1) as repl:
        sync_repl(repl)
        observed = {
            "board": query_value(repl, "process.env.BOARD", "BOARD"),
            "version": query_value(repl, "process.version", "VERSION"),
            "git_commit": query_value(
                repl, "process.env.GIT_COMMIT", "GIT_COMMIT"
            ),
        }
        for capability in capabilities:
            observed[f"capability_{capability}"] = query_value(
                repl,
                CAPABILITY_EXPRESSIONS[capability],
                f"CAP_{capability.upper()}",
            )
        return observed


def verify_position(position: dict) -> bool:
    position_id, control_role, role, expected = validate_position(position)
    path = Path(role["path"])
    capabilities = position.get("required_capabilities", [])

    print(f"POSITION={position_id}")
    print(f"USB_ROLE={control_role}")
    print(f"USB_PATH={path}")

    try:
        device = path.resolve(strict=True)
    except OSError:
        print(f"FAIL {position_id}_usb_path_missing path={path}")
        return False

    print(f"RESOLVED_DEVICE={device}")
    try:
        observed = collect_observed(str(path), role.get("baud", 115200), capabilities)
    except (OSError, serial.SerialException) as exc:
        print(f"FAIL {position_id}_repl_unavailable error={exc}")
        return False

    print(
        "OBSERVED "
        f"board={observed['board']} "
        f"version={observed['version']} "
        f"git_commit={observed['git_commit']}"
    )

    passed = True
    for field in ("board", "version", "git_commit"):
        check_name = f"{position_id}_firmware_{field}"
        if observed[field] == expected[field]:
            print(f"PASS {check_name} value={observed[field]}")
        else:
            print(
                f"FAIL {check_name} "
                f"expected={expected[field]} observed={observed[field]}"
            )
            passed = False

    for capability in capabilities:
        value = observed[f"capability_{capability}"]
        check_name = f"{position_id}_capability_{capability}"
        if value == "function":
            print(f"PASS {check_name} value={value}")
        else:
            print(f"FAIL {check_name} expected=function observed={value}")
            passed = False

    return passed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("config", type=Path, help="Path to bench configuration JSON")
    args = parser.parse_args()

    try:
        config = load_config(args.config)
        resolve_configured_paths(config)
    except ConfigError as exc:
        print(f"CONFIGURATION_ERROR={exc}", file=sys.stderr)
        return 2

    print(f"BENCH_CONFIG={args.config}")
    print(f"BENCH_ID={config.get('bench_id', 'UNKNOWN')}")
    print(f"OPERATING_MODE={config['operating_mode']}")
    print(f"POWER_SOURCE={config.get('power_configuration', {}).get('target_supply', 'UNKNOWN')}")

    results = [verify_position(position) for position in config["positions"]]
    if all(results):
        print("DONE=PASS")
        return 0

    print("DONE=CONFIGURATION_FAILURE")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
