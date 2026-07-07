# ESP32-C3-DevKitC-02 Harness Wiring Spec

This document maps the common harness blocks onto the Espressif
ESP32-C3-DevKitC-02.

The current schematic PDFs are in:

```text
Hardware/ESP32_C3/
```

Related documents:

- [docs/design/common-harness-design-and-blocks.md](../../design/common-harness-design-and-blocks.md)
- [docs/design/harness-modes.md](../../design/harness-modes.md)
- [docs/design/connectivity-permutations.md](../../design/connectivity-permutations.md)

## Block Mapping

This target wiring document follows the family distinction between:

- `block`: a logical hardware capability grouping
- `mode`: a target-specific harness configuration that enables one or more
  blocks
- `test`: a validation task that may use one block or multiple blocks

For the ESP32-C3 harness, the block mapping is:

| Block | Block name | Practical target meaning |
|---:|---|---|
| 1 | `gpio_block` | loopbacks on `D1/D2` and `D3/D4` in baseline GPIO mode |
| 2 | `analog_block` | `D8 -> ANALOG_FB -> D0` |
| 3 | `i2c_block` | MCP23008 on `D1/D4` with feedback on `D2` and interrupt on `D10` |
| 4 | `spi_block` | MCP3008 on `D3/D5/D6/D7` |
| 5 | `onewire_block` | DS18B20 bus on `D0` selected away from `ANALOG_FB` |
| 6 | `onewire_gpio_block` | not fitted on the current C3 harness revision |
| 7 | `uart_block` | UART0/UART1 crosslink using `D3/D4` and `D20/D21` through `J10` |
| 8 | `grove_i2c_block` | external Grove I2C device on the same `D1/D4` bus |

The important consequence is that modes do not need a one-to-one relationship
with blocks. For example, `C3_I2C` is a primarily I2C-focused mode, while
`C3_BUS_SPI_I2C` is a combined mode that enables blocks 3 and 4 at
the same time.

Block 6 remains part of the family numbering even though the current
ESP32-C3 harness does not implement a DS2413-style OneWire GPIO extension.

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
| `D20` | UART0 RX | reserve for board USB-UART REPL/flashing; selector-used only in UART0/UART1 crosslink mode |
| `D21` | UART0 TX | reserve for board USB-UART REPL/flashing; selector-used only in UART0/UART1 crosslink mode |
| `D9` | boot/download button path | reserve for boot/download control only |
| `D8` | onboard RGB LED / strapping | used only as `PWM_OUT` through 10k series resistance; no fixed pull |

## Default Connectivity Wiring

The ESP32-C3-DevKitC-02 already has a USB connector on the board. That board
USB path goes through the onboard USB-UART bridge to UART0, and it is expected
to be the normal REPL/flashing/control connection for most automated tests.

The harness additionally provides a separate native USB Serial/JTAG connector.
This is not the normal board USB-UART path. It wires directly to the ESP32-C3
native USB pins so phase-one testing can prove the direct USB Serial/JTAG
function independently.

| Board pin / signal | Harness connection | Notes |
|---|---|---|
| Board Micro-USB | host USB | UART0 REPL/flashing path |
| `D18` | fixed wire to native USB/JTAG connector D- | native USB Serial/JTAG |
| `D19` | fixed wire to native USB/JTAG connector D+ | native USB Serial/JTAG |
| GND | native USB/JTAG connector GND and harness GND | common ground |
| VBUS | native USB/JTAG connector VBUS through inline shunt | optional host 5 V feed; default shunt state to be marked |
| EN / reset | automation header `RESET` | also keep manual reset accessible |
| Boot/download path | automation header `BOOT` | expected to control board boot/download path |

In this harness revision, `D18` and `D19` are used only by the additional
harness native USB Serial/JTAG connector. They are not part of the board
USB-UART path, and they are not shared with peripheral test blocks:
`D18` / GPIO18 is fixed-wired to the harness connector USB D-, and
`D19` / GPIO19 is fixed-wired to the harness connector USB D+.

