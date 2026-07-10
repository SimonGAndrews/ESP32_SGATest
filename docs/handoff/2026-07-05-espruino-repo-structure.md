# Espruino Repo Structure By Purpose

Date: 2026-07-05

This note is a simplified successor to:

- [2026-07-01-espruino-repo-structure.md](/home/simon/MaBecker/ESP32_SGATest/docs/handoff/2026-07-01-espruino-repo-structure.md)

Keep the older note as the transitional history record.
Use this note as the main operational guide for current work.

Use this note together with:

- `AGENTS.md`
- [2026-06-25-esp32-family-tests.md](/home/simon/MaBecker/ESP32_SGATest/docs/handoff/2026-06-25-esp32-family-tests.md)
- [artifact-index-2026-07-old-espruino-sandbox.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/artifact-index-2026-07-old-espruino-sandbox.md)

## Purpose

The aim of this note is simple:

- identify which local Espruino repo should be used for which class of task
- preserve the repo context behind completed PR work
- keep Codex and future threads on the correct codebase without relying on
  older mixed sandboxes

## Current Working Repos By Purpose

### 1. Codex interactive harness repo

Path:

```text
/home/simon/MaBecker/ESP32_SGATest
```

Windows counterpart:

```text
C:\Users\simon\Documents\ESP32_SGATest
```

Use for:

- the main interactive Codex working repo
- harness design
- bench evidence
- investigation notes
- REPL tests and Python runners
- workflow and continuity notes

Current branch:

- `main`

Remotes:

- `origin` -> `git@github.com:SimonGAndrews/ESP32_SGATest.git`

Rule:

- start Codex interactive work here unless the task is specifically to edit
  firmware code in an Espruino repo
- keep docs, tests, evidence, and tooling here
- do not use this repo for Espruino firmware PR code itself

### 2. Legacy ESP32 codebase

Path:

```text
/home/simon/MaBecker/Espruino_master
```

Use for:

- classic legacy `ESP32` build work from `boards/ESP32.py`
- comparisons against newer IDF4 and IDF5 ESP32 lines
- legacy-user issue investigation where the old `ESP32` build itself is under
  test

Current branch:

- `master`

Remotes:

- `origin` -> `git@github.com:SimonGAndrews/Espruino.git`

Rule:

- use this repo when the work is specifically about the legacy `ESP32`
  codebase
- do not mix MaBecker IDF5 work into this repo

### 3. IDF4 / upstream codebase

Path:

```text
/home/simon/MaBecker/Espruino_upstream_idf4
```

Use for:

- upstream-targeted ESP32 IDF4 work
- shared fixes intended for `espruino/Espruino`
- clean upstream PR preparation

Current working branch:

- `fix/esp32-idf4-onewire-v1-harness`

Remotes:

- `origin` -> `git@github.com:SimonGAndrews/Espruino.git`
- `upstream` -> `git@github.com:espruino/Espruino.git`

Rule:

- use this repo when the destination is upstream `espruino/Espruino`
- create or refresh clean feature branches from current `upstream/master`
- do not use this repo for MaBecker-targeted IDF5 work

Current local preservation note:

- the main repo path is now used directly for active IDF4 branch work
- an unrelated local UART investigation snapshot is preserved separately at
  `/home/simon/MaBecker/Espruino_upstream_idf4_uart_local`
  on branch `wip/esp32-uart-rx-burst-idf4-local`
- this exists only to keep unrelated in-progress local changes out of the main
  IDF4 repo path while active OneWire work proceeds

### 4. IDF5 / MaBecker codebase

Path:

```text
/home/simon/MaBecker/Espruino_IDF5
```

Use for:

- current MaBecker ESP32 IDF5 firmware work
- IDF5 issue investigation
- clean branch work against `MaBecker/Espruino`

Current branch:

- `esp32_5`

Remotes:

- `origin` -> `https://github.com/MaBecker/Espruino.git`
- `fork` -> `https://github.com/SimonGAndrews/Espruino.git`

Rule:

- use this repo when the destination is `MaBecker/Espruino`
- create new clean branches from `esp32_5` for follow-on IDF5 work
- this is now the default repo for active MaBecker IDF5 tasks

