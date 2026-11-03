# ESP32-S3 IDF4 Ping Functional Characterisation

Date: 2026-11-03

## Conclusion

The ESP32-S3 IDF4 build can run the older native ping task and deliver its
results to JavaScript, but it does not provide a safe or correct
`Wifi.ping()` lifecycle at Espruino revision `70555065f`.

Four functional probes found that:

1. a loopback IPv4 string was accepted but all five requests timed out with
   zero received bytes, followed by a duplicated terminal callback;
2. two serialized sessions completed, confirming that the dual-core S3 can
   deliver older-backend callbacks when operations do not overlap;
3. two overlapping sessions shared the second callback and cumulative result
   state, although the S3 remained responsive; and
4. `reset()` during an active session left native work targeting the discarded
   JavaScript runtime, producing invalid event-queue callbacks, assertions and
   reboots.

These findings agree with the separately recorded classic and C3 comparisons:
the address contract, session ownership and reset lifetime are older shared
backend defects, while the C3 zero-callback symptom is consistent with an
additional single-core scheduling problem. They remain outside the focused
ESP-IDF 5 candidate.

## Source And Bench Identity

| Item | Value |
|---|---|
| Source branch | `fix/esp32-idf5-ping-hardening` |
| Exact source revision | `70555065f` |
| Build definition | `ESP32S3_IDF4` |
| ESP-IDF | 4.4.8 |
| Build type | `RELEASE=1` |
| Runtime version | `2v29.500` |
| Target | ESP32-S3 QFN56, revision 0.1, 8 MB embedded PSRAM |
| MAC | `68:b6:b3:27:2c:40` |
| Console | persistent USB-UART by-path |

A clean exact-revision build passed. The resulting `espruino.bin` was
`0x1abb50` bytes with 14% of the smallest application partition free. Flash
hashes were verified and the runner confirmed `ESP32S3_IDF4`, `2v29.500` and
`70555065f` before testing.

No Wi-Fi credentials or peer hardware were required. The probes requested the
IPv4 loopback address, and the board was hardware-reset between destructive or
stateful cases.

## Reproducers

| Probe | SHA-256 |
|---|---|
| `esp32_wifi_ping_ipv4_parse.js` | `a026feb75cca45a1a9f6d583d0bd89dd73a94bb8bd5cc2a90f83b935a3992e41` |
| `esp32_wifi_ping_legacy_two_sessions.js` | `e256004b4ea52c7ee02a0df48d3307ec16e72fc41a4357b85bab2512c81c9e53` |
| `esp32_wifi_ping_overlap.js` | `01d591589ff24933e8c9cd4ddeb10798cacb709e764867d31168b051246c996a` |
| `esp32_wifi_ping_reset.js` | `a98948f54542d6741f8afd1264e558d97a7fc37b57dcbe78d60db07decdb2f15` |
| `run_wifi_ping_reset_probe.py` | `86714adff18339f4136ad2d087cc33435d1c37bc9f64d2421e210e59a7754e5f` |
| `run_test.py` | `7f33ed898285d4faf9edae8d2b5a969a2768e1ebd80f3c903fb66065f780e841` |

The legacy-specific two-session probe waits for six callbacks because the
older backend delivers five per-request results followed by a duplicated
cumulative terminal result. This characterises the observed implementation;
it is not the desired public API contract.

## Functional Results

### IPv4 loopback and callback delivery

`Wifi.ping("127.0.0.1", callback)` was accepted. Each of the five configured
requests emitted the native diagnostic `ping_sock: send error=0` and produced
a JavaScript result with zero bytes and a one-second response time. The
cumulative timeout count advanced from 1 through 5.

After the probe's fifth-result `DONE` marker, the backend delivered a sixth
callback with `totalCount: 5`, `timeoutCount: 5` and `seqNo: 6`. This is the
older backend's duplicated terminal result, not a sixth request.

The failure is consistent with the identified IDF4 address-API mismatch:
Espruino supplies a binary IPv4 value while this ESP-IDF interface parses the
argument as text. The runtime trace alone establishes the failed loopback
operation; source analysis supplies the explanation.