Use a four-position screw connector for the harness USB Serial/JTAG cable:

| Connector pin | Signal | Harness connection |
|---|---|---|
| 1 | USB GND | harness GND |
| 2 | USB VBUS | inline shunt to harness/board 5 V rail |
| 3 | USB D- | fixed wire to `D18` |
| 4 | USB D+ | fixed wire to `D19` |

The VBUS connection must be shunt-selectable so the harness can be tested with
the native USB/JTAG connector providing signalling only, or with VBUS connected
when that is explicitly desired. This is not a switched 5 V power subsystem;
it is an inline VBUS link for the native USB/JTAG connector.

## Selector-Based GPIO Allocation

The ESP32-C3 has limited spare GPIO once UART0, native USB Serial/JTAG, boot
control, and strapping safety are respected. This harness therefore does not
wire every test function to a dedicated pin. Instead, several C3 GPIOs are
routed through labelled selector blocks.

A selector block lets one GPIO serve one of several test roles. Only one shunt
should be fitted per selector at a time. The mode tables later in this document
state which selector positions are required for each test mode.

## Schematic Selector Bank

The schematic is the master wiring definition for the C3 harness. Multi-use
GPIOs use dual-row selector headers with the MCU GPIO repeated on row A and
the selectable function nets on row B. Fit one vertical shunt only per selector.

| Selector | Header | Row A common | Row B options | Notes |
|---|---:|---|---|---|
| `SEL_D0` | 2x02 | `GPIO0` on `a1`, `a2` | `b1` = `ONEWIRE_DQ`; `b2` = `ADC_IN` via `ANALOG_FB` | `ADC_IN` is the user-facing role; it connects D0 to the `ANALOG_FB` net |
| `SEL_D1` | 2x02 | `GPIO1` on `a1`, `a2` | `b1` = `I2C_A_SDA`; `b2` = loop A output via `R5` | `b2` loops to `SEL_D2 b2` through 470R |
| `SEL_D2` | 2x02 | `GPIO2` on `a1`, `a2` | `b1` = `I2C_A_FB`; `b2` = loop A input via `R5` | `I2C_A_FB` is MCP23008 GP0 feedback through `R2` |
| `SEL_D3` | 2x03 | `GPIO3` on `a1`, `a2`, `a3` | `b1` = `SPI_MISO`; `b2` = loop B output via `R7`; `b3` = `D3_UART1_TX` | UART1 TX route for crosslink mode |
| `SEL_D4` | 2x03 | `GPIO4` on `a1`, `a2`, `a3` | `b1` = `I2C_A_SCL`; `b2` = loop B input via `R7`; `b3` = `D4_UART1_RX` | UART1 RX route for crosslink mode |
| `SEL_D10` | 2x02 | `GPIO10` on `a1`, `a2` | `b1` = `I2C_INT`; `b2` = `SPI_CS_FLASH` | selects MCP23008 interrupt or optional flash CS |
| `J10` / `SEL_UART0_UART1` | 2x03 | `a1` = `D20_UART0_RX` via `R6`; `a2` = `D21_UART0_TX` via `R8`; `a3` = GND | `b1` = `D3_UART1_TX`; `b2` = `D4_UART1_RX`; `b3` = GND | fit both signal shunts only for UART0/UART1 crosslink testing; GND pins support external UART access |
| `SEL_D08` | 1x02 | `GPIO8` / `PWM_OUT` | `R3` 10k to `ANALOG_FB` | single safety jumper; default open for safest boot |

Schematic net names use the `I2C_A_` prefix for the primary I2C block. In test
descriptions, `I2C_SDA`, `I2C_SCL`, and `I2C_FB` refer to `I2C_A_SDA`,
`I2C_A_SCL`, and `I2C_A_FB` respectively.

