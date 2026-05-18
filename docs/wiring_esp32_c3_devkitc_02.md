# ESP32-C3-DevKitC-02 Harness Wiring Spec

This document maps the common harness blocks onto the Espressif
ESP32-C3-DevKitC-02.

Related documents:

- [wiring_common_blocks.md](wiring_common_blocks.md)
- [harness_modes.md](harness_modes.md)
- [gpio_rationalisation.md](gpio_rationalisation.md)
- [connectivity_permutations.md](connectivity_permutations.md)

## Board Under Test

| Item | Value |
|---|---|
| Board | ESP32-C3-DevKitC-02 |
| Module | ESP32-C3-WROOM-02 |
| Pin naming in tests | `Dxx`, matching GPIO number |
| Normal board USB | USB-UART bridge to UART0 |
| Native USB Serial/JTAG | `D18` / `D19`, via harness USB D-/D+ connection |

## Reserved Connectivity Pins

These pins are not general harness GPIO in the default design.

| Pin | Function | Harness rule |
|---:|---|---|
| `D18` | native USB D- | connect to native USB D- block |
| `D19` | native USB D+ | connect to native USB D+ block |
| `D20` | UART0 RX | reserve for board USB-UART REPL/flashing |
| `D21` | UART0 TX | reserve for board USB-UART REPL/flashing |
| `D9` | boot/download button path | reserve for boot/download control only |
| `D8` | onboard RGB LED / strapping | reserve for LED-specific tests, no general harness load |

## Default Connectivity Wiring

| Board pin / signal | Harness connection | Notes |
|---|---|---|
| Board Micro-USB | host USB | UART0 REPL/flashing path |
| `D18` | USB D- connector/header | native USB Serial/JTAG |
| `D19` | USB D+ connector/header | native USB Serial/JTAG |
| GND | USB GND and harness GND | common ground |
| EN / reset | automation header `RESET` | also keep manual reset accessible |
| Boot/download path | automation header `BOOT` | expected to control board boot/download path |

Native USB D-/D+ should be permanently/default connected for phase-one C3
bring-up. Do not route `D18` or `D19` to peripheral test blocks in the default
wiring.

## Approved Harness Node Allocation

| Harness node | C3 pin | Mode / notes |
|---|---:|---|
| `GPIO_LOOP_A_OUT` | `D1` | baseline GPIO |
| `GPIO_LOOP_A_IN` | `D3` | baseline GPIO; shared with SPI MISO and UART TX modes |
| `GPIO_LOOP_B_OUT` | `D4` | baseline GPIO; shared with OneWire and UART RX modes |
| `GPIO_LOOP_B_IN` | `D2` | baseline GPIO input; strapping pin, no fixed pull |
| `PWM_OUT` | `D5` | analog/PWM; shared with SPI MOSI |
| `ADC_IN` | `D0` | analog feedback input |
| `I2C_SDA` | `D6` | I2C mode; shared with SPI SCK |
| `I2C_SCL` | `D7` | I2C mode; shared with SPI CS ADC |
| `I2C_INT` | `D10` | I2C mode; shared with SPI CS flash |
| `I2C_FB` | `D2` | I2C mode; shared with loopback-B input |
| `SPI_MISO` | `D3` | SPI mode |
| `SPI_MOSI` | `D5` | SPI mode |
| `SPI_SCK` | `D6` | SPI mode |
| `SPI_CS_ADC` | `D7` | SPI mode |
| `SPI_CS_FLASH` | `D10` | optional SPI flash |
| `ONEWIRE_DQ` | `D4` | OneWire mode |
| `UART_TX` | `D3` | serial-peer mode |
| `UART_RX` | `D4` | serial-peer mode |

## Permanent Wiring

These connections may be wired permanently because they do not conflict with
approved modes.

| Connection | Notes |
|---|---|
| `D18` -> native USB D- | default phase-one requirement |
| `D19` -> native USB D+ | default phase-one requirement |
| `D20` / `D21` reserved | no peripheral harness wiring |
| `D0` -> `ADC_IN` / `ANALOG_FB` | analog feedback input |
| `D5` -> `PWM_OUT` side of analog block | may need jumper isolation before SPI mode |
| 3.3 V and GND rails | common harness rails |
| reset and boot lines to automation header | manual/automation access |

Because `D5` is reused as `SPI_MOSI`, the analog block should include a clear
link or jumper so `PWM_OUT` can be disconnected when running SPI mode if needed.

## Baseline GPIO Mode

Mode name:

- `C3_BASELINE_GPIO`

Required links:

| Link | Position |
|---|---|
| `D1` -> `GPIO_LOOP_A_OUT` | closed |
| `D3` -> `GPIO_LOOP_A_IN` | closed |
| `GPIO_LOOP_A_OUT` -> 470R -> `GPIO_LOOP_A_IN` | closed |
| `D4` -> `GPIO_LOOP_B_OUT` | closed |
| `D2` -> `GPIO_LOOP_B_IN` | closed |
| `GPIO_LOOP_B_OUT` -> 470R -> `GPIO_LOOP_B_IN` | closed |

Open/conflicting links:

| Link group | Required state |
|---|---|
| SPI links on `D3`, `D5`, `D6`, `D7`, `D10` | open unless test explicitly shares |
| OneWire link on `D4` | open |
| Serial-peer links on `D3` / `D4` | open |
| I2C feedback link to `D2` | open |

