# Codex Handoff - OneWire Investigation, Final Fix Shape, And Cross-IDF Validation

Date: 2026-06-16

This note records the detailed working state from the ESP32-C3 OneWire
investigation, including:

- the original hardware-vs-firmware isolation work
- the first working IDF4 proof
- the later refactor to the final localized ESP32 implementation
- bench validation on both the IDF4 and IDF5 firmware trees

The goal of this handoff is to preserve enough context that a fresh Codex
session can continue without needing to reconstruct:

- the harness bring-up state
- the sensor and daughterboard history
- the rationale for the OneWire firmware changes
- the exact files changed
- the exact test evidence before and after the fix
- the final resolved implementation shape
- the current known remaining ESP32 IDF5 regression outside OneWire

This note supplements, rather than replaces:

- [docs/handoff/2026-06-10.md](2026-06-10.md)
- [esp32_c3_idf5_regressions_2026-06-12.md](../investigations/digitalpulse/esp32-c3-idf5-regressions-2026-06-12.md)
- [docs/investigations/onewire/quiet-timing-design-2026-06-16.md](../investigations/onewire/quiet-timing-design-2026-06-16.md)
- [docs/investigations/onewire/cross-target-comparison-2026-06-15.md](../investigations/onewire/cross-target-comparison-2026-06-15.md)
- [docs/investigations/onewire/logic-trace-comparison-2026-06-15.md](../investigations/onewire/logic-trace-comparison-2026-06-15.md)
- [docs/targets/esp32-c3-devkitc-02/bringup.md](../targets/esp32-c3-devkitc-02/bringup.md)

## Start Here For A New Thread

If a new Codex thread is opened to continue ESP32 harness work, the minimum
bootstrap set should be:

1. [AGENTS.md](/home/simon/MaBecker/ESP32_SGATest/AGENTS.md)
2. [docs/handoff/2026-06-16-onewire-idf4-idf5.md](2026-06-16-onewire-idf4-idf5.md)
3. [esp32_c3_idf5_regressions_2026-06-12.md](../investigations/digitalpulse/esp32-c3-idf5-regressions-2026-06-12.md)
4. [docs/targets/esp32-c3-devkitc-02/bringup.md](../targets/esp32-c3-devkitc-02/bringup.md)
5. [docs/targets/esp32-c3-devkitc-02/wiring.md](../targets/esp32-c3-devkitc-02/wiring.md)
6. [docs/design/harness-modes.md](../design/harness-modes.md)
7. [docs/design/common-harness-design-and-blocks.md](../design/common-harness-design-and-blocks.md)

For the next thread's planned starting point, also read:

- [esp32_c3_digitalpulse_check.py](/home/simon/MaBecker/ESP32_SGATest/tools/wiring_tests/esp32_c3/digitalpulse_check.py)
- [esp32_c3_gpio_block1.py](/home/simon/MaBecker/ESP32_SGATest/tools/wiring_tests/esp32_c3/gpio_block1.py)

If the new thread needs the full OneWire investigation record, this handoff
already points to the deeper notes:

- [docs/investigations/onewire/quiet-timing-design-2026-06-16.md](../investigations/onewire/quiet-timing-design-2026-06-16.md)
- [docs/investigations/onewire/cross-target-comparison-2026-06-15.md](../investigations/onewire/cross-target-comparison-2026-06-15.md)
- [docs/investigations/onewire/logic-trace-comparison-2026-06-15.md](../investigations/onewire/logic-trace-comparison-2026-06-15.md)

## Current Continuation Objective

The next thread should assume:

- OneWire on ESP32-C3 is fixed on the bench in both IDF4 and IDF5 local trees
- the original harness-mounted OneWire path has been revalidated
- the harness/tooling/docs work is now committed
- the next active firmware/debug target is `digitalPulse`, followed by broader
  coexistence and regression coverage in the harness suite

## Current Repo Heads

At the point this handoff was refreshed, the relevant repo heads were:

- harness repo `/home/simon/MaBecker/ESP32_SGATest`: `7b5bc92e8`
- IDF4 firmware repo `/home/simon/Espruino2/Espruino`: `8c6aa317c`
- IDF5 firmware repo `/home/simon/MaBecker/Espruino`: `52381bb30`

## Repos And Paths

The intended VS Code multi-root workspace is:

- harness repo: `/home/simon/MaBecker/ESP32_SGATest`
- reference Espruino repo used for the IDF4 fix work:
  `/home/simon/Espruino2/Espruino`
- MaBecker Espruino repo carrying the IDF5 work:
  `/home/simon/MaBecker/Espruino`

Workspace file:

- `/home/simon/MaBecker/ESP32_SGATest/ESP32_SGATest.code-workspace`

As of this handoff, the workspace file has been corrected to point the third
root at `/home/simon/MaBecker/Espruino`, not
`/home/simon/MaBecker/Espruino_test`.

Important limitation observed during this session:

- the Codex session metadata remained stale and still reported the older single
  root workspace
- this did not block the work because all repos were accessed by absolute path
- a fresh session launched from the corrected `.code-workspace` file should
  pick up the intended three-root context

## Final Assessment

The current evidence supports the following conclusions:

- the original intermittent OneWire failures on the ESP32-C3 were
  firmware-side timing failures, not primarily harness wiring faults
- the clean external daughterboard plus Pico comparison was decisive in
  separating sensor-board concerns from ESP32 firmware behavior
- after the firmware fix, the original harness-mounted OneWire path was also
  retested and passed, which strongly supports the original harness wiring
  being sound
- the successful fix was to protect the OneWire reset, read-slot, and
  write-slot timing windows on ESP32 using an ESP-IDF critical section
- the final accepted implementation shape keeps the ESP32 override local to
  `src/jswrap_onewire.c`
- that final shape now builds in both firmware trees and has been revalidated
  on bench hardware in both IDF4 and IDF5

Remaining open issue outside OneWire:

- `digitalPulse` still appears to be a separate IDF5 regression

Residual acceptance risk still to be covered by the harness suite:

- the OneWire fix introduces short ESP32 critical sections during active
  OneWire timing windows
- that is intentionally much narrower than a global ESP32 interrupt-behaviour
  change
- however, coexistence testing with Wi-Fi, Bluetooth/BLE, UART RX, timers, and
  other bus activity is still required before treating the change as fully
  closed across the ESP32 family

## Hardware State And Current Physical Test Setup

Primary hardware under investigation:

- ESP32-C3-DevKitC-02 on the harness
- harness revision v1.1
- Espruino pin naming uses `Dxx`

Harness design repo:

- KiCad and docs live in `/home/simon/MaBecker/ESP32_SGATest`

Earlier AGENTS/bring-up notes remain valid:

- `D18`/`D19` are native USB Serial/JTAG
- `D20`/`D21` are UART0 and normally reserved for board USB-UART
- `J10` is a 2x3 UART connector/selector for UART0/UART1 crosslink or
  external UART access
- `J_Auto` exists for later automation work

Current OneWire test hardware arrangement at the time of the firmware fix:

- not the original harness OneWire path as sole evidence
- instead a cleaner external daughterboard was used to isolate firmware from
  harness wiring doubt

External daughterboard used for the decisive comparison:

- two DS18B20 sensors
- one `4.7k` pull-up resistor from `DQ` to `3.3V`
- direct wiring to `3.3V`, `GND`, and the selected data pin
- minimal soldered construction

Observed ROM codes on that daughterboard:

- `2838498700e8136b`
- `28253387008562df`

Connection used on the ESP32-C3:

- daughterboard data connected to `D0`

Connection used on the Pico reference target:

- daughterboard data connected to `B1`

Later confirmation step on the original harness path:

- external daughterboard removed
- `SEL_D0` restored to `ONEWIRE_DQ`
- two original harness-mounted DS18B20 sensors used on the harness bus

