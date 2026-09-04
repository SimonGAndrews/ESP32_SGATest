# ESP32_V1 OneWire IDF4 Follow-Up Investigation

Date: 2026-07-08

This note records the OneWire follow-up investigation carried out on the
classic ESP32 DevKitC V4 / `ESP32_V1` harness using the IDF4-based Espruino
tree at:

- `/home/simon/MaBecker/Espruino_upstream_idf4`
- branch `fix/esp32-idf4-onewire-v1-harness`

The immediate objective was not to create a new generic OneWire design, but to
re-establish the current ESP32 IDF4 bench state, measure the remaining
instability on the classic ESP32 target, and test one narrow timing hypothesis
without losing the already-useful helper work.

This note supplements earlier OneWire records rather than replacing them:

- [docs/handoff/2026-06-16-onewire-idf4-idf5.md](../../handoff/2026-06-16-onewire-idf4-idf5.md)
- [quiet-timing-design-2026-06-16.md](quiet-timing-design-2026-06-16.md)
- [cross-target-comparison-2026-06-15.md](cross-target-comparison-2026-06-15.md)
- [logic-trace-comparison-2026-06-15.md](logic-trace-comparison-2026-06-15.md)

The most important continuity point is that the same June fix shape was still
being used here:

- local ESP32 critical-section override in `src/jswrap_onewire.c`
- `searchDebug()` helper available on bench firmware

So the July 8 work was a follow-up on top of the June fix, not a return to the
pre-fix firmware state.

## Bench Scope

Target under test:

- classic ESP32 DevKitC V4 / `ESP32_V1`
- OneWire bus on harness `D13`
- two DS18B20 devices present

Observed ROM codes on the bus during this session:

- `28b27e8700667bcf`
- `289ac18700ef2bbe`

Important scope limitation of the July 8 bench run:

- the bus population during this session was two `DS18B20` devices
- the mixed-family `DS18B20 + DS2413` case was not yet reintroduced here
- that mixed-device case still needs to be rerun before the classic ESP32 IDF4
  limitation can be described completely

Firmware tree and relevant branch head during the session:

- repo `/home/simon/MaBecker/Espruino_upstream_idf4`
- branch `fix/esp32-idf4-onewire-v1-harness`
- branch tip `f3205c09f`
- commit message `onewire: add searchDebug helper and preserve open-drain state`

Important helper context already present on this branch:

- the local ESP32 critical-section override from the earlier June work was
  already in place
- `searchDebug()` had been ported onto this branch for compact per-pass search
  traces
- the helper branch also preserved OneWire open-drain state before reset,
  read, and write

## Chronological Record

### 1. Re-establish helper-enabled bench state

The board was reflashed from the IDF4 repo with the helper-enabled build, and
`searchDebug()` was confirmed present on the bench.

Useful result:

- `python3 tools/common/onewire_search_debug.py --port /dev/ttyUSB0 --pin D13 --runs 1`
- returned both ROMs successfully

What worked:

- the helper-enabled firmware was definitely present on the board
- `searchDebug()` could be used immediately for low-level traces

Issue found:

- REPL-reported firmware provenance remained inconsistent
- `process.version` and earlier metadata reports did not reliably reflect the
  freshly flashed build, even though `searchDebug()` proved the new image was
  running

Practical conclusion:

- for this session, helper presence and flash logs were more trustworthy than
  REPL provenance strings alone

### 2. Short recheck: mixed early evidence

Initial short checks were then rerun against the same bus.

Observed outcomes:

- a short `searchDebug()` run showed both success and failure cases
- one failure aborted early at bit `4`
- the shared DS18B20 functional test passed cleanly in one run

Representative successful functional result:

- `python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js --port /dev/ttyUSB0 --baud 115200 --timeout 12`
- PASS
- both ROMs found on all six scans
- both scratchpads valid with good CRC

Representative short-failure result:

- `searchDebug()` abort at bit `4`
- `abortedOn11=true`
- `idBitsRead=3`

What worked:

- the shared block-5 test could still pass on this target
- gross bus bring-up was therefore not broken

What did not:

- the low-level ROM search was still intermittent
- the remaining problem was below the shared functional test pass/fail layer

### 3. Longer helper capture exposed two separate problems

Longer helper captures were then used to distinguish real OneWire failures from
console-side artifacts.

Observed outcomes:

- a `searchDebug()` run over many searches showed occasional genuine search
  aborts
- the same capture also showed ESP32 task watchdog text injected into the UART
  stream
- that watchdog text corrupted long JSON payloads in the captured REPL output

Examples from the longer runs:

- one helper run showed an abort at bit `31`
- later longer capture showed aborts at bits `4`, `26`, `28`, and `54`
- two JSON parse failures in the bulk 50-run helper dump were not search
  failures in themselves, but serial-stream corruption caused by watchdog text

What worked:

- `searchDebug()` was still valuable because it exposed exact abort bits and
  partial ROM progress

What did not:

- large bulk JSON dumps over the normal REPL/UART path were not robust on this
  board
- watchdog and boot/runtime text could contaminate the same serial stream

This was an important distinction. The UART corruption was real, but it was
not itself proof that every corrupted bulk capture represented a OneWire slot
failure.

### 4. Simple soak confirmed the underlying OneWire issue remained

To separate the JSON-stream problem from the search behaviour itself, the
generic soak was rerun using plain `ow.search()` rather than huge debug dumps.

Key result:

- `python3 tools/common/onewire_soak_generic.py --port /dev/ttyUSB0 --baud 115200 --pin D13 --scans 100`

Summary:

- `two_device=88`
- `one_device=6`
- `zero_device=6`

What worked:

- the soak used much smaller output and avoided the worst bulk-debug parsing
  issue

What did not:

- even without huge debug payloads, the search instability remained obvious
- the target was still missing one or both devices intermittently

Practical conclusion:

- the classic ESP32 IDF4 issue was real at the OneWire level, not just a bulk
  REPL-output artifact

### 5. Per-call `searchDebug()` method established the best measurement path

Because bulk helper dumps were noisy, a per-call measurement method was used:

- one `searchDebug()` call per REPL transaction
- parse the result immediately
- repeat many times

This avoided:

- huge multi-run JSON blobs
- watchdog text corrupting a whole batch result

The best pre-experiment measurement from this method was:

- `runs 200`
- `search_fail_runs 18`
- `json_fail_runs 0`
- `missing_fail_runs 0`

Observed abort-bit spread included:

- `1`, `3`, `9`, `11`, `16`, `17`, `18`, `19`, `23`, `41`, `42`, `45`,
  `49`, `57`, `58`, `60`, `63`

Miss classification from the helper analysis:

- `cmp_low_missed = 11`
- `id_low_missed = 7`

What worked:

- this gave the cleanest measurement of actual search instability
- it eliminated serial-stream ambiguity from the metric

What did not:

- the failure did not cluster around one single bad bit position
- the misses were distributed across the ROM search

Practical conclusion:

- this did not look like a broken search-state-machine transition at one fixed
  point
- it looked more like marginal slot-level read behaviour on the classic ESP32

### 6. Narrow timing experiment: later read-slot sampling

With the failure now looking slot-related rather than purely algorithmic, one
small timing experiment was attempted in `src/jswrap_onewire.c`.

Change tested:

- after releasing the line in `OneWireRead`, move the read sample later
- change:
  - `jshDelayMicroseconds(10)` to `jshDelayMicroseconds(12)`
  - matching tail delay from `53` to `50`

Intent:

- sample closer to roughly `15us` from slot start
- test whether the classic ESP32 was simply sampling too early

This was intentionally narrow:

- no change to search logic
- no change to the already-established ESP32 critical-section workaround
- no wider change to generic GPIO semantics

### 7. Build-system issue found while testing the timing experiment

The first rebuild after the timing edit failed for a reason unrelated to the
timing hypothesis itself.

Issue found:

- the IDF4 `bin/build` tree was stale
- generated build state still carried older `RELEASE` / build-`93` style
  defines even though the outer make layer showed the newer debug/helper build
  defines
- this caused a link failure around:
  - `jswrap_espruino_dumpFreeList`
  - `jswrap_espruino_dumpLockedVars`

Step taken:

- forced a full `make clean`
- reran the build from a clean IDF4 tree

What worked:

- the full clean rebuild restored consistent build flags and generated files
- the timing-experiment image then built and flashed successfully

What did not:

- incremental rebuild on the stale tree was not trustworthy enough for this
  investigation

Practical conclusion:

- for this IDF4 repo, clean rebuilds are safer whenever generated-wrapper state
  and compile-flag state look inconsistent

### 8. Post-patch rerun: no improvement

After the clean rebuild and flash of the timing-experiment image, the same
per-call `searchDebug()` method was rerun over `200` searches.

Result:

- `runs 200`
- `search_fail_runs 19`
- `json_fail_runs 0`
- `missing_fail_runs 0`

Miss classification:

- `id_low_missed = 9`
- `cmp_low_missed = 10`

The post-patch failures were still spread across many abort bits, for example:

- `1`, `3`, `7`, `8`, `14`, `15`, `20`, `23`, `24`, `25`, `35`, `39`,
  `40`, `41`, `42`, `43`, `53`

What worked:

- the per-call measurement again gave a clean comparison
- the build/flash path for the timing experiment itself was valid

What did not:

- later sampling did not reduce the failure rate
- it also did not collapse the failure pattern into a more interpretable
  cluster

Direct comparison:

- pre-experiment best measurement: `18/200` failed searches
- post-experiment measurement: `19/200` failed searches

Practical conclusion:

- the narrow “sample slightly later” hypothesis was not supported

### 9. Revert experiment and restore known source state

Because the timing experiment did not improve behaviour, the OneWire source was
reverted to the prior helper-enabled branch state.

Steps taken:

- reverted the temporary read-slot timing edit in `src/jswrap_onewire.c`
- confirmed the repo was clean again
- rebuilt and reflashed the board so the bench matched the source state again

Restored source-aligned state:

- branch tip `f3205c09f`
- helper-enabled build with `searchDebug()`
- original read-slot timing restored

This left the bench in a known-good-for-investigation state rather than
leaving an unsupported experimental tweak in place.

## Summary Of Issues Found Today

1. The June ESP32 critical-section fix shape was still valuable, but on the
   classic ESP32 IDF4 target it was not sufficient to make multi-device
   `OneWire.search()` stable.
2. Bulk helper output over the UART REPL path was vulnerable to injected
   watchdog text and fresh-boot console noise.
3. The underlying OneWire instability remained even when bulk JSON was
   avoided.
4. Failure positions were distributed across the ROM search, not concentrated
   at one fixed bit.
5. A narrow later-sample timing tweak did not improve the failure rate.
6. The IDF4 build tree can hold stale generated/build-flag state and may need
   explicit cleaning before trusting investigation rebuilds.

## What Worked

- The earlier June helper strategy remained useful:
  - local ESP32 critical-section override
  - `searchDebug()` instrumentation
- The shared DS18B20 functional test could still pass in some runs, proving the
  bus was not dead.
- The per-call `searchDebug()` measurement method gave the clearest real
  failure metric.
- Clean rebuild and reflash from the IDF4 repo were repeatable once the stale
  build tree issue was corrected.

## What Did Not Work

- Large bulk `searchDebug()` dumps over the normal UART REPL path were too
  noisy to rely on as the primary metric.
- Simple “sample a little later” read-slot tuning did not improve the classic
  ESP32 IDF4 result.
- Fresh-flash immediate REPL captures could be contaminated by boot/BLE/network
  console text, so they are poor evidence unless the console is first
  resynchronised.

## Relationship To Earlier Notes

This July 8 result does not contradict the earlier June notes. Instead it
narrows the scope of what those earlier notes proved.

The earlier June work showed:

- the local ESP32 critical-section fix shape was valid
- it solved the investigated C3 cases on the benches used then
- it built cleanly in both IDF4 and IDF5 trees

This July 8 work shows:

- carrying that same fix shape onto the classic ESP32 IDF4 target does not, by
  itself, fully solve the multi-device harness OneWire search instability
- the remaining issue on classic ESP32 appears more subtle than the original
  C3 timing failure alone

So the earlier quiet-timing fix should still be treated as a correct and
useful fix for the problem it solved, but not yet as the whole story for this
classic ESP32 harness case.

## Subsequent Espressif OneWire Component Review (2026-07-09)

After the July 8 bench work, the official Espressif-side OneWire
implementation was reviewed to look for clues that could guide the remaining
ESP32 IDF4 investigation.

Scope reviewed:

- local IDF tree under `/home/simon/MaBecker/Espruino_upstream_idf4/esp-idf-4`
- Espressif `idf-extra-components` `onewire_bus` component

Key findings:

1. The local ESP-IDF 4 tree does not contain a generic host-side OneWire
   component that can simply be adopted into this Espruino IDF4 build.
2. The current official Espressif component is `espressif/onewire_bus`, but
   its manifest declares `idf: ">=5.0"`, so it is an IDF5-era component rather
   than an IDF4 drop-in solution.
3. That component is architecturally different from Espruino's current
   software-bit-banged `src/jswrap_onewire.c` path:
   - it uses RMT transmit and receive together on the same pin
   - it keeps the bus explicitly in open-drain mode
   - it can enable an internal pull-up
   - it decodes pulse widths for read slots and presence detect rather than
     relying on one GPIO sample point
4. The component changelog explicitly notes a recovery-time increase to support
   more sensors on longer wire, which is a useful clue that timing margin on
   loaded buses really matters.
