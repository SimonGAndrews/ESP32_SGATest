# Expedited ESP32-Family IDF5 Validation

Date: 2026-08-17

## Conclusion

Use the completed classic ESP32 and ESP32-C3 V1 harnesses to establish the
state of the Espruino IDF5 code lines, then provide Gordon Williams with
repeatable hardware evidence while improving the shared functional tests for
later V2 reuse. Do not start by assuming that either current IDF5 branch is the
authoritative implementation. First reconcile Gordon's official-repository
`IDF5` branch with MaBecker's maintained `esp32_5` line and identify the exact
source, provisioning and build state that each represents.

This is primarily the **V1 bench testing and functional runners** workstream.
It crosses into **firmware investigations** when results require source-level
attribution. Firmware source changes belong in the selected Espruino checkout;
shared tests, runners and evidence belong in this repository.

## Immediate Objective

The first Ubuntu task is repository and branch reconciliation, before flashing
or extending bench tests:

1. inspect the actual local Espruino checkouts, branches, remotes and dirty state
2. fetch current remote references without discarding local work
3. compare the official `espruino/Espruino:IDF5` branch with
   `MaBecker/Espruino:esp32_5`
4. determine their merge base, ancestry, unique commits and material file
   differences
5. verify how current `master` was merged into the official `IDF5` branch
6. identify the board files, ESP-IDF version, provision scripts, build options
   and any uncommitted or external patches required by each line
7. recommend the exact commit or commits to build for the first comparison

Do not infer equivalence from similar board names, and do not treat an upstream
merge as proof that all MaBecker changes were retained correctly.

## Branch Orientation Snapshot

The following remote tips were observed on 2026-08-17 and are orientation
evidence only. Fetch them again on Ubuntu because both branches may move.

| Repository and branch | Observed tip |
|---|---|
| `espruino/Espruino:IDF5` | `391070be2b5ce37b782e858f5f3cfb505f048456` |
| `espruino/Espruino:master` | `b905c809930b24ed8d26f0d8aa98976129513c2e` |
| `MaBecker/Espruino:esp32_5` | `ca6b3592ccab25d846417774c6b18d7d3c2fe17e` |
| `MaBecker/Espruino:master` | `5bc58174f86224820bf4b972f6c14a090c493c22` |

Primary remote references:

- <https://github.com/espruino/Espruino/tree/IDF5>
- <https://github.com/MaBecker/Espruino/tree/esp32_5>

The user reports that Gordon created the official `IDF5` branch from
MaBecker's work and has since merged current upstream `master` into it. The
first task must verify the resulting Git history and implementation rather
than relying on that concise description alone.

## Ubuntu Repository Audit

Start in the harness repository and confirm it is at the expected pushed
commit. Then inspect the actual Espruino worktrees described in
[`2026-07-05-espruino-repo-structure.md`](2026-07-05-espruino-repo-structure.md).
Those paths are examples from the earlier Ubuntu environment, not guarantees.

For each relevant Espruino checkout, preserve:

- absolute local path for the session record
- `git status --short --branch`
- local branch and `HEAD`
- all remotes and fetched branch tips
- upstream/tracking configuration
- stashes, worktrees and local-only commits that could affect interpretation

After ensuring both remote lines are available in one safe comparison
checkout, use read-only Git comparisons such as:

```bash
git merge-base <official-idf5> <mabecker-idf5>
git merge-base --is-ancestor <commit-a> <commit-b>
git log --left-right --cherry-mark --oneline <official-idf5>...<mabecker-idf5>
git diff --stat <official-idf5>...<mabecker-idf5>
git diff <official-idf5>...<mabecker-idf5> -- boards scripts targets/esp32 libs/network/esp32
```

Use the actual local remote names rather than copying placeholders blindly.
Do not reset, rebase or clean either working checkout as part of this audit.

The audit output should answer:

- Is either branch a direct descendant of the other?
- Which MaBecker commits are present, absent or patch-equivalent upstream?
- What did the `master` merge change or conflict-resolve in ESP32 code?
- Which IDF5 board targets currently build: classic ESP32, ESP32-C3 and
  ESP32-S3?
- Which ESP-IDF tag/commit is provisioned by the inspected revision?
- Are generated files, submodules or local patches needed for a reproducible
  build?
- What is the smallest useful first build matrix?

