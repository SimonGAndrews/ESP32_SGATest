# ESP32-DevKitC V4 Harness Wiring Spec

This document maps the common Espruino hardware-test blocks onto the Espressif
ESP32-DevKitC V4 using an ESP32-WROOM-32E/32UE module.

The first schematic is in:

```text
KICAD/ESP32_V1/
```

## Design Position

The classic ESP32 has enough exposed GPIO to keep the normal test blocks
connected simultaneously. Unlike the ESP32-C3 harness, the DevKitC V4 does not
need a general GPIO selector bank.

One selector is required because `D35` is shared between the MCP23008 interrupt
input and UART1 RX. A separate default-open link completes the second side of
the UART1/UART2 crosslink. UART0 remains dedicated to the board USB-UART
REPL/flashing path.

Tests use Espruino `Dxx` names matching GPIO numbers.

## Reserved And Avoided Pins

| Pin | Rule |
|---:|---|
| `D0` | reserve for BOOT/download control |
| `D1`, `D3` | reserve for UART0 USB-UART REPL/flashing |
| `D2`, `D5`, `D12`, `D15` | leave free of fixed harness loads because they are strapping pins |
| `D6`-`D11` | module SPI-flash signals; do not use |
| `D34`-`D39` | input-only; use only for input roles |

`D34`-`D39` do not have internal pull-up/pull-down resistors. Their assigned
harness sources must provide a defined level where a test depends on one.

## Rationalised Fixed GPIO Allocation

| Harness node | ESP32 GPIO | Direction | Wiring |
|---|---:|---|---|
| `GPIO_LOOP_A_OUT` | `D32` | output | 470R to `D33` |
| `GPIO_LOOP_A_IN` | `D33` | input/watch | fixed loop A input |
| `GPIO_LOOP_B_OUT` | `D25` | output | 470R to `D26` |
| `GPIO_LOOP_B_IN` | `D26` | input/watch | fixed loop B input |
| `PWM_OUT` | `D27` | output/PWM | 10k to `ANALOG_FB` |
| `ADC_IN` | `D34` | ADC input-only | fixed to `ANALOG_FB` |
| `I2C_SDA` | `D21` | bidirectional | MCP23008 and Grove I2C |
| `I2C_SCL` | `D22` | bidirectional | MCP23008 and Grove I2C |
| `I2C_INT` / `UART1_RX` | `D35` | input-only | selected by `SEL_D35` |
| `I2C_FB` | `D39` | input-only | MCP23008 GP0 through 470R |
| `SPI_MISO` | `D19` | input | MCP3008/W25xxx data out |
| `SPI_MOSI` | `D23` | output | MCP3008/W25xxx data in |
| `SPI_SCK` | `D18` | output | shared SPI clock |
| `SPI_CS_ADC` | `D16` | output | MCP3008 CS |
| `SPI_CS_FLASH` | `D17` | output | optional W25xxx CS |
| `ONEWIRE_DQ` | `D13` | bidirectional | two powered DS18B20 devices |
| `UART1_TX` | `D4` | output | crossed through 470R/link to `D36` |
| `UART1_RX` | `D35` | input-only | selected from `D14` through `SEL_D35` |
| `UART2_TX` | `D14` | output | crossed through 470R/`SEL_D35` to `D35` |
| `UART2_RX` | `D36` | input-only | crossed from `D4` through default-open link |

This allocation intentionally keeps VSPI on its conventional `D18`/`D19`/`D23`
pins. Chip selects use `D16` and `D17`, avoiding the usual `D5` strapping-pin
chip select.

## Common Test Blocks

### GPIO loopbacks

- `D32 -> 470R -> D33`
- `D25 -> 470R -> D26`

The connections are permanent. Test code controls which side is an output.

### Analog/PWM feedback

- `D27 -> 10k -> ANALOG_FB`
- `ANALOG_FB -> 100nF -> GND`
- `ANALOG_FB -> D34`
- `ANALOG_FB -> MCP3008 CH0`

`D34` is ADC1-capable, so ADC tests remain usable while Wi-Fi is active.

### I2C

- `D21` SDA
- `D22` SCL
- MCP23008 address `0x20` with A0/A1/A2 low
- MCP23008 GP0 through 470R to `D39`
- MCP23008 GP1 through 470R to GP2
- MCP23008 INT to `SEL_D35`
- `SEL_D35` common to `D35`

Provide removable or DNP 4.7k pull-ups on SDA and SCL so the bare MCP23008
block is self-contained without forcing duplicate pull-ups when a Grove module
already provides them.

For I2C interrupt tests, fit `SEL_D35` between `I2C_INT` and
`D35_UART1_RX`. Do not select the UART-crosslink position at the same time.

#### External Grove I2C

