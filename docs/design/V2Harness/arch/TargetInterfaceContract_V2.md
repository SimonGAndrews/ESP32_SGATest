# V2 Target Interface Contract

**Status:** Accepted — Two-Connector 48-Pin Pinout Fixed; Exact Connector Parts Pending

**Version:** 1.0

**Last Updated:** 7 August 2026

## 1. Conclusion

The accepted Target Interface uses two 24-pin connectors on each board. Each
connector has two rows of 12 pins, giving 48 pins per board. Thirty-two pins
carry signals and controls, four carry power — two for 3.3 V and two for 5 V —
and twelve are ground.

Those 32 signal and control pins provide:

* seven reusable route pins, R0-R6
* 23 direct connections to the Standard Test Blocks
* direct reset and boot-control pins

The pinout covers every connection required by the accepted V2 architecture.
Section 7 shows what is connected to every pin, how Connector A and Connector B
mate and how the Breakaway Links join the boards before separation.

The exact male and female connector parts, plating and PCB footprints still
need to be selected and checked before the Rev-A PCB is released.

## 2. What This Document Defines

This document defines the wires that cross between the reusable harness board
and a removable target daughter board. It also gives each wire a pin on
Connector A or Connector B.

The pinout is based on:

* `StandardTestBlocks_V2.md`
* `StandardControlServices_V2.md`
* `TargetRoutingEnvelope_V2.md`
* `CombinedCapabilityConnectionMatrix_V2.md`
* `I2CControlledRouting_V2.md`
* `HybridHarnessArchitecture_V2.md`

Every daughter board must use this same pinout. A pin may carry one listed
function, a duplicated power connection or ground. There are no unassigned
spare pins in the accepted 48-pin arrangement.

## 3. Signals And Power On The Connectors

### 3.1 Reusable Route Pins

R0-R6 are seven connector pins that feed the Routing Fabric on the reusable
harness. The daughter board wires a suitable target GPIO to each route pin
used by that target.

| Route pin | It can be switched to | How the target uses it | Electrical type |
|---|---|---|---|
| R0 | `TI_ANALOG_ADC_IN`; `TI_ONEWIRE_DQ` | Analogue input or bidirectional open-drain | Bidirectional analogue-capable 0 V to 3.3 V |
| R1 | `TI_GPIO_LOOP_A_OUT`; `TI_SPI_MISO` | Output or input | Bidirectional 3.3 V digital |
| R2 | `TI_GPIO_LOOP_A_IN`; `TI_I2C_FB`; `TI_SPI_CS_ADC`; `TI_ONEWIRE_GPIO_A_FB` | Input or output | Bidirectional 3.3 V digital |
| R3 | `TI_GPIO_LOOP_B_OUT`; `TI_SPI_MOSI`; `TI_UART_A_TX` | Output | 3.3 V digital output |
| R4 | `TI_SPI_SCK`; `TI_UART_A_RX` | Output or input | Bidirectional 3.3 V digital |
| R5 | `TI_ANALOG_PWM_OUT`; `TI_RGB_DATA` | Output | 3.3 V digital waveform |
| R6 | `TI_GPIO_LOOP_B_IN`; `TI_I2C_INT`; `TI_SPI_CS_EXT`; `TI_ONEWIRE_GPIO_B_FB` | Input or output | Bidirectional 3.3 V digital |

All seven route pins are present on every harness. A daughter board may leave
one unconnected only when that target provides the required test connection by
a documented direct connection instead.

### 3.2 Direct Standard Test Block Pins

The connectors provide 23 pins that wire directly to the Standard Test Blocks.
A target with enough GPIO can use these direct pins. A target with fewer GPIO
can use R0-R6 and the Routing Fabric instead. The direction in the table is
shown from the target's point of view.

