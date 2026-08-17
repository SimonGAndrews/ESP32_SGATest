# V2 Daughter-Board Shared Library Provenance

`V2_DaughterBoard_Targets.kicad_sym` and
`V2_DaughterBoard_Targets.pretty/` are the shared project libraries for the
three daughter-board projects below this directory. Each project resolves them
through repository-relative `${KIPRJMOD}/..` entries in its project library
tables. The assets are copied or derived from the sources below so that the
projects remain portable and do not depend on another checkout.

## ESP32-S3-DevKit-LiPo connector

Project assets:

- `V2_DaughterBoard_Targets.kicad_sym`: `CON22`
- `V2_DaughterBoard_Targets.pretty/HN1x22.kicad_mod`

Upstream source:

- [OLIMEX ESP32-S3-DevKit-LiPo](https://github.com/OLIMEX/ESP32-S3-DevKit-LiPo)
- [Rev-B hardware directory](https://github.com/OLIMEX/ESP32-S3-DevKit-LiPo/tree/main/HARDWARE/ESP32-S3-DevKit-LiPo_Rev_B)
- [Upstream licence](https://github.com/OLIMEX/ESP32-S3-DevKit-LiPo/blob/main/LICENSE)

The connector symbol and physical 1x22 header placement were imported from the
Rev-B hardware design. The project copy was converted for KiCad 9, isolated
from the complete upstream board libraries, given shared daughter-board
metadata, and associated with KiCad's standard vertical 1x22 pin-header 3D
model. Olimex identify their hardware as CERN Open Hardware Licence Version 2
- Strongly Reciprocal and require retained Olimex silkscreen attribution where
upstream silkscreen artwork is reused.

## Complete ESP32-S3 target templates

Project assets:

- `V2_DaughterBoard_Targets.kicad_sym`:
  `ESP32-S3-DevKitC-1` and
  `OLIMEX-ESP32-S3-DevKit-LiPo-RevB-EA`
- `V2_DaughterBoard_Targets.pretty/ESP32-S3-DevKitC-1.kicad_mod`
- `V2_DaughterBoard_Targets.pretty/OLIMEX-ESP32-S3-DevKit-LiPo-EA.kicad_mod`

The Espressif template was copied from the curated exploration target library,
whose source revision, manufacturer references and interactive-edit policy are
recorded in
`KICAD/V2/Exploration/Espruino_Harness_V2/TARGET_LIBRARY_PROVENANCE.md`.

The Olimex template was derived from the official Rev-B source at revision
`98e62ae2b9b1e52448ec585089730defb45ba869` and checked against the retained
Rev-B schematic, manual, pinout and dimensions referenced by
`docs/targets/olimex-esp32-s3-devkit-lipo/README.md`. It represents the owned
external-antenna EA N8R8 target. Its accepted GPIO mapping is controlled by
`docs/design/V2Harness/arch/TargetRoutingEnvelope_V2.md`; library geometry and
the scripted `DB-ESP32-FAMILY` connectivity must not be regenerated from the
upstream source over later interactive edits.

## Espruino Pico direct-mount pattern

Project assets:

- `V2_DaughterBoard_Targets.kicad_sym`: `ESPRUINO_PICO_SMD`
- `V2_DaughterBoard_Targets.pretty/ESPRUINO_PICO_SMD.kicad_mod`

Upstream source:

- [EspruinoBoard Pico directory](https://github.com/espruino/EspruinoBoard/tree/master/Pico)
- [Pico Eagle source](https://github.com/espruino/EspruinoBoard/tree/master/Pico/eagle)
- [Upstream licence](https://github.com/espruino/EspruinoBoard/blob/master/LICENSE)

The direct-mount symbol and footprint were derived from the Espruino Pico Eagle
board design and converted to KiCad during the earlier
`KICAD/V2/ComponentDevelopment/EspruinoPicoDirectMount/` work. The shared
copies preserve that reviewed geometry while removing the daughter-board
projects' dependency on the component-development project. The upstream
repository licenses its work, apart from separately identified Eagle
libraries, under Creative Commons Attribution-ShareAlike 3.0 Unported.

## V2 Target Interface connectors

Project asset:

- `V2_DaughterBoard_Targets.kicad_sym`: `Target_Interface_2x12_Odd_Even`

Internal source:

- `KICAD/V2/RevA/Espruino_Harness_RevA/Espruino_Harness_RevA.kicad_sym`

This symbol implements the repository's accepted two-bank Target Interface
contract. It was copied into the shared daughter-board library to keep the
projects portable. The associated 2x12 footprint remains the
standard KiCad `Connector_PinHeader_2.54mm` footprint and is not copied.

## Standard KiCad assets

The `+3.3V`, `+5V`, `GND` and `PWR_FLAG` symbols and the vertical 1x22 header 3D
model remain references to the standard KiCad 9 libraries. They are not copied
into the repository.
