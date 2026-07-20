# Wi-Fi Supervisor Peer Negative Station Cases

Date: 20 July 2026

## Conclusion

The wrong-password and unavailable-SSID cases both passed. In each case the
classic ESP32 remained without an IP address or `connected` event, while the
C3 Supervisor Peer independently recorded no completed station join and no
application traffic.

The result proves that the peer role can provide useful negative evidence, not
only successful-path services. It also confirms that the host runner must own
bounded timeouts because `Wifi.connect()` callbacks are not sufficient to
terminate these failure paths on the tested legacy build.

## Bench And Firmware Preconditions

- both V1 harnesses in `STANDALONE` mode
- both targets powered only through fully connected USB cables
- no external target power
- no `SUP_EVENT_OUT` / `SUP_EVENT_IN` connection
- no other REPL, Web IDE or serial monitor attached
- bench configuration: `tests/WIFI_BLE/standalone_bench_config.json`

| Role | Position | Board | Version | Git commit |
|---|---|---|---|---|
| Supervisor Peer | `esp32_c3_v1` | `ESP32C3_IDF4` | `2v29.107` | `0af6e1568` |
| Target | `esp32_v1` | `ESP32` | `2v29.97` | `d3d33f4aa` |

The runner rebooted and cleaned the target between the two subcases. It did
not flash firmware, save Wi-Fi configuration or require physical interaction.

## Command And Result

```bash
python3 tools/repl/run_wifi_peer_test.py --scenario negative
```

Confirmation run:

```text
RUNNER run_id=20260720T154306Z
RUNNER_RESULT=PASS
```

The positive scenario was rerun after the shared-runner changes and also
passed as run `20260720T154658Z`.

## Wrong WPA2 Password

The target first scanned the controlled SSID and confirmed that exactly one
matching WPA2 AP was visible. It then attempted `Wifi.connect()` with a
generated incorrect password.

| Observation | Result |
|---|---|
| controlled peer visible as WPA2 | pass |
| target disconnect event | reason `15`, `4WAY_HANDSHAKE_TIMEOUT` |
| target IP | `0.0.0.0` |
| target `connected` event | not observed |
| C3 `sta_joined` event | not observed |
| C3 UDP traffic | none |

The disconnect event arrived approximately five seconds after the scan
completed and was accepted as definitive local rejection evidence. The
`Wifi.connect()` callback had not been invoked when that event arrived.

Target result:

```text
PASS wifi_wrong_password_peer_visible
PASS wifi_wrong_password_rejected_event reason=15 msg=4WAY_HANDSHAKE_TIMEOUT
INFO wrong_password_callback_observed=false
PASS wifi_negative_no_ip
PASS wifi_negative_no_connected_event
DONE=PASS
```

## Unavailable SSID

The target first scanned and proved that the generated SSID did not appear in
the ten observed access points. It then attempted `Wifi.connect()` and used an
eight-second runner-owned observation window.

| Observation | Result |
|---|---|
| generated SSID absent from scan | pass |
| target disconnect event | reason `201`, `NO_AP_FOUND` |
| bounded observation timeout | pass at eight seconds |
| target IP | `0.0.0.0` |
| target `connected` event | not observed |
| C3 `sta_joined` event | not observed |
| C3 UDP traffic | none |

The `NO_AP_FOUND` event arrived during the observation window, but the
`Wifi.connect()` callback was not invoked. This is consistent with a connection
attempt that may continue retrying unless the application or runner imposes a
timeout and calls `Wifi.disconnect()`.

Target result:

```text
PASS wifi_unavailable_ssid_absent_from_scan
PASS wifi_unavailable_ssid_bounded_timeout
PASS wifi_negative_no_ip
PASS wifi_negative_no_connected_event
DONE=PASS
```

## Supervisor Peer Evidence

The peer summary for both subcases contained empty event and receive arrays:

```text
PEER_SUMMARY events=[] received=[]
PASS wifi_peer_received_no_negative_traffic
PASS wifi_peer_observed_no_station_join
```

This does not claim that no probe or authentication frames were exchanged. It
proves that neither attempt became a completed peer-side station join and that
no application payload reached the controlled UDP service.

## Espruino API Coverage

| API or event | Negative coverage |
|---|---|
| `Wifi.scan()` | Proved the controlled AP present and the generated unavailable SSID absent. |
| `Wifi.connect()` | Exercised wrong-password and unavailable-AP failure paths. |
| `Wifi.getStatus()` | Reported `4WAY_HANDSHAKE_TIMEOUT` and `NO_AP_FOUND`. |
| `Wifi.getDetails()` | Corroborated both failure-state names. |
| `Wifi.getIP()` | Confirmed that neither attempt obtained an address or gateway. |
| `Wifi.disconnect()` | Terminated each bounded negative attempt. |
| `Wifi.stopAP()` | Removed any target boot-time AP during isolation. |
| `disconnected` event | Reported reason 15 for the bad password and 201 for the absent AP. |
| `connected` event | Confirmed absent in both cases. |
| peer `sta_joined` event | Confirmed absent in both cases. |

The significant API finding is that the legacy ESP32 build did not call the
`Wifi.connect()` callback for the observed bad-password attempt, despite
providing a definitive `4WAY_HANDSHAKE_TIMEOUT` event. Tests should therefore
combine callback handling, event/status observation and a host-owned timeout.

## Cleanup And Scope

The C3 finished in mode `NULL` with IP `0.0.0.0`. The target finished in
inactive station mode with status `NO_AP_FOUND` and IP `0.0.0.0`. Neither board
required cleanup recovery or retained an AP.

This result does not yet cover the boards in reversed roles, a target-hosted
AP, static addressing, configuration persistence or physical Supervisor event
handshaking. Reversing the roles is the next proposed Wi-Fi case and requires
no bench wiring change.