| Pin function | Test Block | Target direction | Connection |
|---|---:|---|---|
| `TI_GPIO_LOOP_A_OUT` | 1 | Output | Dedicated Test Block pin |
| `TI_GPIO_LOOP_A_IN` | 1 | Input | Dedicated Test Block pin |
| `TI_GPIO_LOOP_B_OUT` | 1 | Output | Dedicated Test Block pin |
| `TI_GPIO_LOOP_B_IN` | 1 | Input | Dedicated Test Block pin |
| `TI_ANALOG_PWM_OUT` | 2 | Output | Dedicated Test Block pin |
| `TI_ANALOG_ADC_IN` | 2 | Analogue input | Dedicated Test Block pin |
| `TI_I2C_SDA` | 3 | Bidirectional open-drain | Direct shared I2C bus |
| `TI_I2C_SCL` | 3 | Bidirectional open-drain | Direct shared I2C bus |
| `TI_I2C_FB` | 3 | Input | Dedicated Test Block pin |
| `TI_I2C_INT` | 3 | Input | Dedicated Test Block pin |
| `TI_SPI_SCK` | 4 | Output | Dedicated Test Block pin |
| `TI_SPI_MOSI` | 4 | Output | Dedicated Test Block pin |
| `TI_SPI_MISO` | 4 | Input | Dedicated Test Block pin |
| `TI_SPI_CS_ADC` | 4 | Output | Dedicated Test Block pin |
| `TI_SPI_CS_EXT` | 4 | Output | Dedicated Test Block pin |
| `TI_ONEWIRE_DQ` | 5 | Bidirectional open-drain | Dedicated Test Block pin |
| `TI_ONEWIRE_GPIO_A_FB` | 5 | Input | Dedicated Test Block pin |
| `TI_ONEWIRE_GPIO_B_FB` | 5 | Input | Dedicated Test Block pin |
| `TI_UART_A_TX` | 7 | Output | Dedicated Test Block pin |
| `TI_UART_A_RX` | 7 | Input | Dedicated Test Block pin |
| `TI_UART_B_TX` | 7 | Output | Dedicated Test Block pin |
| `TI_UART_B_RX` | 7 | Input | Dedicated Test Block pin |
| `TI_RGB_DATA` | 9 | Output | Dedicated Test Block pin |

The harness provides every pin in this table, but a daughter board does not
have to connect all of them. Its schematic and Target Profile must show which
functions are wired directly, wired through R0-R6 or left unconnected. The
direct and routed versions of the same function must never be enabled together.

### 3.3 Power, Reset And Boot Pins

| Pin function | Direction | What it does | Wiring rule |
|---|---|---|---|
| `TI_TARGET_3V3` | Target to harness | Powers the routing and Test Block logic in `STANDALONE` and provides the target's 3.3 V I/O reference | Shall remain between 3.00 V and 3.60 V at the Target Interface under the accepted harness load; must never power the target or be connected to the external harness 3.3 V supply |
| `TI_SWITCHED_TARGET_5V` | Harness to daughter board | Supplies switched 5 V to the target in Supervisor operation | The daughter board must not connect it to another live supply |
| `TI_TARGET_RESET_N` | Harness to target | Pulls the target reset input low | Must normally be released and must not depend on I2C or the Routing Fabric |
| `TI_BOOT_REQUEST` | Harness to target | Optionally pulls a target boot or recovery input low | A daughter board may leave it unconnected when the target has no safe equivalent |

A target profile that cannot maintain `TI_TARGET_3V3` at or above 3.00 V under
the accepted harness load shall not use `STANDALONE`; it shall use
`STANDALONE EXT` with the external regulated 3.3 V source. The 3.60 V maximum
also applies when `TI_TARGET_3V3` is used only as the target I/O-domain
reference.

The two power pins work in opposite directions: 3.3 V comes from the target,
while switched 5 V comes from the harness. Do not use either pin to send power
in the opposite direction.

### 3.4 Common Ground

All `TI_GND` pins are connected to the same 0 V ground on both boards. Multiple
ground pins spread the return current and place a nearby ground beside the
main signal groups.

