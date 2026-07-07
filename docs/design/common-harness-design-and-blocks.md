# Common Harness Design And Blocks

This document defines the common reusable wiring blocks and design rules for the
ESP32 hardware test harness family.

Board-specific documents map target `Dxx` pins onto these named harness nodes.
The physical harness boards should keep these blocks in the same relative
layout where practical, even when the DUT socket and fanout differ.

These are logical harness nodes. A board-specific schematic may use more
specific net names, for example `I2C_A_SDA` for the primary `I2C_SDA` block, or
selector-side nets for loopback nodes.

Target harnesses may also include additional devices or target-specific wiring
extensions beyond these baseline common blocks. Those additional items should be
documented in the relevant target wiring notes, not here.

## Design Intent

The harness family should prove the same Espruino hardware interfaces wherever
practical, even when different target boards need different GPIO choices and
different fanout wiring.

In other words:

- keep the logical test blocks consistent across targets
- keep the test tasks consistent across targets
- let each target harness translate its own GPIOs onto the common harness nodes
- avoid redesigning the tests every time the DUT changes

The board-specific work is choosing safe GPIOs and documenting the selector or
link state for that target. The family-level work is keeping the logical block
names, block purpose, and overall harness structure consistent.

## Blocks, Modes, And Tests

This repo uses three related but distinct concepts:

- a `block` is a logical hardware capability grouping such as GPIO, analog,
  I2C, SPI, OneWire, or UART
- a `mode` is a harness configuration or operator precondition that enables one
  or more blocks on a specific target
- a `test` is a functional validation task that may exercise one block or
  multiple blocks, depending on what behaviour it is trying to prove

These concepts should not be treated as interchangeable.

A mode does not need to map one-to-one onto a block. For example, a
target-specific combined bus mode may deliberately enable both an I2C block and
a SPI block at the same time.

A test also does not need to map one-to-one onto a block. Many tests should
prefer the smallest useful block set for clear fault isolation, but some valid
tests will deliberately exercise multiple blocks together, especially when
checking coexistence, shared-node behaviour, or multi-peripheral bus activity.

## Pin Naming

Tests should use Espruino `Dxx` names matching raw GPIO numbers.

Examples:

- `GPIO21` is addressed as `D21`
- `GPIO0` is addressed as `D0`

Board aliases such as `LED1` may exist, but harness wiring and target mapping
should be specified in raw GPIO / `Dxx` terms.

## Pin Selection Rules

Prefer pins that are:

- exposed on the development board headers
- normal bidirectional GPIO
- available at boot without changing strapping state
- not connected to module SPI flash or PSRAM
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

## Electrical Baseline

| Item | Requirement |
|---|---|
| Logic voltage | 3.3 V |
| Ground | common ground across DUT, harness ICs, USB/serial peers, and test devices |
| IC mounting | socketed ICs for MCP3008 and MCP23008 |
| Construction | wirewrap on fixed-grid plated-through proto board |
| Labels | label harness nodes by function, not only by target GPIO |

Use one common 3.3 V rail for the target-facing peripherals unless a later
test explicitly requires separate supply control.

## Harness Node Names

| Harness node | Description |
|---|---|
| `GPIO_LOOP_A_OUT` | GPIO output for loopback pair A |
| `GPIO_LOOP_A_IN` | GPIO input/watch input for loopback pair A |
| `GPIO_LOOP_B_OUT` | GPIO output for loopback pair B |
| `GPIO_LOOP_B_IN` | GPIO input/watch input for loopback pair B |
| `PWM_OUT` | PWM or digital level source for analog feedback |
| `ANALOG_FB` | filtered feedback node driven by `PWM_OUT` |
| `ADC_IN` | target ADC input selected to `ANALOG_FB` |
| `I2C_SDA` | MCP23008 SDA |
| `I2C_SCL` | MCP23008 SCL |
| `I2C_INT` | MCP23008 interrupt output to target |
| `I2C_FB` | MCP23008 GPIO output feedback to target |
| `SPI_MISO` | SPI data from peripherals to target |
| `SPI_MOSI` | SPI data from target to peripherals |
| `SPI_SCK` | SPI clock |
| `SPI_CS_ADC` | MCP3008 chip select |
| `SPI_CS_FLASH` | optional W25xxx chip select |
| `ONEWIRE_DQ` | shared DS18B20 OneWire data bus |
| `UART_TX` | target TX for non-console serial validation |
| `UART_RX` | target RX for non-console serial validation |

## Shared Layout Intent

Keep the same logical block order and relative placement across harnesses where
practical, even when the DUT socket and selector details differ.

Suggested physical regions:

