# Target Documentation

Target documentation describes how the common ESP32-family harness blocks are
mapped onto specific boards.

The generic design rules live in `../design/`; target directories should focus
on pin allocation, selector state, bring-up notes, and target-specific
constraints.

## Current Targets

The C3 and classic ESP32 directories describe completed V1 harness targets and
their wiring. The Olimex directory is retained as earlier target-specific
reference history.

### `esp32-c3-devkitc-02/`

ESP32-C3-DevKitC-02 harness documentation.

Status:

- first built harness
- used for IDF4/IDF5 bring-up and regression investigation
- selector-heavy design because of the C3 pin budget

Key files:

- `wiring.md`
- `bringup.md`
- `../../Hardware/ESP32_C3/schematic-v1-1.pdf`

### `esp32-devkitc-v4/`

Classic ESP32 DevKitC V4 / `ESP32_V1` harness documentation.

Status:

- completed wirewrap harness; now used as a stable bench platform
- practical target board is the Olimex ESP32-DevKit-LiPo Rev.D, described by
  Olimex as pin-to-pin comparable with Espressif ESP32-CoreBoard /
  `ESP32-DevKitC`
- KiCad project lives in `../../KICAD/V1/ESP32_V1/`

Key files:

- `wiring.md`
- `../../Hardware/ESP32_V1/schematic-v1-0.pdf`

### `olimex-esp32-devkit-lipo/`

Earlier target-specific notes for the Olimex ESP32-DevKit-LiPo Rev.D.

Status:

- retained as target reference/design history
- current classic ESP32 harness work is consolidated under
  `esp32-devkitc-v4/`

Key files:

- `wiring.md`

## V2 Target-Library Reference Sets

- `ESP32-S3-DevKitC-1_V1.1/`
- `Raspberry-Pi-Pico-Family/`
- `espruino_pico/`
- `MDBT42Q_breakout/`

These directories provide manufacturer drawings, pinouts and, where present,
target-library notes used to validate the curated symbols and footprints in
`../../KICAD/V2/Exploration/Espruino_Harness_V2/V2_Targets.*`.

Target-specific daughter-board mappings will be added after the V2 Target
Interface contract is stable. Curated KiCad assets and upstream revisions are
described in
`../../KICAD/V2/Exploration/Espruino_Harness_V2/TARGET_LIBRARY_PROVENANCE.md`.
