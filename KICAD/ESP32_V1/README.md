# ESP32 DevKitC V4 Espruino Test Harness

Top-level revision: v1.0

The active KiCad 9 project is:

```text
ESP32_V1.kicad_pro
ESP32_V1.kicad_sch
ESP32_V1.pretty/
fp-lib-table
```

`ESP32_V1.sch` and `ESP32_V1.pro` are retained as the original import source.

`ESP32_V1.pretty` is the project-local footprint library. It contains copies
of the proven ESP32-C3 harness footprints needed by this board, plus the
DevKitC V4 1x19 sockets and DS18B20 TO-92 footprint. The DS2413 breakout uses
a 1x04 female socket on the harness PCB and downward-facing male pins on the
removable breakout. Project-local footprints should use the `ESP32_V1:`
footprint-library prefix where available so the project remains portable.

Design notes and the authoritative GPIO table are in:

```text
../../docs/wiring_esp32_devkitc_v4.md
```

The UART test block crosses UART1 and UART2 while UART0 remains available for
the REPL. `SEL_D35` selects D35 between MCP23008 interrupt input and UART1 RX.

## Footprint Policy

| Component group | Footprint approach |
|---|---|
| DevKitC V4 | two `PinSocket_1x19_P2.54mm_Vertical` rows |
| MCP3008 / MCP23008 | DIP-16 / DIP-18 socket footprints |
| DS18B20 | `TO-92_Inline` |
| DS2413 breakout | vertical 1x04, 2.54 mm female pin socket |
| Resistors | vertical 5.08 mm pitch |
| External wiring | 2.54 mm terminal blocks |
| Jumpers/selectors | 2.54 mm pin headers |
| Optional flash | 1x06 pin socket |
| Grove I2C | Seeed Grove 1x04, 2 mm pitch |

Before fixing the PCB placement, verify the centre-to-centre spacing and
orientation of the two 19-pin DevKitC socket rows against the physical DUT.
The PCB silkscreen should then add the complete DevKitC body outline, antenna
end, USB end, and pin-1/orientation marks.

The intended PCB is a wirewrap placement/silkscreen guide. Copper routing is
not required for the first pass; ratsnest/net information remains useful for
checking point-to-point wirewrap connections.

## DS2413 OneWire GPIO Test

`J_DS2413` accepts a removable DS2413 two-channel open-drain GPIO breakout on
the existing `D13_ONEWIRE_DQ` bus:

| `J_DS2413` pin | Signal |
|---:|---|
| 1 | `DS2413_PIOB` |
| 2 | `DS2413_PIOA` |
| 3 | `D13_ONEWIRE_DQ` |
| 4 | GND |

`DS2413_PIOA` and `DS2413_PIOB` each have a 4.7 kΩ pull-up to 3.3 V. The
breakout is parasite-powered from the OneWire data connection and ground.

`SEL_D33` selects whether `D33` receives the normal `D32` loopback or
`DS2413_PIOA`. `SEL_D26` similarly selects the normal `D25` loopback or
`DS2413_PIOB`. A single 470 Ω resistor in each selector common path protects
the ESP32 input:

```text
D33 <- 470R <- SEL_D33 <- D32 or DS2413_PIOA
D26 <- 470R <- SEL_D26 <- D25 or DS2413_PIOB
```

Fit only one shunt position on each selector. Mark pin 1 and the breakout
orientation clearly on the PCB silkscreen.

## Prototype Board Geometry

`ESP32_V1.kicad_pcb` includes the same substrate guide used by the ESP32-C3
harness:

- 90 mm x 70 mm board outline
- 31 x 26 guide-hole grid at 2.54 mm pitch on `Dwgs.User`
- four measured 1 mm NPTH mounting holes

The guide circles are locked. They represent the plated-through prototype
board hole pattern and are not PCB drill holes. Keep `Dwgs.User` visible while
placing footprints, and include it only when producing the construction-guide
printout.
