# Documentation Map

Documentation is grouped by information type.

## `design/`

Generic ESP32-family harness design and operating principles:

- common hardware blocks
- harness modes
- connectivity permutations
- reference links

Historical design-decision notes that are no longer active guidance live under
`design/history/`.

## `targets/`

Target-specific wiring and bring-up notes. These documents describe how the
generic harness blocks are mapped onto a particular board.

Start with `targets/README.md` for the target index.

Current targets:

- `esp32-c3-devkitc-02/`
- `esp32-devkitc-v4/`
- `olimex-esp32-devkit-lipo/`

## `investigations/`

Issue analysis, debugging history, and resolution notes. These are evidence and
reasoning records, not primary wiring specs.

Current investigation areas:

- `onewire/`
- `digitalpulse/`
- `i2c/`
- `wifi/`
- `uart/`
- `watch-debounce/`
- `jsinteractive/`

Investigation-specific raw evidence should live under the relevant
investigation, for example:

```text
investigations/onewire/artifacts/logic-traces/
```

## `handoff/`

Codex/thread continuity notes. These are intended to preserve working context
between sessions and should point to the current design and target docs.

Start with `handoff/README.md`. It distinguishes current workstream handovers
from historical continuity records.

## Current Workstream Entry Points

| Workstream | Entry point |
|---|---|
| V1 bench tests and functional runners | `handoff/2026-06-25-esp32-family-tests.md` |
| Firmware investigations | `handoff/2026-07-05-espruino-repo-structure.md` and the relevant `investigations/` area |
| V2 architecture and Target Interface | `design/V2Harness/README.md` and `handoff/2026-07-17-v2-services-and-routing.md` |
| V2 KiCad implementation | `design/V2Harness/README.md` and `../KICAD/V2/Exploration/Espruino_Harness_V2/TARGET_LIBRARY_PROVENANCE.md` |

Repository-relative paths are canonical because the repository is used on both
Windows and Ubuntu.
