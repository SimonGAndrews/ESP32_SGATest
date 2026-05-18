# ESP32 GPIO Rationalisation For Test Harnesses

This document starts the GPIO allocation work for the first ESP32 Espruino
hardware test harnesses.

The aim is to keep the peripheral/test blocks physically consistent across
the harness boards while allowing the device-under-test socket and wiring fanout
to differ per target board.

Initial boards:

- Espressif ESP32-C3-DevKitC-02 with ESP32-C3-WROOM-02
- Olimex ESP32-DevKit-LiPo Rev.D with ESP32-WROOM-32E, marking `MGN4`

Reference component set, matching the RP2040 harness:

- MCP3008 for SPI ADC validation
- MCP23008 for I2C GPIO expander validation
- two DS18B20 devices on one OneWire bus for search, ID selection, and
  addressed-device validation
- GPIO loopback pairs for `digitalWrite`, `digitalRead`, and `setWatch`
- PWM-to-ADC feedback node
- optional second SPI device, such as W25xxx flash, for shared-bus validation

## Design Intent

The harness family should use the same test block layout on each board:

- common power rails and ground distribution
- common MCP3008 block
- common MCP23008 block
- common two-device DS18B20 OneWire block
- common loopback block
- common analog feedback block
- common serial-loopback or serial-peer block

The difference between harness variants should be the DUT socket and the
wirewrap fanout from each board pin to the shared named harness nodes.

This keeps early wirewrap builds practical and leaves a clean path toward a
future PCB family where most copper can be reused and only the target-board
socket/fanout changes.

## Common Harness Nodes

These names describe the logical harness, not final pin choices.

| Harness node | Purpose |
|---|---|
| `GPIO_LOOP_A_OUT` | digital output for loopback pair A |
| `GPIO_LOOP_A_IN` | digital input/watch input for loopback pair A |
| `GPIO_LOOP_B_OUT` | digital output for loopback pair B |
| `GPIO_LOOP_B_IN` | digital input/watch input for loopback pair B |
| `PWM_OUT` | PWM or digital level source for analog feedback |
| `ANALOG_FB` | filtered feedback node driven by `PWM_OUT` |
| `ADC_IN` | target ADC input connected to `ANALOG_FB` |
| `I2C_SDA` | MCP23008 SDA |
| `I2C_SCL` | MCP23008 SCL |
| `I2C_INT` | MCP23008 interrupt output back to target GPIO |
| `I2C_FB` | MCP23008 GPIO output back to target GPIO |
| `SPI_MISO` | MCP3008/W25xxx data to target |
| `SPI_MOSI` | target data to MCP3008/W25xxx |
| `SPI_SCK` | SPI clock |
| `SPI_CS_ADC` | MCP3008 chip select |
| `SPI_CS_FLASH` | W25xxx chip select |
| `ONEWIRE_DQ` | shared DS18B20 OneWire data bus |
| `UART_TX` | target TX for non-console serial validation |
| `UART_RX` | target RX for non-console serial validation |

## Espruino Pin Naming Assumption

The ESP32 builds under test identify GPIO numbers with a `D` prefix in the
JavaScript API.

Examples:

- `GPIO21` is addressed as `D21`
- `GPIO0` is addressed as `D0`

Board-level aliases such as `LED1` may exist, but those aliases are themselves
test subjects from the Espruino board definition. Harness wiring should be
specified in raw GPIO / `Dxx` terms.

## Pin Selection Rules

Prefer pins that are:

- exposed on the development board headers
- normal bidirectional GPIO
- available at boot without changing strapping state
- not connected to SPI flash or PSRAM
- not required by the normal REPL/flashing path
- ADC-capable where an ADC test input is needed
- usable with Espruino's target pin naming and peripheral mapping

Avoid or treat as conditional:

- flash/PSRAM pins
- boot strapping pins that may change startup mode
- UART0 pins when UART0 is the REPL/flashing console
- native USB pins when native USB is the REPL/flashing path
- input-only pins for output, loopback-drive, SPI, I2C, or PWM roles
- board-specific pins tied to LEDs, buttons, battery sensing, or power sensing
  unless the test explicitly covers that board feature

## ESP32-C3-DevKitC-02 GPIO Position

The ESP32-C3-DevKitC-02 exposes these GPIOs on the headers:

- `GPIO0`, `GPIO1`, `GPIO2`, `GPIO3`
- `GPIO4`, `GPIO5`, `GPIO6`, `GPIO7`
- `GPIO8`, `GPIO9`, `GPIO10`
- `GPIO18`, `GPIO19`
- `GPIO20`, `GPIO21`

Important board facts:

- `GPIO8` drives the onboard addressable RGB LED.
- `GPIO2`, `GPIO8`, and `GPIO9` are ESP32-C3 strapping pins.
- `GPIO9` is also the boot/download button path.
- `GPIO20` and `GPIO21` are UART0 RX/TX on the board header.
- `GPIO18` and `GPIO19` are native USB D- and D+.
- The board uses a USB-to-UART bridge for normal serial flashing/control.

Practical consequence:

- If UART0 over the USB-to-UART bridge is used as the Espruino REPL/control
  port, `GPIO20` and `GPIO21` should normally be reserved.
- Native USB Serial/JTAG is a phase-one bring-up test, so `GPIO18` and
  `GPIO19` are reserved by default for USB D-/D+.
- If both UART0 and native USB are reserved, the C3 does not have enough
  comfortable GPIO for the full RP2040-style always-connected harness.
- Therefore the C3 harness probably needs either:
  - a smaller phase-1 fixed harness plus later alternate wiring modes, or
  - jumper-selectable blocks that allow the same pins to be reused across
    mutually exclusive test phases.

### ESP32-C3 First-Pass Allocation Strategy

This is a starting strategy, not a final wiring table.

Use fixed wiring for the most important baseline tests:

| Harness node | Candidate C3 GPIO | Rationale |
|---|---:|---|
| `GPIO_LOOP_A_OUT` | `GPIO1` | normal exposed GPIO, avoids strapping and connectivity pins |
| `GPIO_LOOP_A_IN` | `GPIO3` | normal exposed GPIO, ADC-capable if later needed |
| `GPIO_LOOP_B_OUT` | `GPIO4` | normal exposed GPIO, also used by OneWire/Serial alternate modes |
| `GPIO_LOOP_B_IN` | `GPIO2` | strapping pin, but only through removable/resistor-protected loopback; confirm boot safety |
| `PWM_OUT` | `GPIO5` | exposed output-capable GPIO |
| `ADC_IN` | `GPIO0` | ADC-capable, avoids known C3 strapping pins |
| `I2C_SDA` | `GPIO6` | exposed GPIO, candidate software/peripheral I2C pin |
| `I2C_SCL` | `GPIO7` | exposed GPIO, candidate software/peripheral I2C pin |
| `I2C_INT` | `GPIO10` | exposed GPIO, useful as expander interrupt input |
| `I2C_FB` | `GPIO2` | shares the loopback-B input through I2C mode jumper; no fixed pull |
| `ONEWIRE_DQ` | `GPIO4` | shares loopback-B output through OneWire mode jumper |

Candidate alternate-mode allocation for SPI:

| Harness node | Candidate C3 GPIO | Rationale |
|---|---:|---|
| `SPI_MISO` | `GPIO3` | reused from loopback block in SPI mode |
| `SPI_MOSI` | `GPIO5` | reused from PWM block in SPI mode |
| `SPI_SCK` | `GPIO6` | reused from I2C block in SPI mode |
| `SPI_CS_ADC` | `GPIO7` | reused from I2C block in SPI mode |
| `SPI_CS_FLASH` | `GPIO10` | reused from interrupt input in SPI mode |

Candidate alternate-mode allocation for non-console serial:

| Harness node | Candidate C3 GPIO | Rationale |
|---|---:|---|
| `UART_TX` | `GPIO3` | reused from loopback-A input in serial-peer mode |
| `UART_RX` | `GPIO4` | reused from loopback-B output in serial-peer mode |

Open C3 decision:

- preserve native USB pins `GPIO18` and `GPIO19` by default from phase one
- decide whether a later explicit alternate mode may borrow `GPIO18` and
  `GPIO19`, with jumpers and warnings, after native USB testing is complete
- `GPIO2` is accepted as a resistor-protected loopback/input and I2C feedback
  input with no fixed pull, despite being a strapping pin
- decide whether `GPIO8` can be used for LED-specific tests only, leaving it
  out of general harness wiring because it is both a strapping pin and the RGB
  LED pin
- avoid using `GPIO9` for general harness wiring unless an alternate mode is
  explicitly designed around boot-button constraints

## Olimex ESP32-DevKit-LiPo Rev.D GPIO Position

The Olimex board is designed to be pin-compatible with Espressif ESP32-DevKitC,
with added LiPo charging and power circuitry. The board under test has an
ESP32-WROOM-32E module marked `MGN4`.

Classic ESP32 gives a more comfortable harness pin budget than ESP32-C3.

Generally avoid:

- `GPIO6` to `GPIO11`, used for module SPI flash
- `GPIO1` and `GPIO3`, UART0 TX/RX when used for flashing and REPL/control
- `GPIO0`, `GPIO2`, `GPIO12`, and `GPIO15` for fixed harness loads unless
  strapping behavior has been checked carefully