Observed ROM codes on the original harness-mounted sensors:

- `2808c68700aa7672`
- `28b3e08700b65ea9`

## Firmware Trees In Play

Two Espruino trees matter in this investigation.

### 1. Reference / IDF4 Work Tree

Path:

- `/home/simon/Espruino2/Espruino`

State used for the successful OneWire timing fix:

- git `HEAD` at `8c6aa317c`
- committed changes now include:
  - `feat(esp32/onewire): add searchDebug and local timing guard`
  - `chore(board): disable USB Serial JTAG on ESP32C3_IDF4 bench build`

### 2. MaBecker / IDF5 Tree

Path:

- `/home/simon/MaBecker/Espruino`

State at handoff:

- git `HEAD` at `52381bb30`
- committed changes now include:
  - `feat(esp32/onewire): add searchDebug and local timing guard`
  - `chore(board): disable USB Serial JTAG on ESP32C3_IDF5 bench build`

The MaBecker repo is the relevant IDF5-capable tree because it contains:

- `esp-idf-5/`
- `bin_esp32_idf5/`
- `o_esp32_idf5/`
- `o2_esp32_idf5/`
- `obj_esp32_idf5/`

The directory `/home/simon/MaBecker/Espruino_test` is not the IDF5 firmware
repo. It is a different Espruino-related tree and should not be confused with
the IDF5 development target for the next phase.

## Why This Investigation Happened

The original objective was broader than just fixing OneWire:

- prove the harness wiring
- develop REPL-driven test blocks
- compare a known-good older ESP32-C3 build against a newer build using
  Espressif IDF 5.x

OneWire became the main focus because it remained unstable on the ESP32-C3
even after substantial harness-side rework. The concern was whether the fault
was:

- harness wiring
- sensor hardware
- daughterboard wiring
- or the ESP32 target/firmware implementation

## Earlier Harness And Test Progress Before The Firmware Dive

Before the focused firmware work, the following had already happened:

- initial harness wirewrap build completed
- `J10` UART crosslink wiring completed
- `J_Auto` left as future use
- a known-good Espruino firmware around `2v29` was available on the bench
- simple REPL-based block testing was used to validate harness wiring
- digital loopback, analog blocks, SPI/I2C block, and OneWire block were all
  stepped through with manual shunt instructions

OneWire specifically consumed a long sequence of hardware-side checks:

- solder touch-up
- wirewrap touch-up
- repeated re-tests
- trying one sensor vs two sensors
- changing which sensor was fitted
- trying a sensor from a different batch
- replacing most of the OneWire circuitry
- confirming `4k7` pull-up
- confirming `3.3V` at sensor power pins
- confirming ground continuity back to the processor

These steps materially reduced the likelihood that the remaining failures were
caused by simple assembly faults.

## The Daughterboard Cross-Target Comparison

The major confidence-building step was to move to the clean external
daughterboard and test it on both:

- the ESP32-C3 harness target
- an Espruino Pico with `2v29`

Pico REPL test:

```js
pinMode(B1, 'input');
var ow = new OneWire(B1);

var sensors = ow.search().map(function(device) {
  return require("DS18B20").connect(ow, device);
});
console.log(sensors);
```

Pico observed output:

- both devices found
- same two expected ROM codes returned

Pico soak result using the same daughterboard:

- `50/50` scans found both devices

ESP32-C3 using the same daughterboard:

- sensors could often be read
- scratchpads and CRCs could be valid
- but repeated `OneWire.search()` remained unstable

Earlier documented ESP32-C3 daughterboard soak result:

- `50` scans
- `30` two-device results
- `12` one-device results
- `8` zero-device results

Practical conclusion:

- the daughterboard itself is good enough to act as a known-good reference
  test load
- the DS18B20 devices are not the root cause
- the problem is strongly associated with the ESP32-C3 side

See the detailed comparison note:

- [docs/investigations/onewire/cross-target-comparison-2026-06-15.md](../investigations/onewire/cross-target-comparison-2026-06-15.md)

