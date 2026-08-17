# Olimex ESP32-S3-DevKit-LiPo-EA Rev B

**Status:** Exact owned V2 target identified; electrical mapping accepted

## Accepted Target Identity

The Olimex target allocated to `DB-ESP32-FAMILY` is the external-antenna
`ESP32-S3-DevKit-LiPo-EA`, hardware revision B, in the manufacturer's N8R8
configuration. It uses the U.FL/external-antenna option rather than the
PCB-antenna product variant.

| Item | Accepted value |
|---|---|
| Target ID | `OLIMEX-ESP32-S3-DEVKIT-LIPO-EA-REV-B-N8R8` |
| Manufacturer | Olimex |
| Product | `ESP32-S3-DevKit-LiPo-EA` |
| Hardware revision | B |
| Memory configuration | N8R8: 8 MB flash and 8 MB PSRAM |
| Antenna option | U.FL connector with external antenna |
| V2 daughter board | `DB-ESP32-FAMILY` |
| Mounting | Socketed, one fitted target per daughter board |
| Shared KiCad footprint | `V2_DaughterBoard_Targets:OLIMEX-ESP32-S3-DevKit-LiPo-EA` |

The supplier product description identifies the family as N8R8. The exact
module marking on the owned board shall also be recorded during physical
placement verification; this is an evidence check and does not reopen the
accepted Rev-B EA product identity.

## Primary Sources

- Olimex product page:
  <https://www.olimex.com/Products/IoT/ESP32-S3/ESP32-S3-DevKit-Lipo-EA/open-source-hardware>
- Olimex open-source hardware repository:
  <https://github.com/OLIMEX/ESP32-S3-DevKit-LiPo>

The curated KiCad asset was derived from Olimex source revision
`98e62ae2b9b1e52448ec585089730defb45ba869` as recorded by the V2 target-library
provenance document.

## Retained Local References

The following manufacturer references are currently retained in the older
mixed Olimex resource directory. They are linked here without moving them so
the later asset-rationalisation work can separate the classic ESP32 and S3
targets in one controlled change:

- [Rev-B schematic](../olimex-esp32-devkit-lipo/Resources/ESP32-S3-DevKit-LiPo_Rev_B.pdf)
- [Rev-B manual](../olimex-esp32-devkit-lipo/Resources/Manual_ESP32-S3-DevKit-LiPo_Rev_B.pdf)
- [Pinout](../olimex-esp32-devkit-lipo/Resources/Pinout_ESP32-S3-DevKit-LiPo.jpg)
- [Board dimensions](../olimex-esp32-devkit-lipo/Resources/ESP32-S3-DevKit-LiPo-dimensions.png)

## Accepted V2 Mapping

The exact target is allocated in
[DaughterBoardMatrix_V2.md](../../design/V2Harness/arch/DaughterBoardMatrix_V2.md).
The complete 44-pad target footprint and symbol are held in the shared Rev-A
daughter-board libraries.

The accepted electrical assessment and complete contact mapping are recorded
in section 7.4 of
[TargetRoutingEnvelope_V2.md](../../design/V2Harness/arch/TargetRoutingEnvelope_V2.md).
It uses R0-R6 on `D1`, `D4`, `D15`, `D16`, `D7`, `D8` and `D9`; direct I2C on
`D10`/`D11`; and direct UART-B on `D17`/`D18`. The substitutions of `D15` and
`D16` preserve the Olimex board's loaded `D5/PWR_SENS` and `D6/BAT_SENS` pins.

The mapping is now an implementation authority. Remaining checks are to:

1. verify the fitted N8R8 module marking on the owned board
2. implement and deterministically check the accepted schematic connectivity
3. prove physical placement, USB-C/U.FL access and antenna-cable clearance
4. retain the documented single-source power and unpopulated-pUEXT test
   preconditions