### 5. Archived or historical repos

These are not current working bases for new code.

#### Old mixed sandbox

Path:

```text
/home/simon/MaBecker/Espruino_ARCHIVEONLY_SeeESP32_SGATEST
```

Use:

- historical archive only

Rule:

- do not use as a base for new work
- non-PR investigation residue has been preserved as patch artifacts in
  `ESP32_SGATest/docs/investigations/`

#### Historical digitalPulse PR worktree

Path:

```text
/home/simon/MaBecker/Espruino_pr_digitalpulse
```

Use:

- historical context only

Current note:

- this path was a worktree tied to the older sandbox repo
- after the sandbox repo rename, this worktree should not be treated as a
  reliable active repo

Rule:

- do not use this path for new work
- use `Espruino_IDF5` instead

## PR-Linked Repo History

This section exists to preserve repo context for completed PR work.
It is not intended to be a general PR tracker.

### `MaBecker/Espruino#4`

PR:

- [Fix/esp32 idf5 digitalpulse target v2 #4](https://github.com/MaBecker/Espruino/pull/4)

What it preserved:

- the ESP32 IDF5 target-side `digitalPulse` fix

Historical local repo/branch used to raise it:

- repo path: `/home/simon/MaBecker/Espruino_pr_digitalpulse`
- branch: `fix/esp32-idf5-digitalpulse-target-v2`

Current follow-on repo:

- `/home/simon/MaBecker/Espruino_IDF5`

Related notes:

- [conclusion-2026-07-05.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/digitalpulse/conclusion-2026-07-05.md)
- [artifact-index-2026-07-old-espruino-sandbox.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/artifact-index-2026-07-old-espruino-sandbox.md)

## Open PR Or Issue-Prep Codebases

At the time of this note:

- no separate active PR-prep repo is required beyond the current working repos
  above

Current exception kept intentionally for issue verification:

- `/home/simon/MaBecker/Espruino_master`
  branch `test/gordon-uart-master-2026-07-06`
- created after syncing local `master` to current `origin/master` /
  `upstream/master`
- purpose: hold a stable verification point for Gordon's upstream
  `ESP32` UART RX fix from issue
  [espruino/Espruino#2718](https://github.com/espruino/Espruino/issues/2718)
  without disturbing the legacy investigation branch
  `investigate/esp32-uart-rx-burst-legacy`
- practical effect: local `master` already contains the same upstream fix; the
  extra branch exists as a named test snapshot for bench reruns and discussion
  follow-up

If new PR work starts later, record:

- destination repo
- local repo used
- branch name
- issue or PR reference

## Notes On Repo Use

### One repo per codebase

Use:

- `Espruino_master` for legacy `ESP32`
- `Espruino_upstream_idf4` for upstream/IDF4 work
- `Espruino_IDF5` for MaBecker/IDF5 work
- `ESP32_SGATest` for tests, evidence, and documentation

This is enough to investigate issues and manage PRs cleanly.

### Use branches, not mixed sandboxes

The preferred pattern is:

1. choose the repo that matches the destination codebase
2. branch for the issue or task
3. build and test in that repo
4. raise the PR from that branch if needed

That is the preferred replacement for the earlier worktree-heavy arrangement.

### Keep dormant investigation code as artifacts

If investigation code is valuable but not ready to live as an active branch:

- preserve it as a patch artifact in `ESP32_SGATest/docs/investigations/`
- document what repo it should be reapplied to later

Do not keep a mixed local sandbox alive just to preserve dormant work.

### Keep firmware ownership clear

The harness repo can describe, test, and support firmware work.
But actual firmware code changes should live in the Espruino repo that matches
the intended destination.

## New Thread Guidance

If a new thread is opened for firmware or PR work:

1. read `AGENTS.md`
2. read [2026-06-25-esp32-family-tests.md](/home/simon/MaBecker/ESP32_SGATest/docs/handoff/2026-06-25-esp32-family-tests.md)
3. read this note
4. confirm the destination codebase:
   - legacy `ESP32`
   - upstream/IDF4
   - MaBecker/IDF5
   - harness/docs/tests
5. work only in the repo that matches that destination
