# ESP32 OneWire Quiet Timing Design Note

Date: 2026-06-16

This note records the design reasoning behind the ESP32-family OneWire timing
fix used during the ESP32-C3 harness investigation.

The immediate practical problem was:

- `OneWire.search()` on ESP32-C3 was intermittent
- the same DS18B20 daughterboard and sensors were stable on an Espruino Pico
- the failure pattern suggested timing corruption during the ROM-search
  transaction

The selected fix was to add a short-duration ESP32-specific critical section
for OneWire timing windows, rather than globally changing Espruino interrupt
semantics on ESP32.

Update 2026-06-17:

- the first working proof used ESP32 target helpers
  `jshQuietTimingEnter()` / `jshQuietTimingExit()`
- after review, that was refactored into a smaller final form that keeps the
  ESP32 override local to `src/jswrap_onewire.c`
- the final implementation uses a local `portMUX_TYPE` and
  `portENTER_CRITICAL()` / `portEXIT_CRITICAL()`
- that refactored form now builds in both the IDF4 and IDF5 Espruino trees
- on the bench ESP32-C3, the IDF4 build passed:
  - `OneWire.searchDebug()` soak `20/20`
  - `OneWire.searchDebug()` soak `50/50`
  - DS18B20 conversion/read soak `20/20`
- on the bench ESP32-C3, the IDF5 build passed:
  - `OneWire.searchDebug()` soak `20/20`
  - `OneWire.searchDebug()` soak `50/50`
  - DS18B20 conversion/read soak `20/20`
- the original harness-mounted OneWire path was then restored and also passed
  on IDF5 using `SEL_D0 -> ONEWIRE_DQ`
- the latest rerun on that original harness path again found both harness ROMs
  on every pass:
  - `2808c68700aa7672`
  - `28b3e08700b65ea9`

## Problem Summary

On the ESP32 target, existing `OneWire` code relied on:

- `jshInterruptOff()`
- `jshInterruptOn()`

to protect timing-sensitive windows such as:

- reset / presence detect
- read slots
- write slots

However, on ESP32 those functions were effectively stubbed, so the code still
looked like it was protecting timing but in practice was not.

That mismatch matters because OneWire bit-banging is sensitive to short timing
disturbances and to delayed sampling.

## Why Not Re-enable Global Interrupt Off/On?

We explicitly did not choose to "just implement" `jshInterruptOff()` /
`jshInterruptOn()` globally for ESP32.

Reasons:

1. Historical evidence in Espruino indicated that raw interrupt off/on on
   ESP32 had previously caused crashes.
2. `jshInterruptOff()` / `jshInterruptOn()` have multiple call sites outside
   OneWire, so changing them globally would widen the risk far beyond this
   specific timing problem.
3. On ESP32-family targets, especially SMP-capable ones such as ESP32 and
   ESP32-S3, a naïve single-core mental model of interrupt disabling is not a
   good match for the platform's concurrency model.

So the design target was:

- preserve existing stubbed global behavior
- introduce a new narrowly-scoped primitive for short timing-critical sections
- use it only where OneWire genuinely needs it

## Chosen Approach

The final implemented approach is:

1. In `src/jswrap_onewire.c`, under `#ifdef ESP32`, define a local
   `portMUX_TYPE` spinlock.
2. In that same file, locally override:
   - `jshInterruptOff()` to `portENTER_CRITICAL(&JSQuietTimingMux)`
   - `jshInterruptOn()` to `portEXIT_CRITICAL(&JSQuietTimingMux)`
3. Apply those timing guards around:
   - `OneWireReset()`
   - OneWire read slots
   - OneWire write slots
4. Leave all non-ESP32 targets unchanged.
5. Keep the ESP32-specific behavior local to the OneWire implementation rather
   than introducing new cross-target `jshardware` API surface.

This keeps the blast radius small while aligning with the upstream preference
to avoid adding new target hooks unless they are broadly justified.

## Why This Matches ESP-IDF Guidance

ESP-IDF's own FreeRTOS documentation describes ESP critical sections in terms
of:

- a `portMUX_TYPE` spinlock
- `taskENTER_CRITICAL(&spinlock)`
- `taskEXIT_CRITICAL(&spinlock)`

