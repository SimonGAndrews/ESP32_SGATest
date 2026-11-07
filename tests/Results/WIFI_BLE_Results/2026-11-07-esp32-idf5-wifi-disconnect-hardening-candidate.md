# ESP32 IDF5 Wi-Fi Disconnect-Hardening Candidate Qualification

Date: 2026-11-07

## Purpose

This record qualifies the stacked ESP32 Wi-Fi asynchronous-operation candidate
after adding IDF5 `Wifi.disconnect()` ownership and exactly-once completion.
The candidate includes the previously qualified ping and `Wifi.connect()`
changes and is therefore tested as one integrated firmware head.

## Source And Firmware Identity

| Item | Value |
|---|---|
| Espruino repository | `/home/simon/MaBecker/Espruino_master` |
| Branch | `fix/esp32-wifi-disconnect-hardening` |
| Exact revision | `14cd9932f` |
| Parent connection candidate | `610007d3f` |
| Parent ping candidate | `bc5f06466e` |
| Build type | `RELEASE=1` |
| Espruino version | `2v29.504` |

The PR3 firmware commit changes only
`libs/network/esp32/jswrap_esp32_network.c`: 89 added lines guarded to the
IDF5 connection/disconnection implementation.

## Parent Reproduction

The connected-disconnect probe was first run on the exact PR2 parent,
`610007d3f`. One accepted `Wifi.disconnect(callback)` invocation produced two
callback executions while the independent public `disconnected` event was
emitted once. This retained the defect independently of the earlier ping and
connection fixes.

## Implemented Contract

The candidate gives an accepted IDF5 disconnect operation explicit ownership
independent of callback presence. A native disconnected event completes an
associated operation once; an idle or unassociated station completes
immediately because no terminal event can occur. An overlap throws
`A disconnection is already in progress` without replacing the first
operation. Disconnecting during a connection completes that connection once
with `Connection cancelled`. Reset retires both ownership and callback.

The wrapper queries `esp_wifi_sta_get_ap_info()` rather than relying only on
the cached station flag. This is required because `esp_wifi_disconnect()` can
return `ESP_OK` without emitting an event when the station is unassociated,
and a JavaScript reset can discard a queued event before the cached flag is
updated. Public Wi-Fi events remain independent of per-call completion.

## IDF5 Runtime Matrix

All three targets ran exact `14cd9932f` release images and reported the board,
version and embedded Git revision before each role.

| Test | Classic `ESP32_IDF5` | `ESP32C3_IDF5` | `ESP32S3_IDF5` |
|---|---:|---:|---:|
| disconnect lifecycle | 27/27 | 27/27 | 27/27 |
| connection overlap ownership | 12/12 | 12/12 | 12/12 |
| connection/failure/recovery lifecycle | 33/33 | 33/33 | 33/33 |
| disconnect reset/recovery | pass | pass | pass |
| full ping lifecycle | 35/35 | 35/35 | 35/35 |

The disconnect lifecycle covered idle disconnect, connected disconnect,
disconnect while connecting, connection cancellation, callback and
callback-less ownership, valid and invalid overlaps, public-event counts and
reconnection after each terminal path. Each accepted disconnect callback
completed once and each rejected overlap supplied no callback.

The connection regression covered successful connection, reconnect while
already connected, unavailable SSID, incorrect password, recovery after both
failures and ten further connect/disconnect cycles. Every accepted operation
completed its callback once.

| Target | Ten-cycle connection heap delta |
|---|---:|
| Classic | -136 bytes |
| C3 | -148 bytes |
| S3 | -132 bytes |

No target showed material native-heap loss.

## Ping Integration And Reset Boundaries

Each IDF5 target completed 28 ping sessions: 27 successful sessions and one
expected timeout session. Each session delivered its five expected results,
for 140 callbacks per target. Overlap rejection, timeout recovery, BLE
advertising, UDP recovery and final heap stability all passed.

| Target | Sessions | Callbacks | Ping-soak heap delta |
|---|---:|---:|---:|
| Classic | 28 | 140 | -20 bytes |
| C3 | 28 | 140 | -4 bytes |
| S3 | 28 | 140 | -48 bytes |

The exact C3 head also passed all three ping-reset modes: reset during a
successful session, reset during a timeout session, and reset after the final
callback had been queued. No unknown-callback error occurred and every
post-reset recovery session delivered five callbacks. The connection-reset
probe detached the old request and completed a new request once. The
disconnect-reset probe detached the old callback and then completed a fresh
connect/disconnect sequence once.

## Manual `SHED` Outage And Restoration

The C3 connected to the physical `SHED` AP, after which the AP was disabled
manually. The target made its existing native retry attempts and then emitted
one public `disconnected` event with reason 201, `NO_AP_FOUND`. Its station
status became `NO_AP_FOUND`, its IP became `0.0.0.0`, and the native station
driver stopped.

After `SHED` was restored, one explicit `Wifi.connect()` request completed one
callback with no error and restored IP `192.168.50.104`. The retained test
reported:

```text
METRIC initial_connect_callbacks=1
METRIC disconnected_events=1
METRIC recovery_connect_callbacks=1
PASS manual_ap_recovery
DONE=PASS
```

## Legacy Backend Regression

