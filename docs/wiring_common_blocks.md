# Common Harness Wiring Blocks

This document defines the common reusable wiring blocks for the ESP32 hardware
test harness family.

Board-specific documents map target `Dxx` pins onto these named harness nodes.
The physical harness boards should keep these blocks in the same relative
layout where practical, even when the DUT socket and fanout differ.

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
| `PWM_OUT` | PWM or digital level source |
| `ANALOG_FB` | filtered feedback node driven by `PWM_OUT` |
| `ADC_IN` | target ADC input connected to `ANALOG_FB` |
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
| `UART_TX` | target TX for non-console serial test |
| `UART_RX` | target RX for non-console serial test |

## Digital Loopback Block

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

## Analog Feedback Block

Create one filtered node named `ANALOG_FB`.

| Connection | Value | Notes |
|---|---:|---|
| `PWM_OUT` -> `ANALOG_FB` | 10k | series resistor |
| `ANALOG_FB` -> GND | 0.1uF | filter capacitor |
| `ANALOG_FB` -> `ADC_IN` | direct or short protected route | target ADC input |
| `ANALOG_FB` -> MCP3008 CH0 | direct | external SPI ADC cross-check |

Test coverage:

- digital low/high read through `analogRead`
- PWM / `analogWrite` feedback through `analogRead`
- MCP3008 CH0 comparison against target ADC

## I2C MCP23008 Block

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

Fit I2C pull-ups if they are not provided elsewhere:

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

## SPI MCP3008 Block

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

Test coverage:

- SPI setup
- SPI transfer
- chip-select behavior
- analog feedback comparison through external ADC

## Optional SPI Flash Block

Reserve footprint/socket/header space for a W25xxx-compatible SPI flash device.

| W25xxx signal | Harness node / connection |
|---|---|
| VCC | 3.3 V |
| GND | GND |
| CLK | `SPI_SCK` |
| DO | `SPI_MISO` |
| DI | `SPI_MOSI` |
| CS | `SPI_CS_FLASH` |

Test coverage:

- JEDEC ID
- status-register read
- shared-bus operation with MCP3008

This block is optional for first bring-up but should be planned into the layout.

## OneWire DS18B20 Block

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

## Serial Peer Block

Provide a serial-peer area for non-console UART tests.

| Harness node | External peer connection |
|---|---|
| `UART_TX` | peer RX |
| `UART_RX` | peer TX |
| GND | peer GND |

Provide either:

- a local resistor-protected TX/RX loopback, or
- a header for an external USB-UART adapter

Preferred:

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