## C3 GPIO Test Role Allocation

The table below lists the approved C3 test roles for each GPIO. For
selector-controlled pins, the roles are alternatives selected by the named
selector; they are not
simultaneously connected.

| C3 pin | Harness roles | Selector / wiring | Notes |
|---:|---|---|---|
| `D0` / GPIO0 | `ADC_IN`, `ONEWIRE_DQ` | `SEL_D0` | ADC position connects to `ANALOG_FB`; OneWire position isolates `ANALOG_FB` from the OneWire bus |
| `D1` / GPIO1 | `I2C_SDA`, `GPIO_LOOP_A_OUT` | `SEL_D1` | `I2C_A_SDA` or loop A output through `R5` |
| `D2` / GPIO2 | `I2C_FB`, `GPIO_LOOP_A_IN` | `SEL_D2` | strapping pin; no fixed pull; loop/I2C feedback through resistors |
| `D3` / GPIO3 | `SPI_MISO`, `GPIO_LOOP_B_OUT`, `UART1_TX` | `SEL_D3` | SPI MISO, loop B output through `R7`, or UART1 TX for crosslink mode |
| `D4` / GPIO4 | `I2C_SCL`, `GPIO_LOOP_B_IN`, `UART1_RX` | `SEL_D4` | I2C clock, loop B input through `R7`, or UART1 RX for crosslink mode |
| `D5` / GPIO5 | `SPI_MOSI` | fixed wire | fixed SPI bus wiring |
| `D6` / GPIO6 | `SPI_SCK` | fixed wire | fixed SPI bus wiring |
| `D7` / GPIO7 | `SPI_CS_ADC` | fixed wire | MCP3008 chip select |
| `D8` / GPIO8 | `PWM_OUT` | `SEL_D08` safety jumper | strapping/RGB LED pin; only through 10k to `ANALOG_FB`; default open |
| `D9` / GPIO9 | BOOT automation | fixed automation header wiring | boot/download control only |
| `D10` / GPIO10 | `I2C_INT`, `SPI_CS_FLASH` | `SEL_D10` | MCP23008 interrupt or optional flash chip select |
| `D18` / GPIO18 | native USB D- | fixed wire to `J1` | reserved for native USB Serial/JTAG |
| `D19` / GPIO19 | native USB D+ | fixed wire to `J1` | reserved for native USB Serial/JTAG |
| `D20` / GPIO20 | UART0 RX | `J10` / `SEL_UART0_UART1` via `R6` only | reserved by default; used only for UART0/UART1 crosslink or deliberate external UART access |
| `D21` / GPIO21 | UART0 TX | `J10` / `SEL_UART0_UART1` via `R8` only | reserved by default; used only for UART0/UART1 crosslink or deliberate external UART access |

## Permanent Wiring

These connections are either permanent or built as the fixed/default selector
paths because they do not create unmanaged mode conflicts.

| Connection | Notes |
|---|---|
| `D18` -> native USB D- | default phase-one requirement |
| `D19` -> native USB D+ | default phase-one requirement |
| `D20` / `D21` reserved by default | selector-connected only through `J10` / `SEL_UART0_UART1` for deliberate UART0/UART1 crosslink or external UART access |
| `D5` -> `SPI_MOSI` | fixed SPI bus wiring |
| `D6` -> `SPI_SCK` | fixed SPI bus wiring |
| `D7` -> `SPI_CS_ADC` | fixed MCP3008 chip-select wiring |
| `D8` -> `SEL_D08` -> 10k -> `ANALOG_FB` | single safety jumper; no fixed pull on strapping pin |
| 3.3 V and GND rails | common harness rails |
| reset and boot lines to automation header | manual/automation access |

`D8` is a strapping pin and also drives the onboard RGB LED. The harness must
not add a fixed pull-up or pull-down. The only normal external load is the 10k
series path into `ANALOG_FB`, which may be opened with a jumper if bring-up
shows any boot sensitivity.

