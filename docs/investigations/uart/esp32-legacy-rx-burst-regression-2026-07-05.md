# ESP32 Legacy UART RX Burst Regression

Date: 2026-07-05

## Scope

This note starts a separate UART investigation for the classic ESP32 port,
using the `ESP32_V1` harness UART crosslink mode as the first controlled test
environment.

The immediate trigger is upstream issue:

- <https://github.com/espruino/Espruino/issues/2718>

Issue summary:

- legacy `ESP32` build
- peripheral `Serial` RX loses or mishandles continuous bursts beyond roughly
  64 bytes
- WiFi softAP appears to make the problem worse

This investigation should stay separate from:

- the earlier GPIO and `digitalPulse` work
- the classic ESP32 I2C bring-up issue
- any future external-modem-specific UART diagnostics

## Objective

The first objective is to turn this into a controlled shared functional test so
that the same UART RX burst behavior can be compared across:

- legacy `ESP32`
- `ESP32_IDF4`
- `ESP32_IDF5`

This directly supports Gordon Williams' request in the Espruino discussion
thread to compare the legacy `ESP32` build against the newer IDF4 and IDF5
builds before deciding whether the old build can be retired.

The broader objective is:

1. identify whether the failure is confined to the legacy `ESP32` build or also
   propagates into the newer ESP32-family build lines
2. if the bug is real in legacy `ESP32`, fix it for existing users
3. if the same underlying bug is present in `ESP32_IDF4` or `ESP32_IDF5`, fix
   those lines as well

## Test Context

Hardware target and harness:

- classic ESP32 DevKitC V4 style target
- `ESP32_V1` harness

Harness mode:

- `ESP32_SERIAL_UART1_UART2_CROSSLINK`

Required harness state:

- `SEL_D35` in UART position
- `JP_UART_LOOP2` closed
- UART0 `D1` / `D3` kept as the runner/control path

Logical serial mapping:

- `Serial2`: TX `D4`, RX `D35`
- `Serial3`: TX `D14`, RX `D36`

## Shared Test Under Development

The current shared functional tests for this investigation are:

- [uart_rx_burst_s2_to_s3.js](/home/simon/MaBecker/ESP32_SGATest/tests/repl/uart_block6/uart_rx_burst_s2_to_s3.js)
- [uart_rx_burst_s3_to_s2.js](/home/simon/MaBecker/ESP32_SGATest/tests/repl/uart_block6/uart_rx_burst_s3_to_s2.js)
- [uart_rx_burst_128_s2_to_s3.js](/home/simon/MaBecker/ESP32_SGATest/tests/repl/uart_block6/uart_rx_burst_128_s2_to_s3.js)
- [uart_rx_burst_128_s3_to_s2.js](/home/simon/MaBecker/ESP32_SGATest/tests/repl/uart_block6/uart_rx_burst_128_s3_to_s2.js)
- [uart_rx_burst_200_s2_to_s3.js](/home/simon/MaBecker/ESP32_SGATest/tests/repl/uart_block6/uart_rx_burst_200_s2_to_s3.js)
- [uart_rx_burst_200_s3_to_s2.js](/home/simon/MaBecker/ESP32_SGATest/tests/repl/uart_block6/uart_rx_burst_200_s3_to_s2.js)

Current design intent:

- keep direction-specific and size-specific cases explicit
- cover the original `64`-byte boundary with the direction-pair files
- cover `128` and `200` byte bursts as clean-start single-case files
- keep the JS files directly usable in the REPL while the Python runner acts
  only as transport and parser

## Baseline Result Before Candidate Fix

Bench firmware under test:

- legacy `ESP32` build from `boards/ESP32.py`
- flashed onto the `ESP32_V1` harness target
- `process.env.BOARD == "ESP32"`

Observed result with the shared UART burst test:

- `32` byte burst passes
- `64` byte burst passes
- the run fails at the `65` byte transition before completion

Observed failure in both runner and direct REPL use:

```text
assertion "jsvHasStringExt(it->var)" failed:
file "src/jsvariterator.c", line 466, function: jsvStringIteratorAppend
abort() was called at PC 0x40158883 on core 0
...
Rebooting...
```

So the baseline legacy result was not just a soft `FAIL` line. It was a
firmware assertion and reboot once the RX burst test moved beyond the 64-byte
case.

## Baseline ESP32_IDF4 Comparison Result

Bench firmware under test:

- `ESP32_IDF4`
- version `2v29.93`
- commit `a8d426a80`
- flashed onto the same `ESP32_V1` harness target

Observed result with the same shared UART burst test and the same harness mode:

- `32` byte burst passes
- `64` byte burst passes
- the run fails before the `65` byte case completes