5. The component is not evidence that all mixed-device search problems are
   already solved on the Espressif side. Public issue reports exist for
   mixed-device search failures caused by first-bit discrepancy handling in the
   search iterator.

Practical interpretation:

- there is still some realistic room for incremental improvement in the
  classic ESP32 IDF4 build
- however, the official Espressif direction for more robust OneWire handling is
  peripheral-backed, and that points much more naturally to the IDF5 line than
  to deeper IDF4 backport work

So the current judgement is:

- IDF4 is still worth a bounded close-out pass
- larger OneWire improvement effort should move toward the IDF5 implementation

## Initial Same-Family Baseline Rerun (2026-07-09)

With the bench left in the same population as the last IDF4 runs, the first
step of the revised plan was to re-establish the same-family baseline before
reintroducing mixed device types.

Bench population during this rerun:

- `DS18B20 + DS18B20`
- no `DS2413` reintroduced yet

Firmware state:

- `ESP32_IDF4`
- `process.version = 2v29.102`
- `process.env.GIT_COMMIT = f3205c09f`

### Shared REPL DS18B20 test

Command:

- `python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js --port /dev/ttyUSB0 --baud 115200 --timeout 15`

Two representative runs were taken.

Run 1:

- all `6/6` search scans found both ROMs
- both returned scratchpads produced plausible temperatures
- both scratchpads failed CRC

Returned scratchpads:

- `850100007fe13cab16`
- `890101007fe13caa6a`

Run 2:

- one search pass returned `[]`
- the remaining `5/6` scans found both ROMs
- both returned scratchpads again produced plausible temperatures
- both scratchpads again failed CRC

Returned scratchpads:

- `890100017fe13caa6a`
- `8b0101007fe13caaec`

Practical interpretation:

- same-family `OneWire.search()` is still intermittent on the classic ESP32
  IDF4 target
- in addition, DS18B20 scratchpad reads can look superficially plausible while
  still being corrupt at the CRC level

### Same-family search soak

Command:

- `python3 tools/common/onewire_soak_generic.py --port /dev/ttyUSB0 --baud 115200 --pin D13 --scans 50`

Summary:

- `two_device = 44`
- `one_device = 5`
- `zero_device = 1`

ROM appearances:

- `28b27e8700667bcf` seen `49/50`
- `289ac18700ef2bbe` seen `44/50`

This confirmed that the same-family search path is still unstable even when
using a compact command/response format rather than a large shared test.

### Per-call `searchDebug()` rerun

A paced per-call host loop was then used to avoid the noisy bulk-debug upload
path while still using the helper-enabled firmware.

Summary over `20` single-call debug runs:

- `17` successful full two-device searches
- `3` failed searches

Observed failure shapes:

- one run aborted on the first search pass at bit `53` and returned no devices
- one run found the first ROM, then aborted on the second pass at bit `59`
- one run found the first ROM, then aborted on the second pass at bit `39`

Practical interpretation:

- the helper remains usable on this build when driven one call at a time
- the same-family failure mode is still a real search-level instability, not
  just a higher-level shared-test artefact
- the DS18B20 scratchpad CRC failures are a second symptom that should now be
  tracked alongside search instability during the rest of the IDF4 close-out

## Initial Mixed-Family Rerun (2026-07-09)

After the same-family baseline was re-established, the removable `DS2413`
breakout was re-fitted on `J_DS2413` and the board was power-cycled.

Mixed-family bench population during this rerun:

- `DS18B20 + DS18B20 + DS2413`

Selector state during this rerun:

- `SEL_D33 = 1-2`
- `SEL_D26 = 1-2`

So this stage exercised mixed-family discovery and direct device commands on
the shared `D13` OneWire bus, but it did not yet route DS2413 PIO feedback
into `D33` / `D26`.

Observed DS2413 ROM on the bus:

- `3a27d15e000000f2`

### Mixed-family search soak

Command:

- `python3 tools/common/onewire_soak_generic.py --port /dev/ttyUSB0 --baud 115200 --pin D13 --scans 50`

Observed scan population:

- `46/50` scans returned the full three-device set:
  - `28b27e8700667bcf`
  - `289ac18700ef2bbe`
  - `3a27d15e000000f2`
- `4/50` scans returned `[]`
- one otherwise successful scan returned a duplicated DS18B20 ROM in place of
  the second DS18B20:
  - `["28b27e8700667bcf","28b27e8700667bcf","3a27d15e000000f2"]`

ROM appearances across `50` scans:

- `28b27e8700667bcf` seen `47/50`
- `289ac18700ef2bbe` seen `45/50`
- `3a27d15e000000f2` seen `46/50`

Practical interpretation:

- when the mixed-family search succeeds, it usually returns the same full
  three-device set deterministically
- however, full-search failures still occur, and one malformed successful scan
  showed ROM duplication rather than a clean omission

### Mixed-family per-call `searchDebug()` rerun

A paced per-call helper loop was repeated against the mixed-family bus.

Summary over `20` single-call debug runs:

- `18` successful full three-device searches
- `2` failed searches

Observed failure shapes:

- one run found the first DS18B20 ROM, then aborted on the second pass at bit
  `54`
- one run aborted on the first pass at bit `13` and returned no devices

Practical interpretation:

- mixed-family search on this bench is still not fully reliable on the classic
  ESP32 IDF4 build
- but in this short sample it was slightly better than the same-family
  `DS18B20 + DS18B20` search baseline

### Mixed-family command checks using known ROMs

To separate command-level behaviour from search instability, a direct REPL
check was run using the known ROMs rather than performing a fresh search inside
each command cycle.

ROMs used:

- `DS18B20`: `28b27e8700667bcf`
- `DS18B20`: `289ac18700ef2bbe`
- `DS2413`: `3a27d15e000000f2`

Command sequence per run:

1. `ow.reset()`
2. `ow.skip(); ow.write(0x44, 1)` for DS18B20 conversion
3. wait approximately `1s`
4. read both DS18B20 scratchpads by `ow.select(rom); ow.write(0xBE)`
5. send a DS2413 access-write sequence with values:
   - `0xFF`
   - `0xFE`
   - `0xFD`
   - `0xFC`
   - `0xFF`

Five runs were taken.

DS2413 results:

- `confirm` byte was consistently `aa`
- `status` bytes were consistently:
  - `0f` for `0xFF`
  - `3c` for `0xFE`
  - `c3` for `0xFD`
  - `f0` for `0xFC`
  - `0f` for the final `0xFF`

Practical interpretation for DS2413:

- direct DS2413 command/write-confirm/status handling appears stable on this
  build when driven by known ROM
- that does not yet prove the feedback routing path because `SEL_D33` /
  `SEL_D26` remained in their normal loopback positions during this rerun

DS18B20 filtered scratchpad results:

- all runs returned plausible temperatures around `24.94C` and `25.06C`
- CRC validity varied by run and by sensor

Representative scratchpads:

- sensor `28b27e8700667bcf`
  - good CRC example: `8f0100007fe13caaba`
  - bad CRC example: `8f0101007fe13caaba`
  - bad CRC example: `8f0100007fe13dabba`
- sensor `289ac18700ef2bbe`
  - good CRC example: `910100007fe13caa57`
  - bad CRC example: `910100007fe13daa57`
  - bad CRC example: `910100017fe13caa57`
  - bad CRC example: `910100007fe13dab57`

Practical interpretation for DS18B20:

- even when search is removed from the equation and known ROMs are used
  directly, DS18B20 scratchpad CRC corruption still occurs on this classic
  ESP32 IDF4 build
- this confirms that the current limitation is not only a search-enumeration
  problem
- the mixed-family bus can support stable DS2413 command/status exchange while
  still showing intermittent DS18B20 scratchpad corruption

## DS2413 Feedback Path Rerun (2026-07-09)

After the mixed-family direct-command checks, the harness was moved into the
full block 6 DS2413 feedback selector state:

- `SEL_D33 = 2-3`
- `SEL_D26 = 2-3`

The board was then power-cycled and the canonical V1 DS2413 validation script
was rerun:

- `python3 tools/wiring_tests/esp32_v1/onewire_gpio_block6.py --port /dev/ttyUSB0 --baud 115200`

Observed results:

- all `5/5` `OW_SCAN_n` passes found:
  - `28b27e8700667bcf`
  - `289ac18700ef2bbe`
  - `3a27d15e000000f2`
- `DS2413_COUNT = 1`
- the DS2413 family code check passed
- all write-confirm/status checks passed
- all `D33` / `D26` feedback observations matched expectation

Observed step results:

- `BOTH_RELEASED`
  - `confirm = aa`
  - `status = 0f`
  - `d33 = 1`
  - `d26 = 1`
- `PIOA_LOW`
  - `confirm = aa`
  - `status = 3c`
  - `d33 = 0`
  - `d26 = 1`
- `PIOB_LOW`
  - `confirm = aa`
  - `status = c3`
  - `d33 = 1`
  - `d26 = 0`