## Logic Analyzer Work

The user captured PulseView/CSV traces for:

- one successful Pico `ow.search()` run
- three ESP32-C3 runs:
  - success
  - one-sensor result
  - zero-sensor result

Key captured files in the harness repo:

- `Test_Pico_01.csv`
- `Test_c3_01.csv`
- `Test_c3_01(One results).csv`
- `Test_c3_02(No results).csv`

These are discussed in:

- [docs/investigations/onewire/logic-trace-comparison-2026-06-15.md](../investigations/onewire/logic-trace-comparison-2026-06-15.md)

Key observation from that note:

- the ESP32-C3 failure did not look like a grossly broken bus from the very
  first reset pulse
- early waveform families were broadly plausible
- failing C3 runs appeared to stop early part-way through the search
  transaction

That finding made it reasonable to move deeper into firmware-side search/timing
analysis rather than continuing to treat the bus hardware as the primary
suspect.

## Instrumented Firmware Investigation

The next step was to prove where `OneWire.search()` was going wrong on the
ESP32-C3.

Rather than relying only on external traces, debug instrumentation was added to
Espruino `OneWire.search()` in the IDF4 work tree.

### Added Debug Method

New method added in the IDF4 tree:

- `OneWire.searchDebug()`

This returns:

- the discovered device list
- per-pass state for the ROM search
- compactly encoded slot traces for the search walk

This was intentionally compact enough to stream through the REPL without
turning the board interaction into a huge logging exercise.

### Harness-Side Runner

New harness-side tool:

- `/home/simon/MaBecker/ESP32_SGATest/tools/common/onewire_search_debug.py`

Purpose:

- connect to the Espruino REPL
- call `OneWire.searchDebug()`
- decode the returned slot trace objects
- summarise where a failure occurred

The tool prints:

- board
- firmware version
- pin
- per-run device counts
- per-pass `resetOk`, `searchResult`, `abortedOn11`, `abortBit`,
  discrepancies, ROM state
- compact failure context around the failing search bit

## What The Instrumentation Proved Before The Fix

Before the quiet-timing fix, repeated C3 runs showed a distinctive pattern.

Observed pattern from `searchDebug()` runs on the ESP32-C3:

- some runs found both sensors
- some found one sensor
- some found none
- failed passes ended with `abortedOn11=true`
- `abortBit` values varied significantly between runs

Representative earlier distribution from the debug work:

- `20` runs
- `6` two-device successes
- `6` one-device results
- `8` zero-device results

Important detail:

- all failing runs showed the search aborting at different bit positions
- abort bits included values like `1`, `16`, `17`, `19`, `23`, `25`, `30`,
  `37`, `39`, `41`, `49`, `55`

Why this mattered:

- if the ROM search algorithm itself were deterministically wrong, one would
  expect a more repeatable failure signature
- the variable failure bit strongly suggested timing/read corruption during
  search slot execution
- this pushed suspicion toward the low-level timing windows rather than the
  higher-level search algorithm

## Architectural Analysis Around Interrupts

At that point, the key question became:

- why is OneWire timing unreliable on ESP32?
- can this be fixed without globally changing Espruino interrupt semantics?

### Important Historical Finding

An older ESP32 change in Espruino had effectively removed the real
implementation of `jshInterruptOff()` / `jshInterruptOn()` because using raw
interrupt disable had caused crashes on ESP32.

The relevant historical signal identified during the investigation was a commit
message along the lines of:

- "ESP32: remove interrupt on/off code as it just causes a crash"

Current ESP32 target implementation therefore had:

- `jshInterruptOff()` stubbed
- `jshInterruptOn()` stubbed

That means code using those APIs on ESP32 did not actually gain any timing
protection.

### Call-Site Risk Analysis

A broader audit showed `jshInterruptOff()` / `jshInterruptOn()` were used by
more than OneWire. Callers included areas such as:

- variable/allocator-related code
- device/timer code
- SPI/I2C support
- NeoPixel support
- OneWire

