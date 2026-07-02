# Historical Pre-Wiring Decisions And Proposed Responses

> Historical note: this document records pre-wiring design decisions from the
> early ESP32-C3/classic ESP32 harness planning phase. It is not the current
> outstanding-items list. For current wiring, see the target documents under
> `../../targets/`; for current continuation context, see
> `../../handoff/2026-06-25-esp32-family-tests.md`.

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
| `GPIO_LOOP_A_IN` | `D2` | strapping pin; no fixed pull, resistor-protected only |
| `GPIO_LOOP_B_OUT` | `D3` | shared with SPI MISO and serial TX mode |
| `GPIO_LOOP_B_IN` | `D4` | shared with I2C SCL and serial RX mode |
| `PWM_OUT` | `D8` | strapping/RGB LED pin; 10k analog feedback path only |
| `ADC_IN` | `D0` | ADC-capable, analog/OneWire selector common |

Decision:

- Use `D0` for ADC feedback rather than `D2`.
- Use `SEL_D0` on `D0`: one shunt position connects to `ANALOG_FB`, the other
  position connects to `ONEWIRE_DQ`.
- Use `D2` only as a resistor-protected input/feedback node, with no fixed
  pull-up/down.
- `D2` is accepted for this use despite being a strapping pin.

### C3 Combined SPI/I2C Bus Mode

| Harness node | C3 pin | Notes |
|---|---:|---|
| `I2C_SDA` | `D1` | shares baseline loopback-A output |
| `I2C_SCL` | `D4` | shares baseline loopback-B input |
| `I2C_INT` | `D10` | compatible with MCP3008 SPI, excludes optional flash CS |
| `I2C_FB` | `D2` | shares baseline loopback input |
| `PWM_OUT` | `D8` | enables PWM analog feedback while SPI uses D5 MOSI |
| `SPI_MISO` | `D3` | reuses loopback-A input |
| `SPI_MOSI` | `D5` | dedicated MOSI in combined bus mode |
| `SPI_SCK` | `D6` | SPI clock |
| `SPI_CS_ADC` | `D7` | MCP3008 chip select |
| `SPI_CS_FLASH` | `D10` | optional extended mode only, mutually exclusive with I2C INT |

Decision:

- Use one combined C3 SPI/I2C bus mode for MCP3008 plus MCP23008 testing.
- Move `PWM_OUT` to `D8` so PWM-generated `ANALOG_FB` can be measured by both
  `D0` and MCP3008 while SPI is active.
- Keep optional W25xxx flash testing as an extended SPI mode by moving `D10`
  from `I2C_INT` to `SPI_CS_FLASH`.
- This keeps native USB and UART0 reserved while reducing manual harness mode
  changes.

### C3 OneWire Mode

| Harness node | C3 pin | Notes |
|---|---:|---|
| `ONEWIRE_DQ` | `D0` | selected instead of `ANALOG_FB` by `SEL_D0` |

Decision:

- Accepted `D0` for two-device DS18B20 OneWire mode via `SEL_D0`.
- OneWire mode is mutually exclusive with target ADC feedback on `ANALOG_FB`.
- I2C on `D1` / `D4` can remain active with OneWire, supporting combined
  temperature read plus I2C display/logging tests.

### C3 UART0/UART1 Crosslink Mode

| Harness node | C3 pin | Notes |
|---|---:|---|
| `UART1_TX` | `D3` | selected through `SEL_D3` UART position |
| `UART1_RX` | `D4` | selected through `SEL_D4` UART position |
| `UART0_RX` | `D20` | crossed from `D3` through `J10` / `SEL_UART0_UART1` and `R6` |
| `UART0_TX` | `D21` | crossed to `D4` through `R8` and `J10` / `SEL_UART0_UART1` |
| UART GND | GND | `J10` GND column supports external UART access |

Decision:

- Accepted schematic v1.1 UART crosslink as the first C3 automated serial test
  path.
- Confirm Espruino C3 UART mapping during bring-up.
- Keep UART0 `D20` / `D21` reserved by default for normal board USB-UART
  REPL/flashing.
- Use `D20` / `D21` only when `J10` / `SEL_UART0_UART1` is deliberately used:
  fit both signal shunts for UART0/UART1 crosslink, or leave them open when
  using `J10` as an external UART access connector.

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
   - [docs/design/common-harness-design-and-blocks.md](../common-harness-design-and-blocks.md)
   - [docs/targets/esp32-c3-devkitc-02/wiring.md](../../targets/esp32-c3-devkitc-02/wiring.md)
   - [docs/targets/olimex-esp32-devkit-lipo/wiring.md](../../targets/olimex-esp32-devkit-lipo/wiring.md)
2. Refine C3 jumper/link group names and physical labels for the schematic.
3. Define runner prompts and confirmation text for manual harness modes.
