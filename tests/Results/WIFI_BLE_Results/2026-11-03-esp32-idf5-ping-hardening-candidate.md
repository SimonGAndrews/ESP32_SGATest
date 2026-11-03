# ESP32 IDF5 Ping Hardening Candidate Qualification

Date: 2026-11-03

## Conclusion

The six-commit ESP32 IDF5 `Wifi.ping()` candidate at Espruino revision
`70555065f` passes focused runtime qualification on classic ESP32, ESP32-C3
and ESP32-S3 hardware and clean builds for all three IDF5 families.

Final C3 qualification covered IPv4 parsing, five-result delivery, overlapping
session rejection, callback-less session ownership, recovery, JavaScript
`reset()` during success and timeout operations, queued completion during
reset, and 28 repeated loopback sessions. The repeated-session test delivered
140 callbacks with a final native-heap change of -32 bytes.

The same focused probes subsequently passed on ESP32-S3. Its repeated-session
test delivered 140 callbacks with a final native-heap change of -12 bytes.

Classic ESP32 then passed the same focused probes. Its repeated-session test
delivered 140 callbacks with a final native-heap change of -28 bytes.

Qualification initially exposed an additional native-task reclamation defect.
The parent candidate completed 24 sessions and 120 callbacks before native free
heap fell by 70,064 bytes and `esp_ping_new_session()` returned
`ESP_ERR_NO_MEM`. Commit `70555065f` adds a bounded interpreter yield after
asynchronous ESP-IDF session deletion so the native ping task can exit and the
FreeRTOS idle task can reclaim its stack and TCB.

## Source And Bench Identity

| Common item | Value |
|---|---|
| Final runtime commit | `70555065f` |
| Source branch | `fix/esp32-idf5-ping-hardening` |
| Upstream base | `3b5c8d97f` |
| ESP-IDF | 5.5.3 |
| Build type | `RELEASE=1` |

| Runtime target | Board definition | Version | Console |
|---|---|---|---|
| ESP32-D0WD-V3, revision 3.1 | `ESP32_IDF5` | `2v29.500` | persistent USB-UART by-path |
| Seeed Studio XIAO ESP32-C3 | `ESP32C3_IDF5` | `2v29.500` | persistent Espressif USB Serial/JTAG by-id path |
| ESP32-S3, revision 0.1, 8 MB embedded PSRAM | `ESP32S3_IDF5` | `2v29.500` | persistent USB-UART by-id path |

All three targets were left flashed with their IDF5 board definitions at
`70555065f`. The tests used loopback or a documentation-only timeout address;
no Wi-Fi credentials or peer hardware were required.

## Candidate Commits

1. `919bd2cce` — restore IPv4 string parsing;
2. `08739ca25` — complete ESP-IDF 5 ping sessions safely;
3. `77e30bebb` — deliver ping results across ESP32 targets;
4. `99cc0a5d4` — harden ping result handoff;
5. `db60cfe9b` — cancel ping safely on JavaScript reset;
6. `70555065f` — reap completed native ping tasks.

## Reproducers

| Probe | SHA-256 |
|---|---|
| `esp32_wifi_ping_ipv4_parse.js` | `a026feb75cca45a1a9f6d583d0bd89dd73a94bb8bd5cc2a90f83b935a3992e41` |
| `esp32_wifi_ping_overlap.js` | `01d591589ff24933e8c9cd4ddeb10798cacb709e764867d31168b051246c996a` |
| `esp32_wifi_ping_no_callback_overlap.js` | `f4d9d3b5d25fefc7bd664510cdf065a8a7c86d4793976524cc45289d1804e232` |
| `esp32_wifi_ping_reset.js` | `a98948f54542d6741f8afd1264e558d97a7fc37b57dcbe78d60db07decdb2f15` |
| `esp32_wifi_ping_loopback_soak.js` | `10d09e311cbb9493ae3cf574f541a54eac2f48c3fed71303912bdbbee465bd42` |
| `run_wifi_ping_reset_probe.py` | `86714adff18339f4136ad2d087cc33435d1c37bc9f64d2421e210e59a7754e5f` |
| `run_test.py` | `7f33ed898285d4faf9edae8d2b5a969a2768e1ebd80f3c903fb66065f780e841` |