Conclusion from that audit:

- re-implementing `jshInterruptOff()` globally on ESP32 would be a broad
  behavioral change
- that risk was too high for a targeted OneWire fix, especially while also
  preparing for an IDF5 migration comparison

### External Design Reference

ESP-IDF and MicroPython behavior were checked conceptually:

- ESP-IDF expects short critical sections via FreeRTOS critical-section
  primitives
- MicroPython uses target-specific timing protection/atomic sections on ESP32,
  rather than relying on a naive global interrupt-disable model

This strengthened the case for a target-specific, short-duration timing
primitive.

## Chosen Design

The adopted design was:

- do not change generic `jshInterruptOff()` / `jshInterruptOn()` semantics on
  ESP32
- add a new ESP32-only short-duration timing guard
- use that guard only in the ESP32 `OneWire` implementation
- keep the change targeted and easy to reason about

This respects the user's architectural preference to avoid broad core changes,
while accepting a small, guarded core hook where necessary.

## IDF4 Tree Code Changes

This section records the first working proof implementation as it was developed
on the IDF4 tree. Parts of this section are now historical because the final
refactor removed the `jshQuietTiming*` target API and localized the ESP32
critical-section override inside `src/jswrap_onewire.c`.

The following files were modified in `/home/simon/Espruino2/Espruino`.

### 1. `boards/ESP32C3_IDF4.py`

Reason:

- local board bring-up required UART console via the board USB-UART bridge
- the USB Serial/JTAG define was commented out for this target on this board

Change:

- comment out `DEFINES+=-DESPR_USE_USB_SERIAL_JTAG`

This is a board/test-environment convenience change, not the OneWire fix
itself.

### 2. `src/jshardware.h`

Added ESP32-only declarations:

- `jshQuietTimingEnter()`
- `jshQuietTimingExit()`

### 3. `targets/esp32/jshardware.c`

Added:

- `static portMUX_TYPE JSQuietTimingMux = portMUX_INITIALIZER_UNLOCKED;`
- `jshQuietTimingEnter()` using `taskENTER_CRITICAL(&JSQuietTimingMux);`
- `jshQuietTimingExit()` using `taskEXIT_CRITICAL(&JSQuietTimingMux);`

Not changed:

- `jshInterruptOff()` remained stubbed
- `jshInterruptOn()` remained stubbed

This was deliberate.

### 4. `src/jswrap_onewire.c`

Three categories of change exist here.

#### a. ESP32-specific timing hook selection

On `ESP32`:

- `ONEWIRE_TIMING_ENTER` maps to `jshQuietTimingEnter`
- `ONEWIRE_TIMING_EXIT` maps to `jshQuietTimingExit`

On other targets:

- the code continues to use `jshInterruptOff()` / `jshInterruptOn()`

#### b. New `searchDebug()` instrumentation

Added:

- `OneWireSearchDebugPass` structure
- helper functions to encode slot traces
- internal search function variant returning debug state
- new JS-visible `OneWire.searchDebug()` method

This instrumentation was critical for proving the pre-fix failure mode and is
still present in the tree at handoff time.

#### c. Timing protection in actual OneWire paths

Initially changed:

- OneWire read slots
- OneWire write slots

Later changed:

- the reset / presence-detect window in `OneWireReset()`

This final reset-path change mattered because an intermediate soak showed the
search corruption was gone but a rare `resetOk=false` miss remained.

### 5. `src/jswrap_onewire.h`

Added prototype:

- `jswrap_onewire_searchDebug()`

## Final Refactor Shape

After the first working proof and follow-up discussion, the implementation was
refactored in both firmware trees to the final smaller form:

- remove `jshQuietTimingEnter()` / `jshQuietTimingExit()`
- remove the related `src/jshardware.h` and `targets/esp32/jshardware.c`
  changes
- keep the ESP32-specific critical-section behavior local to
  `src/jswrap_onewire.c`
