# ESP32 Harness Modes

This document defines the intended harness modes before detailed wiring is
specified.

The purpose is to decide which connections are permanent, which are
jumper-selected, and which test suites are enabled in each physical harness
state.

Related documents:

- [target_reference_links.md](target_reference_links.md)
- [connectivity_permutations.md](connectivity_permutations.md)
- [gpio_rationalisation.md](gpio_rationalisation.md)
- [wiring_common_blocks.md](wiring_common_blocks.md)
- [wiring_esp32_c3_devkitc_02.md](wiring_esp32_c3_devkitc_02.md)
- [wiring_olimex_esp32_devkit_lipo_rev_d.md](wiring_olimex_esp32_devkit_lipo_rev_d.md)

## Mode Design Principles

The ESP32 harness family should use the same peripheral blocks as the RP2040
harness, but the ESP32-C3 pin budget means not every block can be permanently
wired at the same time.

Therefore:

- keep connectivity testing explicit
- keep phase-one C3 native USB Serial/JTAG wiring protected
- prefer permanent wiring on the classic ESP32 where GPIO budget allows it
- use labelled jumpers/links on C3 where test blocks must share pins
- document the default jumper state
- design for repeatable automation from the first harness build

## Permanent Connections

These should be present in all normal harness modes.

### Classic ESP32 / Olimex ESP32-DevKit-LiPo Rev.D

| Connection | Status | Notes |
|---|---|---|
| Board Micro-USB | permanent | normal UART0 REPL/flashing path |
| UART0 `GPIO1` / `GPIO3` | reserved | not used for peripheral harness wiring |
| Reset access | permanent | should support manual and later automated reset |
| Boot/download access | permanent | must remain usable with harness connected |
| 3V3/GND rails | permanent | common harness supply/reference |

### ESP32-C3-DevKitC-02

| Connection | Status | Notes |
|---|---|---|
| Board Micro-USB | permanent | USB-UART bridge to UART0, normal serial/flashing path |
| UART0 `GPIO20` / `GPIO21` | reserved | not used for peripheral harness wiring |
| Native USB D-/D+ on `GPIO18` / `GPIO19` | permanent/default | phase-one USB Serial/JTAG bring-up path |
| Reset access | permanent | should support manual and automated reset |
| Boot/download access | permanent | should support manual and automated boot/download selection |
| 3V3/GND rails | permanent | common harness supply/reference |

## Automation Mode

Automation is not a separate test function; it is a harness capability used by
the other modes.

| Automation signal | Classic ESP32 | ESP32-C3 | Initial expectation |
|---|---|---|---|
| Reset | EN / reset input | EN / reset input | wired to accessible header or automation connector |
| Boot/download | `GPIO0` boot path | boot button / download path, likely `GPIO9` on C3 board | wired to accessible header or automation connector |
| Power cycle | optional at first | optional at first | leave provision for later controlled power switching |
| Control serial | UART0 USB-UART | UART0 USB-UART or native USB Serial/JTAG | runner profile decides; pin names use `Dxx` |

The runner design is still TBD, but the harness should not require hidden or
hard-to-reach manual button presses for normal repeated test execution.

Harness mode selection itself is manual. The runner should prompt the operator
with the required mode and jumper/link checklist, then wait for confirmation
before starting tests that depend on that mode.

## Classic ESP32 Harness Modes

The classic ESP32 has enough GPIO that most hardware blocks can be wired
permanently. Modes still help document what is being proven.

### `ESP32_CONNECTIVITY`

Purpose:

- prove UART0 USB-UART REPL connection
- prove reset/reconnect behavior
- prove flashing/download still works with harness attached

Reserved pins:

- `GPIO1` / `GPIO3` for UART0
- boot strapping pins must remain boot-safe

Enabled tests:

- basic REPL
- reset/reconnect
- flashing smoke test
- later watchdog reset recovery

### `ESP32_BASELINE_HARDWARE`

Purpose:

- run the normal always-wired hardware regression pack

Expected fixed blocks:

- GPIO loopbacks
- PWM-to-ADC feedback
- MCP23008 I2C
- MCP3008 SPI ADC
- optional W25xxx SPI flash
- two DS18B20 devices on one OneWire bus
- non-console UART loopback or peer

Enabled tests:

- GPIO read/write
- `pinMode`
- `digitalPulse`
- `shiftOut`
- `setWatch`
- ADC
- PWM / `analogWrite`
- I2C
- SPI
- OneWire
- `Serial`
- timers
- watchdog survival
- flash and `Storage`

### `ESP32_SERIAL_PEER`

Purpose:

- prove non-console `Serial` behavior using an external peer, not only a local
  loopback

Links:

- connect selected non-console TX/RX pair to external USB-UART or peer header
- leave UART0 REPL untouched

Enabled tests:

- `Serial.setup`
- `Serial.read`
- `Serial.on("data")`
- `Serial.unsetup` / re-setup
- optional parity/error handling if supported

### `ESP32_POWER_RESET`

Purpose:

- prove behavior across reset, bootloader entry, watchdog reset, and later
  controlled power cycling

Links:

- automation connector controls reset and boot/download
- optional future power switch controls target power

Enabled tests:

- reset reconnect
- bootloader entry/flashing
- watchdog destructive reset
- storage/save recovery after reset

## ESP32-C3 Harness Modes

The C3 requires more explicit modes because native USB and UART0 consume four
important pins from the start.

### `C3_CONNECTIVITY_UART0`

Purpose:

- prove the board USB-UART path through UART0
- provide a known-good control path for early tests
- prove flashing/download through the normal board USB path

Reserved pins:

- `GPIO20` / `GPIO21` for UART0
- `GPIO18` / `GPIO19` remain connected to native USB Serial/JTAG hardware but
  do not need to be the runner control path in this mode

Enabled tests:

- basic REPL
- reset/reconnect
- flashing smoke test

### `C3_CONNECTIVITY_USB_SERIAL_JTAG`

Purpose:

- prove ESP32-C3 native USB Serial/JTAG from phase one
- establish whether native USB can be used as a REPL/control path
- prove reset/reconnect behavior on native USB

Required default links:

- `GPIO18` -> USB D-
- `GPIO19` -> USB D+
- disconnect `GPIO18` / `GPIO19` from all peripheral test blocks

Reserved pins:

- `GPIO18` / `GPIO19` for native USB
- `GPIO20` / `GPIO21` for UART0 unless deliberately testing native-only
  operation

Enabled tests:

- native USB Serial/JTAG enumeration
- REPL attach if firmware exposes console there
- reset/reconnect
- flashing/debug path if supported by the firmware/tooling under test

### `C3_BASELINE_GPIO`

Purpose:

- prove basic GPIO and event behavior without disturbing connectivity pins

Candidate fixed blocks:

- GPIO loopback pair A
- GPIO loopback pair B if pin budget allows
- simple digital pulse / shiftOut feedback

Proposed default pin use:

| Harness node | C3 pin |
|---|---:|
| `GPIO_LOOP_A_OUT` | `D1` |
| `GPIO_LOOP_A_IN` | `D3` |
| `GPIO_LOOP_B_OUT` | `D4` |
| `GPIO_LOOP_B_IN` | `D2` |

Reserved pins:

- `GPIO18` / `GPIO19` for native USB
- `GPIO20` / `GPIO21` for UART0

Enabled tests:

- `pinMode`
- `digitalWrite`
- `digitalRead`
- `digitalPulse`
- `shiftOut`
- `setWatch`

### `C3_ANALOG_PWM`

Purpose:

- prove ADC and PWM / `analogWrite` behavior with a feedback node

Links:

- connect `PWM_OUT` to `ANALOG_FB` through the RC feedback network
- connect `ANALOG_FB` to selected C3 ADC input

Open pin decision:

- current candidate `ADC_IN` is `D0`, avoiding known C3 strapping pins
- `D2` is accepted for loopback/input feedback use despite being a strapping
  pin, provided it has no fixed pull and is only connected through
  resistor-protected/manual-mode wiring.

Proposed pin use:

| Harness node | C3 pin |
|---|---:|
| `PWM_OUT` | `D5` |
| `ADC_IN` | `D0` |

Enabled tests:

- `analogRead`
- digital low/high feedback into ADC
- PWM-derived analog feedback

### `C3_I2C`

Purpose:

- prove I2C API and MCP23008 behavior

Links:

- connect selected pins to `I2C_SDA` and `I2C_SCL`
- connect MCP23008 interrupt output to selected input pin
- connect MCP23008 feedback output to selected input pin if pin budget allows