Record conclusions separately from raw command output. Commit hashes and file
diffs are evidence; statements such as "branch A is newer" require an explicit
comparison basis.

## Available Bench Scope

Physical hardware currently available for repeatable V1 harness testing:

| Target | Harness | Current role |
|---|---|---|
| Classic ESP32 / ESP32 DevKitC-compatible | `KICAD/V1/ESP32_V1/` | Mature comparator and IDF5 test target |
| ESP32-C3-DevKitC-02 | `KICAD/V1/ESP32_C3_v1/` | C3 IDF5 test target and prior regression platform |
| ESP32-S3 | No completed V1/V2 harness currently available | Code/build assessment only unless separate suitable hardware is established |

Absence of an S3 harness must be stated in reports. A successful S3 build is
not hardware validation, and classic/C3 results must not be generalized to S3
without evidence.

## Test-Development Direction

Use the IDF5 request to improve the common test layer rather than expanding
target-specific script copies:

- plain reusable Espruino JavaScript under `tests/repl/`
- target pins and selector state in visible target configuration
- Python orchestration and result parsing under `tools/repl/`
- existing target-specific wiring tests retained as hardware diagnostics
- logical assertions written so the same tests can later acquire V2 target
  maps without changing their functional intent

Initial bench priority, after the code audit and reproducible builds, is:

1. identity, boot, REPL and firmware provenance
2. static GPIO read/write and watch behaviour
3. `digitalPulse` regression coverage
4. analog/PWM feedback
5. I2C and SPI functional devices
6. OneWire search, addressed access and soak behaviour
7. non-console UART crosslink
8. Wi-Fi/BLE tests selected with explicit peer and firmware roles

Run the smallest comparison matrix that can answer the current question. The
classic legacy build is a mature comparator, not a golden oracle; IDF4 builds
remain useful for separating IDF5 migration effects from target-specific
behaviour.

## Evidence Requirements

Every retained result must identify:

- target board and physical V1 harness
- harness mode, jumpers and selectors
- serial port used for control
- Espruino board file and reported version/commit
- source repository, remote, branch and full build commit
- provision-script revision and ESP-IDF version/commit
- build options and local patches
- exact test and runner command
- expected result, observed result and repeat count

Place block results under the existing `tests/Results/<block>/` structure.
Create an investigation document under `docs/investigations/` only when an
unexpected result needs sustained diagnosis. Keep build artifacts out of this
repository unless deliberately archived as compact evidence.

## Required Reading For The New Thread

Read in this order:

1. `AGENTS.md`
2. this handover
3. [`2026-07-05-espruino-repo-structure.md`](2026-07-05-espruino-repo-structure.md)
4. [`2026-07-20-esp32-firmware-lineage-and-test-interpretation.md`](2026-07-20-esp32-firmware-lineage-and-test-interpretation.md)
5. [`2026-06-25-esp32-family-tests.md`](2026-06-25-esp32-family-tests.md)
6. `docs/design/repl-test-suite-design.md`
7. `docs/design/harness-modes.md`
8. the wiring document for the target being tested
9. the relevant `tests/repl/` block and any investigation it references

Read the OneWire handover only when OneWire or closely related ESP32 timing is
in scope.

## V2 Boundary And Return Point

V2 work is deliberately slowed while this expedited validation is undertaken,
not abandoned. The reusable shared-test work is a direct input to future V2
target maps, but firmware observations must not silently alter V2 hardware
requirements.

The V2 Windows work paused after commit:

```text
c70e50c Implement Rev-A daughter-board foundations
```

That commit contains the three daughter-board project foundations, shared
libraries, measured J900/J901 interface footprints and initial Olimex S3
mapping. Resume V2 from its design documents and Git history rather than from
this firmware-validation handover.

## Suggested New-Thread Opening

```text
Workstream: V1 bench testing and functional runners
Cross-workstream dependency: ESP32 IDF5 firmware investigation
Current objective: establish the exact relationship and reproducible build
state of espruino/Espruino:IDF5 and MaBecker/Espruino:esp32_5 before selecting
the first ESP32 and ESP32-C3 V1 harness validation matrix.

Read AGENTS.md and
docs/handoff/2026-08-17-idf5-expedited-esp32-family-validation.md. Begin with
a read-only audit of the Ubuntu harness and Espruino repositories. Preserve
dirty work and report branch ancestry, unique commits, provisioning, build
targets and recommended comparison commits before making changes.
```