- `BOTH_LOW`
  - `confirm = aa`
  - `status = f0`
  - `d33 = 0`
  - `d26 = 0`
- `BOTH_RELEASED_AGAIN`
  - `confirm = aa`
  - `status = 0f`
  - `d33 = 1`
  - `d26 = 1`

Practical interpretation:

- the classic ESP32 IDF4 build can successfully:
  - discover the DS2413 on the mixed OneWire bus
  - issue DS2413 access-write commands reliably
  - observe the expected PIO feedback through the block 6 selector routing
- this strengthens the current fault boundary:
  - DS2413 command and feedback behaviour appears stable on this build
  - DS18B20 scratchpad CRC corruption remains the dominant remaining
    command-level OneWire problem
  - mixed-family search is still imperfect, but the DS2413 path itself is not
    the main remaining blocker

Taken together with the earlier same-family and mixed-family results, the
current classic ESP32 IDF4 limitation is therefore more specific than "all
OneWire is broken". The build can support stable DS2413 GPIO-style activity on
the shared bus, while DS18B20 temperature-read integrity and some search runs
remain unreliable.

## Revised Plan

The follow-on plan after the July 8 bench session and the July 9 Espressif
component review is:

1. Freeze the current ESP32 IDF4 baseline.
   Record the exact branch, commit, bench target, harness selector state, bus
   population, and current search failure evidence as the legacy reference
   point.
2. Re-establish the IDF4 baseline in the simplest bus cases first.
   Rerun:
   - single-device `DS18B20`
   - same-family multi-device `DS18B20 + DS18B20`
3. Add back mixed device types explicitly to characterise the real legacy
   limitation.
   Rerun:
   - `DS2413` only where practical
   - `DS18B20 + DS2413`
   - any other harness-relevant population that is easy to repeat on the bench
4. Separate search failures from command-level failures.
   For each population, capture:
   - `OneWire.reset()`
   - `OneWire.search()` repeatability
   - device-specific command success after selection where practical
5. Do one bounded final IDF4 timing/noise-reduction pass only.
   Keep this to low-risk experiments such as:
   - recovery-time increases
   - small read-slot sample-point changes
   - reduced background firmware activity and unsolicited console/runtime work
6. Use strict stop criteria on IDF4.
   If changes only give marginal gains, unstable tradeoffs, or population-
   specific wins that do not generalise, stop further optimisation work there.
7. Preserve the best achievable IDF4 result as the legacy reference position.
   That may be "works acceptably on some populations, but mixed-device or more
   heavily loaded buses remain limited."
8. Move the main forward improvement effort to IDF5.
   The strongest next technical path is to assess whether the IDF5 line should
   use the Espressif `onewire_bus` approach directly, or an Espruino-native
   peripheral-backed equivalent based on the same general strategy.

## Final Bounded IDF4 Timing Pass (2026-07-09)

After the same-family, mixed-family, and block-6 reruns above, one final
low-risk IDF4 timing experiment was taken before freezing the legacy baseline.

### Provisioning clarification

While preparing the rebuild, an environment detail was confirmed:

- `source scripts/provision.sh ESP32` is not sufficient for the IDF4 tree
- `source scripts/provision.sh ESP32_IDF4` is required to provide `idf.py`

Practical consequence:

- classic ESP32 legacy-build setup and ESP32 IDF4 setup must be treated as
  separate provision flows during firmware investigation work

### Change tested

The experiment did not alter search logic or the existing ESP32
critical-section override. It only changed the read-slot tail delay in
`src/jswrap_onewire.c`:

- from `jshDelayMicroseconds(53);`
- to `jshDelayMicroseconds(60);`

Intent:

- give slightly more recovery margin between consecutive read slots
- test whether a small post-sample relaxation would improve the mixed-device
  DS18B20 integrity issue without broader behavioural change

### Build and flash

The image was rebuilt and flashed from:

- repo `/home/simon/MaBecker/Espruino_upstream_idf4`
- branch `fix/esp32-idf4-onewire-v1-harness`

Build command:

- `bash -lc 'source scripts/provision.sh ESP32_IDF4 >/dev/null && BOARD=ESP32_IDF4 RELEASE=0 make -j4'`

Flash command:

- `bash -lc 'source scripts/provision.sh ESP32_IDF4 >/dev/null && BOARD=ESP32_IDF4 RELEASE=0 make flash PORT=/dev/ttyUSB0'`

### Post-flash DS18B20 filtered soak

To remove search variability from the selection list and focus on DS18B20
command behaviour, a filtered soak was run that:

