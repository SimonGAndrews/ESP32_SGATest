# ESP32 DevKitC V4 Espruino Test Harness

Top-level revision: v1.0

The active KiCad 9 project is:

```text
ESP32_V1.kicad_pro
ESP32_V1.kicad_sch
```

`ESP32_V1.sch` and `ESP32_V1.pro` are retained as the original import source.

Design notes and the authoritative GPIO table are in:

```text
../../docs/wiring_esp32_devkitc_v4.md
```

The UART test block crosses UART1 and UART2 while UART0 remains available for
the REPL. `SEL_D35` selects D35 between MCP23008 interrupt input and UART1 RX.
