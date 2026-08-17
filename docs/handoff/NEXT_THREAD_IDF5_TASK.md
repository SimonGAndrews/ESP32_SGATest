# New Thread Prompt — ESP32 IDF5 State Assessment

Workstream: V1 bench testing and functional runners

Cross-workstream dependency: ESP32 IDF5 firmware investigation

Current objective: establish the exact relationship, completeness and
reproducible build state of Gordon Williams' official
`espruino/Espruino:IDF5` branch and MaBecker's maintained
`MaBecker/Espruino:esp32_5` branch before selecting firmware for ESP32 and
ESP32-C3 V1 harness testing.

Read the repository context route in `AGENTS.md`, then read:

1. `docs/handoff/2026-08-17-idf5-expedited-esp32-family-validation.md`
2. `docs/handoff/2026-07-05-espruino-repo-structure.md`
3. `docs/handoff/2026-07-20-esp32-firmware-lineage-and-test-interpretation.md`
4. `docs/handoff/2026-06-25-esp32-family-tests.md`

This work is being resumed on Ubuntu in the `ESP32_SGATest` repository. First
inspect the actual Ubuntu workspace and locate the harness and Espruino
checkouts. Treat paths preserved in older handovers as examples until verified.

## First Task

Conduct a read-only audit of the available Espruino repositories and report:

1. each relevant checkout path, dirty state, branch, `HEAD`, remotes and
   tracking configuration
2. the freshly fetched tips of:
   - `espruino/Espruino:IDF5`
   - `espruino/Espruino:master`
   - `MaBecker/Espruino:esp32_5`
   - any relevant MaBecker base branch
3. the merge base and ancestry relationship between the official `IDF5` and
   MaBecker `esp32_5` lines
4. commits unique to each line, including patch-equivalent commits where Git
   hashes differ
5. how upstream `master` was merged into the official `IDF5` branch and any
   ESP32-related conflict resolutions or behavioural changes introduced by
   that merge
6. material differences in:
   - `boards/`
   - `scripts/`, especially provisioning
   - `targets/esp32/`
   - `libs/network/esp32/`
   - build configuration and generated inputs
7. the exact ESP-IDF tag or commit selected by each branch
8. which classic ESP32, ESP32-C3 and ESP32-S3 board definitions are present
   and whether their builds appear reproducible from committed sources
9. any local-only commits, patches, worktrees or uncommitted changes that must
   be preserved before further work
10. a recommended smallest useful build matrix for the first V1 bench tests

Separate observations, verified conclusions and open questions. Do not assume
that either branch is authoritative merely because it is newer, is hosted in
the official repository, or contains a merge from `master`.

## Constraints

- Provide a plan before making changes.
- Do not reset, clean, rebase or otherwise rewrite any checkout.
- Do not modify firmware or harness files during the initial audit.
- Do not build or flash until the candidate commits and provisioning state
  have been reported and agreed.
- Preserve interactive/local work found in any checkout.
- Firmware source changes belong in the selected Espruino repository.
- Shared tests, runners and test evidence belong in `ESP32_SGATest`.
- Use the completed classic ESP32 and ESP32-C3 V1 harnesses as the available
  bench platforms.
- There is no completed ESP32-S3 harness at present; distinguish build review
  from hardware validation.
- Develop shared logical tests so they can later gain V2 target maps without
  changing their functional intent.

## Expected First Deliverable

Before proposing code changes, provide a concise branch-state report containing:

- a repository/branch diagram or table
- exact commit hashes and ancestry findings
- important code and provisioning differences
- build-readiness assessment for classic ESP32, ESP32-C3 and ESP32-S3
- preserved local-work risks
- recommended commits and build order for the first ESP32 and ESP32-C3 V1
  harness comparison
- any questions that require Gordon Williams or MaBecker to clarify intent

The V2 harness work is deliberately paused, not abandoned. Its current return
point in this repository is:

```text
c70e50c Implement Rev-A daughter-board foundations
```