`D0` is the common row of `SEL_D0`. One shunt position selects `ADC_IN` by
connecting `D0` to `ANALOG_FB` for ADC/PWM/SPI analog tests. The other shunt
position connects `D0` to `ONEWIRE_DQ` for DS18B20 tests. Do not fit both shunts:
`ANALOG_FB` has the RC smoothing capacitor and MCP3008 CH0 load, which should
be isolated from the OneWire bus.

## Harness Test Modes

The following sections define the manual harness modes used by the test
runner. Each mode lists the required selector positions and any conflicting
selector positions that must not be fitted.

### Connectivity UART0 Mode

Mode name:

- `C3_CONNECTIVITY_UART0`

Purpose:

- prove the normal board USB-UART path through UART0
- provide the default flashing and control path for repeated test runs

Runner/control path:

- board USB-UART through the board Micro-USB connector on `D20` / `D21`

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| board USB-UART path | left untouched |
| `J10` / `SEL_UART0_UART1` | no signal shunts fitted |
| `SEL_D3` / `SEL_D4` UART positions | not fitted |
| BOOT and RESET access | available for flashing and reset tests |

Compatible selector positions:

| Selector group | Allowed state |
|---|---|
| baseline loopback positions on `SEL_D1`, `SEL_D2`, `SEL_D3`, and `SEL_D4` | may remain fitted |
| native USB Serial/JTAG wiring on `D18` / `D19` | may remain physically wired, but is not the runner/control path in this mode |

Enabled coverage:

- REPL attach over the normal board USB-UART path
- reset and reconnect
- flashing with the harness attached

### Baseline GPIO Mode

Mode name:

- `C3_BASELINE_GPIO`

Purpose:

- enable block 1 GPIO loopback testing
- preserve a safe default state for the shared analog, I2C, SPI, and UART
  selector paths

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| `SEL_D1` | shunt `GPIO1` to loop A output, `a2-b2` |
| `SEL_D2` | shunt `GPIO2` to loop A input, `a2-b2` |
| loop A resistor | `SEL_D1 b2` -> `R5` 470R -> `SEL_D2 b2` |
| `SEL_D3` | shunt `GPIO3` to loop B output, `a2-b2` |
| `SEL_D4` | shunt `GPIO4` to loop B input, `a2-b2` |
| loop B resistor | `SEL_D3 b2` -> `R7` 470R -> `SEL_D4 b2` |

Open/conflicting selector positions:

| Selector group | Required state |
|---|---|
| `SEL_D1` / `SEL_D2` I2C positions | not fitted |
| `SEL_D3` SPI or UART position | not fitted |
| `SEL_D4` I2C or UART position | not fitted |
| `SEL_D08` analog/PWM path | open unless analog/PWM testing is active |
| `SEL_D0` OneWire position | not fitted |

Notes:

- `D2` is accepted as a strapping pin only because it has no fixed pull and is
  used through resistor-protected/manual-mode wiring.
- Physical loopback wiring should be `D1 -> 470R -> D2` and
  `D3 -> 470R -> D4`.

Enabled coverage:

- block 1 GPIO loopback behavior
- `pinMode`, `digitalWrite`, `digitalRead`, `digitalPulse`, and `setWatch`
  coverage on the baseline loopback pairs

### Analog/PWM Mode

Mode name:

- `C3_ANALOG_PWM`

Purpose:

- enable block 2 analog and PWM feedback testing
- connect `D0` to the filtered `ANALOG_FB` node while keeping OneWire isolated

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| `SEL_D08` | closed after safe boot if PWM feedback is being run |
| `PWM_OUT` -> 10k -> `ANALOG_FB` | permanent |
| `ANALOG_FB` -> 0.1uF -> GND | permanent |
| `SEL_D0` | select `ADC_IN`: shunt `GPIO0` to `ANALOG_FB`, `a2-b2` |
| `ANALOG_FB` -> MCP3008 CH0 | closed/permanent if MCP3008 fitted |