- use:
  - `portENTER_CRITICAL(&JSQuietTimingMux)`
  - `portEXIT_CRITICAL(&JSQuietTimingMux)`
- keep `OneWire.searchDebug()` in place for bench diagnostics

This final shape is closer to the preferred upstream direction because it does
not add new target API surface for other boards to consider.

## Build And Flash Workflow Used For The IDF4 Tree

Build environment provisioning command:

```bash
source ./scripts/provision.sh ESP32C3_IDF4
```

Build command:

```bash
make BOARD=ESP32C3_IDF4 RELEASE=0 -j4
```

Generated image of interest:

- `bin/build/espruino.bin`

Typical flash command path used:

```bash
cd bin
idf.py -p /dev/ttyUSB0 flash
```

At the time of the successful final retest:

- board reported `BOARD=ESP32C3_IDF4`
- version reported `2v29.82`

## Test Evidence Across The Fix

### Pre-Fix State

Before the quiet-timing work, search stability was poor and inconsistent:

- a mixture of two-device, one-device, and zero-device runs
- `abortedOn11=true` in failed passes
- varying abort bits

This was the core evidence for slot timing corruption.

### After Adding Quiet Timing To Read/Write Slots Only

Immediate result from `searchDebug()` on the bench C3:

- `20/20` runs found both sensors
- no `abortedOn11`
- no overflow
- both expected ROM codes returned every time

This was a strong improvement, but a longer soak was run to test confidence.

Longer soak at this intermediate stage:

- `50` runs
- `49` good runs
- `1` failing run

Character of the single remaining failure:

- not a variable-bit search abort
- instead `resetOk=false`

Interpretation:

- the earlier search-slot corruption appeared fixed
- the remaining outlier pointed at the reset/presence timing window

### After Also Guarding The Reset / Presence Window

`OneWireReset()` was updated to use the same quiet-timing enter/exit pair.

Board was rebuilt and reflashed.

Final decisive soak result:

- `50/50` runs passed
- both sensors found every time
- no `abortedOn11`
- no reset misses
- no search overflows

This is the strongest result achieved in the session.

## Cross-IDF Bench Validation Of The Final Shape

After the refactor to the final localized ESP32 implementation, both firmware
trees were rebuilt and bench-tested.

### IDF4 Final Validation

Bench firmware:

- `BOARD=ESP32C3_IDF4`
- `VERSION=2v29.82`

Observed on `/dev/ttyUSB0` with `D0` OneWire:

- `OneWire.searchDebug()` passed `20/20`
- `OneWire.searchDebug()` passed `50/50`
- DS18B20 conversion/read soak passed `20/20`
- both ROMs were found every time:
  - `2838498700e8136b`
  - `28253387008562df`
- no `resetOk=false`
- no `abortedOn11`
- no pass overflow

Observed DS18B20 ranges:

- sensor 0: `23.8125..23.8750 C`
- sensor 1: `24.0000..24.0625 C`

### IDF5 Final Validation

Bench firmware:

- `BOARD=ESP32C3_IDF5`
- `VERSION=2v28`

Observed on `/dev/ttyUSB0` with `D0` OneWire:

- `OneWire.searchDebug()` passed `20/20`
- `OneWire.searchDebug()` passed `50/50`
- DS18B20 conversion/read soak passed `20/20`
- both ROMs were found every time:
  - `2838498700e8136b`
  - `28253387008562df`
- no `resetOk=false`
- no `abortedOn11`
- no pass overflow

Observed DS18B20 ranges:

- sensor 0: `23.6875..23.8125 C`
- sensor 1: `23.9375..23.9375 C`

Practical result:

- the final localized ESP32 fix is now proven on both firmware trees used for
  this bring-up work

## Final Confirmation On Original Harness Wiring

After the cross-IDF validation on the clean external daughterboard, the setup
was switched back to the original harness OneWire path:

- daughterboard removed
- `SEL_D0 -> ONEWIRE_DQ`
- two original harness-mounted DS18B20 sensors installed

