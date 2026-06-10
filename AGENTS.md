# Agent Notes

This repo designs and develops ESP32-family Espruino hardware test harnesses.

Start by reading:

- `docs/codex_handoff_2026-06-10.md`
- `docs/wiring_esp32_c3_devkitc_02.md`
- `docs/harness_modes.md`
- `docs/gpio_rationalisation.md`

Current active hardware focus:

- ESP32-C3-DevKitC-02 harness
- KiCad project: `KICAD/ESP32_C3_v1/`
- schematic/PCB revision: v1.1
- initial wirewrap build is complete except deferred UART and automation areas

Important ESP32-C3 notes:

- Use Espruino `Dxx` pin names in tests, matching GPIO numbers.
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
