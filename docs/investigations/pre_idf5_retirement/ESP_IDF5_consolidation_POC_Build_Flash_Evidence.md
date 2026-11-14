# ESP32 IDF5 Backend Consolidation POC: Build and Flash Evidence

## Result

The unmodified automated consolidation commit built successfully for all three
required IDF5 targets on 2026-11-13. Each resulting image was flashed to a
corresponding loose development board, passed esptool write verification,
booted, and reported the expected board, version and source commit through the
Espruino REPL. The classic ESP32 and ESP32-C3 boards used for this startup
check were not the wired V1 harness targets.

No manual firmware-source correction was made before or during this stage.
The wired V1 peripheral tests and the wider existing functional test suites
have not yet been run; this record therefore establishes successful build,
flash and startup on loose boards, not V1 harness validation or complete
runtime qualification.

## Source and toolchain provenance

| Item | Recorded value |
|---|---|
| Espruino repository | Simon's local Espruino checkout |
| Branch | `poc/esp32-idf5-consolidation` |
| Fixed baseline | `2f0bc6bc293dede9458ef9d2b23ce76807f6bc94` |
| Automated consolidation commit | `953f89309ed0d155d31769017a0f32d51a586f83` |
| Build version | `2v29.504` |
| ESP-IDF version | `v5.5.3` |
| ESP-IDF commit | `2c211b236707889e8400c4dc5644dd5c4ee071e0` |
| Xtensa toolchain | `esp-14.2.0_20251107`, GCC 14.2.0 |
| RISC-V toolchain | `esp-14.2.0_20251107`, GCC 14.2.0 |
| Parallel build setting | `-j4` |

For each target, `scripts/provision.sh` was sourced in the same shell as the
build. The provisioner resolved all three boards to the `ESP32_IDF5` family and
activated the existing ESP-IDF v5.5.3 installation. A clean was performed
whenever the board target changed.

The build sequence was equivalent to:

```bash
source scripts/provision.sh <BOARD>
make BOARD=<BOARD> clean
make -j4 BOARD=<BOARD> RELEASE=1
```

where `<BOARD>` was, in order, `ESP32_IDF5`, `ESP32C3_IDF5` and
`ESP32S3_IDF5`.

## Build results

| Board | Generated identity | Pins | Application image | Smallest app partition free | Package SHA-256 | Result |
|---|---|---:|---:|---:|---|---|
| `ESP32_IDF5` | chip `ESP32`, family `ESP32_IDF5` | 40 | 1,547,536 bytes (`0x179d10`) | 500,464 bytes (`0x7a2f0`), 24% | `9a5a5d2bc222cdae9560e9e99bb2ad689e1385261f367071f17f4d20ed57ecf4` | Pass |
| `ESP32C3_IDF5` | chip `ESP32C3`, family `ESP32_IDF5` | 22 | 1,694,928 bytes (`0x19dcd0`) | 353,072 bytes (`0x56330`), 17% | `acadbc1e4a70382efbf07affe95f3eca2890675f37b6792152429f92502b60c1` | Pass |
| `ESP32S3_IDF5` | chip `ESP32S3`, family `ESP32_IDF5` | 49 | 1,563,024 bytes (`0x17d990`) | 484,976 bytes (`0x76670`), 24% | `76660a9f8b40fe6ec7da3e5a42af966ff6001629601848a6f8851fe3193b492d` | Pass |

The package hashes identify the generated `2v29.504` `.tgz` files. The
application-image hashes used to confirm that the packaged files were the
images just built were:

| Board | Application-image SHA-256 |
|---|---|
| `ESP32_IDF5` | `219f79ff70cf4c74b3855dc2f895a670d43b5d4e04d7d7bf71b94367ba7f6e56` |
| `ESP32C3_IDF5` | `f602d2a06aec4ba5e4354beb1be94d58c0b9fd42778df4a4c86f3835e331698a` |
| `ESP32S3_IDF5` | `6121611069ccf41e9eb119f55fc9207c0665d91ce00239f36e60690b738464d0` |

The builds emitted non-fatal ESP-IDF Kconfig migration messages and compiler
warnings concerning deprecated IDF interfaces and existing type or attribute
usage. No warning stopped a build, and no build failure or source correction
was required.

## Hardware identification and flash results

Each serial device was probed with esptool before writing. The probe established
the chip type and MAC address independently of the Linux device name. The two
CH341 adapters exposed the same USB serial identifier, so their distinct USB
paths are also recorded.

| Board | Hardware form | Port during run | USB identity or path | Probed chip and MAC | Flash result |
|---|---|---|---|---|---|
| `ESP32_IDF5` | Loose development board; not the classic V1 harness target | `/dev/ttyUSB1` | USB path `0:2.2:1.0` | ESP32-D0WD-V3 rev 3.1, `08:b6:1f:70:15:18` | Pass; all written segments hash-verified |
| `ESP32C3_IDF5` | Loose development board; not the C3 V1 harness target | `/dev/ttyACM0` | Espressif USB Serial/JTAG `A0:76:4E:79:90:A0` | ESP32-C3 rev 0.3, `a0:76:4e:79:90:a0` | Pass; all written segments hash-verified |
| `ESP32S3_IDF5` | Loose development board | `/dev/ttyUSB0` | USB path `0:2.1:1.0` | ESP32-S3 rev 0.1, `68:b6:b3:27:2c:40` | Pass; all written segments hash-verified |

The board-specific bootloader, partition table and application were written.
Other flash regions were not erased. The classic ESP32 bootloader was written
at `0x1000`; the C3 and S3 bootloaders were written at `0x0`. All three used
`0x8000` for the partition table and `0x10000` for the application.

## Post-flash startup check

After reset, each board's REPL was queried serially. No REPL tool accessed more
than one board concurrently.

| Target | `process.env.BOARD` | `process.version` | `process.env.GIT_COMMIT` | Result |
|---|---|---|---|---|
| Classic ESP32 | `ESP32_IDF5` | `2v29.504` | `953f89309` | Pass |
| ESP32-C3 | `ESP32C3_IDF5` | `2v29.504` | `953f89309` | Pass |
| ESP32-S3 | `ESP32S3_IDF5` | `2v29.504` | `953f89309` | Pass |

This loose-board startup check confirms that each target is running the image
from the automated consolidation commit. It is not a substitute for the V1
harness tests or the applicable existing functional tests required by
Sections 5.2, 6.4 and 7.7 of the POC specification.
