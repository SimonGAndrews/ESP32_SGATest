# ESP32-C3-DevKitC-02 V2 GPIO Allocation And Routing Design

**Status:** Provisional design study
**Last Updated:** 8 July 2026

## Purpose

This document captures the current ESP32-C3-DevKitC-02 rationalisation for the
V2 Espruino test harness and provides enough detail to guide purchase and
construction of an initial routing prototype.

It is the design-phase equivalent of the V1 target wiring document at
`docs/targets/esp32-c3-devkitc-02/wiring.md`, but it is not yet a wiring
specification. No schematic, PCB, switch register map or final bill of materials
has been approved.

The V1 harness remains the active bench and functional-test platform. This V2
study deliberately starts the C3 allocation again rather than treating the V1
manual selector wiring as fixed.

## Current Working Assumptions

The current prototype direction is:

* the DUT controls its own Routing Layer
* route selection is performed from the Espruino test script
* a reusable Espruino harness module may be stored in flash
* one permanently connected I2C bus serves a dedicated MCP23017 routing
  controller and a separate MCP23008 functional test device
* the MCP23008 retains the proven V1 I2C register, feedback and interrupt test
  role without access to the route-control signals
* route selection must be instrumented with write/readback evidence so an I2C
  control failure is identified before dependent tests run
* the Routing Layer implements only approved target-to-resource routes, not an
  arbitrary crosspoint matrix
* routes default to a boot-safe disconnected state

These are working assumptions for prototype evaluation, not final architecture
decisions.

## Board-Level Evidence

Local board references are held under
`docs/targets/esp32-c3-devkitc-02/Resources/`.

Review of `SCH_ESP32-C3-DEVKITC-02_V1_1_20210126A.pdf` confirms:

* the board Micro-USB data pair is routed through fitted zero-ohm links to the
  CP2102N USB-to-UART bridge
* alternative zero-ohm links from that connector to GPIO18/GPIO19 are marked
  not fitted
* the normal board console path is therefore CP2102N to UART0 on GPIO20/GPIO21
* GPIO18/GPIO19 remain available on the headers for the harness native USB
  Serial/JTAG connector
* GPIO20/GPIO21 remain electrically connected to the CP2102N UART through
  fitted zero-ohm links
* GPIO8 has both a 10 kohm pull-up and a fitted zero-ohm connection to the
  addressable RGB LED data input
* GPIO9 is connected to the BOOT button and CP2102N automatic-download circuit

Hardware path and firmware behavior remain separate evidence. Initial Espruino
bring-up uses the board CP2102N/UART0 path with `ESPR_USE_USB_SERIAL_JTAG`
disabled. Native USB Serial/JTAG is a separate test path through the harness
connector on GPIO18/GPIO19.

## Exposed GPIO Inventory

The ESP32-C3-DevKitC-02 exposes 15 GPIOs on its headers.

| GPIO | Relevant capability or board use | V2 classification |
|---:|---|---|
| `D0` | ADC1 channel 0 | available |
| `D1` | ADC1 channel 1 | available |
| `D2` | ADC1 channel 2; strapping pin | conditional; route disconnected at reset |
| `D3` | ADC1 channel 3 | available |
| `D4` | ADC1 channel 4; external JTAG function | available when external JTAG is unused |
| `D5` | ADC2 channel 0; external JTAG function | available when external JTAG is unused |
| `D6` | external JTAG function | available when external JTAG is unused |
| `D7` | external JTAG function | available when external JTAG is unused |
| `D8` | strapping pin; RGB LED and board pull-up | reserved from normal routed blocks |
| `D9` | strapping pin; BOOT and auto-download | reserved |
| `D10` | general GPIO | available |
| `D18` | native USB D- | reserved, fixed harness connection |
| `D19` | native USB D+ | reserved, fixed harness connection |
| `D20` | UART0 RX through CP2102N | reserved/conditional UART test use |
| `D21` | UART0 TX through CP2102N | reserved/conditional UART test use |

GPIO11 is not exposed and is associated with `VDD_SPI`. GPIO12-GPIO17 are used
for module flash and are not harness resources.

## Provisional Fixed Allocation