The connection and disconnection lifecycle changes are guarded to IDF5.
Exact-source IDF4 release images on Classic, C3 and S3 each completed a basic
station connection with one callback and a five-result loopback ping.

The expanded Classic IDF3 regression passed 15/15 checks. It covered five
successful station/DHCP connections, an unavailable SSID and recovery,
native `associated`, `connected` and `disconnected` events, deliberate
disconnect, three repeated cycles and clean runner reset/startup. It recorded
the established IDF3 behavior of two callbacks for the first deliberate
disconnect instead of imposing the new IDF5 contract. A separate
legacy-aware ping probe completed two sessions with the older six-callback
shape in each session.

A subsequent full classic IDF3 Wi-Fi API regression extended that guard across
scan and connected-scan behavior, connection cancellation, incorrect-password
recovery, controlled AP loss and restoration, AP/STA transitions, target-hosted
WPA2 AP operation, static station and custom AP addressing, saved-configuration
restoration, DNS, hostname, SNTP and supported global configuration. All
operational roles passed. Its unchanged legacy-backend limitations are
recorded separately in the detailed matrix at
[the classic IDF3 Wi-Fi API regression](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-07-esp32-classic-idf3-wifi-api-regression.md).

## Clean Build Matrix

All seven maintained ESP32-family definitions completed clean release builds
at `14cd9932f`.

| Build | Application size | Smallest app-partition free | Result |
|---|---:|---:|---|
| `ESP32` | 1,526,608 bytes | 46,256 bytes | pass |
| `ESP32_IDF4` | `0x15b710` | 31% | pass |
| `ESP32_IDF5` | `0x17a7a0` | 24% | pass |
| `ESP32C3_IDF4` | `0x1d5600` | 6% | pass |
| `ESP32C3_IDF5` | `0x19e910` | 17% | pass |
| `ESP32S3_IDF4` | `0x1aba70` | 14% | pass |
| `ESP32S3_IDF5` | `0x17e400` | 24% | pass |

## Evidence Identity

| File | SHA-256 |
|---|---|
| `wifi_disconnect_hardening_lifecycle.js` | `6d6428382081dc7a598823c76638f47a253fd3437b09631f70e6428bf1a78e9b` |
| `wifi_connect_hardening_overlap.js` | `8f105169117d0e846f3a36dad54ed7943483fbbbc9ca2b1ebf2d6a06ff2b73b8` |
| `wifi_connect_hardening_lifecycle.js` | `a8cd524b2bea4dc8a31a431c9942721dac8a41529ddee6b937b51cccfe66839a` |
| `wifi_manual_ap_recovery.js` | `880c3e45a6c02c652ff7484afc4e53627d9e8a218dd7ce1044a265bc3ba09dbe` |
| `wifi_legacy_station_regression.js` | `eb547dcf2db1b0880797fe93597a9b046a1b9eb13d8eaecc5d05e1070eaf33f1` |
| `wifi_ping_legacy_smoke.js` | `b43496e1d501bdad8de8107ac13809e9ae2e209199238013e88745d8165a3b24` |
| `esp32_wifi_disconnect_connected.js` | `2a3849d6003a0c53c12821cee4f93be0b0fd5178ffa7c9d7318b47d3b1ae0280` |
| `esp32_wifi_disconnect_reset.js` | `08fa960564c4bca1412293481ba52e8d5de6072fd587543b479da5f783795c34` |
| `run_wifi_disconnect_reset_test.py` | `91e47c23428f4a1bf274c9829eb510396b35f4cea873e8e161d557d7435e9d97` |
| `run_wifi_local_test.py` | `7ba29e952bf814f09e4e7fdbcf77691a6eea2cf5b6c268ea910017f9694d5e33` |
| `run_wifi_manual_ap_test.py` | `5208bbf44af4f342ccdf2214b5fef11cf3999afa33180d9f0db9ec7294bfc84d` |
| candidate bench configuration | `f43814442bacc456cd9560a3d99cd8983706e6d2f84531894a1edab4562d6a94` |

## Excluded Or Repeated Runs

- The first S3 disconnect lifecycle run reached the test's original 90-second
  overall deadline after 22 successful checks. The target was still
  progressing normally; the retained test deadline was increased to 150
  seconds and the complete 27/27 rerun passed.
- An older debug Classic peer interleaved native tracing with `PEER_READY` and
  truncated the structured marker. It was replaced by the exact release
  candidate before ping evidence was retained.
- One Classic image was initially written at the wrong flash offset and did
  not boot. It was rebuilt and flashed with the matching bootloader,
  partition table and application offsets before any firmware result was
  retained.
- One Classic ping attempt was interrupted by a USB-hub re-enumeration. Board
  identity was rechecked and the complete rerun passed.
- One Classic IDF4 ping upload immediately following station cleanup produced
  no test marker. A clean re-upload delivered all five results and passed.
- The first manual outage run was discarded after a physical USB disconnect
  reset all three processors. The retained run began from a fresh identity
  check and clean C3 reset.

## Disposition

The stacked candidate passes the complete build matrix, IDF5 physical runtime
matrix, legacy-backend guards, reset boundaries, manual AP-loss recovery and
heap checks. It is ready for section 3 of the umbrella issue and preparation
of the dependent PR3 submission.
