# ESP32 Ping Classic Legacy And IDF4 Comparison

Date: 2026-11-03

## Purpose

This comparison separates pre-IDF5 `Wifi.ping()` behaviour from the focused
ESP32 IDF5 hardening candidate. It checks whether the previously observed C3
IDF4 absence of JavaScript ping callbacks is shared by a dual-core classic
ESP32, and provides a classic IDF3 regression reference.

The results do not extend the scope of the IDF5 candidate. They identify
limitations in the older shared ping backend that should be investigated
separately.

## Source And Bench Identity

| Item | Value |
|---|---|
| Source branch | `fix/esp32-idf5-ping-hardening` |
| Exact source revision | `70555065f` |
| Build type | `RELEASE=1` |
| Target | ESP32-D0WD-V3, revision 3.1 |
| MAC | `08:b6:1f:70:15:18` |
| Console | persistent USB-UART by-path |

Clean exact-revision builds passed for both `ESP32` and `ESP32_IDF4`. Each
image was flashed to the same physical classic ESP32 and its runtime board,
version and Git revision were checked before testing:

| Build | ESP-IDF | Espruino | Git revision |
|---|---|---|---|
| `ESP32` | legacy 3.x | `2v29.500` | `70555065f` |
| `ESP32_IDF4` | 4.4.8 | `2v29.500` | `70555065f` |

## Reproducers

| Probe | SHA-256 |
|---|---|
| `esp32_wifi_ping_ipv4_parse.js` | `a026feb75cca45a1a9f6d583d0bd89dd73a94bb8bd5cc2a90f83b935a3992e41` |
| `esp32_wifi_ping_overlap.js` | `01d591589ff24933e8c9cd4ddeb10798cacb709e764867d31168b051246c996a` |
| `esp32_wifi_ping_legacy_two_sessions.js` | `e256004b4ea52c7ee02a0df48d3307ec16e72fc41a4357b85bab2512c81c9e53` |
| `esp32_wifi_ping_legacy_sequential.js` | `99d5e71275369afa2fc4d9c6393d510f87186dcc3ef5b8af0359bb3882f7757f` |

The legacy-specific probes wait for six callbacks because the older backend
delivers five per-request results followed by a duplicated cumulative terminal
summary. They are characterisation tests, not assertions that six callbacks
are the desired API contract.

## Classic IDF4 Results

### Loopback callback delivery

`Wifi.ping("127.0.0.1", callback)` was accepted and JavaScript received six
callbacks. The cumulative `totalCount` sequence was `1,2,3,4,5,5`, while
`seqNo` advanced from 1 through 6. On this backend loopback was reported as a
series of timeouts with zero received bytes.

Two strictly sequential sessions completed after the probe waited for each
sixth callback. This establishes that classic IDF4 can deliver results and
reuse the backend when calls are serialized according to its observed
lifecycle.

### Overlap

Two immediate ping calls were both accepted. The native `ping` task then
repeatedly triggered task-watchdog diagnostics and the JavaScript probe did
not reach its `DONE` marker. The run was stopped and the board was
hardware-reset before further testing.

This is a failure of the older backend's overlap handling. It is outside the
IDF5-only ownership guard in the current candidate.

## Classic Legacy IDF3 Results

An isolated two-session run passed. Each session produced the same six-result
shape, with cumulative `totalCount` values `1,2,3,4,5,5` and `seqNo` values
1 through 6. Unlike the IDF4 loopback result, received bytes accumulated by
32 bytes per request to 160 bytes.

A longer strictly sequential run completed eight sessions before the
250-second host deadline. It produced no firmware failure before the deadline,
but it did not reach the requested 28 sessions or a `DONE` marker and is not
recorded as a soak pass. The old backend's loopback cycle is too slow for the
IDF5 soak's time budget.

### Reset boundary observation

The general IPv4 probe declares completion after the fifth callback, matching
the IDF5 contract. On legacy IDF3, its sixth terminal callback was therefore
still outstanding when the runner issued `reset()`. Starting another ping
after that reset produced a `jsvUnLockInline` assertion and reboot. A hardware
reset followed by the isolated two-session probe passed.

Source inspection is consistent with this observation: the older path retains
a global JavaScript callback and has no IDF5-style wrapper kill hook. The
single sequence is evidence of a reset/lifetime hazard, not by itself a claim
that every legacy reset will fail.

## C3 IDF4 Comparison

The same-source C3 IDF4 loopback probe accepted the ping call but delivered no
JavaScript callbacks. Earlier controlled C3 IDF4 testing also showed a working
network link while the C3's own `Wifi.ping()` callback remained absent.

The classic IDF4 result narrows that symptom: the shared older backend can
deliver callbacks on the dual-core classic ESP32, whereas it can starve result
delivery on the single-core C3. This is consistent with native ping-task
priority and scheduling being the cause of the C3 zero-callback symptom. It is
an evidence-based inference rather than proof from the callback trace alone.

Overlap and reset ownership are separate shared-backend concerns. Classic IDF4
accepted overlapping sessions and wedged the native ping task; C3 IDF4 also
accepted overlap. Raising task priority may restore C3 callback execution, but
would not by itself serialize sessions or make callback lifetime safe across
`reset()`.

## Invalid Or Bounded Runs

- One IDF4 overlap upload was truncated by the serial uploader and was
  discarded. The result above comes from a clean re-upload after hardware
  reset.
- One early long-soak upload was corrupted and crashed because a callback
  parameter name was truncated. It is excluded from firmware evidence.
- The legacy 28-session attempt reached eight sessions before the harness
  deadline and is recorded only as bounded reuse evidence.

## Assessment

The classic regression provides two useful distinctions:

1. the C3 IDF4 zero-callback result is not universal across IDF4 hardware and
   is consistent with single-core scheduling starvation;
2. overlap acceptance, duplicated terminal delivery and reset callback
   lifetime belong to the older backend itself and need separate treatment.

The IDF5 candidate should remain scoped to the new ESP-IDF 5 session API. The
older backend findings should be retained for a follow-up design rather than
folded into the current ping PR without their own implementation and test
matrix.