Bench firmware used for this final harness-path proof:

- `BOARD=ESP32C3_IDF5`
- `VERSION=2v28`

Observed ROMs on the original harness sensors:

- `2808c68700aa7672`
- `28b3e08700b65ea9`

Observed results on `/dev/ttyUSB0` with `D0` OneWire:

- `OneWire.searchDebug()` passed `20/20`
- `OneWire.searchDebug()` passed `50/50`
- DS18B20 conversion/read soak passed `20/20`
- both harness-mounted ROMs were found every time
- no `resetOk=false`
- no `abortedOn11`
- no pass overflow

Observed DS18B20 ranges on the harness sensors:

- sensor 0: `23.3750..23.5000 C`
- sensor 1: `24.3125..24.3750 C`

Practical interpretation:

- the clean daughterboard remained important for isolating the original cause
- but the final firmware fix is not limited to the daughterboard setup
- the original harness OneWire wiring now also behaves reliably with the fixed
  firmware
- that materially strengthens the conclusion that the earlier unreliability
  was firmware timing, not an inherently unsound harness path

## Why The Evidence Matters

This session did not merely produce a green run; it materially changed the
quality of the explanation.

Before the fix:

- failure was blamed broadly on "OneWire instability"
- hardware vs firmware responsibility still had room for argument

After the investigation:

- the daughterboard and sensors were proven stable on Pico
- logic traces suggested early transaction termination on C3
- `searchDebug()` showed variable search-bit corruption before the fix
- the corruption disappeared when timing-critical sections were actually
  protected
- the one remaining miss was isolated to reset/presence timing
- guarding that window removed the last observed failure in the 50-run soak

This is now a defensible firmware-side explanation rather than a vague
correlation.

## Current File State At Handoff

Update 2026-06-17:

- the OneWire fix has now been ported into the MaBecker IDF5 tree
- the initial `jshQuietTimingEnter()` / `jshQuietTimingExit()` implementation
  was refactored out
- the final form keeps the ESP32 critical-section override local to
  `src/jswrap_onewire.c`
- both trees now build successfully with the refactored implementation
- the flashed IDF5 ESP32-C3 bench build passed:
  - `OneWire.searchDebug()` `20/20`
  - `OneWire.searchDebug()` `50/50`
  - DS18B20 conversion/read soak `20/20`
- the flashed IDF4 ESP32-C3 bench build was then rerun and also passed:
  - `OneWire.searchDebug()` `20/20`
  - `OneWire.searchDebug()` `50/50`
  - DS18B20 conversion/read soak `20/20`
- the original harness-mounted OneWire path was then retested on IDF5 with
  `SEL_D0 -> ONEWIRE_DQ` and also passed:
  - `OneWire.searchDebug()` `20/20`
  - `OneWire.searchDebug()` `50/50`
  - DS18B20 conversion/read soak `20/20`
- do not run multiple REPL harness scripts against `/dev/ttyUSB0` in parallel;
  one attempted parallel run corrupted the REPL session even though the DUT was
  stable when retested sequentially

### IDF4 Work Tree: `/home/simon/Espruino2/Espruino`

Modified and uncommitted:

- `boards/ESP32C3_IDF4.py`
- `src/jswrap_onewire.c`
- `src/jswrap_onewire.h`

No commit was made during this session.

### IDF5 Work Tree: `/home/simon/MaBecker/Espruino`

Modified and uncommitted:

- `boards/ESP32C3_IDF5.py`
- `src/jswrap_onewire.c`
- `src/jswrap_onewire.h`

The IDF5 tree now carries the same final localized OneWire fix shape as the
IDF4 tree.

## Outstanding IDF5 Context

The project is not only about making IDF4 work. The broader intent is to
support the ESP32 family during migration from Espressif IDF 4.x to 5.x.

Historical status at the time this note was first requested:

- there is already a documented IDF5 regression note for `digitalPulse`
- that regression is separate from the OneWire investigation
- OneWire on IDF5 has not yet been re-evaluated using the new quiet-timing
  approach

