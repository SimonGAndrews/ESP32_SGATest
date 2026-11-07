# ESP32 IDF5 `Wifi.connect()` Hardening Qualification

Date: 2026-11-05

## Conclusion

Espruino revision `610007d3f` qualifies the IDF5-only `Wifi.connect()`
hardening on classic ESP32, ESP32-C3 and ESP32-S3. The candidate rejects an
overlapping call before it can replace the accepted operation, retains
ownership without a callback, completes success or terminal failure exactly
once, detaches ownership across JavaScript `reset()`, and delivers station
events to JavaScript from the interpreter task rather than the ESP-IDF event
task.

The focused overlap tests passed 12 of 12 checks on each IDF5 target. The
connection/recovery tests passed 33 of 33 checks on each target, including ten
connect/disconnect soak cycles and no material warmed native-heap loss. Reset
and full ping regressions passed on all three targets. The classic IDF5 target
also passed the stateful scan regression and the controlled
AP-only -> AP+station -> station-only transition test.

The unchanged IDF4 station path completed a basic connection on classic,
C3 and S3. Classic IDF3 also completed the same station smoke test. All seven
maintained ESP32 build definitions completed clean release builds.

## Source Identity

| Item | Value |
|---|---|
| Espruino repository | `/home/simon/MaBecker/Espruino_master` |
| Branch | `fix/esp32-wifi-connect-hardening` |
| Qualified revision | `610007d3f` |
| Qualified parent | `bc5f06466e` |
| Runtime version | `2v29.503` |
| Build type | `RELEASE=1` |
| Candidate commit | `610007d3f ESP32 IDF5: harden Wifi.connect lifecycle` |

The candidate changes only
`libs/network/esp32/jswrap_esp32_network.c` and
`libs/network/esp32/jswrap_esp32_network.h`: 408 insertions and three
deletions relative to the qualified ping parent. `git diff --check` passed.

The connection lifecycle changes are selected only for ESP-IDF 5. The IDF3
and IDF4 connection implementations remain unchanged; both remain in build
and runtime regression coverage.

## Implementation Under Test

The candidate adds an explicit connection operation state independent of the
presence of a JavaScript callback. A call validates its arguments before it
can acquire ownership. An accepted operation is either waiting for station
startup or connecting. A second call is rejected with a catchable
`A connection is already in progress` error without changing the first
operation.

One completion helper takes and clears operation ownership before queuing the
result. It is used for usable-IP success, terminal disconnection and immediate
or deferred ESP-IDF failures. Callback-less calls retain the same operation
ownership even though there is no function to invoke. The reset/kill hook
retires the state and callback before a discarded JavaScript runtime can
receive a late completion.

IDF5 station events are copied into a bounded 16-entry plain-C queue in the
ESP-IDF event task. `jswrap_wifi_events_idle()` drains that queue in Espruino's
interpreter task, where it creates `JsVar` values, emits public events and
queues call completions. Scanning and AP events remain outside this PR's
station-event boundary.

The connect debug message continues to identify the SSID and callback
presence, but no longer prints the supplied password.

## Physical Bench