Boot-safety requirement:

- no direct `D8` pull-up or pull-down
- no low-value LED/test load from `D8` to either rail
- if fitted, a `D8` -> `PWM_OUT` jumper should default open until the board has
  booted cleanly with the harness attached

Test note:

- `D0` analog feedback behavior must be confirmed during bring-up.
- PWM-generated `ANALOG_FB` can be read by both target ADC on `D0` and MCP3008
  CH0 over SPI in `C3_BUS_SPI_I2C`.
- OneWire tests require the `D0` selector to move away from `ANALOG_FB`.

Enabled coverage:

- block 2 `analogRead` low/high level checks
- block 2 PWM or `analogWrite` feedback into the target ADC
- target-side ADC preparation for optional MCP3008 comparison in combined
  block 3 plus block 4 mode

### I2C Mode

Mode name:

- `C3_I2C`

Purpose:

- enable block 3 I2C testing on the primary MCP23008 path
- optionally keep the Grove I2C extension available on the same bus

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| `SEL_D1` | shunt `GPIO1` to `I2C_A_SDA`, `a1-b1` |
| `SEL_D4` | shunt `GPIO4` to `I2C_A_SCL`, `a1-b1` |
| `SEL_D10` | shunt `GPIO10` to `I2C_INT`, `a1-b1` |
| `SEL_D2` | shunt `GPIO2` to `I2C_A_FB`, `a1-b1`, if feedback tests are run |
| I2C SDA/SCL pull-ups | provided by attached I2C module(s) for this revision |

Open/conflicting selector positions:

| Selector group | Required state |
|---|---|
| `SEL_D1` / `SEL_D2` loopback positions | not fitted |
| `SEL_D3` / `SEL_D4` UART crosslink positions | not fitted |
| `SEL_D4` loopback position | not fitted |

Enabled coverage:

- block 3 MCP23008 register read/write
- block 3 GP0 feedback through `D2`
- block 3 INT through `D10`
- block 8 external Grove I2C devices on the same bus where fitted
- `setWatch` on expander feedback/interrupt where supported

### Combined SPI/I2C Bus Mode

Mode name:

- `C3_BUS_SPI_I2C`

Purpose:

- provide one practical harness mode that enables block 3 I2C and
  block 4 SPI concurrently
- verify Espruino SPI pin mapping and transfer behavior using the MCP3008
- verify Espruino I2C pin mapping and MCP23008 operation in the same physical
  harness mode
- exercise both bus APIs without moving jumpers between separate I2C and SPI
  selector states

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| `SEL_D1` | shunt `GPIO1` to `I2C_A_SDA`, `a1-b1` |
| `SEL_D4` | shunt `GPIO4` to `I2C_A_SCL`, `a1-b1` |
| `SEL_D10` | shunt `GPIO10` to `I2C_INT`, `a1-b1` |
| `SEL_D2` | shunt `GPIO2` to `I2C_A_FB`, `a1-b1`, if feedback tests are run |
| `SEL_D08` | closed after boot if PWM-to-ADC/SPI comparison is being run |
| `SEL_D0` | select `ADC_IN`: shunt `GPIO0` to `ANALOG_FB`, `a2-b2`, if target ADC comparison is run |
| `SEL_D3` | shunt `GPIO3` to `SPI_MISO`, `a1-b1` |
| `D5` -> `SPI_MOSI` | closed |
| `D6` -> `SPI_SCK` | closed |
| `D7` -> `SPI_CS_ADC` | closed |
| MCP3008 CH0 -> `ANALOG_FB` | closed |
| I2C SDA/SCL pull-ups | provided by attached I2C module(s) for this revision |

ESP32-C3 harness wiring:

| ESP32-C3 pin | Harness node | Peripheral connection |
|---|---|---|
| `D1` / GPIO1 | `I2C_SDA` | MCP23008 `SDA`; Grove `SDA` |
| `D4` / GPIO4 | `I2C_SCL` | MCP23008 `SCL`; Grove `SCL` |
| `D10` / GPIO10 | `I2C_INT` | MCP23008 `INT` |
| `D2` / GPIO2 | `I2C_FB` | MCP23008 `GP0` via 470R |
| `D8` / GPIO8 | `PWM_OUT` | 10k to `ANALOG_FB`; no fixed pull |
| `D0` / GPIO0 | `ADC_IN` selector common | select to `ANALOG_FB` for target ADC comparison |
| `D3` / GPIO3 | `SPI_MISO` | MCP3008 `DOUT`; optional W25xxx `DO` |
| `D5` / GPIO5 | `SPI_MOSI` | MCP3008 `DIN`; optional W25xxx `DI` |
| `D6` / GPIO6 | `SPI_SCK` | MCP3008 `CLK`; optional W25xxx `CLK` |
| `D7` / GPIO7 | `SPI_CS_ADC` | MCP3008 `CS/SHDN` |

MCP3008 wiring detail:

| MCP3008 PDIP pin | Function | Connection |
|---:|---|---|
| 16 | `VDD` | `3V3` |
| 15 | `VREF` | `3V3` |
| 14 | `AGND` | GND |
| 9 | `DGND` | GND |
| 13 | `CLK` | `SPI_SCK` |
| 12 | `DOUT` | `SPI_MISO` |
| 11 | `DIN` | `SPI_MOSI` |
| 10 | `CS/SHDN` | `SPI_CS_ADC` |
| 1 | `CH0` | `ANALOG_FB` |
| 2-8 | `CH1`-`CH7` | no connection for first revision, or optional analog test header |

Open/conflicting selector positions:

| Selector group | Required state |
|---|---|
| loopback selector positions on `SEL_D1`, `SEL_D2`, `SEL_D3`, `SEL_D4` | not fitted |
| `SEL_D08` analog/PWM drive | close only after confirming boot safety |
| `SEL_D0` OneWire position | not fitted |
| UART crosslink positions on `SEL_D3` / `SEL_D4` | not fitted |
| `SEL_D10` flash-CS position | not fitted while `GPIO10` is used for `I2C_INT` |

Enabled coverage:

- block 4 MCP3008 transfer/read
- block 3 MCP23008 register read/write
- block 3 MCP23008 feedback and interrupt behavior
- block 8 external Grove I2C devices on the same bus where fitted
- concurrent SPI and I2C operation in one manual harness mode

### SPI Flash Extended Mode

Mode name:

- `C3_SPI_FLASH_EXTENDED`

This optional mode reuses the SPI bus above but moves `D10` from `I2C_INT` to
`SPI_CS_FLASH`. It is not part of the first combined SPI/I2C bus mode.

Required selector change from `C3_BUS_SPI_I2C`:

| Selector or wiring | Position |
|---|---|
| `SEL_D10` | move shunt from `I2C_INT` `a1-b1` to `SPI_CS_FLASH` `a2-b2` |

Enabled coverage:

- optional W25xxx JEDEC/status
- shared-bus chip-select behavior with MCP3008

### OneWire Mode

Mode name:

- `C3_ONEWIRE`

Purpose:

- enable block 5 OneWire testing on `D0`
- isolate `D0` from the analog feedback node while the OneWire bus is active

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| `SEL_D0` | shunt `GPIO0` to `ONEWIRE_DQ`, `a1-b1` |
| `ONEWIRE_DQ` -> 4.7k -> 3.3 V | fitted |
| DS18B20 A DQ -> `ONEWIRE_DQ` | closed/permanent within OneWire block |
| DS18B20 B DQ -> `ONEWIRE_DQ` | closed/permanent within OneWire block |