Observed failure:

```text
assert failed: jsvStringIteratorAppend jsvariterator.c:466
(jsvHasStringExt(it->var))
...
Rebooting...
```

This was materially the same failure boundary and same core assertion as the
legacy `ESP32` result.

## Baseline ESP32_IDF5 Comparison Result

Bench firmware under test:

- `ESP32_IDF5`
- version `2v28`
- commit `ca6b3592c`
- flashed onto the same `ESP32_V1` harness target

Observed result with the same shared UART burst test and the same harness mode:

- `32` byte burst passes
- `64` byte burst passes
- from `65` bytes upward, the received data truncates to `64` bytes rather
  than crashing the firmware
- later reverse-direction cases also fail and the overall run hits the test
  timeout

Observed additional raw console output:

```text
ERROR: jshPinSetState: Unexpected state: 0
```

So the baseline IDF5 result was materially different from legacy `ESP32` and
`ESP32_IDF4`:

- no assertion/reboot was observed in this run
- the practical failure mode looks like a `64`-byte receive ceiling or
  truncation in this path

## Baseline Interpretation

This is already useful evidence:

- the failure is reproducible on real classic ESP32 hardware
- it occurs in direct REPL use as well, so it is not a Python-runner artifact
- it appears at the same practical burst boundary reported in the upstream
  issue

Before the candidate fix work, the failure was best described as:

- legacy `ESP32` and `ESP32_IDF4` both become unsafe beyond the `64`-byte
  region in this test scenario and assert/reboot
- `ESP32_IDF5` shows a different symptom: no crash, but practical truncation
  at `64` bytes followed by later-case failure/timeout
- this meant the broad problem was not confined to the legacy `ESP32` build,
  but the failure mode was not identical across all three ESP32-family lines

This established the pre-fix comparison baseline.

## Root-Cause Narrowing On Legacy ESP32

Additional investigation work on the dedicated legacy branch
`investigate/esp32-uart-rx-burst-legacy` has now narrowed the first failure
mode further.

Target-side containment attempt:

- `targets/esp32/jshardwareUart.c` was temporarily changed to push RX data into
  Espruino in smaller chunks before handing it to `jshPushIOCharEvents(...)`
- this did **not** remove the assertion
- so the failure is not solved just by splitting the ESP32 UART handoff at the
  target boundary

Relevant Core behavior now confirmed:

- `src/jsdevices.h` sets `IOEVENT_MAX_LEN` to `64`
- `src/jsinteractive.c:jsiHandleIOEventForSerial()` creates a string from the
  first event chunk and appends later chunks with `jsvAppendStringBuf(...)`
- `jsvNewStringOfLength(...)` can create a flat string for the first chunk
- appending a later chunk onto that flat-string-backed receive path is
  consistent with the assertion in `jsvStringIteratorAppend`

Narrow legacy experiment:

- the legacy branch was then changed in `src/jsinteractive.c` so serial RX
  event data is built incrementally from an empty string instead of creating
  the first receive chunk with `jsvNewStringOfLength(...)`
- with that narrow change in place, the legacy `ESP32` build no longer asserts
  or reboots at `65` bytes
- forward-direction burst cases then passed through at least `200` bytes from a
  clean start

Current reading of that result:

- the legacy crash boundary is strongly tied to Core serial event string
  assembly, not just ESP32 target UART buffering
- the first practical candidate fix is therefore a narrow serial-event-path fix
  rather than a broad ESP32 UART-driver change

## Test-Structure Finding

The current shared test also exposed a second, separate issue in the test
structure itself.

Observed behavior on the modified legacy build:

- `Serial2 -> Serial3` burst runs can pass through `200` bytes from a clean
  start
- `Serial3 -> Serial2` burst runs can also pass through `200` bytes from a
  clean start
- but chaining both directions sequentially inside one JS run causes the second
  direction never to start sending, even though the overall timeout timer still
  fires

Current interpretation:

- this second problem looks like a REPL/test sequencing issue rather than a
  UART RX data-integrity failure
- the old single-script two-direction shape was too coupled for clean
  diagnosis
- the current shared test pack therefore uses separate direction files and
  separate clean-start high-burst files

## Current Legacy Test Pack Result

On the modified legacy `ESP32` investigation build:

- boundary pack passes in both directions:
  - `32`
  - `64`
  - `65`
  - `96`
- clean-start `128` byte single-case tests pass in both directions
- clean-start `200` byte single-case tests pass in both directions

This means the current legacy evidence now supports both parts of the current
working theory:

- the original `65`-byte crash was fixed by the narrow serial-event-path change
- the later failures were primarily test-shape artifacts from chaining too much
  work into one JS run