| Region | Suggested content |
|---|---|
| DUT socket edge | target board headers/socket and labelled fanout rows |
| Digital loopback block | two resistor-protected removable loopbacks |
| Analog block | `PWM_OUT -> resistor -> ANALOG_FB`, filter capacitor, ADC feed |
| I2C block | MCP23008 socket, pull-ups, INT and feedback links |
| SPI block | MCP3008 socket, optional W25xxx socket, chip-select links |
| OneWire block | two DS18B20 devices on one bus and one pull-up |
| Serial block | loopback or peer jumper area |
| Expansion strip | spare labelled pads for later tests or target-specific additions |

Use named harness nodes on the board silkscreen or labels rather than only raw
GPIO numbers. Raw GPIO numbers differ by target; the harness functions should
not.

## Digital Loopback Block (`gpio_block`)

Provide two resistor-protected loopback pairs.

| Connection | Series resistor | Notes |
|---|---:|---|
| `GPIO_LOOP_A_OUT` -> `GPIO_LOOP_A_IN` | 470R | removable link or mode jumper preferred |
| `GPIO_LOOP_B_OUT` -> `GPIO_LOOP_B_IN` | 470R | removable link or mode jumper preferred |

Test coverage:

- `pinMode`
- `digitalWrite`
- `digitalRead`
- `digitalPulse`
- `shiftOut`
- `setWatch`

## Analog Feedback Block (`analog_block`)

Create one filtered node named `ANALOG_FB`.

| Connection | Value | Notes |
|---|---:|---|
| `PWM_OUT` -> `ANALOG_FB` | 10k | series resistor |
| `ANALOG_FB` -> GND | 0.1uF | filter capacitor |
| `ANALOG_FB` -> `ADC_IN` | direct, short-protected, or selector-routed path | target ADC input |
| `ANALOG_FB` -> MCP3008 CH0 | direct | external SPI ADC cross-check |

On pin-limited targets, `ADC_IN` may be selected away from `ANALOG_FB` for
another mode. In that case the selector must isolate the RC filter capacitor
and MCP3008 CH0 from the alternate bus.

Test coverage:

- digital low/high read through `analogRead`
- PWM / `analogWrite` feedback through `analogRead`
- MCP3008 CH0 comparison against target ADC

## I2C MCP23008 Block (`i2c_block`)

Use one MCP23008 as the standard I2C test device.

### MCP23008 Power And Address

| MCP23008 pin/function | Connection |
|---|---|
| VDD | 3.3 V |
| VSS | GND |
| RESET | 3.3 V |
| A0 | GND |
| A1 | GND |
| A2 | GND |
| Address | `0x20` |

### MCP23008 Bus

| MCP23008 signal | Harness node |
|---|---|
| SDA | `I2C_SDA` |
| SCL | `I2C_SCL` |

If a harness uses a bare MCP23008 without module-side pull-ups, add removable
or DNP 4.7k pull-ups:

| Signal | Pull-up |
|---|---:|
| SDA -> 3.3 V | 4.7k |
| SCL -> 3.3 V | 4.7k |

### MCP23008 Feedback And Interrupt

| MCP23008 signal | Connection | Notes |
|---|---|---|
| INT | `I2C_INT` | interrupt output to target |
| GP0 | 470R -> `I2C_FB` | target feedback input |
| GP1 | 470R -> GP2 | expander internal feedback/interrupt stimulus |

Test coverage:

- I2C setup
- register read/write
- MCP23008 output feedback into target GPIO
- MCP23008 interrupt polling
- target `setWatch` on expander interrupt or feedback input

## SPI MCP3008 Block (`spi_block`)

Use one MCP3008 as the standard SPI ADC.

| MCP3008 pin/function | Harness node / connection |
|---|---|
| VDD | 3.3 V |
| VREF | 3.3 V |
| AGND | GND |
| DGND | GND |
| CLK | `SPI_SCK` |
| DOUT | `SPI_MISO` |
| DIN | `SPI_MOSI` |
| CS/SHDN | `SPI_CS_ADC` |
| CH0 | `ANALOG_FB` |
| CH1-CH7 | unconnected for first revision, or optional analog test header |

MCP3008 PDIP pin detail:

| Pin | Function | Harness node / connection |
|---:|---|---|
| 1 | CH0 | `ANALOG_FB` |
| 2-8 | CH1-CH7 | unconnected for first revision, or optional analog test header |
| 9 | DGND | GND |
| 10 | CS/SHDN | `SPI_CS_ADC` |
| 11 | DIN | `SPI_MOSI` |
| 12 | DOUT | `SPI_MISO` |
| 13 | CLK | `SPI_SCK` |
| 14 | AGND | GND |
| 15 | VREF | 3.3 V |
| 16 | VDD | 3.3 V |