| Target | Stable USB path | Identity |
|---|---|---|
| ESP32-S3 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.1:1.0-port0` | revision 0.1, MAC `68:b6:b3:27:2c:40` |
| classic ESP32 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.2:1.0-port0` | revision 3.1, MAC `08:b6:1f:70:15:18` |
| Seeed Studio XIAO ESP32-C3 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.3:1.0` | revision 0.3, MAC `a0:76:4e:79:90:a0` |

The targets were independently USB powered. The Shelly switch and mains
heater were not connected. The `SHED` access point was available for the
credentialed tests. Credentials were loaded from the ignored local credential
file with console echo disabled and were not written to this record.

## IDF5 Connection Results

Clean exact-revision images were flashed to all three physical targets. Each
runtime reported board version `2v29.503` and embedded revision `610007d3f`.

### Overlap and ownership

| Target | Checks | Result |
|---|---:|---|
| classic `ESP32_IDF5` | 12/12 | pass |
| `ESP32C3_IDF5` | 12/12 | pass |
| `ESP32S3_IDF5` | 12/12 | pass |

The checks covered valid overlap rejection with preservation of the first
callback, invalid second-call arguments without disturbance of the first
operation, callback-less ownership, cancellation release, and successful
follow-up completion exactly once.

### Connection, failure and recovery lifecycle

| Target | Checks | Unavailable SSID | Incorrect password | Soak cycles |
|---|---:|---|---|---:|
| classic `ESP32_IDF5` | 33/33 | `NO_AP_FOUND` once | `4WAY_HANDSHAKE_TIMEOUT` once | 10 |
| `ESP32C3_IDF5` | 33/33 | `NO_AP_FOUND` once | `4WAY_HANDSHAKE_TIMEOUT` once | 10 |
| `ESP32S3_IDF5` | 33/33 | `NO_AP_FOUND` once | `4WAY_HANDSHAKE_TIMEOUT` once | 10 |

Every successful connection, failure, recovery and soak cycle produced
exactly one call completion. Reconnecting while already connected also
completed once with a usable address. The lifecycle traversed both stopped
station startup and already-started station operation.

The final classic rerun additionally inspected the complete captured serial
stream before sanitising it and reported `password_exposed=no` while exercising
both the valid and intentionally incorrect passwords.

### Native heap

The first completed cycle is used as the warmed comparison point because
initial Wi-Fi allocation is expected.

| Target | Startup | Warmed first | Lowest | Final | Final minus warmed |
|---|---:|---:|---:|---:|---:|
| classic `ESP32_IDF5` | 62,264 | 62,244 | 57,892 | 62,104 | -140 bytes |
| `ESP32C3_IDF5` | 73,788 | 67,724 | 64,900 | 67,824 | +100 bytes |
| `ESP32S3_IDF5` | not used | 105,624 | 102,552 | 105,484 | -140 bytes |

No target showed material native-heap loss across ten repeated
connect/disconnect cycles.

### JavaScript reset

All three IDF5 targets passed the reset probe. An unavailable-network
operation was accepted and then interrupted by `reset()`. Its old callback did
not execute in the new runtime. A fresh post-reset unavailable-network request
then completed once with `NO_AP_FOUND`, proving both stale callback detachment
and recovery of operation ownership.

### Station transition regressions

The classic IDF5 target completed an initial connection, explicit disconnect
and subsequent scan. The scan returned 15 networks, exactly one matching the
configured AP, and emitted no unsolicited connected event.

The controlled two-board AP/station test then used the C3 IDF4 image at the
same exact source revision as its peer. The classic target passed seven of
seven target checks while moving from AP-only through AP+station to
station-only. It retained its station address after stopping the AP and
completed a UDP exchange. The peer independently observed station join and
leave, received the run-bound challenge, and both boards finished with Wi-Fi
inactive.

### Immediate native failures

The candidate routes failures from `esp_wifi_get_mode()`,
`esp_wifi_set_mode()`, `esp_wifi_set_config()`, `esp_wifi_start()` and both
direct and deferred `esp_wifi_connect()` calls through the same exactly-once
completion helper. These branches are compiled in all three IDF5 images and
were reviewed in the exact candidate diff.

No deterministic public-API stimulus was available that forces one of these
ESP-IDF calls to fail without also depending on timing or adding a test-only
firmware hook. The physical suite therefore proves the terminal native failure
paths (`NO_AP_FOUND` and `4WAY_HANDSHAKE_TIMEOUT`) but records immediate native
failure delivery as source-covered rather than directly forced.

## Ping Regression

The full IDF5 ping soak passed on all three targets after the connection
changes to the shared wrapper and reset hook.

| Target | Sessions | Expected callbacks | Received callbacks | Final heap delta |
|---|---:|---:|---:|---:|
| classic `ESP32_IDF5` | 28 | 140 | 140 | +8 bytes |
| `ESP32C3_IDF5` | 28 | 140 | 140 | +24 bytes |
| `ESP32S3_IDF5` | 28 | 140 | 140 | 0 bytes |

Every session completed with its five expected results. No target showed final
native-heap loss.

## Legacy Runtime Regression

| Build | Station connection | Loopback ping | Result |
|---|---|---|---|
| classic `ESP32_IDF4` | one successful callback and usable IP | five request callbacks, 320 bytes, no timeout/error | pass |
| `ESP32C3_IDF4` | one successful callback and usable IP | five request callbacks, 320 bytes, no timeout/error | pass |
| `ESP32S3_IDF4` | one successful callback and usable IP | five request callbacks, 320 bytes, no timeout/error | pass |
| classic `ESP32` IDF3 | one successful callback and usable IP | two serialized legacy sessions completed through each terminal summary | pass |

The IDF3 ping result shape remains its established legacy behavior and is not
changed or redefined by this candidate.

An early IDF4 ping run was discarded after the generic REPL runner saw the
literal `DONE=` text echoed from the uploaded source and reset the runtime
while the legacy native session was still active. `run_test.py` now disables
source echo before capture. Clean reruns on C3 and S3 then delivered all five
expected results; the runner correction is included in the evidence hashes
below.

## Clean Build Matrix

All seven maintained ESP32 definitions completed clean release builds at the
qualified revision.

| Build | Image size | Smallest app partition free | Result |
|---|---:|---:|---|
| `ESP32` | 1,526,608 bytes | 46,256 bytes | pass |
| `ESP32_IDF4` | `0x15b710` | 31% | pass |
| `ESP32C3_IDF4` | `0x1d55f0` | 6% | pass |
| `ESP32S3_IDF4` | `0x1aba70` | 14% | pass |
| `ESP32_IDF5` | `0x17a690` | 24% | pass |
| `ESP32C3_IDF5` | `0x19e810` | 17% | pass |
| `ESP32S3_IDF5` | `0x17e300` | 24% | pass |

## Evidence Identity

| File | SHA-256 |
|---|---|
| `wifi_connect_hardening_overlap.js` | `8f105169117d0e846f3a36dad54ed7943483fbbbc9ca2b1ebf2d6a06ff2b73b8` |
| `wifi_connect_hardening_lifecycle.js` | `a8cd524b2bea4dc8a31a431c9942721dac8a41529ddee6b937b51cccfe66839a` |
| `wifi_connect_legacy_smoke.js` | `16690c7c9b0122a3ee930891a037886b085d9a2be40a26f7929315840268b4b5` |
| `esp32_wifi_connect_reset.js` | `71888a36ae3ba16d925da5ae72a47e533f051a78c6518e16dfef4f4dd215540e` |
| `esp32_wifi_ping_loopback_soak.js` | `10d09e311cbb9493ae3cf574f541a54eac2f48c3fed71303912bdbbee465bd42` |
| `esp32_wifi_ping_ipv4_parse.js` | `a026feb75cca45a1a9f6d583d0bd89dd73a94bb8bd5cc2a90f83b935a3992e41` |
| `esp32_wifi_ping_legacy_two_sessions.js` | `e256004b4ea52c7ee02a0df48d3307ec16e72fc41a4357b85bab2512c81c9e53` |
| `esp32_wifi_scan_after_disconnect.js` | `11484d05f4782cfe46bfe5a65f8eef15186613ef4e2b47aeda88b2baba114c20` |
| `wifi_apsta_transition_lifecycle.js` | `4f3deb215f50d1e522aeac49bb4e936b4a8f52b020dfa42542a10d707297ab7d` |
| `run_test.py` | `20c2326c7e129116c3c77d2a576e8f2b7638b3fd760a7999ce563c980e81b4c2` |
| `run_wifi_local_test.py` | `ca760000c62a71659468a9644ac3b8e2ae33497754fdc2fa88490c7a66cf16ba` |
| `run_wifi_connect_reset_test.py` | `ef0636642587d90d05f1502bc33b84a58369478d86d9590280b6b2a1c12b8d0b` |
| candidate bench configuration | `90433bf11d53aeca83126690d64eb1b00166f37b0c0b1f9ff3fa4694fcab5e88` |

## Final Bench State

Classic ESP32, ESP32-C3 and ESP32-S3 were all reflashed with their exact
`610007d3f` IDF5 release images after the legacy comparison runs. Flash hashes
were verified by `esptool`. The final classic lifecycle run and post-flash C3
and S3 loopback smokes each reported the expected IDF5 board name, Espruino
`2v29.503` and embedded revision `610007d3f`.

## Disposition

PR2 is implemented and qualified at `610007d3f`. The candidate is suitable for
issue-section completion and review preparation. The separate exactly-once
`Wifi.disconnect()` lifecycle remains PR3 work.