## Runtime Results

### IPv4 parsing and result delivery

On all three runtime targets, `Wifi.ping("127.0.0.1", callback)` was accepted and
delivered five result objects. `totalCount` and `seqNo` advanced from 1 through
5, the final `totalBytes` was 320, and no timeout or error was reported.

### Overlapping session ownership

On all three runtime targets, the first loopback session was accepted. An immediate
second call threw the catchable exception
`Error: A ping is already in progress`. The first callback received all five
results and the rejected callback received none.

A callback-less first session exhibited the same ownership on each target. Its
overlap was rejected, and a later recovery session was accepted and delivered
five callbacks.

### Reset and recovery

| Target | Mode | Old callbacks after reset requested | Unknown callback errors | Recovery callbacks | Recovery complete |
|---|---|---:|---:|---:|---|
| C3 | active loopback success | 0 | 0 | 5 | `true` |
| C3 | active timeout target | 0 | 0 | 5 | `true` |
| C3 | completion queued before teardown | 1 | 0 | 5 | `true` |
| S3 | active loopback success | 0 | 0 | 5 | `true` |
| S3 | active timeout target | 0 | 0 | 5 | `true` |
| S3 | completion queued before teardown | 1 | 0 | 5 | `true` |
| classic | active loopback success | 0 | 0 | 5 | `true` |
| classic | active timeout target | 0 | 0 | 5 | `true` |
| classic | completion queued before teardown | 1 | 0 | 5 | `true` |

In the queued-final mode, one already queued callback ran after `reset()` was
requested but before interpreter teardown. This follows Espruino's existing
main-loop ordering: queued events are serviced before the deferred reset and
wrapper kill hooks. No callback targeted the discarded runtime, no invalid
event-queue diagnostic occurred, and recovery completed in every mode.

The S3 reset transcript also contained ESP-IDF `GPIO number error`
diagnostics while the interpreter reset its pin state. They did not prevent
ping cleanup or recovery and are retained as a separate reset observation,
not attributed to this ping candidate.

### Repeated-session and heap qualification

The first soak against parent candidate `db60cfe9b` failed:

| Metric | Failed candidate |
|---|---:|
| completed sessions | 24 of 28 |
| callbacks | 120 |
| first free heap | 71,304 bytes |
| lowest/final free heap | 1,240 bytes |
| final delta | -70,064 bytes |
| terminal error | `ESP_ERR_NO_MEM` |

Source inspection showed that ESP-IDF 5.5 `esp_ping_delete_session()` clears an
initialisation flag and returns. The native ping task frees its resources on a
later timed wake and self-deletes. FreeRTOS requires an idle task to reclaim a
self-deleted task's stack and TCB, but the active single-core Espruino USB
interpreter can keep that idle task from running.

After commit `70555065f`, the same test passed on all three runtime targets:

| Metric | classic | C3 | S3 |
|---|---:|---:|---:|
| completed sessions | 28 of 28 | 28 of 28 | 28 of 28 |
| callbacks | 140 | 140 | 140 |
| first free heap | 63,632 bytes | 71,300 bytes | 108,960 bytes |
| lowest free heap | 63,604 bytes | 71,268 bytes | 108,920 bytes |
| final free heap | 63,604 bytes | 71,268 bytes | 108,948 bytes |
| final delta | -28 bytes | -32 bytes | -12 bytes |

## Build Coverage

Clean exact-final-commit builds passed for:

- `ESP32_IDF5`;
- `ESP32C3_IDF5`;
- `ESP32S3_IDF5`.

Exact-final-commit clean builds also passed for classic `ESP32` and
`ESP32_IDF4`. Before the final IDF5-only reap commit, the same branch completed
clean builds for `ESP32C3_IDF4` and `ESP32S3_IDF4`. The reap implementation is
inside the existing ESP-IDF-major-version guard and does not enter those older
build paths.

## Disposition

The ESP32 IDF5 ping candidate has passed focused runtime qualification across
classic ESP32, C3 and S3 and is ready for review and PR preparation. The
separately recorded classic IDF3/IDF4 behaviour is not corrected or claimed by
this IDF5 candidate and remains a distinct follow-up investigation.
