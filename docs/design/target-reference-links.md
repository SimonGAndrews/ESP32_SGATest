# ESP32 Target Reference Links

This document collects primary reference links for the initial ESP32 Espruino
hardware test targets.

Checked: 2026-05-18

## Initial Targets

| Test target | Board | Module | Manufacturer | Notes |
|---|---|---|---|---|
| `ESP32_C3` | ESP32-C3-DevKitC-02 | ESP32-C3-WROOM-02 | Espressif | RISC-V ESP32-C3 target with Wi-Fi and Bluetooth LE. |
| `ESP32` / original tESP32 baseline | ESP32-DevKit-LiPo Rev.D | ESP32-WROOM-32E, marking `MGN4` | Olimex | Classic dual-core Xtensa ESP32 board with LiPo power support. |

## ESP32-C3-DevKitC-02

Primary board references:

- Espressif product page: https://www.espressif.com/en/dev-board/esp32-c3-devkitc-02-en
- Espressif user guide: https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32c3/esp32-c3-devkitc-02/user_guide.html
- Board schematic: https://dl.espressif.com/dl/schematics/SCH_ESP32-C3-DEVKITC-02_V1_1_20210126A.pdf

Module and SoC references:

- ESP32-C3-WROOM-02 / WROOM-02U datasheet: https://www.espressif.com/sites/default/files/documentation/esp32-c3-wroom-02_datasheet_en.pdf
- ESP32-C3-WROOM-02 module page: https://www.espressif.com/en/module/esp32-c3-wroom-02-en
- ESP32-C3 technical reference manual: https://www.espressif.com/sites/default/files/documentation/esp32-c3_technical_reference_manual_en.pdf
- ESP32-C3 datasheet: https://www.espressif.com/sites/default/files/documentation/esp32-c3_datasheet_en.pdf
- ESP-IDF USB Serial/JTAG console guide for ESP32-C3: https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-guides/usb-serial-jtag-console.html

Testing relevance:

- Header pins expose GPIO, ADC, UART0, native USB D-/D+, and the board RGB LED.
- Some GPIOs are boot strapping or shared with board features, so harness pin
  allocation must be checked against the board schematic and module boot rules.
- Native USB Serial/JTAG on the C3 may affect how REPL, flashing, and reset
  automation differ from classic ESP32 USB-UART boards.
- On the ESP32-C3-DevKitC-02 board, the normal Micro-USB connector is the
  USB-to-UART bridge path; native USB Serial/JTAG is exposed through the
  chip's USB D-/D+ pins on `GPIO18` / `GPIO19`.

## Olimex ESP32-DevKit-LiPo Rev.D

Primary board references:

- Olimex product/open-source hardware page: https://www.olimex.com/Products/IoT/ESP32/ESP32-DevKit-LiPo/open-source-hardware
- Olimex hardware repository: https://github.com/OLIMEX/ESP32-DevKit-LiPo
- Olimex Rev.D hardware files: https://github.com/OLIMEX/ESP32-DevKit-LiPo/tree/master/HARDWARE/ESP32-DevKit-LiPo-Rev.D
- Olimex ESP32 product family page: https://www.olimex.com/Products/IoT/ESP32/

Module and SoC references:

- ESP32-WROOM-32E / ESP32-WROOM-32UE datasheet: https://documentation.espressif.com/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.html
- ESP32 technical reference manual: https://www.espressif.com/sites/default/files/documentation/esp32_technical_reference_manual_en.pdf
- ESP32 datasheet: https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf
- ESP32 hardware design guidelines: https://www.espressif.com/sites/default/files/documentation/esp32_hardware_design_guidelines_en.pdf
- ESP-IDF serial connection guide for ESP32: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/establish-serial-connection.html

Testing relevance:

- The Rev.D board is intended to be pin-compatible with Espressif ESP32-DevKitC while
  adding LiPo charging, battery operation, battery measurement, and external
  power sense circuitry.
- The module family on this board is classic ESP32, so tests should distinguish
  classic ESP32 behavior from ESP32-C3 behavior where UART, ADC, Bluetooth,
  USB/serial, strapping pins, and low-power behavior differ.
- The board under test has an ESP32-WROOM-32E module marked `MGN4`.
- Battery and external-power sense pins may be useful later, but should be
  treated as board-specific rather than part of the core `jshardware` contract.

## Cross-Target References

- Espressif documentation portal: https://docs.espressif.com/
- ESP-IDF programming guide: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/
- Espruino repository: https://github.com/espruino/Espruino
- Espruino ESP32 board files: https://github.com/espruino/Espruino/tree/master/boards
- Espruino ESP32 target implementation: https://github.com/espruino/Espruino/tree/master/targets/esp32