Notes:

- `D2` is accepted as a strapping pin only because it has no fixed pull and is
  used through resistor-protected/manual-mode wiring.

## Analog/PWM Mode

Mode name:

- `C3_ANALOG_PWM`

Required links:

| Link | Position |
|---|---|
| `D5` -> `PWM_OUT` | closed |
| `PWM_OUT` -> 10k -> `ANALOG_FB` | permanent |
| `ANALOG_FB` -> 0.1uF -> GND | permanent |
| `ANALOG_FB` -> `D0` / `ADC_IN` | closed/permanent |
| `ANALOG_FB` -> MCP3008 CH0 | closed/permanent if MCP3008 fitted |

Open/conflicting links:

| Link group | Required state |
|---|---|
| SPI MOSI link on `D5` | open during analog/PWM test |

Test note:

- `D0` analog feedback behavior must be confirmed during bring-up.

## I2C Mode

Mode name:

- `C3_I2C`

Required links:

| Link | Position |
|---|---|
| `D6` -> `I2C_SDA` | closed |
| `D7` -> `I2C_SCL` | closed |
| `D10` -> `I2C_INT` | closed |
| `D2` -> `I2C_FB` | closed if feedback tests are run |
| MCP23008 SDA/SCL pull-ups | fitted |

Open/conflicting links:

| Link group | Required state |
|---|---|
| SPI links on `D6`, `D7`, `D10` | open |
| baseline loopback-B link to `D2` | open if using `I2C_FB` |

Enabled coverage:

- MCP23008 register read/write
- GP0 feedback through `D2`
- INT through `D10`
- `setWatch` on expander feedback/interrupt where supported

## SPI Mode

Mode name:

- `C3_SPI`

Required links:

| Link | Position |
|---|---|
| `D3` -> `SPI_MISO` | closed |
| `D5` -> `SPI_MOSI` | closed |
| `D6` -> `SPI_SCK` | closed |
| `D7` -> `SPI_CS_ADC` | closed |
| `D10` -> `SPI_CS_FLASH` | closed if optional W25xxx fitted/tested |
| MCP3008 CH0 -> `ANALOG_FB` | closed |

Open/conflicting links:

| Link group | Required state |
|---|---|
| baseline loopback link on `D3` | open |
| analog `PWM_OUT` drive on `D5` | open if it conflicts with SPI MOSI |
| I2C links on `D6`, `D7`, `D10` | open |
| serial-peer link on `D3` | open |

Enabled coverage:

- MCP3008 transfer/read
- optional W25xxx JEDEC/status
- shared-bus chip-select behavior

## OneWire Mode

Mode name:

- `C3_ONEWIRE`

Required links:

| Link | Position |
|---|---|
| `D4` -> `ONEWIRE_DQ` | closed |
| `ONEWIRE_DQ` -> 4.7k -> 3.3 V | fitted |
| DS18B20 A DQ -> `ONEWIRE_DQ` | closed/permanent within OneWire block |
| DS18B20 B DQ -> `ONEWIRE_DQ` | closed/permanent within OneWire block |

Open/conflicting links:

| Link group | Required state |
|---|---|
| baseline loopback-B output link on `D4` | open |
| serial-peer RX link on `D4` | open |

Enabled coverage:

- two-device search
- addressed DS18B20 selection
- scratchpad read
- temperature conversion

## Serial Peer Mode

Mode name:

- `C3_SERIAL_PEER`

Required links:

| Link | Position |
|---|---|
| `D3` -> `UART_TX` | closed |
| `D4` -> `UART_RX` | closed |
| `UART_TX` -> peer RX | closed |
| peer TX -> `UART_RX` | closed |
| peer GND -> harness GND | closed |

Open/conflicting links:

| Link group | Required state |
|---|---|
| baseline loopback links on `D3` / `D4` | open |
| SPI MISO link on `D3` | open |
| OneWire link on `D4` | open |

Alternative:

- fit a local 470R loopback option between `UART_TX` and `UART_RX` if a peer
  adapter is not used.

## Native USB Serial/JTAG Mode

Mode name:

- `C3_CONNECTIVITY_USB_SERIAL_JTAG`

Required links:

| Link | Position |
|---|---|
| `D18` -> USB D- | closed/default |
| `D19` -> USB D+ | closed/default |
| USB GND -> harness GND | closed/default |

Open/conflicting links:

| Link group | Required state |
|---|---|
| any peripheral use of `D18` / `D19` | not allowed in phase-one default design |

Enabled coverage:

- native USB Serial/JTAG enumeration
- native USB serial REPL if firmware exposes it
- reset/reconnect behavior
- flashing/debug path if supported by selected tooling

## Automation Header

Minimum C3 automation header:

| Header pin | C3/board signal | Purpose |
|---|---|---|
| GND | GND | common reference |
| RESET | EN / reset | reset control |
| BOOT | boot/download path | download-mode selection |

5 V power switching is not required for this first harness.

## Default Jumper State

Default state should support:

- safe boot
- normal board USB-UART flashing
- native USB Serial/JTAG connection
- baseline GPIO tests

Default closed:

- native USB `D18` / `D19`
- UART0 board USB left untouched
- baseline GPIO loopback links
- reset/boot automation header available

Default open:

- SPI mode links
- I2C mode links that conflict with baseline GPIO
- OneWire link to `D4`
- serial-peer links
- any peripheral link to `D18` / `D19`
