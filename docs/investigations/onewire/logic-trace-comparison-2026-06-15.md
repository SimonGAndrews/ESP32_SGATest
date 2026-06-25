# OneWire Logic Trace Comparison

Date: 2026-06-15

This note compares logic-analyzer captures from a known-good Espruino Pico
setup against intermittent ESP32-C3 runs using the same external OneWire
daughterboard and the same two DS18B20 devices.

## Capture Inputs

Reference Pico capture:

- [Test_Pico_01.csv](artifacts/logic-traces/Test_Pico_01.csv)
- board: `PICO_R1_3`
- firmware: `2v29`
- data pin: `B1`

ESP32-C3 captures:

- [Test_c3_01.csv](artifacts/logic-traces/Test_c3_01.csv)
  - run result: both devices found
- [Test_c3_01(One results).csv](<artifacts/logic-traces/Test_c3_01(One results).csv>)
  - run result: one device found
- [Test_c3_02(No results).csv](<artifacts/logic-traces/Test_c3_02(No results).csv>)
  - run result: no devices found
- board: `ESP32C3_IDF4`
- firmware: `2v29.81`
- data pin: `D0`

Common capture setup:

- sample rate: `24 MHz`
- full transaction captured
- single-shot `ow.search()` style REPL trigger

## Reference Script Pattern

Pico:

```js
pinMode(B1, "input");
var ow = new OneWire(B1);
setTimeout(function () {
  console.log("START");
  console.log(ow.search());
  console.log("END");
}, 1000);
```

ESP32-C3:

```js
pinMode(D0, "input");
var ow = new OneWire(D0);
setTimeout(function () {
  console.log("START");
  console.log(ow.search());
  console.log("END");
}, 1000);
```

## High-Level Observation

The early waveform structure on the ESP32-C3 is broadly similar to the Pico
reference. The failing C3 traces do not appear to start with a grossly
malformed reset or presence region. Instead, the failing traces appear to stop
early part-way through the search transaction.

This matters because it shifts suspicion away from:

- a completely broken external bus waveform from the first pulse
- the new daughterboard or DS18B20 devices

and toward:

- ESP32-C3-side search timing/state handling
- or a C3-specific interaction on `D0`

## Segment Counts

The deduped transition-derived segment counts were:

| Capture | Segments | Meaning |
|---|---:|---|
| `Test_Pico_01.csv` | 808 | full successful transaction |
| `Test_c3_01.csv` | 808 | full successful transaction |
| `Test_c3_01(One results).csv` | 642 | transaction ends early |
| `Test_c3_02(No results).csv` | 342 | transaction ends much earlier |

This is the strongest signal in the trace set.

## Early Timing Comparison

The first waveform segments of the Pico and C3 captures are very close.

Representative early segments from the Pico reference:

```text
0.000-532.291 us   dur 532.291 us
532.291-560.625 us dur  28.334 us
560.625-668.500 us dur 107.875 us
668.500-1038.208 us dur 369.708 us
1038.208-1104.000 us dur 65.792 us
1104.000-1109.541 us dur  5.541 us
```

Representative early segments from the successful C3 run:

```text
0.000-504.083 us   dur 504.083 us
504.083-532.375 us dur  28.292 us
532.375-640.000 us dur 107.625 us
640.000-1023.250 us dur 383.250 us
1023.250-1089.458 us dur 66.208 us
1089.458-1095.250 us dur  5.792 us
```

Representative early segments from the one-result C3 run:

```text
0.000-504.125 us   dur 504.125 us
504.125-532.625 us dur  28.500 us
532.625-640.250 us dur 107.625 us
640.250-1023.291 us dur 383.041 us
1023.291-1089.500 us dur 66.209 us
1089.500-1095.291 us dur  5.791 us
```

Representative early segments from the no-result C3 run:

```text
0.000-504.083 us   dur 504.083 us
504.083-532.625 us dur  28.542 us
532.625-640.208 us dur 107.583 us
640.208-1023.250 us dur 383.042 us
1023.250-1089.458 us dur 66.208 us
1089.458-1095.250 us dur  5.792 us
```

Interpretation:

- the first timing families are all plausible and closely matched
- the ESP32-C3 does not obviously fail at the first bus reset/presence stage

## Where The C3 Fails

The main difference between the successful and failing C3 traces is not the
opening waveform family but the point at which the transaction stops.

Long idle tails in the failing captures:

- one-result trace final long idle starts around `25.75 ms`
- no-result trace final long idle starts around `13.35 ms`

By contrast:

- the successful C3 trace continues with a full transaction much closer to the
  Pico reference and only goes idle near the expected end

Interpretation:

- the C3-side transaction appears to abort or terminate early
- the worse the failure, the earlier it stops

## Combined Reading With Cross-Target Soak Tests

From [docs/investigations/onewire/cross-target-comparison-2026-06-15.md](cross-target-comparison-2026-06-15.md):

- Pico + same daughterboard: `50/50` stable
- ESP32-C3 + same daughterboard: unstable

Taken together with these traces, the most likely conclusion is:

- the daughterboard and sensors are not the root cause
- the ESP32-C3 is starting the transaction with plausible bus timing
- failing C3 runs appear to stop part-way through search processing

This makes an ESP32-C3-side firmware or pin-specific issue more plausible than
an external bus hardware fault.

## Current Best Hypotheses

1. ESP32-C3 `OneWire.search()` processing/timing state issue.
2. ESP32-C3 `D0` pin-specific interaction or timing sensitivity.
3. Less likely: a remaining subtle electrical issue that only affects the C3,
   despite the similar early waveform.

## Practical Implication

The logic-analyzer captures are now good enough to justify firmware-side
investigation on the ESP32-C3 path.

The next debugging step should focus on the Espruino C3 implementation rather
than continuing to vary the daughterboard or DS18B20 devices.
