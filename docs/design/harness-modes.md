# ESP32 Harness Modes

This document defines the family-level harness mode model.

It does not define exact selector positions, jumper states, or per-pin routing
for a specific target harness. Those details belong in the target wiring notes.

Related documents:

- [docs/design/target-reference-links.md](target-reference-links.md)
- [docs/design/connectivity-permutations.md](connectivity-permutations.md)
- [docs/design/common-harness-design-and-blocks.md](common-harness-design-and-blocks.md)
- [docs/targets/esp32-c3-devkitc-02/wiring.md](../targets/esp32-c3-devkitc-02/wiring.md)
- [docs/targets/esp32-devkitc-v4/wiring.md](../targets/esp32-devkitc-v4/wiring.md)

## Purpose

A harness mode is a named test precondition.

It tells the operator and the runner:

- which console or control path is in use
- which harness blocks are expected to be active
- which shared pins or links are deliberately borrowed for that test phase
- which conflicting blocks must be left disconnected

The exact physical implementation is target-specific. The mode meaning should
remain stable across targets even when the selector names or pin choices differ.

## Mode Rules

- mode state is manual and operator-confirmed unless a later harness revision
  adds reliable sensing
- the runner should prompt for the required mode and selector or link checklist
  before the test starts
- the mode used must be recorded in test evidence
- the default harness state should always be safe to boot, safe to flash, and
  safe to reach the normal REPL path
- connectivity pins stay reserved unless a deliberate mode says otherwise
- reset and boot automation is a harness capability used by other modes, not a
  separate peripheral block

## Mode Categories

The ESP32-family harnesses use a small set of recurring mode types.

### Connectivity Modes

These prove the console, flashing, and reconnect path itself.

Typical coverage:

- REPL attach
- reset and reconnect
- flashing with the harness attached
- alternate control path behaviour where supported

Examples:

- `ESP32_CONNECTIVITY`
- `C3_CONNECTIVITY_UART0`
- `C3_CONNECTIVITY_USB_SERIAL_JTAG`

### Baseline Hardware Modes

These prove the normal hardware test blocks without intentionally borrowing
connectivity resources.

Typical coverage:

- GPIO loopbacks
- `digitalPulse`
- `setWatch`
- analog/PWM feedback
- I2C
- SPI
- OneWire
- storage or external flash where fitted

Examples:

- `ESP32_BASELINE_HARDWARE`
- `C3_BASELINE_GPIO`
- `C3_BUS_SPI_I2C`

### Alternate Shared-Pin Modes

These exist where one target must reuse the same GPIO for more than one logical
block. They prove a deliberate alternate configuration, not the default state.
In practice these modes are selected using target-specific selector headers or
links with shunts to choose the required role. Those selector definitions belong
in the target wiring notes.

The ESP32-C3 is the main current example because its limited comfortable GPIO
budget requires significant selector use.

Typical coverage:

- analog vs OneWire selection
- I2C interrupt vs flash chip-select selection
- optional shared-bus extensions

Examples:

- `C3_ANALOG_PWM`
- `C3_I2C`
- `C3_ONEWIRE`
- `C3_SPI_FLASH_EXTENDED`

### Serial Modes

These prove non-console serial behaviour either with an external peer or with a
deliberate local crosslink.

Typical coverage:

- `Serial.setup`
- TX/RX transfer
- `Serial.read`
- `Serial.on("data")`
- reconfiguration

Examples:

- `ESP32_SERIAL_PEER`
- `ESP32_SERIAL_UART1_UART2_CROSSLINK`
- `C3_SERIAL_UART0_UART1_CROSSLINK`

### Reset And Power Modes

These prove behaviour across destructive or state-changing events that are not
part of ordinary peripheral testing.

Typical coverage:

- reset reconnect
- bootloader entry
- watchdog reset
- controlled power-cycle recovery where available

Examples:

- `ESP32_POWER_RESET`
- `C3_POWER_RESET`

## Family Position By Target Class

### Classic ESP32 Harnesses

Classic ESP32 targets usually have enough spare GPIO that most baseline test
blocks can remain wired at the same time.

So the normal pattern is:

- one connectivity mode for UART0 REPL/flashing
- one baseline hardware mode
- one serial mode for non-console UART behaviour
- one reset or power mode

The current classic harness implementation is documented in
[docs/targets/esp32-devkitc-v4/wiring.md](../targets/esp32-devkitc-v4/wiring.md).

### ESP32-C3 Harnesses

The ESP32-C3 requires more explicit modes because native USB, UART0, boot
constraints, and a smaller comfortable GPIO budget force more sharing.

So the normal pattern is:

- separate UART0 and native USB connectivity modes
- a baseline GPIO mode
- deliberate alternate modes for analog, OneWire, and combined bus testing
- a deliberate serial crosslink mode
- a reset or power mode

The current C3 implementation is documented in
[docs/targets/esp32-c3-devkitc-02/wiring.md](../targets/esp32-c3-devkitc-02/wiring.md).

## Target-Wiring Ownership

The target wiring documents own:

- exact selector names
- exact jumper or shunt positions
- default fitted and default-open states
- target-specific conflicts
- exact pin routing
- mode-specific link tables

This document owns only the family-level meaning of each mode.
