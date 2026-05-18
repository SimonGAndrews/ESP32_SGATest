# Outstanding Items And Proposed Responses

This document collects the remaining pre-wiring decisions and proposes
responses for review.

## Settled Inputs

| Item | Response |
|---|---|
| Espruino pin naming | GPIO numbers are addressed with a `D` prefix, for example `GPIO21` as `D21`. |
| Board aliases | Aliases such as `LED1` may exist, but harness wiring should use `Dxx`; aliases are themselves test subjects. |
| Classic ESP32 board | Olimex ESP32-DevKit-LiPo Rev.D. |
| Classic ESP32 module | ESP32-WROOM-32E, marking `MGN4`. |
| Harness mode selection | Manual. Runner prompts with required mode/jumper checklist and waits for operator confirmation. |
| ESP32-C3 native USB Serial/JTAG | Phase-one bring-up requirement. `D18` / `D19` reserved by default for USB D-/D+. |
| Classic ESP32 fixed allocation | Approved. |
| ESP32-C3 mode allocations | Approved. |
| ESP32-C3 `D2` use | Approved as a no-fixed-pull, resistor-protected input/feedback node despite being a strapping pin. |
| Classic ESP32 `D36` UART RX | Approved as UART RX. |
| 5V power switch provision | Not required for the first harness design. |

## Proposed Classic ESP32 Allocation

Use a mostly fixed, always-wired harness for the Olimex Rev.D board.

| Harness node | ESP32 pin | Reason |
|---|---:|---|
| `GPIO_LOOP_A_OUT` | `D32` | safe bidirectional GPIO |
| `GPIO_LOOP_A_IN` | `D33` | safe bidirectional GPIO |
| `GPIO_LOOP_B_OUT` | `D25` | safe bidirectional GPIO |
| `GPIO_LOOP_B_IN` | `D26` | safe bidirectional GPIO |
| `PWM_OUT` | `D27` | PWM-capable output |
| `ADC_IN` | `D34` | input-only ADC, ideal for feedback input |
| `I2C_SDA` | `D21` | conventional ESP32 I2C SDA |
| `I2C_SCL` | `D22` | conventional ESP32 I2C SCL |
| `I2C_INT` | `D35` | input-only, suitable for interrupt input |
| `I2C_FB` | `D39` | input-only, suitable for expander feedback input |
| `SPI_MISO` | `D19` | conventional VSPI MISO |
| `SPI_MOSI` | `D23` | conventional VSPI MOSI |
| `SPI_SCK` | `D18` | conventional VSPI SCK |
| `SPI_CS_ADC` | `D16` | avoids `D5` strapping pin |
| `SPI_CS_FLASH` | `D17` | second safe chip select |
| `ONEWIRE_DQ` | `D13` | bidirectional, avoids UART0 and strapping pins |
| `UART_TX` | `D14` | non-console UART TX candidate |
| `UART_RX` | `D36` | input-only pin, proposed UART RX through GPIO matrix |

Decision:

- Accepted as the classic ESP32 baseline allocation.
- Keep Olimex `BAT_SENS_E1` and `PWR_SENS_E1` solder jumpers open so board
  battery/power sensing does not occupy `D35` / `D39`.
- `D36` is accepted as UART RX.

## Proposed ESP32-C3 Allocation

The C3 should use manual modes. `D18` / `D19` remain native USB by default and
`D20` / `D21` remain UART0 by default.

### C3 Baseline GPIO / Analog

| Harness node | C3 pin | Notes |
|---|---:|---|
| `GPIO_LOOP_A_OUT` | `D1` | normal GPIO |
| `GPIO_LOOP_A_IN` | `D3` | normal GPIO |
| `GPIO_LOOP_B_OUT` | `D4` | shared with OneWire/serial mode |
| `GPIO_LOOP_B_IN` | `D2` | strapping pin; no fixed pull, resistor-protected only |
| `PWM_OUT` | `D5` | output/PWM candidate |
| `ADC_IN` | `D0` | ADC-capable and avoids known C3 strapping pins |

Decision:

- Use `D0` for ADC feedback rather than `D2`.
- Use `D2` only as a resistor-protected input/feedback node, with no fixed
  pull-up/down.
- `D2` is accepted for this use despite being a strapping pin.

### C3 I2C Mode

| Harness node | C3 pin | Notes |
|---|---:|---|
| `I2C_SDA` | `D6` | mode pin |
| `I2C_SCL` | `D7` | mode pin |
| `I2C_INT` | `D10` | mode pin |
| `I2C_FB` | `D2` | shares baseline loopback input |

Decision:

- Accepted as C3 I2C mode allocation.
- This mode can test MCP23008 register access, feedback, and interrupt/watch
  without borrowing native USB pins.

### C3 SPI Mode

| Harness node | C3 pin | Notes |
|---|---:|---|
| `SPI_MISO` | `D3` | reuses loopback-A input |
| `SPI_MOSI` | `D5` | reuses PWM output |
| `SPI_SCK` | `D6` | reuses I2C SDA |
| `SPI_CS_ADC` | `D7` | reuses I2C SCL |
| `SPI_CS_FLASH` | `D10` | reuses I2C INT |

Decision:

- Accepted as C3 SPI mode allocation.
- SPI mode is mutually exclusive with I2C mode and full baseline loopback mode.
- This keeps native USB and UART0 reserved while still supporting MCP3008 and
  optional W25xxx shared-bus testing.

### C3 OneWire Mode

| Harness node | C3 pin | Notes |
|---|---:|---|
| `ONEWIRE_DQ` | `D4` | shares loopback-B output and serial RX mode pin |

Decision:

- Accepted `D4` for two-device DS18B20 OneWire mode.
- OneWire mode is mutually exclusive with baseline loopback-B and serial-peer
  mode.

### C3 Serial Peer Mode

| Harness node | C3 pin | Notes |
|---|---:|---|
| `UART_TX` | `D3` | external peer RX |
| `UART_RX` | `D4` | external peer TX |

Decision:

- Accepted as the first C3 non-console serial candidate.
- Confirm Espruino C3 UART mapping during bring-up.
- Keep UART0 `D20` / `D21` untouched for normal board USB-UART REPL/flashing.

## Automation Connector

Decision:

- Include reset and boot/download control from the start.
- Keep actual control hardware simple for the first wirewrap harness:
  accessible header pins for reset, boot/download, and ground.
- 5V power switch provision is not required for the first harness design.
- Allow the first runner implementation to prompt for manual mode confirmation,
  while leaving the hardware ready for later relay/transistor/USB-GPIO control.

## Runner Prompt Model

Proposed response:

- Every test suite declares a required harness mode.
- If the requested mode is not the default, the runner prints:
  - target board
  - harness mode
  - required jumper/link positions
  - expected control port type
  - warnings for conflicting links
- Runner waits for explicit operator confirmation before opening the serial
  port and running tests.

## Remaining Work

1. Review the first wiring specs:
   - [wiring_common_blocks.md](wiring_common_blocks.md)
   - [wiring_esp32_c3_devkitc_02.md](wiring_esp32_c3_devkitc_02.md)
   - [wiring_olimex_esp32_devkit_lipo_rev_d.md](wiring_olimex_esp32_devkit_lipo_rev_d.md)
2. Refine C3 jumper/link group names and physical labels for the schematic.
3. Define runner prompts and confirmation text for manual harness modes.