Existing IDF5 regression note:

- [esp32_c3_idf5_regressions_2026-06-12.md](../investigations/digitalpulse/esp32-c3-idf5-regressions-2026-06-12.md)

That note records:

- `digitalWrite` loopback works
- `digitalPulse` fails on the tested IDF5 build

This means IDF5 work still has at least one known regression independent of the
OneWire story.

Current status after the 2026-06-17 bench rerun:

- the IDF5 OneWire port has been built, flashed, and validated on the bench
- OneWire is no longer an open IDF5 blocker on this harness configuration
- the IDF4 tree has also been rerun after the same final refactor and remains
  clean on the bench
- the original harness-mounted OneWire path has also now been validated after
  the firmware fix
- `digitalPulse` remains a separate known IDF5 regression

## Recommended Next Steps

The next sensible path is now:

1. Preserve the final localized ESP32 OneWire override in both firmware trees:
   - no global ESP32 redefinition of interrupt semantics
   - no `jshQuietTiming*` target API
   - ESP32 guard remains local to `src/jswrap_onewire.c`
2. Keep `OneWire.searchDebug()` available until the issue is upstreamed or no
   longer needed for bench diagnostics.
3. Update upstream discussion / future PR notes to reflect the final accepted
   shape:
   - local `jswrap_onewire.c` override
   - `portENTER_CRITICAL()` / `portEXIT_CRITICAL()`
   - proven on IDF4 and IDF5
4. Keep the separate `digitalPulse` IDF5 regression in view; OneWire success on
   IDF5 does not close the overall ESP32 IDF5 bring-up effort.
5. Continue the remaining harness regression blocks sequentially on the serial
   port; do not run concurrent REPL scripts against the same TTY.

## Suggested First Commands For The Next Session

If the next session starts fresh, these are the most likely orientation
commands.

Check workspace and repo state:

```bash
git -C /home/simon/Espruino2/Espruino status --short
git -C /home/simon/MaBecker/Espruino status --short
```

Inspect the current IDF4 OneWire fix:

```bash
git -C /home/simon/Espruino2/Espruino diff -- \
  src/jswrap_onewire.c \
  src/jswrap_onewire.h \
  boards/ESP32C3_IDF4.py
```

Inspect the current IDF5 OneWire fix:

```bash
git -C /home/simon/MaBecker/Espruino diff -- \
  src/jswrap_onewire.c \
  src/jswrap_onewire.h \
  boards/ESP32C3_IDF5.py
```

Then rerun the bench soaks if needed, one script at a time.

## Bench Assumptions At End Of Session

At the point the detailed handoff was requested:

- the ESP32-C3 harness board had been reflashed successfully with the fixed
  IDF4 build
- the clean daughterboard remained the trusted OneWire test load
- the most recent decisive test was a `50/50` successful `searchDebug()` soak
  on `D0`

At the later final cross-check stage:

- both IDF4 and IDF5 bench builds had passed the same search and DS18B20 soak
  sequence on the same clean daughterboard setup
- the IDF5 bench build had also passed the same search and DS18B20 soak
  sequence on the original harness-mounted OneWire path

Actual future bench state may have changed after this note. If a new session
begins later, verify:

- board connected on `/dev/ttyUSB0`
- daughterboard still on `D0`
- same two DS18B20 devices present
- pull-up still `4.7k`

## Core Takeaway

The important result from this session is not merely "OneWire passed once".

The important result is:

- the external daughterboard and sensors were validated on a Pico
- ESP32-C3 failures were narrowed to firmware-side timing behavior
- a targeted ESP32 quiet-timing primitive was introduced without globally
  changing interrupt semantics
- that targeted change produced a clean `50/50` C3 OneWire soak on IDF4

That baseline was then refactored into a smaller localized implementation and
revalidated on both IDF4 and IDF5 on the bench C3, and the original harness
OneWire path was then shown to pass with the fixed firmware as well.
