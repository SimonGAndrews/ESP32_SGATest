# USB Path Identity Baseline

Date: 20 July 2026

## Conclusion

The standalone V1 Wi-Fi/BLE bench passed the positive configuration check.
Each fixed `/dev/serial/by-path/` connection resolved to one unique serial
device and returned the board, firmware and wireless capabilities assigned to
that physical bench position.

This proves the positive half of the V2 Section 5.5 host-identity principle.
The physical-port swap also produced the expected configuration failure,
providing the corresponding negative test.

## Preconditions

- both harnesses in `STANDALONE` mode
- targets powered only through fully connected USB cables with VBUS present
- no external target power
- no Harness Supervisor or controlled target-power service
- no other REPL or serial tool attached
- configuration: `tests/WIFI_BLE/standalone_bench_config.json`

## Command

```bash
python3 tools/repl/verify_bench_config.py \
  tests/WIFI_BLE/standalone_bench_config.json
```

## Observed Identity

| Position | Configured physical path suffix | Resolved device | Board | Version | Git commit | Wi-Fi | BLE |
|---|---|---|---|---|---|---|---|
| `esp32_v1` | `usb-0:10.3:1.0-port0` | `/dev/ttyUSB0` | `ESP32` | `2v29.97` | `d3d33f4aa` | function | function |
| `esp32_c3_v1` | `usb-0:10.4:1.0-port0` | `/dev/ttyUSB1` | `ESP32C3_IDF4` | `2v29.107` | `0af6e1568` | function | function |

Final verifier result:

```text
DONE=PASS
```

## Swapped-Port Negative Test

The two target USB connectors were exchanged between the configured physical
host or hub ports without changing the configuration file. Both by-path
entries reappeared and continued to resolve to unique serial devices.

| Configured position | Physical path suffix | Expected board | Observed board | Observed version | Observed commit | Result |
|---|---|---|---|---|---|---|
| `esp32_v1` | `usb-0:10.3:1.0-port0` | `ESP32` | `ESP32C3_IDF4` | `2v29.107` | `0af6e1568` | rejected |
| `esp32_c3_v1` | `usb-0:10.4:1.0-port0` | `ESP32C3_IDF4` | `ESP32` | `2v29.97` | `d3d33f4aa` | rejected |

For both positions, the board, version and Git-commit checks failed. The Wi-Fi
and BLE capability checks still passed, demonstrating that generic capability
presence is not sufficient to establish the configured target identity.

The verifier exited with status 1 and reported:

```text
DONE=CONFIGURATION_FAILURE
```

This is the expected successful negative-test result. The runner did not guess
the target from another available serial port and did not accept a
wireless-capable but mismatched target at either configured position.

## Restored-Port Confirmation

The connectors were returned to their original physical host or hub ports and
the unchanged configuration was verified again.

| Configured position | Physical path suffix | Restored board | Version | Git commit | Result |
|---|---|---|---|---|---|
| `esp32_v1` | `usb-0:10.3:1.0-port0` | `ESP32` | `2v29.97` | `d3d33f4aa` | pass |
| `esp32_c3_v1` | `usb-0:10.4:1.0-port0` | `ESP32C3_IDF4` | `2v29.107` | `0af6e1568` | pass |

The verifier exited with status 0 and reported:

```text
DONE=PASS
```

The complete result is therefore positive, negative, positive:

1. the configured physical positions and target identities passed
2. swapping only the physical USB positions was rejected
3. restoring only the physical USB positions returned the bench to pass

This demonstrates that the configuration binds expected target and firmware
identity to a fixed host USB path, detects an exchanged target, and recovers
without changing the configuration or guessing another available port.

## Scope Boundary

This run does not prove USB No-VBUS operation, Supervisor selection, target or
Test Block supply switching, USB disappearance after controlled power-off, or
the V2 rack recovery sequence.
