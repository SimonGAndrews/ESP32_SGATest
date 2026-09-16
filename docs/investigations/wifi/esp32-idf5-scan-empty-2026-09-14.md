# ESP32 IDF5 `Wifi.scan()` Empty Result Investigation

Date: 2026-09-14

## Conclusion

Current-master `ESP32_IDF5` starts a station connection whenever the Wi-Fi
station interface starts, including when `Wifi.scan()` started that interface.
ESP-IDF then aborts the concurrent scan and Espruino reports an empty access
point array. A candidate correction now records whether the station is started
and calls `esp_wifi_connect()` only for an explicit `Wifi.connect()` request.
It restores scanning without losing direct connection, AP+station transition,
saved-configuration restore, cancellation or recovery behavior.

This is a firmware defect, not a failure of the C3 access point or bench radio
path. Direct association, DHCP and UDP exchange with the same controlled AP
passed when scan was bypassed.

## Reproduction

The classic ESP32 was the station under test. An ESP32-C3 peer advertised a
run-specific WPA2 access point on channel 6 and reported its AP-ready state
independently over USB.

| Source/image | AP settling time | `Wifi.scan()` result |
|---|---:|---|
| IDF5 ping/70 KB candidate `20302d7f9` | 1.5 s | callback, no error, 0 APs |
| IDF5 ping/70 KB candidate `20302d7f9` | 5 s | callback, no error, 0 APs |
| exact current master `26fff60f9`, diagnostic build | 5 s | callback, no error, 0 APs |

On `20302d7f9`, bypassing scan and connecting directly to the same generated
SSID passed association, DHCP (`192.168.4.2`), ping to the peer
(`192.168.4.1`), UDP challenge/reply and disconnect. This rules out AP startup,
credentials, channel and basic radio operation.

### State-Controlled Clean-Master Reproduction

On 2026-09-15, exact commit `26fff60f9` was checked out in a separate detached
worktree with no source modifications and rebuilt against ESP-IDF 5.5.3 using
`BOARD=ESP32_IDF5 RELEASE=1`. The application image SHA-256 was
`6f6c2ddcba9ba87aa32296ca2b8593828683e449716fa25459d51733a32b653d`.
The clean image did not contain the candidate symbols `g_isStaStarted` or
`g_connectAfterStaStart`.

The classic ESP32 V1 target on the configured `...usb-0:2.3:1.0-port0`
USB-UART path was flashed with that image. The stateful reproducer first
connected to a reachable WPA2 access point, completed DHCP, disconnected and
allowed `stopWifiIfIdle()` to stop the station. It then called `Wifi.scan()`
while the valid station configuration remained in IDF's RAM storage.

Two consecutive runs produced the same result:

| Run | Initial connection | Disconnect and idle stop | Scan result |
|---|---|---|---:|
| 1 | passed | passed | 0 APs |
| 2 | passed | passed | 0 APs |

Both runs observed a fresh `WIFI_EVENT_STA_START` for the scan and then
`WIFI_EVENT_SCAN_DONE`; the JavaScript callback received an empty array. This
provides a repeatable failure precondition for current master without relying
on the station state inherited by a one-pass REPL upload.

The authoritative state-controlled REPL reproducer is
[`repros/esp32_wifi_scan_after_disconnect.js`](repros/esp32_wifi_scan_after_disconnect.js).
It requires a reachable access point because the initial connection both
proves the radio path and leaves a valid station configuration for the later
scan. The credential-safe host runner injects the local SSID and password
without printing them:

```bash
python3 tools/repl/run_wifi_scan_stateful.py --port /dev/ttyUSB0
```

Run the command from the repository root after creating the ignored
`tests/WIFI_BLE/local_wifi_credentials.json` described in
[`../../../tests/WIFI_BLE/README.md`](../../../tests/WIFI_BLE/README.md).
Unmodified affected firmware exits with a failed empty-scan assertion; the
candidate exits successfully only when the expected AP is present and the scan
did not initiate a station connection.

[`repros/esp32_wifi_scan_empty.js`](repros/esp32_wifi_scan_empty.js) remains a
no-credential two-scan diagnostic for direct REPL use. It reports the native
state and both AP lists, but the state-controlled credentialed test is the
repeatable regression assertion.

## Source Cause

`jswrap_wifi_scan()` in
`libs/network/esp32/jswrap_esp32_network.c` changes the mode to station,
starts Wi-Fi and then calls non-blocking `esp_wifi_scan_start()`.

Starting Wi-Fi emits `WIFI_EVENT_STA_START`. The shared ESP32 event handler
unconditionally calls `esp_wifi_connect()` for that event, even though the
operation that started Wi-Fi was a scan and no connection was requested.
Diagnostic logging on exact master showed this sequence:

1. `esp_wifi_scan_start()` returned `ESP_OK`;
2. `WIFI_EVENT_STA_START` was handled;
3. `WIFI_EVENT_SCAN_DONE` arrived with no AP records;
4. the JavaScript callback received an empty array.