Reference:

- https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/system/freertos_idf.html#critical-sections

Important points from the ESP-IDF guidance:

- the core disables interrupts or interrupt nesting up to the syscall priority
- the core then acquires the spinlock atomically
- the protected region then runs under that critical section

That model is a better fit for ESP32-family targets than pretending a generic
global interrupt-off primitive is sufficient everywhere.

In plain terms:

- ESP-IDF expects short protected regions to be expressed as critical sections
  using a mux/spinlock
- the final local `jswrap_onewire.c` override follows that pattern directly

The first proof version used `taskENTER_CRITICAL()` / `taskEXIT_CRITICAL()`.
The final refactor uses `portENTER_CRITICAL()` / `portEXIT_CRITICAL()` instead,
because that compiled cleanly across both the IDF4 and IDF5 trees used here.

## Why This Matches MicroPython's ESP32 Approach

MicroPython's ESP32 port uses its own target-specific atomic section mechanism
instead of relying on a generic platform-agnostic global interrupt-disable
assumption.

Relevant references:

- https://github.com/micropython/micropython/blob/master/ports/esp32/mphalport.h
- https://github.com/micropython/micropython/blob/master/ports/esp32/mphalport.c

Key observations from the MicroPython ESP32 port:

- it defines a `portMUX_TYPE` atomic mux
- `mp_begin_atomic_section()` uses `portENTER_CRITICAL(&mp_atomic_mux)`
- `mp_end_atomic_section()` uses `portEXIT_CRITICAL(&mp_atomic_mux)`
- the comments note this protects against concurrent access on SMP systems as
  well as disabling interrupts on the calling CPU
- MicroPython also maps its quiet-timing/atomic helpers onto that mechanism

This is not identical code to Espruino, but it is architecturally the same
kind of solution:

- an ESP32-specific short critical section
- not a blind restoration of raw global interrupt-off behavior

## Why Only OneWire Was Changed

This design note is intentionally narrow.

It does not claim:

- every ESP32 timing-sensitive subsystem in Espruino should immediately use the
  same primitive
- every call site of `jshInterruptOff()` must be rewritten now

It only claims:

- OneWire needed protection for specific very short timing windows
- a narrow ESP32-specific critical-section override is a defensible and
  low-risk way to provide it on ESP32

That narrower scope made it easier to:

- prove the fix with bench evidence
- avoid broad regressions
- preserve future freedom to redesign wider ESP32 interrupt/timing policy if
  needed

## Residual Risk And Expected Side Effects

The fix is intentionally narrow, but it is not free.

What changes on ESP32 is not the whole system interrupt model. What changes is
that `OneWire` now introduces short critical sections during its timing
windows in `src/jswrap_onewire.c`.

Important boundaries:

- the override is file-local to `src/jswrap_onewire.c`
- it does not change other `jshInterruptOff()` / `jshInterruptOn()` call sites
- it does not globally alter ESP32 interrupt handling when `OneWire` is idle

The real residual risk is therefore not "everything on ESP32 now runs with
interrupts changed". The real residual risk is:

- interrupt latency increases in short bursts while `OneWire` activity is in
  progress
- repeated `OneWire.search()` or DS18B20 conversions/reads can create many
  such bursts in succession
- other interrupt-driven subsystems may therefore see added jitter or delayed
  service during active `OneWire` traffic

The most likely areas to watch are:

- Wi-Fi background work during repeated `OneWire` transactions
- Bluetooth/BLE controller or host timing during repeated `OneWire`
  transactions
- UART RX at higher baud rates while `OneWire` traffic is active
- software timing features such as `setWatch`, timers, or pulse generation
- any application that relies on tight interrupt response while `OneWire` is
  running

The key engineering judgement is that this residual risk is much smaller than
the risk of globally re-enabling `jshInterruptOff()` / `jshInterruptOn()` on
ESP32.

## Coexistence Tests Still Required

Acceptance of the fix should include coexistence testing, not just isolated
OneWire success.

The future ESP32-family test plan should include cases where `OneWire` runs in
parallel with other interrupt-driven features so that the critical-section
tradeoff is exercised directly.

