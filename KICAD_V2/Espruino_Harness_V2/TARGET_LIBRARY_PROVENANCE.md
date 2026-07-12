# V2 Target Library Provenance

**Status:** Working project libraries, manually reviewed 12 July 2026

## Libraries

- Symbols: `V2_Targets.kicad_sym`
- Footprints: `V2_Targets.pretty/`

These are curated, project-local production libraries. The upstream
repositories under `KICAD_V2/upstream/` are reference inputs only. They are not
registered as KiCad production libraries and are deliberately excluded from
the parent repository.

Several footprints include interactive KiCad edits made after mechanical
import. The copies in `V2_Targets.pretty/` are therefore the authoritative V2
working versions; they must not be mechanically regenerated over the top of
those edits.

## Upstream Reference Revisions

| Source | Revision | Licence relevant to imported material |
|---|---|---|
| [Espressif KiCad libraries](https://github.com/espressif/kicad-libraries) | `ecaaf2a3d7fa059dc6f8804a46f2c7fa746a928b` | CC-BY-SA 4.0 with the upstream KiCad-library exception |
| [EspruinoBoard](https://github.com/espruino/EspruinoBoard) | `3c0f25d0f67890fd0117e88633a455beb10eaebd` | CC-BY-SA 3.0 for repository work apart from the separately treated Eagle libraries |
| [KiCad-RP-Pico](https://github.com/ncarandini/KiCad-RP-Pico) | `dc6f9b9f213dc36eebce626aa9ee72a333fa0db3` | CC-BY-SA 4.0 with the TPCWare KiCad-library exception |
| [Olimex ESP32-S3-DevKit-LiPo](https://github.com/OLIMEX/ESP32-S3-DevKit-LiPo) | `98e62ae2b9b1e52448ec585089730defb45ba869` | Hardware is published under CERN-OHL-S-2.0; retain Olimex silkscreen credit as required by the upstream README |

Manufacturer drawings and pinout references used for dimensional and mapping
checks are retained under the corresponding `docs/targets/` directories.

## ESP32-C3-DevKitC-02

- Symbol: `V2_Targets:ESP32-C3-DevKitC-02`.
- Footprint: `V2_Targets:ESP32-C3-DevKitC-02`.
- Imported from the Espressif symbol and footprint libraries.
- The symbol was migrated out of `V2_Harness.kicad_sym` for V2 target-library
  ownership.
- Pinout and dimensions were checked against the references under
  `docs/targets/esp32-c3-devkitc-02/Resources/`.
- The curated footprint adds a backside board/USB outline and mirrored
  wirewrap pin labels.

## ESP32 DevKitC V4

- Symbol: `V2_Targets:ESP32-DevKitC-V4`.
- Footprint: `V2_Targets:ESP32-DevKitC-V4-Wirewrap`.
- Based on the official Espressif `ESP32-DevKitC` symbol and footprint rather
  than the V1 harness's separate 1x19 DUT sockets.
- Pinout and dimensions were checked against the references under
  `docs/targets/esp32-devkitc-v4/Resources/`.
- The curated footprint includes manually adjusted backside construction
  labels and board/USB geometry.

## ESP32-S3-DevKitC-1 V1.1

- Symbol: `V2_Targets:ESP32-S3-DevKitC-1`.
- Footprint: `V2_Targets:ESP32-S3-DevKitC-1`.
- Based on the official Espressif DevKitC symbol/footprint data and checked
  against the V1.1 references under
  `docs/targets/ESP32-S3-DevKitC-1_V1.1/Resources/`.
- USB-to-UART and native USB/OTG connector geometry is represented.
- The curated footprint contains authoritative interactive front/back
  silkscreen adjustments.

## Olimex ESP32-S3-DevKit-LiPo-EA

- Symbol: `V2_Targets:OLIMEX-ESP32-S3-DevKit-LiPo-EA`.
- Footprint: `V2_Targets:OLIMEX-ESP32-S3-DevKit-LiPo-EA-Wirewrap`.
- Connector mapping and mechanical geometry were derived from the official
  Olimex Rev B KiCad design and supporting references.
- J3 physical label order was corrected against the source connector
  orientation.
- The curated footprint contains authoritative interactive alignment and USB
  geometry edits.

## Raspberry Pi Pico Family

- Symbol: `V2_Targets:Raspberry-Pi-Pico-Family`.
- Footprint: `V2_Targets:Raspberry-Pi-Pico-Family-Wirewrap`.
- Based on KiCad-RP-Pico library data and checked against the Pico-family
  dimension and pinout references under
  `docs/targets/Raspberry-Pi-Pico-Family/Resources/`.
- The symbol follows the physical dual-row convention: pins 1-20 run down the
  left and pins 21-40 run up the right.
- The curated footprint adds backside labels, board outline and approximate
  USB connector geometry and includes later interactive edits.

## Espruino Pico 1v4

- Symbol: `V2_Targets:Espruino-Pico-1v4`.
- Footprint: `V2_Targets:Espruino-Pico-1v4-Wirewrap`.
- Derived from Espruino board sources and the references described in
  `docs/targets/espruino_pico/README.md`.
- J6 SWD pads are represented on the board underside.
- `Espruino-Pico-Official-Adapter` is retained as a separate reference adapter
  footprint and must not be confused with the wirewrap target footprint.

## Espruino MDBT42Q Breakout

- Symbol: `V2_Targets:Espruino-MDBT42Q-Breakout`.
- Footprint: `V2_Targets:Espruino-MDBT42Q-Breakout-Wirewrap`.
- Derived from Espruino board sources and the references described in
  `docs/targets/MDBT42Q_breakout/README.md`.

## Naming and Maintenance Policy

A target-board footprint name identifies a specific physical board or a
documented compatible revision family. Bare MCU/module footprints and adapter
landing patterns are separate assets and must not be confused with wirewrap
target footprints.

Future source refreshes must be reviewed as merges, not blind replacements.
Preserve pad numbering, symbol-to-footprint associations, backside construction
legends and the user's interactive KiCad refinements.
