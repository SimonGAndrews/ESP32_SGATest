# Olimex ESP32-DevKit-LiPo Rev.D Harness Wiring Spec

This document maps the common harness blocks onto the Olimex
ESP32-DevKit-LiPo Rev.D.

Related documents:

- [docs/design/common-harness-design-and-blocks.md](../../design/common-harness-design-and-blocks.md)
- [docs/design/harness-modes.md](../../design/harness-modes.md)
- [docs/design/history/pre-wiring-decisions-2026-06-10.md](../../design/history/pre-wiring-decisions-2026-06-10.md)

## Board Under Test

| Item | Value |
|---|---|
| Board | Olimex ESP32-DevKit-LiPo Rev.D |
| Module | ESP32-WROOM-32E, marking `MGN4` |
| Pin naming in tests | `Dxx`, matching GPIO number |
| Normal board USB | USB-UART bridge to UART0 |

## Reserved Connectivity Pins

| Pin | Function | Harness rule |
|---:|---|---|
| `D1` | UART0 TX | reserve for board USB-UART REPL/flashing |
| `D3` | UART0 RX | reserve for board USB-UART REPL/flashing |
| `D0` | boot strapping/download | reserve for boot/download control only |
| `D2` | strapping-related | no fixed harness load |
| `D5` | strapping-related on many ESP32 designs | avoid fixed harness use |
| `D12` | strapping-related | avoid fixed harness use |
| `D15` | strapping-related | avoid fixed harness use |
| `D6`-`D11` | module flash pins | do not use |

## Olimex Board-Specific Notes

Keep these solder jumpers open for the core harness:

| Jumper | Board function | Reason |
|---|---|---|
| `BAT_SENS_E1` | battery sense to `GPI35` | keeps `D35` available for `I2C_INT` |
| `PWR_SENS_E1` | external power sense to `GPI39` | keeps `D39` available for `I2C_FB` |

Board-specific battery/power sensing can be tested later as an Olimex-specific
extension, but it is outside the core `jshardware` harness wiring.

## Approved Fixed Harness Allocation

The classic ESP32 harness is intended to be mostly fixed wiring.

| Harness node | ESP32 pin | Notes |
|---|---:|---|
| `GPIO_LOOP_A_OUT` | `D32` | safe bidirectional GPIO |
| `GPIO_LOOP_A_IN` | `D33` | safe bidirectional GPIO |
| `GPIO_LOOP_B_OUT` | `D25` | safe bidirectional GPIO |
| `GPIO_LOOP_B_IN` | `D26` | safe bidirectional GPIO |
| `PWM_OUT` | `D27` | PWM-capable output |
| `ADC_IN` | `D34` | input-only ADC feedback input |
| `I2C_SDA` | `D21` | conventional ESP32 I2C SDA |
| `I2C_SCL` | `D22` | conventional ESP32 I2C SCL |
| `I2C_INT` | `D35` | input-only interrupt input |
| `I2C_FB` | `D39` | input-only feedback input |
| `SPI_MISO` | `D19` | conventional VSPI MISO |
| `SPI_MOSI` | `D23` | conventional VSPI MOSI |
| `SPI_SCK` | `D18` | conventional VSPI SCK |
| `SPI_CS_ADC` | `D16` | avoids strapping pins |
| `SPI_CS_FLASH` | `D17` | second safe chip select |
| `ONEWIRE_DQ` | `D13` | two-device DS18B20 bus |
| `UART_TX` | `D14` | non-console UART TX |
| `UART_RX` | `D36` | input-only UART RX |

## Digital Loopback Wiring

| Connection | Series resistor | Link |
|---|---:|---|
| `D32` / `GPIO_LOOP_A_OUT` -> `GPIO_LOOP_A_IN` / `D33` | 470R | fixed or removable |
| `D25` / `GPIO_LOOP_B_OUT` -> `GPIO_LOOP_B_IN` / `D26` | 470R | fixed or removable |