The proposed pinout uses twelve ground pins across Connector A and Connector B.
They are placed near power, analogue, I2C, SPI, UART and the general digital
signals.

## 4. Why 34 Functions Need 48 Pins

The interface has 34 different functions:

| Function group | Pins |
|---|---:|
| Route pins R0-R6 | 7 |
| Direct Standard Test Block pins | 23 |
| 3.3 V and switched 5 V | 2 |
| Reset and boot control | 2 |
| **Different functions** | **34** |

The physical connectors use 48 pins because both power connections are
duplicated and twelve pins are ground. Using R0-R6 can reduce the number of
target GPIOs needed for a particular daughter board, but it does not remove
the direct Test Block pins from the standard connector.

## 5. Connections Handled Elsewhere

The following connections do not pass through Connector A or Connector B:

| Function | Where it connects instead |
|---|---|
| Target USB data, USB VBUS and USB No-VBUS | Target's onboard USB connector, a cable or a daughter-board Adapter Service |
| SWD, JTAG and target-specific debug | A target connector or daughter-board Adapter Service |
| UART CTS and RTS | A daughter-board Adapter Service when a target needs that test |
| Onboard USB-UART bridge isolation | Target-specific links, wiring or setup instructions |
| `SUP_EVENT_OUT` and `SUP_EVENT_IN` | The separate Supervisor Interface between the Rack Control Endpoint and Test Block 3 |
| Rack Control I2C | The Rack Control Backplane |
| Target Power Monitor I2C and shunt | Reusable-harness circuitry connected to the Rack Control Backplane |
| `ROUTE_CLEAR_N` and routing-controller controls | Internal reusable-harness wiring |
| External regulated 3.3 V and 5 V inputs | Harness power connectors |
| Target-specific VIN, VBAT, USB-OTG VBUS or other rails | A daughter-board Adapter Service where required |
| Target or daughter-board identity | Documentation and the Target Profile; no connector pin is currently required |

Adding one of these functions to a later Target Interface would require a
review of this pinout and the architecture documents that define the function.

## 6. Architecture Cross-Check

The pin list includes:

* all 23 target-facing connections from `StandardTestBlocks_V2.md`
* all seven route pins from `TargetRoutingEnvelope_V2.md`
* the direct I2C and second UART connections required by the combined matrix
* target 3.3 V, switched target 5 V, reset and optional boot from
  `StandardControlServices_V2.md`
* both the direct and routed wiring required by
  `HybridHarnessArchitecture_V2.md`
* the decision to handle CTS/RTS and the Target Power Monitor elsewhere

No currently accepted feature needs another connector pin.

## 7. Connector Pinout

### 7.1 Connector Arrangement

The Target Interface uses two 24-pin connectors, called Connector A and
Connector B. Each connector has two rows of 12 pins on a 2.54 mm pitch.
Right-angle through-hole parts allow the reusable harness and daughter board
to lie in the same plane.

This gives:

* 48 pins using only two connectors on each board
* a clear Connector A and Connector B in the schematic and PCB layout
* the option to use one male and one female connector to prevent mistakes
* fewer parts to buy and align than four smaller connectors

Possible right-angle sockets include the Samtec
`SSQ-112-02-T-D-RA` and `SSW-112-02-F-D-RA`. They demonstrate that a
standard connector family is available in the required shape.
Samtec identifies the TSW `-NA` header orientation for mating edge-to-edge in
the same plane with its SSW right-angle socket series:

* <https://suddendocs.samtec.com/catalog_english/tsw_th.pdf>

The exact male and female parts are not selected yet. Before PCB release we
must check that they mate with the boards in one plane, are available at an
acceptable cost and can safely carry the required current.

### 7.2 Pin Names And Orientation

Connector A pins are named `A01`-`A24`. Connector B pins are named
`B01`-`B24`. These names do not depend on a particular connector manufacturer.
The matching schematic connector pins are numbered 1-24.

