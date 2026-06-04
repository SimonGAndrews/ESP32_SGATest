# ESP32 Connectivity And REPL Test Permutations

This document captures the connectivity modes that need to be tested separately
from normal GPIO/peripheral harness testing.

The RP2040 harness used SWD plus the Raspberry Pi Debug Probe. That gave a
very useful separation between:

- firmware flash/debug access
- runtime REPL/control
- optional UART observation

The initial ESP32 targets do not have the same default separation. Their
connectivity modes change which pins are available and which console path is
being validated, so the harness needs explicit connectivity permutations.

## Connectivity Test Goals

The test suite should prove:

- the normal Espruino REPL path can connect, reset, and run saved tests
- firmware flashing remains possible with the harness connected
- the board can recover after reset, watchdog reset, or power cycle
- alternate console paths work when the target supports them
- a console path can be tested without accidentally consuming pins needed by
  the peripheral harness
- USB/UART/JTAG serial paths are tested as features, not treated only as host
  plumbing

## Classic ESP32: Olimex ESP32-DevKit-LiPo

The classic ESP32 board has a USB-to-UART bridge connected to UART0.

Expected normal mode:

| Mode | Host connection | Target path | Harness impact | Purpose |
|---|---|---|---|---|
| `ESP32_UART0_REPL` | board Micro-USB | USB-UART bridge to UART0 | reserve `GPIO1` / `GPIO3` | normal REPL, flashing, saved-test runner |

Candidate additional modes:

| Mode | Host connection | Target path | Harness impact | Purpose |
|---|---|---|---|---|
| `ESP32_UART0_REPL_WITH_PEER` | board Micro-USB plus external USB-UART | UART0 REPL plus non-console UART | reserve UART0 and allocate a second UART pair | validate `Serial` API while REPL remains on UART0 |
| `ESP32_POWER_CYCLE_RECONNECT` | board Micro-USB, optionally controlled power | UART0 REPL | no extra GPIO, but runner must handle reconnect | validate reset/power-cycle recovery |
| `ESP32_BOOTLOADER_FLASH` | board Micro-USB | UART0 download mode | boot/reset auto-control must still work | validate flashing with harness attached |

Harness implication:

- `GPIO1` and `GPIO3` should be reserved from normal peripheral wiring because
  they are the UART0 console/flashing path.
- Non-console serial tests should use another UART-capable pair or a loopback
  mode that does not disturb UART0.
- Bootstrapping pins must not be loaded in a way that prevents esptool from
  entering download mode.

## ESP32-C3: ESP32-C3-DevKitC-02

The ESP32-C3-DevKitC-02 has two distinct connectivity concepts:

- the board Micro-USB path through the onboard USB-to-UART bridge
- the ESP32-C3 native USB Serial/JTAG controller on `GPIO18` / `GPIO19`

The native USB Serial/JTAG capability is part of the ESP32-C3 chip, but on
this DevKitC-02 board the normal Micro-USB connector is documented as the
USB-to-UART bridge path. The header exposes `GPIO18` as USB D- and `GPIO19`
as USB D+.

So for this board, native USB Serial/JTAG is not available through the onboard
Micro-USB connector. Testing it requires bringing `GPIO18` / `GPIO19` out to a
separate USB D-/D+ harness connection.

Expected normal mode:

| Mode | Host connection | Target path | Harness impact | Purpose |
|---|---|---|---|---|
| `C3_UART0_REPL` | board Micro-USB | USB-UART bridge to UART0 on `GPIO20` / `GPIO21` | reserve `GPIO20` / `GPIO21` | normal REPL, flashing, saved-test runner |

Native USB Serial/JTAG modes:

| Mode | Host connection | Target path | Harness impact | Purpose |
|---|---|---|---|---|
| `C3_USB_SERIAL_JTAG_CONSOLE` | separate USB D+/D- harness connection | native USB Serial/JTAG on `GPIO18` / `GPIO19` | reserve `GPIO18` / `GPIO19` and provide USB wiring | validate native USB serial console behavior |
| `C3_USB_SERIAL_JTAG_FLASH` | separate USB D+/D- harness connection | native USB Serial/JTAG download/debug path | reserve `GPIO18` / `GPIO19` and provide USB wiring | validate flashing or monitor path through native USB/JTAG |
| `C3_DUAL_CONNECTION_OBSERVE` | board Micro-USB plus native USB D+/D- harness connection | UART0 plus native USB Serial/JTAG | reserve `GPIO18` / `GPIO19` and `GPIO20` / `GPIO21` | compare console behavior and recovery paths |
| `C3_USB_SERIAL_JTAG_CONTROL_UART0_UART1_CROSSLINK` | separate USB D+/D- harness connection | native USB Serial/JTAG controls runner; UART1 on `GPIO3` / `GPIO4` crossed to UART0 on `GPIO20` / `GPIO21` | fit `SEL_D3`, `SEL_D4`, and both `SEL_UART0_UART1` shunts; do not use board USB-UART as runner control | validate UART0/UART1 serial API behavior without an external USB-UART peer |