| GPIO | Fixed V2 role | Reason |
|---:|---|---|
| `D6` | permanent harness I2C SCL | serves MCP23017 and MCP23008; non-strapping |
| `D7` | permanent harness I2C SDA | serves MCP23017 and MCP23008; non-strapping |
| `D9` | BOOT/download control | board-defined role |
| `D18` | native USB Serial/JTAG D- | fixed harness connector |
| `D19` | native USB Serial/JTAG D+ | fixed harness connector |
| `D20` | UART0 RX | board CP2102N path; crosslink use is conditional |
| `D21` | UART0 TX | board CP2102N path; crosslink use is conditional |

Using D6/D7 for permanent I2C gives up external four-wire JTAG on those pins.
Native USB Serial/JTAG on D18/D19 remains available.

The control bus must never pass through the Routing Layer. Tests may disrupt or
reconfigure I2C only if they first establish the required route and define a
recoverable return path.

## Provisional Routed GPIO Roles

| GPIO | Candidate routed roles |
|---:|---|
| `D0` | target ADC input; OneWire DQ |
| `D1` | GPIO loop A output; SPI MISO |
| `D2` | MCP23008 feedback input; DS2413 PIO feedback input |
| `D3` | GPIO loop B output; SPI MOSI; UART1 TX |
| `D4` | GPIO loop B input; SPI SCK; UART1 RX |
| `D5` | PWM output; MCP3008 chip select |
| `D10` | GPIO loop A input; MCP23008 interrupt; SPI flash chip select; DS2413 PIO feedback input |

GPIO8 is intentionally omitted from ordinary block allocation because its
strapping, pull-up and RGB LED connections introduce avoidable boot and load
conditions.

## Provisional Mode Map

| GPIO | GPIO loopback | Analog/PWM | I2C functional | SPI | OneWire/DS2413 | UART crosslink |
|---:|---|---|---|---|---|---|
| `D0` | - | ADC input | - | - | DQ | - |
| `D1` | loop A output | - | - | MISO | - | - |
| `D2` | - | - | feedback input | - | PIOA feedback | - |
| `D3` | loop B output | - | - | MOSI | - | UART1 TX |
| `D4` | loop B input | - | - | SCK | - | UART1 RX |
| `D5` | - | PWM output | - | MCP3008 CS | - | - |
| `D6` | control SCL | control SCL | control SCL | control SCL | control SCL | control SCL |
| `D7` | control SDA | control SDA | control SDA | control SDA | control SDA | control SDA |
| `D10` | loop A input | - | interrupt input | flash CS | PIOB feedback | - |

The intended GPIO loopbacks are:

```text
D1  -> 470R -> D10
D3  -> 470R -> D4
```

The intended analog path is:

```text
D5 -> 10k -> ANALOG_FB -> D0
                      -> MCP3008 CH0
```

Here `D5` is the routed PWM drive choice for the analog path. In SPI mode the
same GPIO is instead assigned to `MCP3008_CS`, so these are alternative routed
roles rather than simultaneous fixed connections.

The intended SPI allocation is:

```text
MISO=D1  MOSI=D3  SCK=D4  MCP3008_CS=D5  FLASH_CS=D10
```

## UART0/UART1 Crosslink

UART crosslink mode uses native USB Serial/JTAG on D18/D19 as the runner and
connects:

```text
D3  UART1 TX -> 470R -> D20 UART0 RX
D21 UART0 TX -> 470R -> D4  UART1 RX
```

Because D20/D21 remain physically attached to the onboard CP2102N, the current
operator precondition is:

* unplug the board Micro-USB connector
* connect the native USB Serial/JTAG harness connector on D18/D19
* provide power through the explicitly selected harness supply path

The current tests have no mechanism to confirm that the board USB cable is
unplugged. This remains an unverified mode instruction that must be recorded in
test evidence. Automated route selection does not remove this external
precondition.

## Separate Routing And Functional I2C Devices

The current concept uses two devices on the same permanent D6/D7 I2C bus:

| Address | Device | Role |
|---:|---|---|
| `0x20` | MCP23008 | proven V1 functional register, feedback and interrupt tests |
| `0x27` | MCP23017 | routing control only |

The addresses are provisional but illustrate the intended separation. Address
pins must be explicitly strapped in hardware.

This arrangement does not consume additional DUT GPIO and prevents functional
I2C tests from overwriting route-control direction or output registers. Tests
that deliberately unsetup or disrupt the shared physical I2C bus still make
both devices temporarily inaccessible, but the MCP23017 retains its latched
route state while the DUT restores the bus.

Every route request must write, read back and report the MCP23017 control state.
Functional MCP23008 tests should verify that the routing controller remains
reachable and unchanged after disruptive bus operations.