Removable links are still useful for fault isolation, but no mode conflict is
expected in the normal fixed harness.

## Analog/PWM Wiring

| Connection | Value / notes |
|---|---|
| `D27` -> `PWM_OUT` | fixed |
| `PWM_OUT` -> `ANALOG_FB` | 10k series resistor |
| `ANALOG_FB` -> GND | 0.1uF capacitor |
| `ANALOG_FB` -> `D34` / `ADC_IN` | fixed |
| `ANALOG_FB` -> MCP3008 CH0 | fixed |

## I2C MCP23008 Wiring

| Harness node | ESP32 pin |
|---|---:|
| `I2C_SDA` | `D21` |
| `I2C_SCL` | `D22` |
| `I2C_INT` | `D35` |
| `I2C_FB` | `D39` |

MCP23008 wiring:

| MCP23008 signal | Connection |
|---|---|
| SDA | `D21` |
| SCL | `D22` |
| INT | `D35` |
| GP0 | 470R -> `D39` |
| GP1 | 470R -> GP2 |
| A0/A1/A2 | GND |
| RESET | 3.3 V |
| VDD/VSS | 3.3 V / GND |

Fit 4.7k pull-ups on SDA/SCL if not provided elsewhere.

## SPI Wiring

| Harness node | ESP32 pin |
|---|---:|
| `SPI_MISO` | `D19` |
| `SPI_MOSI` | `D23` |
| `SPI_SCK` | `D18` |
| `SPI_CS_ADC` | `D16` |
| `SPI_CS_FLASH` | `D17` |

MCP3008 wiring:

| MCP3008 signal | Connection |
|---|---|
| DOUT | `D19` |
| DIN | `D23` |
| CLK | `D18` |
| CS/SHDN | `D16` |
| CH0 | `ANALOG_FB` |
| VDD/VREF | 3.3 V |
| AGND/DGND | GND |

Optional W25xxx wiring:

| W25xxx signal | Connection |
|---|---|
| DO | `D19` |
| DI | `D23` |
| CLK | `D18` |
| CS | `D17` |
| VCC/GND | 3.3 V / GND |

## OneWire Wiring

| Connection | Notes |
|---|---|
| `D13` -> `ONEWIRE_DQ` | fixed |
| `ONEWIRE_DQ` -> 4.7k -> 3.3 V | one bus pull-up |
| DS18B20 A DQ -> `ONEWIRE_DQ` | powered mode |
| DS18B20 B DQ -> `ONEWIRE_DQ` | powered mode |
| DS18B20 A/B VDD | 3.3 V |
| DS18B20 A/B GND | GND |

## Serial Peer Wiring

| Harness node | ESP32 pin | External peer |
|---|---:|---|
| `UART_TX` | `D14` | peer RX |
| `UART_RX` | `D36` | peer TX |
| GND | GND | peer GND |

Optional local loopback:

| Connection | Series resistor |
|---|---:|
| `D14` / `UART_TX` -> `UART_RX` / `D36` | 470R |

Use a removable jumper to select local loopback vs external peer.

## Reset And Boot Automation Header

Minimum automation header:

| Header pin | Board signal | Purpose |
|---|---|---|
| GND | GND | common reference |
| RESET | EN / reset | reset control |
| BOOT | `D0` boot/download path | download-mode selection |

5 V power switching is not required for this first harness.

## Expected Default State

Default state should allow:

- normal board USB-UART REPL/flashing
- all fixed hardware test blocks connected
- reset and boot/download access
- no battery/power-sense solder jumper connected to `D35` / `D39`
- no fixed load on reserved strapping pins

Default open:

- local serial loopback if using external peer
- any board-specific battery/power sensing jumpers

Default closed:

- GPIO loopback links
- analog feedback path
- I2C block
- SPI MCP3008 block
- OneWire two-device bus
- reset/boot automation header access