Harness implication:

- Native USB Serial/JTAG testing is a phase-one bring-up requirement for the
  C3 harness.
- `GPIO18` and `GPIO19` should be reserved by default for native USB D-/D+.
- If `GPIO18` and `GPIO19` are made available to any peripheral block, that
  must be through explicit jumpers and must default back to native USB.
- The harness should provide a stable USB D-/D+ connection for native USB
  Serial/JTAG from the first build.
- If both UART0 and native USB Serial/JTAG are reserved at once, the C3 GPIO
  budget becomes tight enough that some peripheral tests must move to alternate
  harness modes.
- Schematic v1.1 deliberately borrows `GPIO20` / `GPIO21` only through
  `SEL_UART0_UART1`, allowing UART0/UART1 crosslink testing while native USB
  Serial/JTAG remains the runner/control path.

## Proposed Harness Connectivity Blocks

Add a small connectivity area to each harness board:

| Block | Classic ESP32 use | ESP32-C3 use |
|---|---|---|
| Main board USB | UART0 REPL/flashing | UART0 REPL/flashing through USB-UART bridge |
| External USB-UART header | optional peer serial / second UART | not required for v1.1 UART crosslink; optional future peer serial |
| Native USB D+/D- header | not used on classic ESP32 | USB Serial/JTAG on `GPIO18` / `GPIO19` |
| Reset access | reset/reconnect tests | reset/reconnect tests |
| Boot/download access | flashing tests | flashing tests, plus native USB Serial/JTAG boot checks |
| Automation header | optional reset/boot/power control | reset/boot/power control from phase one |

The wirewrap harness should make these modes visible and deliberate:

- labelled jumpers for native USB D+ and D-
- labelled disconnects where GPIO18/GPIO19 also feed peripheral blocks
- labelled UART0 reservation near the DUT socket
- a visible selector-controlled UART crosslink area; optional future place to
  connect an external USB-UART adapter for peer serial tests
- reset and boot-button access that remains reachable with the DUT installed
- provision for repeatable automation of reset, boot/download selection, and
  eventually controlled power cycling

## Runner Consequences

The host runner should eventually understand a connectivity profile, not just
a serial port path.

Candidate profile fields:

| Field | Meaning |
|---|---|
| `control_port` | REPL/control serial device |
| `control_kind` | `uart_bridge`, `usb_serial_jtag`, or later another transport |
| `peer_port` | optional second serial device |
| `reset_strategy` | `soft_reset`, `serial_reopen`, `manual`, or later controlled power |
| `flash_strategy` | `uart0_esptool`, `usb_serial_jtag_esptool`, or manual |
| `reserved_pins` | pins unavailable to the hardware harness in this mode |

This lets the same saved tests run under different connectivity modes where
that makes sense, while connectivity-specific tests can prove each path in its
own right.

Runner design remains to be defined, but the hardware should assume repeatable
automation from the beginning rather than relying on a permanently manual
reset/boot procedure.

Harness mode selection is expected to be manual. The runner should display the
required connectivity/peripheral mode, list the jumper/link positions needed
for that mode, and wait for the operator to confirm that the harness is ready.

## Open Decisions

Settled for phase one:

1. The ESP32-C3 harness shall include a proper USB D+/D- connection for native
   USB Serial/JTAG testing from the first build.
2. C3 `GPIO18` / `GPIO19` are native-USB pins by default, not general
   peripheral-test pins.
3. Native USB Serial/JTAG tests are phase-one bring-up tests.
4. Reset/boot automation should be designed into the initial harness.

Still open:

1. Define how the runner distinguishes normal UART0 REPL from native USB
   Serial/JTAG REPL.
2. Define the exact automation interface for reset, boot/download mode, and
   controlled power cycling.
3. Define runner prompts and confirmation for manual harness mode changes.
4. Decide whether any later C3 peripheral alternate mode is allowed to borrow
   `GPIO18` / `GPIO19`, and if so define the jumper positions and warnings.