Test coverage:

- SPI setup
- SPI transfer
- chip-select behavior
- analog feedback comparison through external ADC

## Optional SPI Flash Block (`spi_block`)

Reserve footprint/socket/header space for a W25xxx-compatible SPI flash device
or module.

| W25xxx signal | Harness node / connection |
|---|---|
| VCC | 3.3 V |
| GND | GND |
| CLK | `SPI_SCK` |
| DO | `SPI_MISO` |
| DI | `SPI_MOSI` |
| CS | `SPI_CS_FLASH` |
| WP | 3.3 V, if using a bare flash IC |
| HOLD | 3.3 V, if using a bare flash IC |

Test coverage:

- JEDEC ID
- status-register read
- shared-bus operation with MCP3008

This block is optional for first bring-up but should be planned into the layout.
If the harness uses a small SPI flash module rather than a bare IC, `WP` and
`HOLD` may already be handled on the module and need not appear on the harness
connector.

## OneWire DS18B20 Block (`onewire_block`)

Use two DS18B20 devices on the same OneWire bus.

| DS18B20 signal | Connection |
|---|---|
| DQ, device A | `ONEWIRE_DQ` |
| DQ, device B | `ONEWIRE_DQ` |
| VDD, both devices | 3.3 V |
| GND, both devices | GND |
| `ONEWIRE_DQ` pull-up | 4.7k to 3.3 V |

Use powered mode, not parasite power.

Test coverage:

- bus presence
- device search returns two ROMs
- family-code validation for both devices
- addressed temperature conversion/readback
- scratchpad read for each selected ROM

## Serial Peer Block (`uart_block`)

Provide a serial-peer area for non-console UART tests.

| Harness node | External peer connection |
|---|---|
| `UART_TX` | peer RX |
| `UART_RX` | peer TX |
| GND | peer GND |

Provide either:

- a local resistor-protected TX/RX loopback, or
- a header for an external USB-UART adapter

Where GPIO budget and board space allow:

- include both options and select with jumpers
- use 470R series protection on local loopback links

Test coverage:

- `Serial.setup`
- `Serial.read`
- `Serial.on("data")`
- `Serial.unsetup` / re-setup
- optional parity/error behavior where supported

## Reset And Boot Automation Header

Provide a small header for repeatable reset and boot/download control.

Minimum first-harness header:

| Header signal | Purpose |
|---|---|
| GND | common reference |
| RESET / EN | target reset control |
| BOOT | target boot/download selection |

5 V power switching is not required for the first harness design.

The runner will initially prompt for manual harness mode confirmation. This
header is intended to make later reset/boot automation straightforward without
changing the test block wiring.

## Mode Labelling

Every removable link or jumper group should have:

- a short mode label
- default position
- conflict warning if it shares pins with another block
- corresponding wiring document reference

Default state should always be:

- safe to boot
- safe to flash
- safe for connectivity tests
- no unsafe fixed pull on strapping pins

## Appendix: Block Numbering Reference

This appendix summarises the current block model and how it is
expressed in the repo.

| Block | Block name | Purpose | Repo expression |
|---:|---|---|---|
| 1 | `gpio_block` | GPIO loopback tasks such as `digitalWrite`, `digitalRead`, `setWatch`, `digitalPulse`, and `shiftOut` | shared tests in `gpio_block1`; target wiring scripts such as `gpio_block1.py` |
| 2 | `analog_block` | PWM/digital feedback into target ADC and analog validation tasks | shared tests in `analog_block2`; target wiring scripts such as `analog_block2.py` |
| 3 | `i2c_block` | MCP23008 bus access, read/write, feedback, and interrupt tasks | shared tests in `i2c_block3`; combined target cross-checks may still appear in `i2c_spi_block34.py` |
| 4 | `spi_block` | MCP3008 SPI transfer/read tasks and SPI-specific cross-checks | shared tests in `spi_block4`; SPI extension checks also remain within block 4, including `spi_extension_block4.py` |
| 5 | `onewire_block` | DS18B20 OneWire discovery and temperature-read tasks | shared tests in `onewire_block5`; target wiring scripts such as `onewire_block5.py` |
| 6 | `onewire_gpio_block` | DS2413 OneWire GPIO output/feedback tasks | shared tests reserved under `onewire_gpio_block6`; target wiring scripts such as `onewire_gpio_block6.py` |
| 7 | `uart_block` | non-console UART crosslink or peer serial tests | shared tests in `uart_block7`; target wiring scripts such as `uart_block7.py` |
| 8 | `grove_i2c_block` | external Grove I2C extension and secondary-device tasks | shared tests in `grove_i2c_block8`; target wiring scripts such as `grove_i2c_block8.py` |