- `GPIO34`, `GPIO35`, `GPIO36`, and `GPIO39` for output roles because they are
  input-only

Prefer:

- `GPIO16`, `GPIO17`, `GPIO18`, `GPIO19`, `GPIO21`, `GPIO22`, `GPIO23`
- `GPIO25`, `GPIO26`, `GPIO27`, `GPIO32`, `GPIO33`
- input-only ADC pins such as `GPIO34`, `GPIO35`, `GPIO36`, or `GPIO39` for
  analog feedback input

### Olimex ESP32 First-Pass Fixed Allocation

The classic ESP32 board can support a close match to the RP2040 harness with
fixed wiring.

| Harness node | Candidate ESP32 GPIO | Rationale |
|---|---:|---|
| `GPIO_LOOP_A_OUT` | `GPIO32` | output-capable, ADC/touch-capable, away from UART0 |
| `GPIO_LOOP_A_IN` | `GPIO33` | output/input-capable, good loopback/watch input |
| `GPIO_LOOP_B_OUT` | `GPIO25` | output-capable, DAC/PWM-capable |
| `GPIO_LOOP_B_IN` | `GPIO26` | output/input-capable, DAC/PWM-capable |
| `PWM_OUT` | `GPIO27` | output/PWM-capable, near analog-capable group |
| `ADC_IN` | `GPIO34` | input-only ADC pin, suitable for feedback measurement |
| `I2C_SDA` | `GPIO21` | conventional ESP32 I2C SDA choice |
| `I2C_SCL` | `GPIO22` | conventional ESP32 I2C SCL choice |
| `I2C_INT` | `GPIO35` | input-only pin, suitable for MCP23008 interrupt input |
| `I2C_FB` | `GPIO39` | input-only pin, suitable for expander feedback input |
| `SPI_MISO` | `GPIO19` | conventional VSPI MISO |
| `SPI_MOSI` | `GPIO23` | conventional VSPI MOSI |
| `SPI_SCK` | `GPIO18` | conventional VSPI SCK |
| `SPI_CS_ADC` | `GPIO16` | output-capable spare CS, avoids strapping pins |
| `SPI_CS_FLASH` | `GPIO17` | output-capable spare CS, avoids strapping pins |
| `ONEWIRE_DQ` | `GPIO13` | output/input-capable spare GPIO, avoids strapping pins |
| `UART_TX` | `GPIO14` | output-capable non-console UART TX, away from UART0 |
| `UART_RX` | `GPIO36` | input-only ADC pin, accepted as non-console UART RX through GPIO matrix |

Open ESP32 decision:

- use the Olimex ESP32-DevKit-LiPo Rev.D hardware files as the board reference
  before freezing socket/fanout wiring
- keep the Olimex `BAT_SENS_E1` and `PWR_SENS_E1` solder jumpers open for the
  core harness, because they connect board power-sense circuitry to `GPI35`
  and `GPI39`
- use `GPIO16` and `GPIO17` for SPI chip-selects so fixed SPI wiring avoids
  `GPIO5` and other classic ESP32 strapping pins
- use confirmed `Dxx` pin naming in saved JavaScript tests

## Shared Harness Layout Recommendation

On the 25 x 30 plated-through proto board, place the reusable blocks in the
same physical regions on both harnesses:

| Region | Suggested content |
|---|---|
| DUT socket edge | target board headers/socket and labelled fanout rows |
| Digital loopback block | two resistor-protected removable loopbacks |
| Analog block | `PWM_OUT -> resistor -> ANALOG_FB`, filter capacitor, ADC feed |
| I2C block | MCP23008 socket, pull-ups, INT and feedback links |
| SPI block | MCP3008 socket, optional W25xxx socket, chip-select links |
| OneWire block | two DS18B20 headers/sockets on one bus and one 4.7k pull-up |
| Serial block | loopback/peer jumper area |
| Expansion strip | spare labelled pads for later tests or PCB revisions |

Use named harness nodes on the board silkscreen/labels rather than only raw
GPIO numbers. Raw GPIO numbers differ by target; harness functions should not.

## Next Work

Before final wiring:

1. Confirm C3 `GPIO0` analog feedback behavior in Espruino.
2. Review and refine the first wiring specs:
   - [wiring_common_blocks.md](wiring_common_blocks.md)
   - [wiring_esp32_c3_devkitc_02.md](wiring_esp32_c3_devkitc_02.md)
   - [wiring_olimex_esp32_devkit_lipo_rev_d.md](wiring_olimex_esp32_devkit_lipo_rev_d.md)