Proposed pin use:

| Harness node | C3 pin |
|---|---:|
| `I2C_SDA` | `D6` |
| `I2C_SCL` | `D7` |
| `I2C_INT` | `D10` |
| `I2C_FB` | `D2` |

Reserved pins:

- `GPIO18` / `GPIO19` remain native USB
- `GPIO20` / `GPIO21` remain UART0

Enabled tests:

- `I2C.setup`
- MCP23008 register read/write
- expander feedback if allocated
- expander interrupt polling/watch if allocated

### `C3_SPI`

Purpose:

- prove SPI API using MCP3008 and optional W25xxx

Links:

- jumper selected C3 pins to `SPI_MISO`, `SPI_MOSI`, `SPI_SCK`,
  `SPI_CS_ADC`, and optional `SPI_CS_FLASH`
- disconnect those pins from conflicting I2C/GPIO blocks in this mode

Proposed pin use:

| Harness node | C3 pin |
|---|---:|
| `SPI_MISO` | `D3` |
| `SPI_MOSI` | `D5` |
| `SPI_SCK` | `D6` |
| `SPI_CS_ADC` | `D7` |
| `SPI_CS_FLASH` | `D10` |

Reserved pins:

- `GPIO18` / `GPIO19` remain native USB by default
- `GPIO20` / `GPIO21` remain UART0

Enabled tests:

- `SPI.setup`
- MCP3008 transfer/read
- optional W25xxx JEDEC/status
- optional shared-bus chip-select behavior

### `C3_ONEWIRE`

Purpose:

- prove OneWire with two DS18B20 devices on one bus

Links:

- connect selected bidirectional GPIO to `ONEWIRE_DQ`
- connect two DS18B20 devices to the shared `ONEWIRE_DQ` bus
- keep one 4.7k pull-up on the OneWire node

Open pin decision:

- proposed `ONEWIRE_DQ` is `D4`, without borrowing native USB pins

Conflict:

- `D4` is also used as `GPIO_LOOP_B_OUT` in baseline GPIO mode and `UART_RX`
  in serial-peer mode

Enabled tests:

- DS18B20 search returns two devices
- family/ROM validation for both devices
- addressed temperature conversion/readback for each selected ROM
- scratchpad read from each selected ROM

### `C3_SERIAL_PEER`

Purpose:

- prove non-console `Serial` API separately from UART0 REPL/flashing

Links:

- connect selected TX/RX pair to external USB-UART peer or loopback
- avoid `GPIO20` / `GPIO21` unless deliberately testing UART0 ownership

Proposed pin use:

| Harness node | C3 pin |
|---|---:|
| `UART_TX` | `D3` |
| `UART_RX` | `D4` |

Enabled tests:

- `Serial.setup`
- `Serial.read`
- `Serial.on("data")`
- `Serial.unsetup` / re-setup
- optional error/parity handling if supported

### `C3_POWER_RESET`

Purpose:

- prove reset, bootloader entry, watchdog reset, and eventually controlled
  power cycling under both UART0 and native USB Serial/JTAG observation

Links:

- automation connector controls reset and boot/download
- native USB D-/D+ remains connected
- UART0 USB-UART remains available
- optional future power switch controls target power

Enabled tests:

- reset reconnect on UART0
- reset reconnect on native USB Serial/JTAG
- bootloader entry/flashing
- watchdog destructive reset
- storage/save recovery after reset

## Default Jumper Philosophy

Default jumper state should be:

- safe to boot
- safe to flash
- safe to run connectivity tests
- safe to run baseline GPIO tests
- native USB Serial/JTAG connected on C3
- no strapping pin pulled into an unsafe state

Mode jumpers should be used only when a test mode needs to borrow pins from a
different functional block.

Each jumper group should have:

- a mode name
- a default position
- a short board label
- a document reference
- an explicit conflict list

The runner should treat mode state as operator-confirmed rather than
auto-detected unless a later harness revision adds reliable sensing.

## Open Items Before Wiring Tables

1. Confirm C3 `D0` analog feedback behavior in Espruino.
2. Define C3 jumper conflict rules for `D3`, `D4`, `D5`, `D6`, `D7`, and
   `D10`.
3. Define the reset/boot/GND automation connector.
4. Define runner prompts and confirmation flow for manual harness mode
   selection.
