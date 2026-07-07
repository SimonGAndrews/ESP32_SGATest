# Agent Notes

This repo designs and develops ESP32-family Espruino hardware test harnesses.

Start by reading:

- `README.md`
- `docs/handoff/2026-06-25-esp32-family-tests.md`
- `docs/handoff/2026-07-01-espruino-repo-structure.md`
- `docs/design/V2Harness/README.md`
- `docs/README.md`
- `docs/handoff/2026-06-10.md`
- `docs/handoff/2026-06-16-onewire-idf4-idf5.md`
- `docs/design/common-harness-design-and-blocks.md`
- `docs/targets/esp32-c3-devkitc-02/wiring.md`
- `docs/targets/esp32-devkitc-v4/wiring.md`
- `docs/design/harness-modes.md`

Current active hardware focus:

- generic ESP32-family Espruino harness tests and runners
- ESP32-C3-DevKitC-02 harness, KiCad project `KICAD/ESP32_C3_v1/`,
  schematic/PCB revision v1.1
- classic ESP32 DevKitC V4 harness, KiCad project `KICAD/ESP32_V1/`,
  wirewrap-built with scripted wiring checks completed

V2 architecture note:

- `docs/design/V2Harness/` is an architecture-only parallel workstream at
  present
- active shared test development, bench regression work, and harness refinement
  remain focused on the V1 harnesses

Important generic test notes:

- Use Espruino `Dxx` pin names in tests, matching GPIO numbers.
- Treat selector/jumper state as part of every test precondition.
- Keep hardware proof separate from firmware proof: continuity/static REPL
  checks come before firmware conclusions.
- Do not run multiple REPL tools concurrently against the same serial port.
- Preserve board name, Espruino version, serial port, firmware build
  provenance, and harness mode/selector state in test evidence.
- Prefer a common logical test runner with target-specific pin/mode maps over
  copying whole scripts for each ESP32-family target.

Important ESP32-C3 notes:

- `D18` / `D19` are native USB Serial/JTAG and are fixed to the harness USB
  Serial/JTAG connector.
- `D20` / `D21` are UART0 and are reserved by default for board USB-UART
  REPL/flashing.
- Do not assume `D20` / `D21` are never wired: they are deliberately available
  through `J10` / `SEL_UART0_UART1` for UART0/UART1 crosslink or external UART
  access.
- `J10` / `SEL_UART0_UART1` is a 2x3 UART connector/selector, not just a simple
  shunt block. Two columns are UART crosslink signal shunts; the third column is
  GND for external UART access.
- UART0/UART1 crosslink testing should use native USB Serial/JTAG as the
  runner/control path, because UART0 is under test.
- `J_Auto` is only a provision until external reset/boot control hardware is
  wired.

Bring-up context:

- Initial flashing is expected to use a known-good custom Espruino build with
  `ESPR_USE_USB_SERIAL_JTAG` disabled/commented out.
- Expected first console path is board USB-UART.
- Native USB Serial/JTAG, UART0/UART1 crosslink, and automation tests are
  deferred until their hardware paths are wired and proven.

Important classic ESP32 DevKitC V4 / ESP32_V1 notes:

- UART0 `D1` / `D3` is reserved for the board USB-UART REPL/flashing/control
  path.
- UART testing uses UART1/UART2 crosslink instead:
  `D4 -> JP_UART_LOOP2 -> D36` and `D14 -> SEL_D35 -> D35`.
- `D35` is shared between MCP23008 interrupt and UART1 RX via `SEL_D35`.
- `D33` and `D26` can be normal loopback inputs or DS2413 PIO feedback inputs
  via selectors.
- `D0` is reserved for BOOT/download control.
- `D2`, `D5`, `D12`, and `D15` are strapping pins; avoid fixed harness loads.
- `D6`-`D11` are module SPI-flash signals; do not use.
- `D34`-`D39` are input-only and lack internal pull-up/down.