A routing-control failure should be reported once as the root failure. Tests
that depend on an unavailable route should be skipped rather than producing a
series of misleading peripheral failures.

## Switch Prototype Direction

The current hand-solderable candidate is the Vishay `DG409LE`, a dual 4:1
bidirectional analog multiplexer. The exact low-voltage `LE` variant is
required; generic older DG409 variants may require at least a 5 V supply.

Preferred prototype package:

```text
DG409LEDY-GE3  SOIC-16
```

SOIC-16 is preferred over TSSOP-16 and QFN-16 for manual assembly and
inspection.

Provisional grouping:

| Device | Routed DUT pins | Principal mode grouping |
|---|---|---|
| DG409LE 1 | `D3`, `D4` | GPIO loopback / SPI / UART |
| DG409LE 2 | `D1`, `D10` | GPIO loopback / SPI / I2C or DS2413 feedback |
| DG409LE 3 | `D0`, `D5` | analog / OneWire / SPI chip select |
| DG409LE 4 | `D2`, spare channel | I2C or DS2413 feedback / prototype expansion |

The four devices may share address lines if the physical input numbering is
arranged around whole harness modes. Independent enables allow only the device
pairs needed by a mode to be connected. A candidate control budget is:

```text
2 shared DG409 address bits
4 DG409 enable bits
2 spare control bits
```

This fits one eight-bit MCP23017 bank, but the route truth table must be proven
before it is treated as final.

The `TMUX1204` is not currently required for the C3 prototype. It remains an
alternative where independent per-GPIO 4:1 routing is more important than
package simplicity or chip count.

## Reset-Safe Requirements

The prototype must demonstrate all of the following before the design is
promoted to a wiring specification:

* strapping pins are not driven or externally biased during reset
* all routed signal paths have a deterministic disconnected reset state
* MCP23017 reset and power-up behavior cannot briefly enable an unsafe route
* changing a mux address cannot momentarily connect conflicting resources
* software disables affected routes before changing address bits
* the permanent control I2C bus remains reachable in every non-destructive mode
* manual bypass or test points allow routing faults to be distinguished from
  DUT firmware faults

## Prototype Purchase Direction

The immediate purchase objective is evaluation, not a final production BOM.
Appendix A records the current order list, supporting parts and the electrical
qualification that remains necessary. Availability and supplier stock should
be checked immediately before ordering.

## Open Decisions

The following items are not settled:

* final MCP23017 package, I2C address and control-register allocation
* confirmation of the MCP23008 and MCP23017 address straps
* whether MCP23017 reset is tied directly to DUT reset or controlled separately
* exact DG409LE mode/address truth table
* exact reset and address bias network for every switch
* whether routing switch resistance and capacitance are acceptable for SPI,
  OneWire, UART and ADC tests at the intended rates
* whether a later V2 revision senses board Micro-USB VBUS to verify the UART
  crosslink precondition
* Espruino module API, route naming and flash-storage mechanism
* target-profile changes required to run the existing MCP23008 tests on D6/D7
* final schematic, prototype test plan and evidence format

## Promotion Criteria

This target study can become a target wiring specification only after:

1. the GPIO allocation and legal mode combinations are reviewed
2. the switch truth table and reset defaults are fixed
3. representative GPIO, ADC, I2C, SPI, OneWire and UART signals pass through
   the prototype successfully
4. routing failures can be distinguished from DUT peripheral failures
5. a schematic and reproducible wiring definition exist

## Appendix A: Initial Routing Prototype Order

This appendix records the prototype purchase position on 8 July 2026. It is an
evaluation order, not a final V2 bill of materials.

### Core Devices

| Quantity | Manufacturer part | Package | Prototype purpose |
|---:|---|---|---|
| 2 | `MCP23017-E/SP` | SPDIP-28 | one routing controller and one spare |
| 2 | `MCP23008-E/P` | PDIP-18 | one proven V1-compatible functional I2C device and one spare |
| 6 | `DG409LEDY-GE3` | SOIC-16 | four routing devices and two spares |
| 6 | `TMUX1204DGSR` | VSSOP/MSOP-10, 0.5 mm pitch | independent 4:1 comparison devices |
| 8 | SOIC-16 to 2.54 mm adapter | adapter board | DG409LE plugboard assembly plus spares |
| 6 or more | MSOP-10 to 2.54 mm adapter | adapter board | TMUX1204 plugboard assembly |
| 2 | 28-pin 0.3 inch DIP socket | through-hole | MCP23017 sockets |
| 2 | 18-pin 0.3 inch DIP socket | through-hole | MCP23008 sockets |

