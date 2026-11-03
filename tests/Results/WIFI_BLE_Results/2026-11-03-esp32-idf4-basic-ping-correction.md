# ESP32 IDF4 Basic Ping Correction Qualification

Date: 2026-11-03

## Conclusion

The narrowly guarded ESP-IDF 4 `Wifi.ping()` correction at Espruino revision
`bc5f06466` restores successful IPv4 loopback ping operation on classic ESP32,
ESP32-C3 and ESP32-S3 IDF4 builds.

The correction has two IDF4-only parts:

1. configure ping through ESP-IDF 4's typed `esp_ping` session API instead of
   passing a binary address to the older text-address adapter; and
2. run the native ping task at priority 6, above Espruino's priority-5
   interpreter task, so it is not starved on the single-core ESP32-C3.

All three IDF4 targets accepted `"127.0.0.1"`, delivered five successful
per-request results and completed two strictly serialized sessions. The
existing IDF4 JavaScript result shape was deliberately retained: each session
delivered its five request results followed by the older duplicated cumulative
terminal callback.

The change does not extend IDF5 lifecycle hardening to IDF4. Overlap rejection,
reset cancellation, native-to-JavaScript result queuing and native task reaping
remain guarded to IDF5. Classic IDF3 is also unchanged.

## Source And Change Identity

| Item | Value |
|---|---|
| Source repository | `/home/simon/MaBecker/Espruino_master` |
| Source branch | `fix/esp32-idf4-basic-ping` |
| Qualified revision | `bc5f06466` |
| Qualified parent | `70555065f` |
| Build type | `RELEASE=1` |
| Runtime version | `2v29.502` |

The IDF4 correction is split into two commits:

| Commit | Purpose |
|---|---|
| `b53aa5707` | configure IDF4 ping through the typed session API while preserving the legacy terminal callback |
| `bc5f06466` | set the IDF4 ping task priority to 6 |

The branch also contains the six previously qualified IDF5 ping-hardening
commits from `919bd2cce` through `70555065f`. The IDF4 code is selected only by
`ESP_IDF_VERSION_MAJOR == 4`; the IDF3 and IDF5 implementations remain on
their existing branches.

## Physical Targets

| Target | Build definition | Identity |
|---|---|---|
| classic ESP32 | `ESP32`, `ESP32_IDF4`, `ESP32_IDF5` | ESP32-D0WD-V3 revision 3.1, MAC `08:b6:1f:70:15:18` |
| ESP32-C3 | `ESP32C3_IDF4`, `ESP32C3_IDF5` | Seeed Studio XIAO ESP32-C3 revision 0.3, MAC `a0:76:4e:79:90:a0` |
| ESP32-S3 | `ESP32S3_IDF4`, `ESP32S3_IDF5` | ESP32-S3 QFN56 revision 0.1 with 8 MB embedded PSRAM, MAC `68:b6:b3:27:2c:40` |

All flashing used the persistent USB by-path for the intended target. Flash
hashes were verified by `esptool`.

## Reproducers

| Probe | SHA-256 |
|---|---|
| `esp32_wifi_ping_ipv4_parse.js` | `a026feb75cca45a1a9f6d583d0bd89dd73a94bb8bd5cc2a90f83b935a3992e41` |
| `esp32_wifi_ping_legacy_two_sessions.js` | `e256004b4ea52c7ee02a0df48d3307ec16e72fc41a4357b85bab2512c81c9e53` |
| `esp32_wifi_ping_overlap.js` | `01d591589ff24933e8c9cd4ddeb10798cacb709e764867d31168b051246c996a` |
| `esp32_wifi_ping_no_callback_overlap.js` | `f4d9d3b5d25fefc7bd664510cdf065a8a7c86d4793976524cc45289d1804e232` |
| `esp32_wifi_ping_reset.js` | `a98948f54542d6741f8afd1264e558d97a7fc37b57dcbe78d60db07decdb2f15` |
| `esp32_wifi_ping_loopback_soak.js` | `10d09e311cbb9493ae3cf574f541a54eac2f48c3fed71303912bdbbee465bd42` |
| `run_test.py` | `7f33ed898285d4faf9edae8d2b5a969a2768e1ebd80f3c903fb66065f780e841` |
| `run_wifi_ping_reset_probe.py` | `86714adff18339f4136ad2d087cc33435d1c37bc9f64d2421e210e59a7754e5f` |

No Wi-Fi credentials, access point or peer device were required because the
functional probes used IPv4 loopback.

## Baseline

An exact-parent clean `ESP32C3_IDF4` image was built from `70555065f`, flashed
to the C3 and checked at runtime before applying the correction. The IPv4
loopback call was accepted, but no JavaScript callback arrived during the
seven-second observation period:

| Field | Result |
|---|---|
| board | `ESP32C3_IDF4` |
| source revision | `70555065f` |
| call accepted | yes |
| callback count | 0 |

This reproduced the C3 IDF4 ping-task starvation result on the immediate
parent. Earlier same-parent evidence had already established the separate
IDF4 address mismatch on dual-core classic and S3 targets: their native tasks
ran, but loopback requests timed out.

## IDF4 Runtime Results

Clean exact-revision images from `bc5f06466` were flashed to each IDF4 target.
The runtime board name, version and embedded Git revision were checked before
interpreting each trace.

