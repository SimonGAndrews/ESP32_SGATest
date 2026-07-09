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

## Suggested Next Step

The strongest next step after this session is:

1. reduce background firmware activity in the classic ESP32 IDF4 bench build,
   especially BLE bring-up and other unsolicited console/runtime work
2. rerun the same per-call `searchDebug()` measurement on the quieter build

If the failure rate remains similar after that, the next likely path is a more
direct investigation of the classic ESP32 GPIO read/write path used by
OneWire, rather than more small search-algorithm or sample-offset tweaks.
