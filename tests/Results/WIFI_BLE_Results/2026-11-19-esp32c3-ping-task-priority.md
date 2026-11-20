# ESP32-C3 `Wifi.ping()` Task-Priority Probe

Date: 2026-11-19

Upstream status: merged through Espruino PR `#2793` on 2026-11-20. The
focused candidate commit `1b820a413` is contained unchanged in upstream merge
commit `e58f6ca81`.

## Conclusion

On exact Espruino `master` commit `fe558e4b3`, an ESP32-C3 accepted a
loopback `Wifi.ping()` request but delivered no callback during the seven
second observation period. A candidate based on that commit with only a
comment and `ping_config.task_prio = 6` added delivered all five expected
callbacks.

The physical before-and-after result confirms that ESP-IDF's default
priority-2 ping task is starved by Espruino's priority-5 interpreter task on
the single-core C3. Clean builds and physical loopback tests also passed on
the classic ESP32 and ESP32-S3 from the same candidate commit.

## Test Identity

| Item | Value |
|---|---|
| Espruino base | `fe558e4b3c90a3bde513d45ab55fcff0bf33be98` |
| Baseline Espruino version | `2v29.524` |
| Candidate Espruino version | `2v29.525` |
| ESP-IDF | 5.5.3 |
| Target | Seeed Studio XIAO ESP32-C3 (`ESP32C3`) |
| Candidate branch | `fix/esp32-ping-task-priority` |
| Candidate commit | `1b820a413f` |
| Candidate change | document the scheduling requirement and set `ping_config.task_prio = 6` after `ESP_PING_DEFAULT_CONFIG()` |
| Reproducer | `docs/investigations/wifi/repros/esp32_wifi_ping_ipv4_parse.js` |
| Build options | `RELEASE=1`, clean target build |

The first priority-6 probe deliberately used an uncommitted one-line change
to isolate causality. The final candidate was then committed, clean-built and
retested on all three available physical targets. Those images report the
candidate Git identity `1b820a413`.

## Source Finding

`targets/esp32/main.c` creates `espruinoTask` at FreeRTOS priority 5.
ESP-IDF's `ESP_PING_DEFAULT_CONFIG()` sets the internal ping task priority to
2, and `esp_ping_new_session()` creates the task with that configured value.

The C3 has one core. If the higher-priority interpreter remains runnable, the
lower-priority ping task cannot perform its native ICMP work or invoke its
result callbacks.

Priority 6 is the lowest FreeRTOS priority above the priority-5 interpreter.
The candidate applies it in the shared consolidated ESP32 ping path rather
than adding a C3-only guard.

## Unmodified Current-Master Result

```text
TEST=esp32_wifi_ping_ipv4_parse
BOARD=ESP32C3
VERSION=2v29.524
GIT_COMMIT=fe558e4b3
CALL_ACCEPTED=true
RESULT=CALL_ACCEPTED_CALLBACK_TIMEOUT
CALLBACK_COUNT=0
DONE=esp32_wifi_ping_ipv4_parse
```

## Priority-6 Diagnostic Result

```text
TEST=esp32_wifi_ping_ipv4_parse
BOARD=ESP32C3
VERSION=2v29.524
GIT_COMMIT=fe558e4b3
CALL_ACCEPTED=true
PING_CALLBACK={"totalCount":1,"totalBytes":64,"totalTime":0,"respTime":0,"seqNo":1,"timeoutCount":0,"bytes":64,"error":0}
PING_CALLBACK={"totalCount":2,"totalBytes":128,"totalTime":0,"respTime":0,"seqNo":2,"timeoutCount":0,"bytes":64,"error":0}
PING_CALLBACK={"totalCount":3,"totalBytes":192,"totalTime":0,"respTime":0,"seqNo":3,"timeoutCount":0,"bytes":64,"error":0}
PING_CALLBACK={"totalCount":4,"totalBytes":256,"totalTime":0,"respTime":0,"seqNo":4,"timeoutCount":0,"bytes":64,"error":0}
PING_CALLBACK={"totalCount":5,"totalBytes":320,"totalTime":0,"respTime":0,"seqNo":5,"timeoutCount":0,"bytes":64,"error":0}
RESULT=CALL_ACCEPTED
CALLBACK_COUNT=5
DONE=esp32_wifi_ping_ipv4_parse
```

## Exact-Candidate Qualification

Clean `RELEASE=1` builds completed for all three available board definitions:

| Board definition | Application size | Free in smallest app partition |
|---|---:|---:|
| `ESP32` | `0x17e6f0` | `0x75910` (24%) |
| `ESP32C3` | `0x19dd10` | `0x562f0` (17%) |
| `ESP32S3` | `0x17d9d0` | `0x76630` (24%) |

The packaged images were preserved during target switching:

| Target | Package SHA-256 |
|---|---|
| `ESP32` | `01639a4c66535475840001c2e859e8c0b7af3624c4c66ba65707ff13e30e341b` |
| `ESP32C3` | `d233c9797aa7b2451dc73c17fd77ab54a87cc7a7c904de27ae7019b197769a8d` |
| `ESP32S3` | `d851f959caae26b1dd90b8f316c81174685224349abeab8d7d7993560a8059ab` |

The same loopback test then passed on each physical target:

| Target | Serial path | Reported version | Reported commit | Callbacks |
|---|---|---|---|---:|
| classic ESP32 | `/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0` | `2v29.525` | `1b820a413` | 5/5 |
| Seeed Studio XIAO ESP32-C3 | `/dev/serial/by-id/usb-Espressif_USB_JTAG_serial_debug_unit_9C:9E:6E:F7:41:64-if00` | `2v29.525` | `1b820a413` | 5/5 |
| ESP32-S3 | `/dev/serial/by-id/usb-Espressif_USB_JTAG_serial_debug_unit_68:B6:B3:27:2C:40-if00` | `2v29.525` | `1b820a413` | 5/5 |

No Wi-Fi connection, peer or harness peripheral was required. Each target
pinged its local loopback address through its normal serial control path;
harness selector state was therefore not material to this test.

## Scope

This probe establishes the scheduling cause of the missing C3 callbacks. It
does not qualify overlapping sessions, reset cleanup, session deletion or the
task context in which JavaScript delivery is queued; those remain separate
ping lifecycle concerns.