`J_Grove_I2C1` is a Grove-standard four-pin connector on the same I2C bus as
the MCP23008. It allows one or more external I2C devices to share `D21`/`D22`,
using a Grove hub or daisy-chain arrangement where supported.

| `J_Grove_I2C1` pin | Signal |
|---:|---|
| 1 | GND |
| 2 | 3.3V |
| 3 | `D21_I2C_SDA` |
| 4 | `D22_I2C_SCL` |

The connector supplies 3.3V, not 5V. Check the total bus pull-up resistance
when external modules are attached, because multiple Grove devices may each
include SDA/SCL pull-ups.

### SPI

- shared `D18` SCK, `D19` MISO, `D23` MOSI
- MCP3008 CS on `D16`
- optional W25xxx CS on `D17`
- MCP3008 CH0 on `ANALOG_FB`

### OneWire

- `D13` to two powered DS18B20 devices
- one 4.7k pull-up from `ONEWIRE_DQ` to 3.3V

`J?_OneWire1`, labelled **External OneWire** on the schematic, exposes the
same powered OneWire bus for additional external devices:

| External OneWire pin | Signal |
|---:|---|
| 1 | 3.3V |
| 2 | `D13_ONEWIRE_DQ` |
| 3 | GND |

External devices share the existing 4.7k bus pull-up. Do not add another
strong pull-up without checking the combined resistance and bus loading.
The connector is for powered-mode devices; parasite-power operation is not the
baseline harness configuration.

### UART

The full UART test crosses the two non-console hardware UARTs while UART0
remains the runner/control connection:

```text
UART1 TX D4  -> R_UART2 470R -> JP_UART_LOOP2 -> D36 UART2 RX
UART2 TX D14 -> R_UART1 470R -> SEL_D35       -> D35 UART1 RX
```

Logical Espruino setup:

| Espruino object | ESP32 UART | TX | RX |
|---|---|---:|---:|
| `Serial1` | UART0 | `D1` | `D3` |
| `Serial2` | UART1 | `D4` | `D35` |
| `Serial3` | UART2 | `D14` | `D36` |

`Serial1`/UART0 stays on the board USB-UART path. `Serial2` and `Serial3`
provide a bidirectional crosslink test:

- `Serial2` transmits on `D4`; `Serial3` receives on `D36`.
- `Serial3` transmits on `D14`; `Serial2` receives on `D35`.

UART crosslink state:

| Link | Required state |
|---|---|
| `SEL_D35` | select `R_UART1`/`D14_UART2_TX` to `D35_UART1_RX` |
| `JP_UART_LOOP2` | closed to connect `D4_UART1_TX` to `D36_UART2_RX` |

I2C interrupt and UART1 RX are mutually exclusive because they share `D35`.

`J_UART2` exposes:

| Pin | Signal |
|---:|---|
| 1 | `D14_UART2_TX` |
| 2 | `D35_UART1_RX` |
| 3 | GND |

This header supports external observation or a UART peer. It does not expose
the complete four-signal internal crosslink.

## Automation

Expose:

| Header signal | DevKitC V4 signal |
|---|---|
| GND | GND |
| RESET | EN |
| BOOT | `D0` |

This is a provision for an external open-drain reset/boot controller. It must
not add fixed levels that interfere with normal boot.

## External 5V Power

`J_External_PWR1` provides an optional external 5V input:

| `J_External_PWR1` pin | Signal |
|---:|---|
| 1 | external 5V, through `JP_External_5V1` to the harness `5V` rail |
| 2 | GND |

`JP_External_5V1` is a default-open isolation shunt. Leave it open when the
DevKitC is powered from its USB connector. Fit it only when deliberately
powering the harness/DevKitC 5V rail from `J_External_PWR1`.

Do not connect competing USB and external 5V sources through a closed shunt
unless their power-sharing arrangement has been explicitly reviewed.

## Default State

- all fixed test blocks connected
- `SEL_D35` fitted in the I2C interrupt position
- `JP_UART_LOOP2` open, leaving the UART1/UART2 crosslink incomplete
- `JP_External_5V1` open, isolating the external 5V connector
- optional I2C pull-up links fitted only if no attached module supplies them
- UART0 and BOOT path untouched
- no fixed harness loads on `D2`, `D5`, `D12`, or `D15`

## UART Crosslink Test Mode

Mode name:

- `ESP32_SERIAL_UART1_UART2_CROSSLINK`

Before running:

1. Keep the runner attached to UART0 through the board USB-UART connector.
2. Move `SEL_D35` from `I2C_INT` to the UART position.
3. Close `JP_UART_LOOP2`.
4. Configure UART1 on `D4`/`D35` and UART2 on `D14`/`D36`.

After the test, reopen `JP_UART_LOOP2` and return `SEL_D35` to `I2C_INT`.
