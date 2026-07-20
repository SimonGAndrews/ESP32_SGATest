# Wi-Fi Target-Hosted AP And Custom IP

Date: 20 July 2026

## Conclusion

Both the ESP32-C3 IDF4 and classic ESP32 legacy builds successfully hosted a
WPA2 AP on the requested `192.168.47.1/24` subnet. In each direction, the
other harness board acted as the Supervisor station, found the AP, associated,
received `192.168.47.2` by DHCP and completed a run-bound bidirectional UDP
challenge/acknowledgement.

The complete API test reports failure because `Wifi.setAPIP()` called back
with the string `"Failure"` on both builds even though `Wifi.getAPIP()` and the
subsequent network exchange proved that the configuration had been applied.
Reproduction on the mature classic legacy build shows that this is not a
C3-only IDF4 anomaly. It is consistent with an inspected shared ESP32 network
wrapper whose callback-result construction appears inverted; that source
correlation is a firmware-investigation hypothesis, not a firmware patch.

The classic-target direction also repeated the known C3-station-to-classic-AP
`Wifi.ping()` timeout. UDP passed in the same association, so the ICMP result
does not invalidate the target-hosted AP or Supervisor-station mechanism.

## Bench And Firmware Preconditions

- both V1 harnesses in `STANDALONE` mode
- both targets powered only through fully connected USB cables
- no external target power
- no `SUP_EVENT_OUT` / `SUP_EVENT_IN` connection
- no third access point or external network endpoint
- no other REPL, Web IDE or serial monitor attached
- physical USB positions and configured identities unchanged
- configuration: `tests/WIFI_BLE/standalone_bench_config.json`

| Position | Board | Version | Git commit |
|---|---|---|---|
| `esp32_c3_v1` | `ESP32C3_IDF4` | `2v29.107` | `0af6e1568` |
| `esp32_v1` | `ESP32` | `2v29.97` | `d3d33f4aa` |

## Commands And Run Outcomes

### C3 target AP, classic Supervisor station

```bash
python3 tools/repl/run_wifi_target_ap_test.py
```

```text
RUNNER run_id=20260720T175441Z
RUNNER_RESULT=FAIL
```

The C3 target recorded six passing checks and one callback-contract failure.
The classic Supervisor station recorded 12 passing checks and no failures.

| Observation | Result |
|---|---|
| C3 AP address after `setAPIP()` | `192.168.47.1/24`, gateway `192.168.47.1` |
| `setAPIP()` callback | `"Failure"` — API-contract failure |
| classic scan | WPA2 AP, channel 6, RSSI `-24 dBm` |
| classic DHCP address | `192.168.47.2`, gateway `192.168.47.1` |
| classic ping to C3 AP | pass, reply in 58 ms |
| UDP challenge and matching acknowledgement | pass |
| C3 `sta_joined` / `sta_left` and exact payload | pass |
| final cleanup | both station IPs `0.0.0.0`; no active AP; no recovery reset |

### Classic target AP, C3 Supervisor station

```bash
python3 tools/repl/run_wifi_target_ap_test.py --target-board esp32
```

```text
RUNNER run_id=20260720T175610Z
RUNNER_RESULT=FAIL
```

The classic target recorded six passing checks and the same callback-contract
failure. The C3 Supervisor station recorded 11 passing checks and one ping
failure.

| Observation | Result |
|---|---|
| classic AP address after `setAPIP()` | `192.168.47.1/24`, gateway `192.168.47.1` |
| `setAPIP()` callback | `"Failure"` — API-contract failure |
| C3 scan | WPA2 AP, channel 6, RSSI `-34 dBm` |
| C3 DHCP address | `192.168.47.2`, gateway `192.168.47.1` |
| C3 ping to classic AP | fail, five timeouts and zero reply bytes |
| UDP challenge and matching acknowledgement | pass |
| classic `sta_joined` / `sta_left` and exact payload | pass |
| final cleanup | both station IPs `0.0.0.0`; no active AP; no recovery reset |

## Espruino API And Event Coverage

| API or event | Evidence |
|---|---|
| `Wifi.setAPIP()` | Functionally applied the custom subnet on both builds; callback contract failed on both. |
| `Wifi.startAP()` | Both targets created the requested WPA2 AP on channel 6. |
| `Wifi.getAPDetails()` / `getAPIP()` | SSID, authentication and custom address checks passed. |
| `Wifi.scan()` | Each Supervisor station found the controlled peer AP. |
| `Wifi.connect()` | Both Supervisor stations associated and completed DHCP. |
| `Wifi.getStatus()` / `getDetails()` / `getIP()` | Station state, AP identity, address and gateway checks passed. |
| `Wifi.ping()` | Classic-to-C3 passed; C3-to-classic repeated the known directional failure. |
| `Wifi.disconnect()` / `stopAP()` | Both role directions cleaned up without recovery. |
| station lifecycle events | `associated`, `connected` and `disconnected` were checked by the station role. |
| AP lifecycle events | `sta_joined` and `sta_left` were checked by the target AP role. |
| UDP socket service | Run-bound challenge and matching acknowledgement passed in both directions. |

## Firmware Interpretation

The C3 and classic builds use different IDF lineages but share substantial
ESP32 networking wrapper code. Inspection of the local IDF4 Espruino source
found the common `setIP` worker used for AP/station address callbacks. Its
callback-value expression appears to construct `null` when the operation has
an error and `"Failure"` when it does not, which matches the observed inverted
success callback. This source observation should be confirmed in each exact
build source tree before changing firmware.

The runner therefore keeps two assertions separate:

1. the documented callback must indicate success
2. independently observed address, DHCP and application traffic must prove
   whether the requested configuration actually took effect

No Espruino firmware was modified during this test.

## V2 Significance And Next Test

This result proves that a Supervisor Peer can act as a station while the
target hosts the Wi-Fi service. It also proves that the host can orchestrate
and reconcile evidence from both boards without the presently absent hardware
event wires. A run-bound UDP exchange remains the primary end-to-end proof;
individual API return values and ICMP are retained as separately reported
coverage.

The next two-board test can exercise `Wifi.setIP()` on the Supervisor station
against the controlled target AP. Because `setIP()` appears to share the same
callback worker as `setAPIP()`, it should assert callback conformance and
functional static addressing independently rather than assuming either
result from this test.
