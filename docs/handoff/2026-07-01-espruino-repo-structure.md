# Espruino Repo Structure And PR Workflow

Date: 2026-07-01
Updated: 2026-07-05

This note records which local repositories are used for which class of work,
how they connect to forks/upstream, and which branches currently hold the live
submission candidates.

Use this note together with:

- `AGENTS.md`
- `docs/handoff/2026-06-25-esp32-family-tests.md`

## Purpose

The work is split across separate local clones on purpose.

The main reasons are:

- keep harness design, bench evidence, and test runners separate from firmware
  repos
- keep MaBecker-targeted ESP32 IDF5 work separate from upstream
  `espruino/Espruino` work
- keep upstreamable fixes on clean branches that track current upstream
  `master`
- avoid mixing target-local fixes, Core issues, and investigation-only changes
  in one checkout

## Working Repositories

### 1. Harness repo

Path:

```text
/home/simon/MaBecker/ESP32_SGATest
```

Role:

- hardware design repo
- bench evidence repo
- wiring specs, investigation notes, and handoff docs
- Python/REPL harness runners

Remote:

- `origin` -> `git@github.com:SimonGAndrews/ESP32_SGATest.git`

Branch:

- `main`

Rule:

- keep all harness docs, runner scripts, and workflow notes here
- do not use this repo for Espruino firmware PR code

### 2. MaBecker ESP32 IDF5 working repo

Path:

```text
/home/simon/MaBecker/Espruino_IDF5
```

Role:

- clean working clone for current MaBecker ESP32 IDF5 firmware work
- current local base for IDF5 builds, investigation continuation, and future
  clean branch work against the MaBecker repo

Remotes:

- `origin` -> `https://github.com/MaBecker/Espruino.git`
- `fork` -> `https://github.com/SimonGAndrews/Espruino.git`

Current active branch:

- `esp32_5`

Rule:

- use this repo when the intended destination is `MaBecker/Espruino`
- create new clean branches from here for any follow-on MaBecker-targeted work
- do not use the older mixed `/home/simon/MaBecker/Espruino` sandbox for new
  development

### 3. Historical clean PR repo for `MaBecker/Espruino#4`

Path:

```text
/home/simon/MaBecker/Espruino_pr_digitalpulse
```

Role:

- historical clean working clone used for the ESP32 IDF5 `digitalPulse` PR
- preserves the branch layout used to raise `MaBecker/Espruino#4`

Remotes:

- `origin` -> `https://github.com/MaBecker/Espruino.git`
- `fork` -> `https://github.com/SimonGAndrews/Espruino.git`

Current branch of interest:

- `fix/esp32-idf5-digitalpulse-target-v2`

Rule:

- keep this repo as historical PR context if needed
- do not treat it as the default starting point for new IDF5 work now that
  `/home/simon/MaBecker/Espruino_IDF5` exists

### 4. Upstream Espruino repo for clean upstreamable work

Path:

```text
/home/simon/MaBecker/Espruino_upstream_idf4
```

Role:

- clean upstream-facing Espruino clone
- used for fixes that should go toward `espruino/Espruino`
- currently used for classic ESP32 IDF4 bring-up fixes

Remotes:

- `origin` -> `git@github.com:SimonGAndrews/Espruino.git`
- `upstream` -> `git@github.com:espruino/Espruino.git`
- `broken-origin` -> `git@github.com:SimonGAndrews/ESP32_SGATest.git`

Current branch policy:

- `master` tracks `upstream/master`
- feature branches are created from current `upstream/master`
- feature branches are pushed to `origin`
- PRs are opened from `SimonGAndrews/Espruino` to `espruino/Espruino`

Rule:

- use this repo for clean upstream PR candidates
- keep one issue/fix per branch where practical
- rebase or recreate branches from current `upstream/master` when needed

Note:

- `broken-origin` is kept only as a breadcrumb of the earlier remote mistake
- it can be deleted later once there is no value in retaining that record

