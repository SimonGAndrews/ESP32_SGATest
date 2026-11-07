# ESP32-C3 Connect Hardening Parent Baseline

Date: 2026-11-05

## Conclusion

The ESP32-C3 firmware at Espruino revision `bc5f06466e` reproduces the
`Wifi.connect()` ownership and immediate-error-reporting defects on the exact
parent selected for the connection-hardening work.

Two overlapping calls with valid arguments were both accepted by JavaScript.
The second native configuration attempt failed with `ESP_ERR_WIFI_STATE`, but
the failure was reported only through `jsError()`: neither callback ran. An
invalid second call threw during argument validation, but the first callback
had already been replaced and did not run. A callback-less first call also did
not reserve the operation, so a second call was accepted and again failed only
through the console diagnostic.

The standalone controls show that non-overlapping terminal connection failures
do follow a different path. Incorrect credentials and an unavailable network
each emitted one `disconnected` event and completed the accepted connection
callback once with the corresponding error. A valid reconnect completed once
after a usable IP address was obtained.

The phase-one exit criterion is therefore met: the qualified ping parent
reproduces the connection defects without relying on earlier firmware
evidence. No firmware source was changed during this phase.

The deliberate-disconnect control also reconfirmed the separate PR3 defect:
one `Wifi.disconnect()` request invoked its callback twice while emitting one
public `disconnected` event.

## Source And Bench Identity

| Item | Value |
|---|---|
| Firmware repository | `Espruino_master` |
| Source branch | `fix/esp32-wifi-connect-hardening` |
| Firmware revision | `bc5f06466e` |
| Board | Seeed Studio XIAO ESP32-C3 |
| Board definition | `ESP32C3_IDF5` |
| Espruino version | `2v29.502` |
| Console | persistent Espressif USB Serial/JTAG by-id path |
| Configuration storage file | `wifi-event-config.json` |

The board-reported revision was `bc5f06466`. The firmware revision is also the
full qualified ping candidate and the unchanged parent of the connection
branch.

The stored diagnostic configuration was checked after upload as 483 bytes with
CRC32 value `2399268020`. It does not enable Espruino automatic Wi-Fi startup;
the diagnostic program explicitly selects and starts each connection attempt.

## Reproducers

| Program | Repository revision | SHA-256 |
|---|---|---|
| `docs/investigations/wifi/repros/esp32_wifi_connect_overlap_repl.js` | phase-one evidence working tree | `3f5725f397d8fcb3821790e34f5c03b052699699ce956c7e3783cc0e7cdde1b5` |
| `docs/investigations/wifi/repros/esp32_wifi_connect_overlap_variants.js` | `ESP32_SGATest` `749fadb82a` | `e03c009dc5cf7a99ceb75e0531157dffa2e152941c3805f8f656585a9eb432d5` |
| `examples/wifi-greenhouse-soil-heater/wifi-event-characterisation.js` | `Espruino-XFSM` `a892a370a0` | `2fa5d22fe9b4ac1d55f712220018c21ed26de551e3df875b04ecae55a25dac3b` |

`DONE=PASS` in the overlap probe means that all observation scenarios ran to
completion. It does not mean that the observed API behaviour was correct.

## Results

### Connection overlap and ownership

| Scenario | Second call | First callback count | Second callback count | Observation |
|---|---|---:|---:|---|
| two valid calls with callbacks | returned normally | 0 | 0 | `esp_wifi_set_config()` returned `ESP_ERR_WIFI_STATE`; only `jsError()` reported it |
| invalid second options | threw a catchable type error | 0 | 0 | validating the second call had already displaced the first callback |
| callback-less first call | second call returned normally | 0 | 0 | callback presence was being used as operation ownership; the native failure again reached only `jsError()` |

Each scenario performed explicit cleanup before the next one. The probe
therefore also confirmed that the API remained callable after cancellation,
although it did not correct the lost completion of the accepted operation.

The separate `esp32_wifi_connect_overlap_repl.js` reproduction reduces the
first scenario to a copy-pasteable Web IDE program. On the same firmware it
reported `ESP_ERR_WIFI_STATE`, printed `connection 2 returned normally`, and
then reported zero callbacks for both calls after 30 seconds.