Recommended minimum coexistence cases:

1. OneWire plus Wi-Fi activity
   - keep Wi-Fi associated
   - generate steady network traffic while repeated `OneWire.search()` and
     DS18B20 reads are running
   - watch for disconnects, stalls, missed reads, or console instability
2. OneWire plus Bluetooth/BLE activity
   - keep BLE advertising, scanning, or a simple active connection running
   - in parallel, run repeated `OneWire.search()` and DS18B20 reads
   - watch for dropped BLE activity, timing instability, or OneWire failures
3. OneWire plus UART RX stress
   - stream data into the board over the active UART path while repeated
     `OneWire` reads/searches run
   - check for framing loss, dropped characters, or REPL corruption
4. OneWire plus GPIO/watch/timer activity
   - keep a watch-based edge counter or timer-based activity running while
     repeated `OneWire` operations execute
   - watch for lost edges, stretched timing, or unexpected callback latency
5. OneWire plus other bus activity
   - run SPI or I2C polling in parallel with repeated `OneWire` operations
   - watch for transaction failures or clear timing degradation

These should be treated as suite-level coexistence/regression tests for:

- ESP32-C3
- original ESP32
- later, ESP32-S3 if it becomes an active target

For the original ESP32 specifically, this matters even more because Wi-Fi and
Bluetooth are both in scope on that family target.

## Evidence That The Design Worked

Using the clean external daughterboard with:

- two DS18B20 sensors
- one `4.7k` pull-up

the observed progression on the ESP32-C3 was:

1. Before the fix:
   - mixed two-device, one-device, and zero-device search results
   - variable abort bit positions in `searchDebug()`
2. After protecting read/write slots:
   - a dramatic improvement
   - one remaining rare `resetOk=false` failure in a 50-run soak
3. After also protecting the reset/presence window:
   - `50/50` successful runs
   - both sensors found every time

So the design is supported by bench evidence, not just by architectural taste.

That evidence now exists in both of the firmware trees used in this project,
not only in the original IDF4 proof tree.

It also now exists on both physical OneWire setups used during the
investigation:

- the clean external daughterboard used to isolate firmware behavior
- the original harness-mounted OneWire path used in the earlier unreliable
  tests

## Intended Portability Across ESP32 Family

The design is intended to scale across ESP32-family targets, including:

- original ESP32
- ESP32-C3
- ESP32-S3

Why this should port cleanly:

- the implementation is small and ESP32-guarded
- the primitive is based on ESP-IDF / FreeRTOS critical sections rather than
  C3-specific register tricks
- the same final shape now builds and passes bench soaks in both the IDF4 and
  IDF5 Espruino trees used here

That does not prove every ESP32-family target will behave identically, but it
does mean the chosen mechanism is family-appropriate rather than board-specific.

## Files Associated With This Design

The final refactored design is embodied in:

- `src/jswrap_onewire.c`
- `src/jswrap_onewire.h`

plus the local board console adjustments needed on the bench target:

- `boards/ESP32C3_IDF4.py`
- `boards/ESP32C3_IDF5.py`

The initial proof version also touched `src/jshardware.h` and
`targets/esp32/jshardware.c`, but those changes were later removed during the
refactor to the final local OneWire override.

## Practical Guidance For Future Review

If this change is later reviewed or upstreamed, the strongest technical framing
is:

- this is not a generic "re-enable interrupts off/on on ESP32" patch
- this is a targeted ESP32 critical-section override for a timing-critical
  bit-banged protocol
- the implementation follows ESP-IDF's critical-section model
- the approach is consistent with the kind of ESP32 atomic-section handling
  used by MicroPython
- the fix is justified by measured before/after bench evidence

## Related Notes

- [codex_handoff_2026-06-16_onewire_idf4_idf5.md](./codex_handoff_2026-06-16_onewire_idf4_idf5.md)
- [onewire_cross_target_comparison_2026-06-15.md](./onewire_cross_target_comparison_2026-06-15.md)
- [onewire_logic_trace_comparison_2026-06-15.md](./onewire_logic_trace_comparison_2026-06-15.md)
