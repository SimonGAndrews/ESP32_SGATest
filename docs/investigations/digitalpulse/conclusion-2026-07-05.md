# ESP32 IDF5 `digitalPulse` Outcome

Date: 2026-07-05

## Purpose

This note closes out the earlier ESP32-family `digitalPulse` investigation and
 records the final practical outcome.

Use this note as the top-level summary when the question is:

- what was actually broken
- what fixed it
- which PR preserved the fix
- what remained outside the PR scope

## Final Outcome

The original bench-visible regression was real:

- `digitalWrite` loopback worked
- `digitalPulse` on the same linked pins did not

The target-side ESP32 IDF5 fix was completed and preserved in:

- [MaBecker/Espruino#4](https://github.com/MaBecker/Espruino/pull/4)

That PR is the authoritative preserved form of the ESP32 IDF5 `digitalPulse`
 fix.

## What The Fix Was

The practical target-side fix had three parts:

1. restore the utility-timer control hooks used by `digitalPulse` in
   `targets/esp32/jshardware.c`
2. use the IDF5-safe interrupt-side timer alarm update path in
   `targets/esp32/rtosutil.c`
3. keep the active reschedule path safe on original ESP32 IDF5 by using
   integer timer-adjustment arithmetic in `targets/esp32/rtosutil.c`

In short:

- the timer path had to be re-enabled
- the IDF5 interrupt-side reschedule path had to be corrected
- the active pulse reschedule arithmetic had to be made safe on original ESP32

## Validation Summary

Validation after the target-side fix showed the expected pulse sequence on both
 tested ESP32 IDF5 lines:

- ESP32-C3 IDF5:
  - `PULSE_SEEN=4`
  - `PULSE_STATES=[1,0,1,0]`
  - final pin state low as expected
- original ESP32 IDF5:
  - `PULSE_SEEN=4`
  - `PULSE_STATES=[1,0,1,0]`
  - final pin state low as expected

So the practical conclusion is:

- the ESP32 IDF5 `digitalPulse` target regression was fixed
- the fix was not only a C3-local recovery; it was also validated on original
  ESP32 under IDF5

## What Was Not Part Of The PR

During the same investigation, a separate Espruino Core issue was exposed in
 `src/jsinteractive.c`.

That issue concerns debounced watch handling when a pending debounce timeout is
 already overdue and a new edge arrives before the old one is processed.

That behaviour was intentionally not folded into the ESP32 IDF5 target PR.

So the correct ownership split is:

- `MaBecker/Espruino#4`:
  target-side ESP32 IDF5 `digitalPulse` fix
- separate Core line of investigation:
  `src/jsinteractive.c` watch/debounce behaviour

## Related Notes

Earlier investigation notes that lead to this outcome:

- [esp32-c3-idf5-regressions-2026-06-12.md](esp32-c3-idf5-regressions-2026-06-12.md)
- [mabecker-idf5-pr-draft-2026-06-19.md](mabecker-idf5-pr-draft-2026-06-19.md)
- [split-submission-plan-2026-06-19.md](split-submission-plan-2026-06-19.md)

Related separate Core/watch notes:

- [core-issue-draft-2026-06-19.md](../jsinteractive/core-issue-draft-2026-06-19.md)
- [pico-repro-2026-06-19.md](../watch-debounce/pico-repro-2026-06-19.md)
- [pico-simple-repro-2026-06-19.md](../watch-debounce/pico-simple-repro-2026-06-19.md)

## Current Working Position

For future threads, the important position is:

- do not treat the ESP32 IDF5 `digitalPulse` regression as still open
- refer to `MaBecker/Espruino#4` for the preserved target-side fix
- treat any remaining debounce/watch work as a separate Core issue

## 31 August 2026 Validation Addendum

The classic ESP32 IDF5 comparison at `25dc06c17` initially appeared to show
that `digitalPulse()` still prevented the structured test from completing.
Follow-up separated source lineage, physical pulse observation and result
timer completion.

Source verification confirms that PR #4 is implemented in the exact build
source:

- merge commit `ca6b3592c` is an ancestor of `25dc06c17`;
- `jshUtilTimerStart()` and `jshUtilTimerReschedule()` call the ESP32 utility
  timer implementation;
- IDF5 rescheduling uses `timer_group_set_alarm_value_in_isr()` and
  `timer_group_enable_alarm_in_isr()`;
- `TIMER_FINE_ADJ` uses the integer arithmetic introduced by `dedba55bf`.

The flashed board reported `ESP32_IDF5`, `2v29.58`, commit `25dc06c17`. The
original narrow V1 check produced the expected non-debounced sequence:

```text
LoopB states [1,0,1,0]
PASS LoopB pulse/watch states=[1,0,1,0]
DONE GPIO_BLOCK1
```

Instrumentation of the newer structured test then showed that the pulse call
returned and all four watched edges occurred. The apparent failure was the
absence of the later result callback under one low-console-activity timing
shape. Emitting each observed edge changed that timing and allowed the result
callback to complete. The corrected PR-shaped structured test passed twice:

```text
INFO pulse_edge=1
INFO pulse_edge=0
INFO pulse_edge=1
INFO pulse_edge=0
PASS gpio_pulse_states got=[1,0,1,0] expected=[1,0,1,0]
PASS gpio_pulse_final_low got=0 expected=0
DONE=gpio_pulse
```

Therefore:

- PR #4 remains present and effective in the tested IDF5 build;
- the August comparison did not demonstrate a surviving `digitalPulse()`
  target regression;
- the timing-sensitive post-pulse result-callback behaviour is a separate
  scheduler/sleep-wake observation and is not yet root-caused;
- later ESP32 sleep/wake changes are a candidate investigation area, not a
  confirmed cause.