- performs one initial `ow.search()`
- keeps only ROMs with family prefix `28`
- repeatedly converts and reads those known DS18B20 ROMs

Command:

- `python3 tools/common/ds18b20_read_soak.py --port /dev/ttyUSB0 --pin D13 --baud 115200 --runs 10`

Initial ROMs:

- all ROMs: `["28b27e8700667bcf","289ac18700ef2bbe","3a27d15e000000f2"]`
- filtered DS18B20 ROMs:
  - `28b27e8700667bcf`
  - `289ac18700ef2bbe`

Summary:

- `10/10` runs still had at least one CRC failure
- some runs returned the same scratchpad pattern for both selected ROMs
- plausible temperatures were still reported, but data integrity was not

Representative returned scratchpads:

- `9d0100007fe13caa2b`
- `9b0100017fe13caafb`
- `9d0101007fe13caa2b`
- `9d0100007fe13daa2b`

Practical interpretation:

- increasing the post-read delay did not fix DS18B20 corruption
- the failure still looks broader than a final-byte CRC-only problem
- ROM-specific selection/read integrity is still suspect because some runs
  returned duplicated DS18B20 payloads across the two selected ROMs

### Mixed-family search recheck on the same image

Command:

- `python3 tools/common/onewire_soak_generic.py --port /dev/ttyUSB0 --baud 115200 --pin D13 --scans 50`

Summary:

- full three-device set returned in `48/50` scans
- `1/50` single-device scan
- `1/50` empty scan

ROM appearances:

- `28b27e8700667bcf` seen `49/50`
- `289ac18700ef2bbe` seen `48/50`
- `3a27d15e000000f2` seen `48/50`

Practical interpretation:

- search itself did not materially regress and may have been marginally better
  than the earlier mixed-family baseline
- this reinforced that the timing change was not solving the main command-path
  integrity problem

### Block 6 DS2413 rerun on the same image

The canonical block-6 DS2413 feedback script was then rerun with the harness
still in the DS2413 feedback selector state:

- `python3 tools/wiring_tests/esp32_v1/onewire_gpio_block6.py --port /dev/ttyUSB0 --baud 115200`

Observed results:

- `DS2413_COUNT = 1`
- `4/5` search scans found the DS2413, with one empty scan
- `confirm` bytes remained `aa`
- `D33` / `D26` feedback still matched the requested output states
- however, the `BOTH_LOW` status byte changed from the earlier expected `f0`
  to `f1`

Practical interpretation:

- the added delay was not a harmless tweak
- it left GPIO-observable DS2413 behaviour mostly intact, but it degraded the
  status-byte result and reduced the clean-search margin in the short block-6
  sample
- this made the experiment a regression overall, not an improvement

## Updated Close-Out Judgement

The final bounded IDF4 timing pass is now complete, and it did not justify
further optimisation effort on this branch of work.

Current judgement:

1. The ESP32 IDF4 build can support useful OneWire bench work on this harness,
   especially DS2413-oriented activity and some successful search/read runs.
2. Mixed-device and even same-family DS18B20 integrity remains unreliable on
   the classic ESP32 target.
3. A further small timing adjustment did not improve DS18B20 integrity and
   introduced a DS2413 status regression.
4. The best next step is therefore to freeze the current helper-enabled IDF4
   state as the legacy reference point and move deeper OneWire improvement
   effort to the IDF5 line.

### Post-revert sanity confirmation

After the experimental `53us -> 60us` delay change was reverted in
`src/jswrap_onewire.c`, the IDF4 image was rebuilt, reflashed, and the block-6
DS2413 script was rerun once more:

- `python3 tools/wiring_tests/esp32_v1/onewire_gpio_block6.py --port /dev/ttyUSB0 --baud 115200`

Observed result after revert:

- `5/5` search scans found the full mixed-device set
- `BOTH_LOW` status returned to the expected `f0`
- the full block-6 script passed again

This confirmed that the short-lived regression belonged to the experimental
read-tail change, and that the bench has been returned to the pre-experiment
helper-enabled IDF4 baseline.

This keeps the remaining IDF4 work valuable and evidence-driven, but avoids
turning it into an open-ended optimisation project for a line that is expected
to be retired in favour of newer ESP32 firmware paths.

## Practical Capability Matrix

To close this investigation cleanly, the table below summarises the current
practical OneWire position across the ESP32-family work that now exists in this
repo.

Important scope note:

- `ESP32-C3` entries below reflect the earlier validated result recorded in
  [docs/handoff/2026-06-16-onewire-idf4-idf5.md](../../handoff/2026-06-16-onewire-idf4-idf5.md)