Open/conflicting selector positions:

| Selector group | Required state |
|---|---|
| `SEL_D0` analog feedback position | not fitted |
| analog filtered node / MCP3008 CH0 load | isolated from `D0` by selector |

Compatible selector positions:

| Selector group | Allowed state |
|---|---|
| I2C links on `D1`, `D4`, `D10`, and `D2` | may remain closed for combined I2C + OneWire tests |

Enabled coverage:

- two-device search
- addressed DS18B20 selection
- scratchpad read
- temperature conversion
- optional I2C display/logging of temperature readings while OneWire is active

These are block 5 behaviours. The current C3 harness does not add a
block 6 DS2413-style OneWire GPIO extension.

### UART0/UART1 Crosslink Mode

Mode name:

- `C3_SERIAL_UART0_UART1_CROSSLINK`

Purpose:

- prove non-console `Serial` API behavior on a second UART mapping
- deliberately exercise UART0 ownership while the runner controls/monitors the
  DUT through native USB Serial/JTAG
- avoid needing an external USB-UART peer for the C3 serial test

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| Runner/control path | native USB Serial/JTAG on `D18` / `D19` |
| `SEL_D3` | shunt `GPIO3` to `D3_UART1_TX`, `a3-b3` |
| `SEL_D4` | shunt `GPIO4` to `D4_UART1_RX`, `a3-b3` |
| `J10` / `SEL_UART0_UART1` column 1 | fit shunt: `D3_UART1_TX` -> `D20_UART0_RX` through `R6` |
| `J10` / `SEL_UART0_UART1` column 2 | fit shunt: `D21_UART0_TX` -> `D4_UART1_RX` through `R8` |
| `J10` / `SEL_UART0_UART1` column 3 | GND/GND; available as common ground for external UART access |

Open/conflicting selector positions:

| Selector group | Required state |
|---|---|
| loopback positions on `SEL_D3` / `SEL_D4` | not fitted |
| `SEL_D3` SPI MISO position | not fitted |
| `SEL_D4` I2C SCL position | not fitted |
| `SEL_D0` OneWire position | not fitted unless combining intentionally |
| board USB-UART control path | do not use as the runner/control path while UART0 is under test |

External UART access:

- with the two signal shunts open, `J10` can also be used as an external UART
  access connector for either side of the UART test block.
- the two GND pins on column 3 provide a local common reference for an external
  USB-UART adapter or test instrument.

Enabled coverage:

- `Serial.setup` on UART0 and UART1-capable mappings
- TX/RX transfer across the crossed UART pair
- `Serial.read`
- `Serial.on("data")`
- `Serial.unsetup` / re-setup
- detection of console/ownership conflicts between UART0 and the selected REPL
  path

### Native USB Serial/JTAG Mode

Mode name:

- `C3_CONNECTIVITY_USB_SERIAL_JTAG`

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| `D18` -> native USB/JTAG connector D- | fixed wire |
| `D19` -> native USB/JTAG connector D+ | fixed wire |
| native USB/JTAG connector GND -> harness GND | fixed wire |
| native USB/JTAG connector VBUS -> 5 V rail | inline shunt, fit only when VBUS feed is wanted |

Open/conflicting selector positions:

| Selector group | Required state |
|---|---|
| any peripheral use of `D18` / `D19` | not allowed in phase-one default design |

Enabled coverage:

- native USB Serial/JTAG enumeration
- native USB serial REPL if firmware exposes it
- reset/reconnect behavior
- flashing/debug path if supported by selected tooling

### Power Reset Mode

Mode name:

- `C3_POWER_RESET`

Purpose:

- prove reset, bootloader entry, watchdog reset, and later controlled power
  behaviour using the harness control provisions

Runner/control path:

- board USB-UART on `D20` / `D21` or native USB Serial/JTAG on `D18` / `D19`,
  depending on which recovery path is under test

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| automation header | connected or manually accessible for RESET and BOOT control |
| board USB-UART path | available for normal reconnect and flashing checks |
| native USB Serial/JTAG wiring | available for native reconnect and flashing checks |
| `J10` / `SEL_UART0_UART1` | no signal shunts fitted unless a deliberate serial-crosslink combination is under test |

Open/conflicting selector positions:

| Selector group | Required state |
|---|---|
| UART0/UART1 crosslink wiring | leave open unless deliberately combining reset testing with the serial-crosslink mode |

Enabled coverage:

- reset reconnect on the normal UART0 path
- reset reconnect on the native USB Serial/JTAG path
- bootloader entry and flashing
- watchdog reset recovery

## Automation Header

The automation header is a provision for later repeatable reset and
boot/download control. It does not automate the harness by itself: a future
runner controller or external interface will be required to pull these lines to
the required states under software control.

Minimum C3 automation header:

| Header pin | C3/board signal | Purpose |
|---|---|---|
| GND | GND | common reference |
| RESET | EN / reset | reset control |
| BOOT | boot/download path | download-mode selection |

5 V power switching is not required for this first harness. Native USB/JTAG
VBUS is provided through a simple inline shunt, not through a power switch.

## Default Jumper State

Default state means the safe starting configuration after assembly, before a
specific test mode has been selected. It should allow the DUT to boot normally,
preserve the board USB-UART path for the usual REPL/flashing connection, keep the
harness USB Serial/JTAG connector wired but not force it to power the board, and
support the baseline GPIO loopback tests.

Permanent wiring, no shunt required:

| Wiring | Default state |
|---|---|
| Board USB-UART path | left untouched; use the ESP32-C3-DevKitC-02 USB connector for normal REPL/flashing |
| Harness USB Serial/JTAG data | `D18` / GPIO18 wired to harness USB `D-`; `D19` / GPIO19 wired to harness USB `D+` |
| SPI fixed lines | `D5` / GPIO5 to `SPI_MOSI`, `D6` / GPIO6 to `SPI_SCK`, `D7` / GPIO7 to `SPI_CS_ADC` |
| Automation header | available, but inactive unless an external runner/controller is connected |

Default fitted shunts:

| Selector | Default position | Purpose |
|---|---|---|
| `SEL_D1` | `a2-b2` | `D1` / GPIO1 to loopback A output |
| `SEL_D2` | `a2-b2` | `D2` / GPIO2 to loopback A input |
| `SEL_D3` | `a2-b2` | `D3` / GPIO3 to loopback B output |
| `SEL_D4` | `a2-b2` | `D4` / GPIO4 to loopback B input |

Default open / not fitted:

| Selector or shunt | Default state | Reason |
|---|---|---|
| `SEL_D0` | no shunt fitted | choose `ONEWIRE_DQ` or `ADC_IN` only for the relevant test mode |
| `SEL_D08` | open | keeps the `D8` / GPIO8 PWM drive path disconnected until analog feedback tests |
| `SEL_D10` | no shunt fitted | choose `I2C_INT` or `SPI_FLASH_CS` only for the relevant test mode |
| `SEL_D3` / `SEL_D4` UART positions | not fitted | UART crosslink testing is a deliberate mode, not the baseline |
| `J10` / `SEL_UART0_UART1` | no signal shunts fitted | keeps UART0 pins reserved for board USB-UART unless crosslink or external UART access is active |
| `JP1` harness USB VBUS shunt | open unless intentionally using harness USB VBUS | avoids an unintended 5 V feed into the board/harness rail |
| `JP12` external 5 V shunt | open unless intentionally using external 5 V input | avoids an unintended 5 V feed into the board/harness rail |

Do not fit `JP1` and `JP12` together unless the power-source arrangement has
been deliberately reviewed. Test-runner prompts should name the required selector
positions before each non-default mode is run.