The current wrapper does not inspect the scan-completion event's status and
the JavaScript `Wifi.scan()` callback receives only the AP array. Consequently
an aborted native scan is presented to JavaScript as a valid empty result,
rather than as an error. The immediate `esp_wifi_scan_start()` return is also
currently ignored, although it was `ESP_OK` in this reproduction and was not
the cause of this particular failure.

Espressif documents that a scan and connection attempted together conflict:
the scan is aborted and the scan API/state reports `ESP_ERR_WIFI_STATE`.
The [ESP-IDF scan example](https://github.com/espressif/esp-idf/blob/v5.5.2/examples/wifi/scan/main/scan.c)
starts station mode and scans without initiating a connection. The
[ESP-IDF Wi-Fi API](https://docs.espressif.com/projects/esp-idf/en/v5.5.2/esp32/api-reference/network/esp_wifi.html#_CPPv419esp_wifi_scan_startPK18wifi_scan_config_tb)
documents the scan/connection restriction.

The current
[MicroPython ESP32 implementation](https://github.com/micropython/micropython/blob/master/ports/esp32/network_wlan.c)
also keeps the operations separate: `WIFI_EVENT_STA_START` records station
state but does not connect; its explicit `connect()` method calls
`esp_wifi_connect()`, and `scan()` calls `esp_wifi_scan_start()` independently.

The unconditional station-start connection predates the IDF5 merge, so the
source defect was latent in the classic port. Historical same-bench evidence
showed reliable scanning on the pre-merge legacy build. The observed IDF5
regression is therefore consistent with a timing/driver-behaviour difference
exposing an existing sequencing error, rather than the IDF5 merge introducing
the unconditional call itself.

## Candidate Correction And Evidence

The committed correction is on branch
`fix/esp32-wifi-sta-start-intent` at `dc274713a`. It is rebased onto current
upstream master `1c96229d0` and was submitted as
[Espruino PR #2752](https://github.com/espruino/Espruino/pull/2752). The
correction:

- records station `START` and `STOP` events explicitly;
- records a one-shot pending connection only when `Wifi.connect()` must start
  a stopped station;
- consumes that request in the subsequent station-start event;
- calls `esp_wifi_connect()` directly when the station is already running,
  including after a scan or while operating as AP+station; and
- clears the pending request on explicit `Wifi.disconnect()` or a failed
  station start.

An earlier counter-based guard restored scanning, producing these focused
results:

| Controlled run | Total APs | Controlled AP result | Subsequent station operation |
|---|---:|---|---|
| `20260914T092122Z` | 13 | one match, WPA2, channel 6, -13 dBm | association, DHCP and UDP passed |
| `20260914T092327Z` | 12 | one match, WPA2, channel 6, -12 dBm | association, DHCP and UDP passed |
| `20260914T092928Z` | 14 | one match, WPA2, channel 6, -12 dBm | association, DHCP and UDP passed |

The first two runs used the guard plus diagnostic logging. The third used the
retained source diff containing only that initial guard. Lifecycle review then
showed that retry count was not a sufficiently direct representation of an
outstanding connection request. A one-shot request flag fixed that ambiguity,
but an AP+station test exposed a second case: the station may already be
started, so another `esp_wifi_start()` does not produce a new station-start
event. Explicit started-state tracking addresses both cases.

The final candidate image was built as `BOARD=ESP32_IDF5` with ESP-IDF 5.5.3
and exercised against a USB-observed ESP32-C3 controlled AP. The peer supplied
independent association, departure and UDP evidence.

| Run | Transition coverage | Result |
|---|---|---|
| `20260914T223402Z` | start local AP; connect as station; stop AP while retaining station | 7 checks passed; peer join, UDP and leave confirmed |
| `20260914T223449Z` | direct connect; scan while connected; reconnect; disconnect; scan while disconnected; connect after scan | 15 checks passed; four peer UDP exchanges confirmed |
| `20260914T223551Z` | cancel an immediate request; five connect/UDP/disconnect cycles | 11 checks passed; five completed UDP cycles confirmed |
| `20260914T223655Z` | save station configuration; hardware reboot; automatic restore | restored IP and post-reboot UDP confirmed; peer saw both joins |
| `20260914T224110Z` | connect; controlled AP loss for eight seconds; restore AP; explicit reconnect | 6 checks passed; peer saw both joins and UDP before and after outage |

The exact rebased commit was then rebuilt as `BOARD=ESP32_IDF5` with ESP-IDF
5.5.3 and flashed to the same classic ESP32 used for the clean-master
comparison. The state-controlled connect, completed disconnect and scan
sequence produced this direct before/after evidence:

| Source | Repetition | Scan result | Expected AP | Unsolicited connection events |
|---|---:|---:|---:|---:|
| clean master `26fff60f9` | 1 | 0 APs | absent | none observed before the empty result |
| clean master `26fff60f9` | 2 | 0 APs | absent | none observed before the empty result |
| rebased correction `dc274713a` | 1 | 15 APs | one match | 0 |
| rebased correction `dc274713a` | 2 | 13 APs | one match | 0 |

The same rebased commit then completed the station-transition lifecycle on
the available legacy classic ESP32 and ESP32-C3 IDF4 targets. This lifecycle
includes direct connection, scan while connected, reconnection while the
station is running, explicit disconnect and idle shutdown, scan while
disconnected, and connection after that scan.

| Run | Target | Target checks | Independent peer evidence | Result |
|---|---|---:|---|---|
| `20260916T082522Z` | classic `ESP32` legacy | 15 passed, 0 failed | four UDP exchanges plus station join/leave | pass |
| `20260916T083448Z` | `ESP32C3_IDF4` | 15 passed, 0 failed | four UDP exchanges plus station join/leave | pass |

An initial C3 run produced the same 15 target passes and four UDP exchanges,
but the overall runner failed only its automatically enabled classic-IDF5
peer-ping assertion. The passing repeat disabled that unrelated optional ICMP
check; it did not change the target lifecycle.

The S3 IDF5 full lifecycle is not used as qualifying evidence because it
exposed a separate, pre-existing reconnect problem. Two initial candidate
attempts were also invalidated because the board was configured for its
external antenna connector but no antenna was attached. After attaching the
antenna, candidate run `20260916T090858Z` completed all 15 checks and four UDP
exchanges, but a confirmation stalled while reconnecting an already-running
station. Exact clean base `1c96229d0` then stalled at the same reconnect step.
This behaviour is therefore not introduced by the candidate and should be
investigated separately.

A narrower S3 comparison bypassed that unrelated reconnect step and exercised
the defect directly: connect to a reachable AP, complete disconnect and idle
shutdown, then scan from the stopped station. Both images were built from the
same exact source base and tested on the same board with its external antenna
connected.

| S3 IDF5 source | Initial connection and disconnect | Scan result | Expected AP | Unsolicited connection events |
|---|---|---:|---:|---:|
| clean base `1c96229d0` | passed | 0 APs | absent | 0 |
| correction `dc274713a` | passed | 10 APs | one match | 0 |

The focused A/B therefore confirms the original failure and its correction on
S3 IDF5 without treating the broader S3 reconnect instability as part of this
pull request.

The AP+station test deliberately performs its UDP exchange after stopping the
target's AP. Both ESP32 soft-AP interfaces otherwise use `192.168.4.1` by
default, making a packet addressed to that IP ambiguous while both interfaces
are active. Association during AP+station mode is instead corroborated by the
controlled peer's station-join event.

The `Wifi.ping()` step timed out in these two candidate runs because plain
current master does not yet include the separate modern IDF5 ping
implementation. That expected failure is unrelated to scan validation.

## Pull Request Status

Clean release builds passed for every ESP32 configuration in the upstream
build matrix: `ESP32`, `ESP32_IDF4`, `ESP32_IDF5`, `ESP32C3_IDF4`,
`ESP32C3_IDF5`, `ESP32S3_IDF4` and `ESP32S3_IDF5`. A Linux host build also
passed. The host `--test-all` run reported 397 of 403 tests passing; the three
named `_FAIL` tests are known failures, and isolated upstream-versus-candidate
checks produced the same result for each unmarked aggregate failure.

Runtime validation covers the original classic IDF5 failure path, the legacy
classic ESP32 path and the C3 IDF4 path. S3 IDF5 has focused clean-base versus
candidate runtime evidence for the scan defect, while the broader lifecycle
remains outside the qualifying matrix because both images reproduce a separate
reconnect stall.

The correction was submitted upstream on 2026-09-16 as
[Espruino PR #2752](https://github.com/espruino/Espruino/pull/2752), titled
`ESP32: connect after station start only when requested`. At submission it was
cleanly mergeable and all 27 GitHub Actions jobs passed, including the seven
ESP32-family builds and Linux build. The PR contains the single candidate
commit `dc274713a` and changes only
`libs/network/esp32/jswrap_esp32_network.c`.

The PR links and fixes
[issue #2750](https://github.com/espruino/Espruino/issues/2750). Exposing
immediate `esp_wifi_scan_start()` failures to the JavaScript callback remains
a separate robustness change and is intentionally outside this correction.

## Deferred ESP32-C3 AP+Station Follow-Up

The
[ESP-IDF ESP32-C3 Wi-Fi guide](https://docs.espressif.com/projects/esp-idf/en/v5.5/esp32c3/api-guides/wifi.html)
documents `WIFI_MODE_APSTA` support, but Espruino still contains a
[target-specific IDF4-era workaround](https://github.com/espruino/Espruino/commit/c45ff321d88c08cf1e72b5d7c6af21d6b82d2380)
that makes ordinary `Wifi.connect()` and `Wifi.startAP()` transitions replace
the other role. The 2024 evidence supports why that was a pragmatic workaround,
but does not prove that it remains necessary. The new explicit station-start
and connection-intent state may remove part of its original lifecycle
justification.

Do not expand the current scan/connect pull request to remove this workaround.
After that correction is accepted, raise the C3 AP+station behavior as a
separate issue and validate any change on known-good C3 hardware across IDF4
and IDF5, including both transition directions, BLE enabled and disabled,
same-channel and different-channel peers, repeated cycles and saved-state
restore.