- classic `ESP32_V1` `ESP32_IDF4` entries reflect the direct July 8-9 bench
  evidence recorded in this note
- classic `ESP32_V1` legacy-build entries are intentionally conservative
  because that line has not yet been rerun to the same standard after this
  investigation

| OneWire capability | ESP32-C3 with quiet-timing fix | Classic ESP32_V1 IDF4 with quiet-timing fix | Classic ESP32_V1 legacy build |
| --- | --- | --- | --- |
| `OneWire` API present (`reset/search/select/skip/write/read`) | Yes | Yes | Yes, but not recently recharacterised here |
| Single-bus bring-up and device presence detect | Working on validated bench setups | Working on current bench | Likely available, but not signed off here |
| Repeated multi-device `search()` | Working on validated bench setups | Not fully reliable; intermittent misses remain | Unresolved in this close-out |
| Addressed DS18B20 conversion/read with reliable CRC outcome | Working on validated bench setups | Not reliable enough; CRC failures remain | Unresolved in this close-out |
| Known-ROM DS18B20 reads without fresh search each cycle | Working on validated bench setups | Still unreliable; corruption remains even when search is removed from the loop | Unresolved in this close-out |
| Mixed-device bus (`DS18B20 + DS2413`) discovery | Working on validated bench setups | Partly working; usually finds all devices, but not deterministically | Unresolved in this close-out |
| DS2413 access-write / confirm / status exchange | Expected to be supportable, but not the focus of the original C3 evidence | Working well enough on the current bench baseline | Unresolved in this close-out |
| DS2413 GPIO-style feedback through harness selectors | Not part of the original C3 close-out evidence | Working on the current bench baseline | Unresolved in this close-out |
| Safe recommendation for shared functional-test sign-off | Yes | Only for bounded DS2413-oriented bench work, not full DS18B20 sign-off | No |

## Interpretation For Firmware Use

The practical conclusion is that "OneWire on ESP32" is no longer a single
global statement.

For `ESP32-C3`, the local ESP32 quiet-timing fix produced a usable OneWire
implementation on the tested harness arrangements:

- repeated multi-device search was stable
- addressed DS18B20 reads were stable
- the C3 line can be treated as functionally working for the bench scenarios
  already validated

For classic `ESP32_V1` on `ESP32_IDF4`, the firmware can do useful OneWire
work, but only some usage patterns are trustworthy:

- the API itself is present and usable
- the bus can often discover devices
- the DS2413 path can perform stable command/feedback style work
- but multi-device discovery is still intermittent
- and DS18B20 read integrity is still not dependable enough for sign-off

So the classic ESP32 IDF4 result is best described as:

- partially usable
- useful for investigation and some DS2413-oriented bench activity
- not yet reliable enough for general multi-device DS18B20 use

## What CRC Retry Can And Cannot Solve

The DS18B20 CRC is helpful, but it is only a mitigation, not a complete
solution to the classic ESP32 IDF4 limitation.

CRC retry can help because:

- it detects many corrupt DS18B20 scratchpad reads
- it allows the caller to reject bad reads and try again
- it can stop many obvious bad temperatures from being accepted upstream

CRC retry cannot fully solve the problem because:

- it does not fix intermittent `search()` failures
- it does not guarantee bounded latency; repeated retries may be needed
- it does not prove that device selection remained correct
- if a valid scratchpad from the wrong ROM were returned with a valid CRC,
  CRC alone would not detect that identity error

This matters because the current classic ESP32 IDF4 evidence is not just
"temperature bytes occasionally fail CRC". It also includes signs that
selection and/or read integrity can drift even when known ROMs are used
directly.

## Final Summary

The line to draw under this investigation is:

1. The localized ESP32 quiet-timing fix is a real fix and should be preserved.
   It solved the earlier C3 OneWire timing failure and remains the correct
   targeted firmware shape for upstream discussion.
2. The same fix is not, by itself, sufficient to make classic `ESP32_V1`
   `ESP32_IDF4` a fully reliable multi-device DS18B20 OneWire platform on this
   harness.
3. Classic `ESP32_V1` `ESP32_IDF4` can still perform useful OneWire work,
   especially DS2413-oriented command and feedback tests, so the result is not
   "all OneWire is broken".
4. CRC validation and retry improve safety for DS18B20 reads, but they do not
   fully close the gap left by intermittent search and selection/read-integrity
   concerns.
5. The practical forward split is therefore:
   - preserve and upstream the targeted fix that genuinely works
   - freeze classic ESP32 IDF4 as a bounded legacy reference point
   - move deeper OneWire improvement effort toward the IDF5 line
