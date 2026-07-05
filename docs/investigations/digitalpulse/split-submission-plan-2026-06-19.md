# ESP32-C3 `digitalPulse` Submission Split Plan

Date: 2026-06-19

Outcome update:

- this note records the investigation-time split plan
- the final outcome is summarised in
  [conclusion-2026-07-05.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/digitalpulse/conclusion-2026-07-05.md)
- the target-side fix line was preserved in
  [MaBecker/Espruino#4](https://github.com/MaBecker/Espruino/pull/4)

## Purpose

This note records the intended submission shape for the ESP32-C3 `digitalPulse`
 investigation outcome.

The practical conclusion is that the work should be split into two tracks:

- an ESP32 IDF5 target PR for the MaBecker Espruino tree
- a separate Espruino Core issue for the `src/jsinteractive.c` debounce/watch
  behaviour

The split is important because the final investigation showed that the observed
 bench failure was made up of two different things:

- an IDF5 target-side `digitalPulse` breakage on ESP32
- a more general Espruino Core debounce/watch edge-ordering issue that became
  visible once the IDF5 timer path was repaired

## High-Level Outcome

The original bench symptom was simple:

- `digitalWrite` transitions were observed correctly
- `digitalPulse` on the same linked pins was not

The investigation then separated into two layers.

### 1. ESP32 IDF5 Target Fixes

The first problem was in the ESP32 IDF5 target code.

On the IDF5 build, the utility timer hooks used by `digitalPulse` had been
 left as empty stubs in `targets/esp32/jshardware.c`.

After that was corrected, the IDF5 reschedule path in
 `targets/esp32/rtosutil.c` also needed the IDF5-safe interrupt-side timer
 alarm update calls.

Validation on an original ESP32 IDF5 board then showed one more target-side
detail: once the timer path was active again, array-form `digitalPulse`
reschedule also needed integer timer-adjustment arithmetic in
`targets/esp32/rtosutil.c` so the active interrupt path behaved safely on that
target as well.

Those two target changes are the correct scope for the MaBecker IDF5 PR.

### 2. Espruino Core Watch/Debounce Issue

Once the IDF5 target timer path was repaired, one remaining issue was exposed
 in `src/jsinteractive.c`.

This issue sits in the debounced watch handling inside `jsiIdle()`. If a watch
 already has a pending debounce timeout, that timeout is already overdue, and a
 new edge arrives before Espruino Core processes the old one, the pending state
 can be updated in place instead of first flushing the overdue edge.

In practice, that means real edges can be merged or misreported.

That is not an IDF5-only ownership area, so it should not be packaged as part
 of the IDF5 PR. It should be raised separately to Espruino Core.

## Proposed Submission Shape

### A. MaBecker IDF5 PR

Scope:

- `targets/esp32/jshardware.c`
- `targets/esp32/rtosutil.c`

Message:

- this PR restores the ESP32 IDF5 `digitalPulse` timer path
- this PR is intentionally limited to the target-side IDF5 fixes
- validation now covers both ESP32-C3 and original ESP32 under IDF5
- the separate `jsinteractive.c` Core issue has been split out

### B. Espruino Core Issue

Scope:

- `src/jsinteractive.c`

Message:

- debounced watches can merge or misorder edges if a pending debounce timeout
  is already overdue when a new edge arrives
- this was exposed during ESP32 IDF5 `digitalPulse` debugging
- it appears to be a Core issue rather than something to fold into the ESP32
  target PR

Preferred outcome:

- raise the Core issue cleanly
- let Gordon review the diagnosis and decide whether he wants to take the fix,
  request a repro first, or ask for a separate Core PR

## Why Use A Shared Overview Note

There is still value in having one higher-level note that explains the full
 picture before the work is split.

That note can be used:

- as internal preparation before posting either item
- as background material when discussing the outcome with MaBecker
- as background material when raising the Core issue to Espruino

But the actual GitHub submissions should stay narrower:

- the MaBecker PR should talk about the IDF5 target fix
- the Espruino Core issue should talk about the `jsinteractive.c` behaviour

## Bench Evidence To Refer Back To

Observed on the ESP32-C3 harness in `C3_BASELINE_GPIO`:

- `digitalWrite` loopback was seen correctly
- `digitalPulse` initially produced no observed transitions on IDF5
- after the target-side fix, `PULSE_SEEN=4` returned on the dedicated check
- the broader GPIO block passed on IDF5
- the same broad visible regression was not reproduced on the IDF4 build

Important refinement:

- the IDF4 result does not prove the `jsinteractive.c` behaviour is impossible
  there
- it only shows that the original bench-visible `digitalPulse` regression was
  not reproduced as a full symptom on IDF4

## Repo And Worktree Structure

The close-out work should stay split physically as well as logically.

### A. MaBecker IDF5 PR Path

Use the MaBecker Espruino tree for the ESP32 IDF5 target PR work:

- main tree: `/home/simon/MaBecker/Espruino`
- clean PR worktree: `/home/simon/MaBecker/Espruino_pr_digitalpulse`
- PR branch: `fix/esp32-idf5-digitalpulse`

This path is for the two ESP32 target files only:

- `targets/esp32/jshardware.c`
- `targets/esp32/rtosutil.c`

The dirty main MaBecker tree should be treated as a scratch investigation tree,
 not as the final submission branch.

### B. Espruino Core / Pico Investigation Path

Use the upstream-style Espruino tree for the Core-side Pico investigation:

- clean base tree: `/home/simon/Espruino2/Espruino`
- current branch there: `master`

Recommended separate worktree for the Pico/Core investigation:

- worktree path: `/home/simon/Espruino2/Espruino_pico_watchdebug`
- branch name: `investigate/core-watch-debounce`

That worktree is the correct place for:

- temporary `src/jsinteractive.c` instrumentation
- Pico builds
- stand-alone Core repro work

It should stay separate from the MaBecker IDF5 PR path.

### C. Harness Repo Role

Use this harness repo for:

- repro scripts
- bench notes
- screenshots and logic-analyser artifacts
- draft PR and issue text

That keeps the investigation records in one place without mixing temporary Pico
 debug work into the PR branch.

## Pico Repro And Evidence Plan

The preferred way to shape the Espruino Core issue is to demonstrate the
 `jsinteractive.c` behaviour on a Core-oriented target such as Espruino Pico.

### Goal

Show that:

- the physical pin edges really occurred
- the JavaScript watch callbacks did not report them correctly
- the failing run went through the overdue-debounce-timeout path in
  `src/jsinteractive.c`

### Preferred Repro Shape

Use a minimal Pico loopback:

- one Pico output pin linked to one Pico input pin
- `setWatch(..., {repeat:true, edge:"both", debounce:...})` on the input
- a short known transition pattern generated on the output
- a deliberate delay or backlog so the first debounce timeout can become
  overdue before the next edge is processed

### Proposed Pico Wiring

Use a fixed simple wiring set so the repro script and analyser captures refer to
 the same pin names every time.

Recommended Pico pins:

- `B3` as the driven output pin
- `B4` as the watched input pin
- `B5` as an optional debug/marker pin
- Pico `GND` as the common ground

Reasons for this choice:

- these pins are easy to reach on the Pico bottom header row
- they avoid the USB pins
- they avoid the on-board LEDs and button
- they avoid the default UART console pins `B6` and `B7`

Recommended loopback wiring:

- `B3` -> `470R` -> `B4`
- Pico `GND` -> logic-analyser ground

Optional marker wiring:

- use `B5` as a high/low debug marker if the repro script needs to mark a busy
  window or other internal phase in the capture

### Logic Analyser Connections

Recommended analyser channel assignment:

- `CH0` -> `B3` output pin
- `CH1` -> `B4` input pin
- `CH2` -> `B5` optional marker pin
- analyser `GND` -> Pico `GND`

Interpretation:

- `CH0` shows what the Pico is driving
- `CH1` shows what the watched input actually sees
- `CH2` can be used later to bracket a forced backlog window if that helps make
  the failing case clearer

If the repro works without `B5`, keep the first pass simpler and only use:

- `CH0` -> `B3`
- `CH1` -> `B4`
- `GND` -> Pico `GND`

The repro should ideally capture two cases:

- control case:
  physical edges present and callbacks reported correctly
- stressed case:
  physical edges still present but callbacks merged, lost, or misordered

### Logic Analyser Role

The logic analyser is useful to prove the physical truth of the signal.

It should be used to show:

- the intended edge pattern on the output/input pair
- a normal run where callback output matches the trace
- a stressed run where the trace is still correct but the callback output is
  not

The analyser alone does not prove the internal Core state, but it is very
 useful evidence that the signal on the wire was not the problem.

### `jsinteractive.c` Instrumentation Role

If the Pico repro alone is not enough, add minimal temporary instrumentation in
 `src/jsinteractive.c`.

This instrumentation should stay narrow and only cover the debounced watch path
 in `jsiIdle()`.

Useful instrumentation points are:

- existing debounce timeout present
- pending timeout already overdue
- overdue timeout flushed first
- existing timeout updated in place
- fresh timeout created for the current edge

The purpose is not broad tracing. The purpose is to confirm that the failing
 Pico run really hit the suspected overdue-timeout path.

### Submission Intent For The Core Side

The first Espruino Core submission should still be an issue, not a PR.

Preferred sequence:

1. demonstrate the behaviour on Pico as simply as possible
2. use analyser evidence if it adds clarity
3. add temporary `jsinteractive.c` instrumentation only if needed
4. raise the Core issue with a concise description
5. let Gordon decide whether he wants:
   - just the report for now
   - a minimal repro
   - or a separate Core PR

This keeps the Core side accurate and useful without over-packaging the first
 report.

## Next Steps

1. Review the ESP32 IDF5 `digitalPulse` fix note for use as a high-level
   discussion-post summary, and add brief wording that explains the two-track
   submission approach.
2. Prepare the MaBecker IDF5 PR using only the two ESP32 target files.
3. Keep the `jsinteractive.c` material out of that PR.
4. Keep the PR support note and split-plan note aligned with that two-track
   submission shape.
5. Set up the Pico/Core investigation in a separate worktree under
   `/home/simon/Espruino2/Espruino`.
6. Try to reproduce the overdue-timeout debounce behaviour on Pico with the
   simplest possible loopback setup.
7. Use logic-analyser traces and minimal temporary `jsinteractive.c`
   instrumentation if needed to make the Core issue evidence clearer.
8. Raise the Espruino Core issue separately with a concise explanation and an
   offer to provide repro and patch details.
9. If requested later, follow up with a separate Core PR or repro script for
   the debounce/watch behaviour.