### 5. Older mixed Espruino working clone

Path:

```text
/home/simon/MaBecker/Espruino
```

Role:

- older local development clone used during earlier investigation work

Current state:

- branch `esp32_5`
- contains mixed local changes spanning multiple files and issues
- non-PR investigation residue is now archived as patch artifacts under
  `ESP32_SGATest/docs/investigations/`

Rule:

- do not use this repo as the base for new clean PR preparation
- it can now be retired or deleted once the archive note has been reviewed

## PR Routing Rules

### MaBecker-targeted ESP32 work

Use:

```text
/home/simon/MaBecker/Espruino_IDF5
```

Flow:

1. branch in the clean MaBecker IDF5 repo
2. keep the diff tightly scoped to the MaBecker issue
3. push branch to `fork`
4. open PR from `SimonGAndrews/Espruino` to `MaBecker/Espruino`

### Upstream Espruino work

Use:

```text
/home/simon/MaBecker/Espruino_upstream_idf4
```

Flow:

1. `git fetch origin`
2. `git fetch upstream`
3. branch from current `upstream/master`
4. keep one upstream issue/fix per branch
5. push branch to `origin`
6. open PR from `SimonGAndrews/Espruino` to `espruino/Espruino`

### Harness and test evidence work

Use:

```text
/home/simon/MaBecker/ESP32_SGATest
```

Flow:

1. record wiring, selector state, and bench results here
2. keep Python runners and REPL test notes here
3. use this repo to explain and support firmware PRs, but not to carry the
   firmware code itself

## Branch Inventory

This list is intended to be updated as branches are created, superseded, or
merged.

### `ESP32_SGATest`

- `main`

### `Espruino_IDF5`

Active/current:

- `esp32_5`

### `Espruino_pr_digitalpulse`

Active/current:

- `fix/esp32-idf5-digitalpulse-target-v2`

Earlier local branches created during the same line of work:

- `fix/esp32-idf5-digitalpulse-target`
- `fix/esp32-idf5-digitalpulse`
- `fix/esp32-idf5-digitalpulse-combined`

Other local branches visible in this clone because of linked worktrees or
earlier ESP32-family work:

- `esp32_5`
- `simon/c3-usb-jtag-repl-fix`
- `simon/s3-usb-jtag-pin-fix`

### `Espruino_upstream_idf4`

Current clean upstream branches:

- `fix/esp32-idf4-i2c-clk-flags`
- `fix/esp32-idf4-onewire-quiet-timing`

Deleted local throwaway branch:

- `test/esp32-idf4-onewire-quiet-timing`

### Older mixed repo `/home/simon/MaBecker/Espruino`

- `esp32_5`

## Current Submission Shape

At the time of this note, the intended submission split is:

- MaBecker repo:
  - ESP32 IDF5 `digitalPulse` target fix, already preserved by
    `MaBecker/Espruino#4`
- upstream Espruino repo:
  - classic ESP32 IDF4 I2C fix
  - classic ESP32 IDF4 OneWire quiet-timing fix
- separate Core issue/reporting path:
  - `jsinteractive.c` watch/debounce behavior, handled separately from the
    ESP32 target fixes

Non-PR investigation code that still matters is preserved as patch artifacts
under `ESP32_SGATest/docs/investigations/` rather than by keeping the older
mixed repo alive.

## New Thread Guidance

If a new Codex thread is opened for firmware or PR work, the safest startup
sequence is:

1. read `AGENTS.md`
2. read `docs/handoff/2026-06-25-esp32-family-tests.md`
3. read this note
4. confirm which destination repo the next change is meant for:
   - `MaBecker/Espruino`
   - `espruino/Espruino`
   - `ESP32_SGATest`
5. work only in the local clone that matches that destination

The main operational rule is simple:

- harness work stays in `ESP32_SGATest`
- MaBecker PR work stays in `Espruino_IDF5`
- upstream Espruino PR work stays in `Espruino_upstream_idf4`
