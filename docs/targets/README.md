# Target Documentation

Target documentation describes how the common ESP32-family harness blocks are
mapped onto specific boards.

The generic design rules live in `../design/`; target directories should focus
on pin allocation, selector state, bring-up notes, and target-specific
constraints.

## Current Targets

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

- current wirewrap build target
- practical target board is the Olimex ESP32-DevKit-LiPo Rev.D, described by
  Olimex as pin-to-pin comparable with Espressif ESP32-CoreBoard /
  `ESP32-DevKitC`
- KiCad project lives in `../../KICAD/ESP32_V1/`

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