Each connector has twelve columns of two pins. Looking into the mating face of
the harness-board connector, with the pin-1 end on the left, the pins are:

```text
Column:    1   2   3   4   5   6   7   8   9  10  11  12
Odd row:  01  03  05  07  09  11  13  15  17  19  21  23
Even row: 02  04  06  08  10  12  14  16  18  20  22  24
```

The daughter-board connector must be laid out so `A01` mates with `A01`, `A02`
with `A02`, and so on. The same applies to Connector B. The daughter footprint
will normally appear mirrored relative to the harness footprint. The pin
numbers must be checked against the manufacturer's drawings rather than judged
from appearance.

The preferred keying uses a male Connector A and female Connector B on the
harness, with the opposite parts on the daughter board. The two connectors
should also be placed asymmetrically so the daughter board cannot be fitted
backwards or moved sideways by one pin. If the final parts cannot use mixed
genders, another positive mechanical key must provide the same protection.

Both PCBs must mark Connector A, Connector B and pin 1. The boards must be
unpowered before the connectors are joined or separated.

### 7.3 Pin Allocation

Each connector uses sixteen pins for signals and controls, two for power and
six for ground.

| Pin use | Pins |
|---|---:|
| Signals and controls | 32 |
| `TI_TARGET_3V3` | 2 |
| `TI_SWITCHED_TARGET_5V` | 2 |
| `TI_GND` | 12 |
| **Total** | **48** |

The 3.3 V and 5 V pins each appear once on Connector A and once on Connector B.
The matching pair is connected together on each PCB to share the current and
reduce voltage drop.

#### 7.3.1 Connector A — Routing, Control And Low-Speed Signals

| Column | Odd pin | Function | Even pin | Function |
|---:|---|---|---|---|
| 1 | `A01` | `TI_TARGET_3V3` | `A02` | `TI_GND` |
| 2 | `A03` | `R0` | `A04` | `R1` |
| 3 | `A05` | `R2` | `A06` | `R3` |
| 4 | `A07` | `R4` | `A08` | `TI_GND` |
| 5 | `A09` | `R5` | `A10` | `R6` |
| 6 | `A11` | `TI_TARGET_RESET_N` | `A12` | `TI_GND` |
| 7 | `A13` | `TI_BOOT_REQUEST` | `A14` | `TI_RGB_DATA` |
| 8 | `A15` | `TI_I2C_SDA` | `A16` | `TI_GND` |
| 9 | `A17` | `TI_I2C_SCL` | `A18` | `TI_I2C_FB` |
| 10 | `A19` | `TI_I2C_INT` | `A20` | `TI_GND` |
| 11 | `A21` | `TI_ANALOG_PWM_OUT` | `A22` | `TI_ANALOG_ADC_IN` |
| 12 | `A23` | `TI_SWITCHED_TARGET_5V` | `A24` | `TI_GND` |

#### 7.3.2 Connector B — Direct Digital Test Block Signals

| Column | Odd pin | Function | Even pin | Function |
|---:|---|---|---|---|
| 1 | `B01` | `TI_TARGET_3V3` | `B02` | `TI_GND` |
| 2 | `B03` | `TI_GPIO_LOOP_A_OUT` | `B04` | `TI_GPIO_LOOP_A_IN` |
| 3 | `B05` | `TI_GPIO_LOOP_B_OUT` | `B06` | `TI_GPIO_LOOP_B_IN` |
| 4 | `B07` | `TI_SPI_SCK` | `B08` | `TI_GND` |
| 5 | `B09` | `TI_SPI_MOSI` | `B10` | `TI_SPI_MISO` |
| 6 | `B11` | `TI_SPI_CS_ADC` | `B12` | `TI_GND` |
| 7 | `B13` | `TI_SPI_CS_EXT` | `B14` | `TI_ONEWIRE_DQ` |
| 8 | `B15` | `TI_ONEWIRE_GPIO_A_FB` | `B16` | `TI_GND` |
| 9 | `B17` | `TI_ONEWIRE_GPIO_B_FB` | `B18` | `TI_UART_A_TX` |
| 10 | `B19` | `TI_UART_A_RX` | `B20` | `TI_GND` |
| 11 | `B21` | `TI_UART_B_TX` | `B22` | `TI_UART_B_RX` |
| 12 | `B23` | `TI_SWITCHED_TARGET_5V` | `B24` | `TI_GND` |