### Valid reconnect control

The retained valid trace began with the station already connected because the
preceding capture ended after initiating the connection. It is consequently a
reconnect control rather than a clean disconnected-start control.

Calling `connect("valid")` produced:

- `associated` at 6,147 ms;
- `connected`, with a usable IPv4 address, at 7,758 ms;
- one successful connection callback at 8,106 ms; and
- a connected observation at 19,822 ms.

This demonstrates normal successful completion on the tested image. The clean
disconnected-start connection used by the deliberate-disconnect control
produced the same associated, IP-ready and single-callback sequence.

### Incorrect password

The 20-second application observation timer expired at approximately 21.3
seconds while the native connection attempt was still active. The native
driver subsequently produced:

- one `disconnected` event at 22,155 ms, reason 15,
  `4WAY_HANDSHAKE_TIMEOUT`; and
- one connection callback at 22,457 ms with
  `4WAY_HANDSHAKE_TIMEOUT`.

No further Wi-Fi event or connection callback was observed through 64,876 ms.
The application timer observed the still-running operation but did not cancel
or reinterpret it.

### Unavailable network

The repeat run produced:

- one `disconnected` event at 15,893 ms, reason 201, `NO_AP_FOUND`;
- cancellation of the still-armed 20-second observation timer;
- one connection callback at 16,233 ms with `NO_AP_FOUND`; and
- no further Wi-Fi event or connection callback through 51,843 ms.

No `associated`, `connected` or `dhcp_timeout` event occurred. This confirms
that an unavailable network can terminate through `disconnected` and the
per-call callback without first establishing a usable connection.

### Deliberate disconnect

The control began disconnected with status `NO_AP_FOUND`, then completed a
normal connection:

- `associated` at 6,474 ms;
- `connected`, with a usable IPv4 address, at 8,023 ms; and
- one successful connection callback at 8,370 ms.

After the deliberate disconnect request, its callback ran at 13,203 ms and
again at 13,521 ms. One public `disconnected` event followed at 13,741 ms with
reason 8, `ASSOC_LEAVE`. The final observation at 24,592 ms remained
disconnected with no IP address.

This result is supporting evidence for the planned disconnect-hardening work;
it is not part of the PR2 connection fix.

## Retained Logs

| Log | SHA-256 |
|---|---|
| `connect-overlap-repl.log` | `56e63f77a6a2006f3dd7384de183abb82bbbdb135070a81ac0439dda0e657152` |
| `connect-overlap.log` | `7ca090bc1410658c9523def91f92436ac630dbceec48c2fab32948b39861dd41` |
| `valid-connection.log` | `4b4a587ed3ae26dc08c7ec4af1e45dbd777e85927a1644b826cbe9a07082501f` |
| `incorrect-password.log` | `c2cf86d40b75ddb1aaed3285c5e67db09b0d2985e0aaa716f6534f3ceec529a0` |
| `unavailable-network.log` | `94bb8fcf51e7ad801824cf57011fdc7e2757ebb0ce0010c6f2399e311e5d20f7` |
| `deliberate-disconnect.log` | `372b96c762193279577a589d89e647ee6fde9dd4a0c2062ea692e48618c4182b` |

Configured SSIDs and passwords were replaced in every retained transcript.
All retained logs were then scanned against every configured value and had
zero matches. The firmware debug path itself printed the supplied password;
removing that diagnostic exposure is therefore a requirement of PR2.

## Excluded Transport Attempt

The first unavailable-network run reached `NO_AP_FOUND`, but the USB console
returned `EIO` while the later observation marker was being sent. The
persistent by-id device re-enumerated from `/dev/ttyACM0` to `/dev/ttyACM1`.

The target had not reset: after reconnecting, it reported approximately 519
seconds of uptime, no error flags, and the same board, version and source
revision. That incomplete capture was excluded and the unavailable-network
test was repeated successfully. The re-enumeration is retained as a bench
transport observation and is not attributed to the Wi-Fi firmware behaviour.

## Disposition

Phase 1 of the asynchronous-operation hardening completion plan is complete.
The evidence supports defining the PR2 connection contract before changing
the firmware. The board was left disconnected, with the explicit diagnostic
profiles retained in `Storage` for the next qualification work.