The MCP23017 and MCP23008 through-hole variants were listed in stock by UK
distributors when this appendix was written:

* [MCP23017-E/SP at Mouser UK](https://www.mouser.co.uk/ProductDetail/Microchip-Technology/MCP23017-E-SP)
* [MCP23008-E/P at DigiKey UK](https://www.digikey.co.uk/en/products/detail/microchip-technology/MCP23008-E-P/735951)
* [DG409LEDY-GE3 stock listing](https://www.newark.com/vishay/dg409ledy-ge3/analogue-mux-dual-4-channel-soic/dp/24AC4670)
* [TMUX1204DGSR at Mouser UK](https://www.mouser.co.uk/ProductDetail/Texas-Instruments/TMUX1204DGSR?qs=EBDBlbfErPw42Q0DdvAwUg%3D%3D)

Stock information is transient and must be rechecked when the order is placed.

### TMUX1204 Comparison Parts And Adapters

Six `TMUX1204DGSR` devices are included as comparison parts. They are not yet a
replacement for the DG409LE mode-paired design. Their purpose is to evaluate a
lower-resistance, independently enabled 4:1 route for signal classes where the
DG409LE's 3.3 V resistance or grouped-channel topology proves limiting.

The ordered `DGSR` suffix is tape-and-reel packaging of TI's `DGS` 10-pin
VSSOP package. Distributor listings may describe it as MSOP-10. It has 0.5 mm
lead pitch and requires an appropriate fine-pitch adapter for plugboard use.

The local adapter reference is
[19000_small_outline_prototyping_adapters.pdf](./19000_small_outline_prototyping_adapters.pdf).
Its ordering table identifies `LCQT-MSOP10` as the 10-pad, 0.020 inch / 0.5 mm
pitch adapter. The adapter footprint dimensions must still be checked against
the TI `DGS` package drawing before purchase; matching the pin count and pitch
alone is not sufficient.

The comparison should record at least:

* GPIO and UART behavior through both switch families
* OneWire rise time and discovery reliability
* SPI edge shape and maximum reliable test rate
* ADC offset and settling behavior
* power-up isolation and enable behavior
* construction and rework effort for SOIC-16 versus VSSOP-10

### Supporting Components

The initial order should include enough passives and links for rework:

* 20 or more 100 nF ceramic capacitors for IC decoupling and analog filtering
* 10 or more 4.7 kohm resistors for I2C and open-drain pull-ups
* 20 or more 10 kohm resistors for reset, enable, address and analog-filter use
* 20 or more 470 ohm resistors for protected loopback and UART paths
* zero-ohm links or removable shunts for bypass and isolation
* 2.54 mm headers, sockets and labelled test points

Each MCP and DG409LE requires local decoupling. The bus should have one
deliberately placed SDA/SCL pull-up pair rather than accumulating module-side
pull-ups unintentionally.

### DG409LE Control And Reset State

The DG409LE truth table defines `EN=0` as all switches off and `EN=1` as the
addressed channels on. Each enable should therefore have a hardware pull-down
so the associated routes remain disconnected while the MCP23017 is in reset or
its outputs are high impedance.

The device supports a 3 V to 16 V single supply and its address and enable
inputs accept 3 V logic. The exact `LE` low-voltage variant is required. See the
[Vishay DG408LE/DG409LE datasheet](https://www.vishay.com/doc?78084=).

### DG409LE On-Resistance At Harness Voltage

The headline 17 ohm typical resistance applies under higher-supply test
conditions and must not be used as the 3.3 V design value. In the datasheet's
3 V single-supply specification, with a 2.7 V minimum supply, the DG409LE is
specified at approximately:

* 63 ohm typical
* 80 ohm maximum at room temperature
* 92 ohm maximum across the specified temperature range

This resistance is expected to be tolerable for the first prototype:

* it is small relative to the 4.7 kohm OneWire pull-up
* it adds to the intentional 470 ohm GPIO and UART protection paths
* ADC and ordinary digital inputs are high impedance
* switch capacitance and edge behavior, rather than DC voltage drop, are likely
  to be the more important SPI limitation

This remains a test hypothesis. The prototype must measure SPI edge quality and
exercise OneWire, UART, ADC and GPIO behavior before DG409LE is accepted as the
final V2 switch family.
