# Generic Daughter Board Library Provenance

The project-local KiCad libraries contain only the symbols and footprints used
by the Generic Daughter Board scaffold. They are copied or derived from the
sources below so that the KiCad project remains portable and does not depend on
another checkout.

## ESP32-S3-DevKit-LiPo connector

Project assets:

- `GenericDaughterBoardV1.kicad_sym`: `CON22`
- `GenericDaughterBoardV1.pretty/HN1x22.kicad_mod`

Upstream source:

- [OLIMEX ESP32-S3-DevKit-LiPo](https://github.com/OLIMEX/ESP32-S3-DevKit-LiPo)
- [Rev-B hardware directory](https://github.com/OLIMEX/ESP32-S3-DevKit-LiPo/tree/main/HARDWARE/ESP32-S3-DevKit-LiPo_Rev_B)
- [Upstream licence](https://github.com/OLIMEX/ESP32-S3-DevKit-LiPo/blob/main/LICENSE)

The connector symbol and physical 1x22 header placement were imported from the
Rev-B hardware design. The project copy was converted for KiCad 9, isolated
from the complete upstream board libraries, given generic project-local
metadata, and associated with KiCad's standard vertical 1x22 pin-header 3D
model. Olimex identify their hardware as CERN Open Hardware Licence Version 2
- Strongly Reciprocal and require retained Olimex silkscreen attribution where
upstream silkscreen artwork is reused.

## Espruino Pico direct-mount pattern

Project assets:

- `GenericDaughterBoardV1.kicad_sym`: `ESPRUINO_PICO_SMD`
- `GenericDaughterBoardV1.pretty/ESPRUINO_PICO_SMD.kicad_mod`

Upstream source:

- [EspruinoBoard Pico directory](https://github.com/espruino/EspruinoBoard/tree/master/Pico)
- [Pico Eagle source](https://github.com/espruino/EspruinoBoard/tree/master/Pico/eagle)
- [Upstream licence](https://github.com/espruino/EspruinoBoard/blob/master/LICENSE)

The direct-mount symbol and footprint were derived from the Espruino Pico Eagle
board design and converted to KiCad during the earlier
`KICAD/V2/ComponentDevelopment/EspruinoPicoDirectMount/` work. The project-local
copies preserve that reviewed geometry while removing the Generic Daughter
Board project's dependency on the component-development project. The upstream
repository licenses its work, apart from separately identified Eagle
libraries, under Creative Commons Attribution-ShareAlike 3.0 Unported.

## V2 Target Interface connectors

Project asset:

- `GenericDaughterBoardV1.kicad_sym`: `Target_Interface_2x12_Odd_Even`

Internal source:

- `KICAD/V2/RevA/Espruino_Harness_RevA/Espruino_Harness_RevA.kicad_sym`

This symbol implements the repository's accepted two-bank Target Interface
contract. It was copied into the Generic Daughter Board project-local library
to keep the project portable. The associated 2x12 footprint remains the
standard KiCad `Connector_PinHeader_2.54mm` footprint and is not copied.

## Standard KiCad assets

The `+3.3V`, `+5V`, `GND` and `PWR_FLAG` symbols and the vertical 1x22 header 3D
model remain references to the standard KiCad 9 libraries. They are not copied
into the repository.
