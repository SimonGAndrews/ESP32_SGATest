# Draft: MaBecker IDF5 `digitalPulse` PR

Outcome update:

- this note preserves the draft PR wording
- the final investigation close-out is summarised in
  [conclusion-2026-07-05.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/digitalpulse/conclusion-2026-07-05.md)
- the actual preserved PR is
  [MaBecker/Espruino#4](https://github.com/MaBecker/Espruino/pull/4)

## Suggested Title

`ESP32 IDF5: restore digitalPulse timer path`

## Draft Body

This PR restores the ESP32 IDF5 timer path used by `digitalPulse`.

On the bench harness, the failure showed up as:

- `digitalWrite` transitions were observed correctly
- `digitalPulse` on the same linked pins was not

The fix here is intentionally limited to the ESP32 IDF5 target side.

Files in scope:

- `targets/esp32/jshardware.c`
- `targets/esp32/rtosutil.c`

What changed:

- restore the ESP32 utility timer control hooks used by `digitalPulse` in
  `targets/esp32/jshardware.c`
- use the IDF5-safe interrupt-side timer alarm update path in
  `targets/esp32/rtosutil.c`
- keep the active timer reschedule path safe on original ESP32 IDF5 by using
  integer timer adjustment arithmetic in `targets/esp32/rtosutil.c`

Bench result after these changes:

- on the ESP32-C3 harness, a non-debounced `digitalPulse` check on the flashed
  IDF5 bench build reported:
  - `PULSE_SEEN=4`
  - `PULSE_STATES=[1,0,1,0]`
  - `D4_FINAL=0`
- on an original ESP32 IDF5 build, the same array-form pulse path was also
  checked on linked pins and reported:
  - `PULSE_SEEN=4`
  - `PULSE_STATES=[1,0,1,0]`
  - `D26_FINAL=0`
- this shows that the pulse path is active again and the reported edge
  sequence matches the expected pulse train on both tested ESP32 IDF5 boards

Related note:

The original debounced watch-based investigation also exposed a separate
Espruino Core debounce/watch issue in `src/jsinteractive.c`. That is not being
treated as part of the IDF5 regression itself. The practical workaround here
was to use a non-debounced regression check for the IDF5 target PR, and the
Core-side debounce issue will be raised separately on Espruino.

## Shorter Version

This PR restores the ESP32 IDF5 timer path used by `digitalPulse`.

On the harness, `digitalWrite` loopback worked but `digitalPulse` did not. The
fix is limited to `targets/esp32/jshardware.c` and `targets/esp32/rtosutil.c`:
it restores the utility timer hooks, uses the IDF5-safe interrupt-side timer
alarm update path, and keeps the active reschedule path safe on original ESP32
IDF5.

Bench validation after these changes reported the expected four-edge pulse
sequence on both ESP32-C3 IDF5 and original ESP32 IDF5.

The earlier debounced watch-based investigation also exposed a separate
Espruino Core debounce/watch issue in `src/jsinteractive.c`, but that is being
handled separately and is not part of this target-side PR.