### 7.4 Why The Pins Are Arranged This Way

The 48-pin arrangement was selected because:

* `TI_SWITCHED_TARGET_5V` supplies the complete target load in Supervisor
  operation, so it uses one pin on each connector
* `TI_TARGET_3V3` supplies the Routing Logic and Test Block rails in
  `STANDALONE`, so it also uses one pin on each connector
* twelve ground pins spread the return current and put ground pins near the
  main signal groups
* all required signals already have pins, so no pins are left unused just in
  case
* two 24-pin connectors cost less and are easier to align than four smaller
  connectors

Connector A keeps R0-R6 together with reset, boot, I2C, analogue and RGB.
Connector B carries the direct GPIO, SPI, OneWire and UART connections. Both
connectors include 3.3 V, 5 V and ground pins.

This grouping only makes the schematic, PCB and wiring easier to follow. It
does not change which tests or combinations are allowed.

### 7.5 Breakaway Link Tracks

When the harness and daughter board are manufactured as one joined PCB, 40
copper tracks cross the Breakaway Links. Each of the 32 signal and control pins
uses one track. The 3.3 V, 5 V and ground connections use parallel tracks to
carry more current.

| Link group | Connector pins carried | Tracks |
|---|---|---:|
| `A-S1` | `A03`, `A04`, `A05`, `A06`, `A07`, `A09`, `A10`, `A11` | 8 |
| `A-S2` | `A13`, `A14`, `A15`, `A17`, `A18`, `A19`, `A21`, `A22` | 8 |
| `B-S1` | `B03`, `B04`, `B05`, `B06`, `B07`, `B09`, `B10`, `B11` | 8 |
| `B-S2` | `B13`, `B14`, `B15`, `B17`, `B18`, `B19`, `B21`, `B22` | 8 |
| `P-3V3` | `A01`, `B01`, plus grounds `A02`, `B02` | 4 |
| `P-5V` | `A23`, `B23`, plus grounds `A24`, `B24` | 4 |
| **Total** | 32 signal, 4 power and 4 ground conductors | **40** |

The other eight ground pins are already connected to the same ground copper on
each PCB, so they do not need separate tracks across the break. The two 3.3 V
tracks and two 5 V tracks match the duplicated power pins on the connectors.

PCB layout must set suitable track widths for the expected current and make
the tracks narrow enough at the break points for clean separation. The link
group names are only PCB-layout labels; they do not create any new signals.

### 7.6 Checks Before Rev-A PCB Release

Before releasing the Rev-A PCB we must:

1. choose the exact male and female connectors and check that both PCBs lie in
   the same plane when mated
2. confirm the connector current rating and set maximum allowed 3.3 V and 5 V
   currents
3. check that both pins for each power rail are connected together on every
   harness and daughter board
4. place the Target Power Monitor before the switched 5 V track divides
   between Connector A and Connector B
5. check what happens during partial or misaligned insertion and prohibit
   connecting or disconnecting powered boards
6. verify that connector gender, spacing and markings prevent reversal,
   connector exchange and one-pin offset
7. check that both connectors align and mate without twisting either PCB
8. test the Breakaway Links for continuity, current capacity, clean separation
   and isolation after separation

There are no spare pins in this 48-pin pinout. If a future requirement needs
another pin, use a larger connector arrangement rather than removing the
recommended power or ground pins.

The signal pinout is accepted. The KiCad footprints must not be released until
the selected male and female parts have been checked against the pin view in
section 7.2.