### Successful loopback operation

| Target | Call | Request callbacks | Final bytes | Timeouts | Errors | Result |
|---|---|---:|---:|---:|---:|---|
| classic `ESP32_IDF4` | accepted | 5 | 320 | 0 | 0 | pass |
| `ESP32C3_IDF4` | accepted | 5 | 320 | 0 | 0 | pass |
| `ESP32S3_IDF4` | accepted | 5 | 320 | 0 | 0 | pass |

For every target, cumulative `totalCount` advanced from 1 through 5,
`totalBytes` advanced by 64 bytes per request to 320, and every result reported
zero timeouts and zero errors. This confirms both native execution on C3 and
correct typed IPv4 target configuration on all three IDF4 families.

### Serialized reuse and legacy compatibility

Two sessions were then run strictly sequentially on every IDF4 target. The
second session started only after the first session's terminal callback.

| Target | Session 1 | Session 2 | Result shape |
|---|---|---|---|
| classic `ESP32_IDF4` | completed | completed | `totalCount` 1,2,3,4,5,5; `seqNo` 1-6 |
| `ESP32C3_IDF4` | completed | completed | `totalCount` 1,2,3,4,5,5; `seqNo` 1-6 |
| `ESP32S3_IDF4` | completed | completed | `totalCount` 1,2,3,4,5,5; `seqNo` 1-6 |

All ten actual requests on each target succeeded. The sixth result in each
session is the deliberately preserved terminal cumulative callback, not a
sixth ICMP request. This compatibility behavior is local to the older backend
and is not treated as the desired IDF5 contract.

## Unchanged IDF3 Check

A clean `ESP32` legacy-IDF3 image from the same final revision was flashed to
the classic board. The legacy-aware two-session probe passed: both sessions
delivered `totalCount` values `1,2,3,4,5,5`, `seqNo` values 1 through 6 and 160
cumulative bytes.

The general five-result probe was also attempted. It declared its fifth result
complete, after which the runner reset the JavaScript runtime while IDF3's
sixth terminal callback was still outstanding. The board then reproduced the
previously recorded legacy callback-lifetime assertion and reboot. This is not
an IDF4-patch regression: the IDF3 implementation is outside both new guards,
and the subsequent isolated legacy-aware probe passed.

## IDF5 Regression And Restoration

Clean IDF5 images from the final revision were built, flashed and checked on
all three physical targets. Each loopback smoke test produced five successful
callbacks, 320 cumulative bytes and no timeout or error:

| Target | Build | Embedded revision | Loopback result |
|---|---|---|---|
| classic ESP32 | `ESP32_IDF5` | `bc5f06466` | pass |
| ESP32-C3 | `ESP32C3_IDF5` | `bc5f06466` | pass |
| ESP32-S3 | `ESP32S3_IDF5` | `bc5f06466` | pass |

The C3 received the broader exact-head regression because it is the
single-core target that motivated the scheduling correction:

| Probe | Result |
|---|---|
| overlapping sessions | second call rejected; first callback received all 5 results |
| callback-less active session | overlap rejected; later recovery delivered 5 results |
| reset during successful session | no stale/unknown callbacks; recovery delivered 5 results |
| reset during timeout session | no stale/unknown callbacks; recovery delivered 5 results |
| reset with final callback already queued | one pre-teardown callback completed; no unknown callback; recovery delivered 5 results |
| repeated-session soak | 28 sessions, 140 callbacks, final heap delta 0 bytes |

The bench therefore finishes with classic, C3 and S3 all running exact-head
IDF5 firmware, rather than any of the deliberately limited comparison images.

## Clean Build Matrix

All seven ESP32 build definitions completed clean release builds at
`bc5f06466`:

| Build | Image size | Smallest app partition free | Result |
|---|---:|---:|---|
| `ESP32` | 1,526,576 bytes | 46,288 bytes | pass |
| `ESP32_IDF4` | `0x15b710` | 31% | pass |
| `ESP32C3_IDF4` | `0x1d55f0` | 6% | pass |
| `ESP32S3_IDF4` | `0x1aba60` | 14% | pass |
| `ESP32_IDF5` | `0x17a1e0` | 24% | pass |
| `ESP32C3_IDF5` | `0x19e250` | 17% | pass |
| `ESP32S3_IDF5` | `0x17ddf0` | 24% | pass |

The C3 IDF4 image is the tightest target but still fits its configured app
partition with 6% free.

## Excluded Harness Artifacts

The first legacy two-session upload on classic IDF4 and the first on S3 IDF4
each lost the initial `p` from a final `print` call. Both native sessions and
all twelve callbacks had already completed, but the resulting `lrint` error
prevented the runner's `DONE` marker. Each test was re-uploaded and passed
cleanly; only the clean reruns are used as qualification evidence.

## Disposition

The IDF4 correction is complete and qualified across classic ESP32, ESP32-C3
and ESP32-S3. It restores basic successful ping operation without importing
the materially larger IDF5 ownership/lifetime solution into older builds.

The two IDF4 commits are suitable for inclusion in the same overall ping PR as
the existing parser and IDF5 hardening commits, while retaining their narrow
version guards and separate commit history.