## Candidate-Fix Result Across All Three ESP32 Lines

The same narrow `src/jsinteractive.c` serial-event change was then carried onto
dedicated investigation branches for:

- legacy `ESP32`
- `ESP32_IDF4`
- `ESP32_IDF5`

Branch names used during investigation:

- `investigate/esp32-uart-rx-burst-legacy`
- `investigate/esp32-uart-rx-burst-idf4`
- `investigate/esp32-uart-rx-burst-idf5`

Candidate-fix shape:

- build serial RX event data from `jsvNewFromEmptyString()`
- append the first received chunk explicitly
- continue appending later same-device chunks on the same path

Bench result on legacy `ESP32`:

- boundary pack passes in both directions:
  - `32`
  - `64`
  - `65`
  - `96`
- clean-start `128` byte tests pass in both directions
- clean-start `200` byte tests pass in both directions

Bench result on `ESP32_IDF4`:

- the previous `65`-byte assertion/reboot is removed
- `32`, `64`, and `65` pass in the boundary pack
- clean-start `128` byte tests pass in both directions
- clean-start `200` byte tests pass in both directions

Bench result on `ESP32_IDF5`:

- the previous practical `64`-byte ceiling/truncation is removed
- the split direction tests pass through `96` in both directions
- clean-start `128` byte tests pass in both directions
- clean-start `200` byte tests pass in both directions

Current conclusion from the bench evidence:

- the narrow serial-event-path change fixes the practical UART RX burst problem
  on all three ESP32-family lines tested
- the original legacy/IDF4 crash and the original IDF5 truncation both point
  back to the same Core serial event assembly behavior
- the current shared UART pack is now good enough to use as regression evidence
  for this fix

Residual notes:

- some runs still emit shortened `DONE=` values such as `DONE=ua` or
  `DONE=uart`; this did not stop the runner from parsing pass/fail results, but
  the output contract should be tightened
- raw console output may still include
  `ERROR: jshPinSetState: Unexpected state: 0`; this did not correlate with a
  UART data-integrity failure in the passing runs

## First Code Areas To Understand

The first code question is no longer just "why 64?" because the current target
 and core structure already gives a strong clue:

- serial RX is fed into Espruino with `jshPushIOCharEvents(...)`
- IO events are chunked at `IOEVENT_MAX_LEN`
- `IOEVENT_MAX_LEN` is `64`

Relevant current code areas:

- `targets/esp32/jshardwareUart.c`
- `src/jsdevices.c`
- `src/jsdevices.h`
- `src/jsinteractive.c`
- `src/jswrap_stream.c`

So the next useful understanding steps are:

1. determine whether the `64`-byte boundary is expected chunking only, or
   whether chunk handling beyond the first `64` bytes is broken
2. determine why legacy `ESP32` and `ESP32_IDF4` crash when handling the next
   chunk while `ESP32_IDF5` appears to truncate instead
3. determine whether the root issue sits in:
   - ESP32 target UART RX handoff
   - Espruino Core serial event coalescing / buffering
   - or a combination of both

Relevant current observations from the code:

- `targets/esp32/jshardwareUart.c` installs large ESP-IDF UART driver buffers,
  so the exact `64`-byte boundary does not look like the ESP-IDF RX buffer
  size itself
- `src/jsdevices.h` defines `IOEVENT_MAX_LEN` as `64`
- `src/jsinteractive.c` coalesces consecutive serial events in
  `jsiHandleIOEventForSerial()`, so the transition from one `64`-byte chunk to
  the next is a prime place to inspect

## Next Investigation Order

1. Decide how to package the `src/jsinteractive.c` fix for upstream review and
   whether to split it by ESP32 line or present it as one Core-side change with
   cross-line evidence.
2. Tighten the runner/test output contract so `DONE=` values are always emitted
   consistently.
3. Decide whether the `jshPinSetState: Unexpected state: 0` console noise needs
   a separate follow-up investigation or can be parked as unrelated for now.
4. Preserve the current UART burst pack as the regression set for any later
   UART or stream-event changes on ESP32-family builds.

## Working Position

The current working position is:

- this is a good example of a focused UART functional regression test
- it is valuable both for upstream comparison and for practical legacy-user
  bug fixing
- the narrow `src/jsinteractive.c` change is now the working candidate fix with
  bench evidence on legacy `ESP32`, `ESP32_IDF4`, and `ESP32_IDF5`
- we should preserve the investigation as a distinct UART workstream rather
  than blur it into the general block-6 design discussion
- any firmware instrumentation or candidate fix work should be done on a
  dedicated investigation branch, not directly on the base branch
