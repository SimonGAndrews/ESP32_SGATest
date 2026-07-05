# Old Espruino Sandbox Archive

Date: 2026-07-05

## Purpose

This note records the small set of investigation code preserved from the older
mixed local repo:

```text
/home/simon/MaBecker/Espruino
```

That repo was used as a scratch investigation tree across multiple workstreams.
It is not the authoritative home of any live PR line.

The important current position is:

- the ESP32 IDF5 `digitalPulse` target fix is already preserved in
  `MaBecker/Espruino#4`
- clean current firmware work should use the dedicated local repos noted in
  `docs/handoff/2026-07-01-espruino-repo-structure.md`
- this archive exists only to preserve non-PR investigation code that may need
  to be reapplied later

## Preserved Artifacts

### 1. Core watch/debounce candidate fix

Artifact:

- [jsinteractive-candidate-fix-2f7237a42.patch](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/jsinteractive/artifacts/jsinteractive-candidate-fix-2f7237a42.patch)

Origin:

- old repo commit `2f7237a42e97e351e2617848c9864b69737e0be3`
- local-only mixed commit from the old sandbox

Purpose:

- preserves the candidate `src/jsinteractive.c` fix for the overdue
  debounce-timeout watch path

Related investigation notes:

- [core-issue-draft-2026-06-19.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/jsinteractive/core-issue-draft-2026-06-19.md)
- [pico-repro-2026-06-19.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/watch-debounce/pico-repro-2026-06-19.md)
- [pico-simple-repro-2026-06-19.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/watch-debounce/pico-simple-repro-2026-06-19.md)

Status:

- not raised as a PR
- still a candidate fix, not an accepted design decision

Recommended future use:

- apply onto a clean upstream-style Espruino repo when returning to the Core
  watch/debounce issue
- prefer `git am` so the original commit metadata is preserved

### 2. OneWire `searchDebug()` diagnostic implementation

Artifact:

- [onewire-searchdebug-ea72b37c9.patch](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/onewire/artifacts/onewire-searchdebug-ea72b37c9.patch)

Origin:

- old repo commit `ea72b37c9ad15d468a2b96c45cf07d413dfb20c4`

Purpose:

- preserves the exact `OneWire.searchDebug()` implementation and associated
  local timing-guard form used during the investigation

Related investigation notes:

- [quiet-timing-design-2026-06-16.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/onewire/quiet-timing-design-2026-06-16.md)
- [cross-target-comparison-2026-06-15.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/onewire/cross-target-comparison-2026-06-15.md)
- [logic-trace-comparison-2026-06-15.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/onewire/logic-trace-comparison-2026-06-15.md)

Status:

- not raised as a PR
- useful as a bench diagnostic or as a base for future upstreamable work if
  that diagnostic is wanted again

Recommended future use:

- apply onto the appropriate clean Espruino repo for bench diagnostics or
  follow-on OneWire work
- prefer `git am`

### 3. Raw uncommitted sandbox debug snapshot

Artifact:

- [old-espruino-sandbox-debug-snapshot.patch](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/digitalpulse/artifacts/old-espruino-sandbox-debug-snapshot.patch)

Origin:

- uncommitted working-tree diff from the old mixed repo at archive time

Purpose:

- preserves the raw temporary debug and instrumentation state from the sandbox
  in case exact forensic reconstruction is ever needed

Related investigation notes:

- [esp32-c3-idf5-regressions-2026-06-12.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/digitalpulse/esp32-c3-idf5-regressions-2026-06-12.md)
- [mabecker-idf5-pr-draft-2026-06-19.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/digitalpulse/mabecker-idf5-pr-draft-2026-06-19.md)
- [split-submission-plan-2026-06-19.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/digitalpulse/split-submission-plan-2026-06-19.md)
- [core-issue-draft-2026-06-19.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/jsinteractive/core-issue-draft-2026-06-19.md)

Contents include:

- temporary `jstimer` debug logging
- temporary ESP32 pin/timer debug wrappers
- the local `src/jsinteractive.c` candidate fix
- mixed target-side timer work in early scratch form

Status:

- debug-only salvage
- not authoritative for any PR
- not suitable for direct submission without manual review

Important warning:

- this snapshot includes at least one accidental garbage line in
  `targets/esp32/jshardware.c`
- treat it as forensic evidence, not as a clean patch to apply blindly

Recommended future use:

- use `git apply` only if exact sandbox reconstruction is needed
- otherwise prefer the more focused artifacts above

## What Was Not Archived As A Future Fix Line

The old repo also contained:

- the early mixed `digitalPulse`/`jsinteractive` commit `2f7237a42`
- the bench-only `boards/ESP32C3_IDF5.py` USB Serial/JTAG toggle
- early scratch copies of `targets/esp32/jshardware.c` and
  `targets/esp32/rtosutil.c`

These are not the authoritative preserved form of the ESP32 IDF5
`digitalPulse` fix.

That fix line is already preserved by:

- `MaBecker/Espruino#4`
- the clean local PR repo
  `/home/simon/MaBecker/Espruino_pr_digitalpulse`
- the clean local MaBecker IDF5 repo
  `/home/simon/MaBecker/Espruino_IDF5`

## Practical Rule

Use:

- clean repos for active development and PR preparation
- these patch artifacts for dormant but valuable unmerged investigation code

Do not use:

- the old mixed sandbox repo as a base for new work