### Serialized session reuse

Two sessions started strictly sequentially and both completed. Each produced
six callbacks with cumulative `totalCount` values `1,2,3,4,5,5` and `seqNo`
values 1 through 6. All ten actual requests timed out with zero received bytes.

This demonstrates callback execution and serialized reuse on the dual-core
S3. It does not demonstrate a successful ping to the requested address.

### Overlapping sessions

Two immediate calls were both accepted. The first callback received no
results; the second callback received all 12 queued results. Its cumulative
`totalCount` sequence was:

```text
1,2,3,4,5,6,7,8,9,9,1,1
```

`seqNo` advanced from 1 through 12. All results reported timeouts and zero
bytes. The reset to `1,1` at the end is consistent with one native session
finishing and resetting shared result state while callbacks from the other
session were still being delivered.

The test failed because the first session's callback was overwritten and the
two sessions shared cumulative state. Unlike the classic IDF4 overlap run, the
S3 remained responsive and did not trigger task-watchdog diagnostics.

### JavaScript reset and native-session lifetime

The reset runner exercised three modes:

| Mode | Invalid callback errors | Recovery accepted | Recovery callbacks | Result |
|---|---:|---|---:|---|
| active loopback session | 6 | `false` | 0 | assertion and reboot |
| active timeout session | 6 | `false` | 0 | assertion and reboot |
| completion queued before teardown | 0 | `true` | 6 | assertion/reboot before recovery; legacy result count |

In both active-session modes, six post-reset events reported
`ERROR: Unknown type of callback in Event Queue`. Espruino then failed the
`jsvUnLockInline` lock assertion and rebooted before a recovery ping could be
accepted.

The queued-completion mode failed a `jsvGetMaxCharactersInVar` assertion and
rebooted. Its subsequent recovery session was accepted and delivered six
legacy callbacks. The IDF5-specific runner correctly rejected that as an
incomplete five-result recovery contract.

These results demonstrate that the older native session can outlive the
JavaScript runtime that owns its callback. The S3 transcript also contained
the previously observed ESP-IDF `GPIO number error` diagnostics during pin
reset; they are retained as a separate reset observation and are not
attributed to ping.

## Cross-Family Interpretation

| Behaviour | Classic IDF4 | C3 IDF4 | S3 IDF4 |
|---|---|---|---|
| Native call accepted | yes | yes | yes |
| JavaScript result delivery | yes | absent in the recorded C3 run | yes |
| Requested loopback succeeds | no | not demonstrated | no |
| Overlap safely rejected | no | no | no |
| Callback/session lifetime safe across `reset()` | no | no | no |

S3 callback delivery strengthens the inference from the classic comparison:
the C3's absent callbacks are not a universal IDF4 result-delivery failure and
are consistent with starvation of the native ping task on the single-core C3.
Changing task priority would not correct the shared address, overlap or reset
ownership defects demonstrated here.

## Bench Restoration

After characterisation, a clean `ESP32S3_IDF5` build from the same revision was
flashed through the persistent S3 serial path. Flash hashes were verified. A
final loopback probe confirmed:

- board definition `ESP32S3_IDF5`;
- Espruino `2v29.500`;
- Git revision `70555065f`; and
- five successful callbacks, 320 cumulative bytes and no timeout or error.

The S3 therefore finishes this run on the qualified IDF5 candidate rather than
the deliberately defective comparison image.

## Excluded Setup Attempt

An initial Makefile flash command ignored its supplied S3 port and selected the
C3 default port. `esptool` detected an ESP32-C3 while expecting an ESP32-S3 and
aborted before writing. No board was altered by that attempt. All subsequent
S3 flashes used `idf.py -p` with the persistent S3 by-path device.

## Disposition

The S3 IDF4 functional run is complete. It adds a second dual-core comparator
for the older backend and confirms that callback scheduling, address handling,
overlap ownership and reset lifetime must be treated as distinct concerns.
The existing IDF5 ping candidate and PR scope should remain IDF5-specific;
older-backend hardening requires its own design and qualification matrix.
