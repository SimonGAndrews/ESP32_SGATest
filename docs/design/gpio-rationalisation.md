# ESP32 GPIO Rationalisation For Test Harnesses

This document starts the GPIO allocation work for the first ESP32 Espruino
hardware test harnesses.

The aim is to keep both the physical peripheral/test blocks and the test suites
consistent across the harness boards, while allowing the device-under-test
socket and wiring fanout to differ per target board.

In other words, each board variant should prove the same Espruino hardware
interfaces wherever possible. The board-specific work is deciding which GPIOs
connect to the shared harness nodes, not redesigning the tests for every
target.

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

The intention is that the test electronics feel the same from one harness to
the next. Each harness has a DUT, meaning Device Under Test: the ESP32 board
currently plugged into, or soldered onto, that particular test harness.

The DUT socket is the physical part of the harness that accepts the target
board. That part will naturally be different for an ESP32-C3-DevKitC-02,
an Olimex ESP32-DevKit-LiPo, or a future ESP32 target. The wirewrap fanout is
the group of wires that adapts the DUT pins to the named harness nodes.

For example, the MCP23008 block should always connect to a harness node called
`I2C_SDA`. On the ESP32-C3 harness, `I2C_SDA` may be reached from `D1`. On the
classic ESP32 harness, it may be reached from `D21`. The expander circuit and
the test idea stay the same; only the board-specific adapter wiring changes.

In practical terms: keep the common test blocks consistent, and let each
target-board harness translate its own GPIO pins onto those shared test names.
This keeps early wirewrap builds understandable and leaves a clean path toward
a future PCB family where most of the reusable test circuitry can stay the
same.

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
| `ADC_IN` | target ADC input selected to `ANALOG_FB` |
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
- Therefore the C3 harness uses selector-controlled blocks that allow the same
  pins to be reused across mutually exclusive test phases.
- In schematic v1.1, `GPIO20` and `GPIO21` remain reserved by default, but may
  be deliberately connected through `J10` / `SEL_UART0_UART1` for a UART0/UART1
  crosslink test when native USB Serial/JTAG is the runner/control path, or
  exposed for deliberate external UART access with the signal shunts open.

### ESP32-C3 Allocation Used By Current Harness

This is the allocation implemented by the ESP32-C3 v1.1 schematic.

Use selector-controlled wiring for the shared C3 pins:

| Harness node | C3 GPIO | Rationale |
|---|---:|---|
| `GPIO_LOOP_A_OUT` | `GPIO1` | normal exposed GPIO, avoids strapping and connectivity pins |
| `GPIO_LOOP_A_IN` | `GPIO2` | strapping pin, but only through selector/resistor-protected loopback; confirm boot safety during bring-up |
| `GPIO_LOOP_B_OUT` | `GPIO3` | normal exposed GPIO, also used by SPI MISO and serial TX alternate modes |
| `GPIO_LOOP_B_IN` | `GPIO4` | normal exposed GPIO, also used by I2C SCL and serial RX alternate modes |
| `PWM_OUT` | `GPIO8` | strapping/RGB LED pin, used only through 10k into analog feedback so SPI can run concurrently |
| `ADC_IN` | `GPIO0` | ADC-capable, selected to `ANALOG_FB` by `SEL_D0` |
| `I2C_SDA` | `GPIO1` | uses baseline loopback output pin so I2C can coexist with SPI |
| `I2C_SCL` | `GPIO4` | uses baseline loopback input pin so I2C can coexist with SPI and OneWire |
| `I2C_INT` | `GPIO10` | exposed GPIO, useful as expander interrupt input; excludes optional flash CS in combined mode |
| `I2C_FB` | `GPIO2` | shares the loopback-A input through `SEL_D2`; no fixed pull |
| `ONEWIRE_DQ` | `GPIO0` | selected instead of `ANALOG_FB` by `SEL_D0`, freeing I2C SCL |

SPI allocation:

| Harness node | C3 GPIO | Rationale |
|---|---:|---|
| `SPI_MISO` | `GPIO3` | reused from loopback block in SPI mode |
| `SPI_MOSI` | `GPIO5` | dedicated MOSI in combined SPI/I2C bus mode |
| `SPI_SCK` | `GPIO6` | dedicated to SPI in combined SPI/I2C bus mode |
| `SPI_CS_ADC` | `GPIO7` | dedicated MCP3008 chip select in combined SPI/I2C bus mode |
| `SPI_CS_FLASH` | `GPIO10` | optional extended mode only, mutually exclusive with `I2C_INT` |

Non-console serial allocation:

| Harness node | C3 GPIO | Rationale |
|---|---:|---|
| `UART1_TX` | `GPIO3` | reused from loopback-B output in UART crosslink mode |
| `UART1_RX` | `GPIO4` | reused from loopback-B input in UART crosslink mode |
| `UART0_RX` | `GPIO20` | reserved by default; selector-connected through `R6` only via `J10` / `SEL_UART0_UART1` |
| `UART0_TX` | `GPIO21` | reserved by default; selector-connected through `R8` only via `J10` / `SEL_UART0_UART1` |

Settled C3 v1 decisions and remaining caveats:

- preserve native USB pins `GPIO18` and `GPIO19` by default from phase one
- do not borrow `GPIO18` or `GPIO19` for v1 peripheral tests
- `GPIO2` is accepted as a resistor-protected loopback/input and I2C feedback
  input with no fixed pull, despite being a strapping pin
- use `GPIO8` for `PWM_OUT` only through the 10k analog feedback path, with no
  fixed pull-up/down and a removable/default-open link if boot sensitivity is
  seen
- use `SEL_D0` as a dual-row selector on `GPIO0`: one shunt position selects
  target ADC feedback from `ANALOG_FB`, the other selects `ONEWIRE_DQ`; do not
  load the OneWire bus with the analog RC/MCP3008 node
- use dual-row selector headers for the other C3 multi-use GPIOs:
  `SEL_D1`, `SEL_D2`, `SEL_D3`, `SEL_D4`, and `SEL_D10`
- use `J10` / `SEL_UART0_UART1` as a default-open 2x3 UART connector/selector:
  two signal columns for the deliberate UART0/UART1 serial test
  (`D3TX-D20RX` and `D21TX-D4RX`) plus a GND column for external UART access
- use `SEL_D08` as a single safety jumper between `GPIO8` and the 10k
  `PWM_OUT` to `ANALOG_FB` path
- avoid using `GPIO9` for general harness wiring unless an alternate mode is
  explicitly designed around boot-button constraints

No C3 v1 GPIO allocation decisions remain open in this document. The remaining
C3 work is bring-up validation, especially confirming `GPIO0`/`D0` analog
feedback behavior in Espruino and defining runner prompts for manual selector
modes.

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

For the ESP32-C3 v1 harness:

1. Confirm C3 `GPIO0` / `D0` analog feedback behavior in Espruino during
   bring-up.
2. Define runner prompts and confirmation flow for manual selector modes.
3. Continue schematic/netlist reviews against
   [docs/targets/esp32-c3-devkitc-02/wiring.md](../targets/esp32-c3-devkitc-02/wiring.md) as the
   wirewrap build progresses.
