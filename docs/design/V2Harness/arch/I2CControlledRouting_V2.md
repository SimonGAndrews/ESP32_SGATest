# V2 Controlled Routing Fabric

**Status:** Accepted

**Version:** 1.0

**Last Updated:** 27 July 2026

## 1. Conclusion And Purpose

The V2 reusable harness shall implement a constrained, target-controlled
routing fabric rather than a general-purpose switching matrix.

The common routed form accepts seven target route entries, R0-R6, and provides
only the 19 route-selection paths required by the accepted Target Routing
Envelope. Targets with sufficient GPIO may instead use fixed direct Test Block
connections, or a reviewed combination of direct and routed connections.

The initial implementation direction is:

* independently controlled, bidirectional signal switches for each legal path
* two routing-control MCP23017 I2C expanders
* an independent active-low Hardware Clear action
* hardware-low switch controls as the inactive state
* powered-off isolation where either side of a connection can remain powered
* four additional Block 7 UART connection switches

This direction gives every route entry independent selection, preserves the
accepted simultaneous route sets and avoids the hidden coupling created by
shared multiplexer address lines. The accepted combined capability connection
matrix confirms the path count, conflicts, simultaneous configurations and
provisional control-bit allocation used by this specification.

## 2. Scope And Authority

This document specifies:

* the reusable routing-fabric topology
* the accepted common R0-R6 connection inventory
* the relationship between direct paths, route-selection switching and
  block-local connection switching
* the routing-control I2C devices and provisional register allocation
* startup, Hardware Clear, powered-off and reconfiguration behaviour
* component-selection requirements and the preferred prototype direction
* routing diagnostics, evidence and prototype acceptance

It consumes, and does not redefine:

* Test Block behaviour from `StandardTestBlocks_V2.md`
* Routing Control Service behaviour from `StandardControlServices_V2.md`
* route-entry roles and concurrency from `TargetRoutingEnvelope_V2.md`
* the daughter-board boundary from `HybridHarnessArchitecture_V2.md`
* accepted path IDs, counts and conflicts from
  `CombinedCapabilityConnectionMatrix_V2.md`

It does not assign physical Target Interface contacts. It also does not define
the Target Profile software schema or the detailed target-specific mapping
implemented by a daughter board.

## 3. Architectural Position

The routing fabric is reusable harness-board circuitry between route-entry
signals on the Target Interface and named Test Block endpoints:

```text
Target GPIO
    |
Target daughter-board mapping
    |
Target Interface route entry R0-R6
    |
route-selection switch
    |
named Test Block endpoint
```

The fabric routes only accepted logical connections. It cannot connect an
arbitrary target GPIO to an arbitrary harness node.

The target owns routing control in every powered Operating Mode. The host asks
the target's Test Control endpoint for a capability; the Target Support Module
applies and verifies the resolved configuration. The Harness Supervisor does
not own or access the target routing-control I2C bus.

### 3.1 Route Selection

Route-selection switching connects one R0-R6 route entry to one of its legal
Test Block destinations:

```text
route entry -> route-selection switch -> Test Block endpoint
```

Each route entry is independently disabled and selected. No common address or
mode line may couple two route entries unless the complete connection matrix
proves that the coupling preserves every accepted configuration, safe state
and diagnostic requirement.

### 3.2 Block-Local Connection Switching

Block-local connection switching changes the internal topology of a Test Block
after target signals have reached its endpoints:

```text
Test Block endpoint -> block-local switch -> block node or external peer
```

Route-selection and block-local switches may share I2C control expanders, but
their purposes, state names and evidence remain distinct.

### 3.3 Direct Paths

A target with suitable independent GPIO may map a target pin directly to a
logical Test Block signal. Such a connection bypasses route-selection
switching but remains subject to the Test Block's protection and any required
block-local switching.

The daughter-board mapping and Target Profile shall ensure that a fixed direct
path and a routed source cannot drive the same Test Block endpoint
simultaneously. A direct path used by a target shall itself be safe throughout
target reset; a strapping pin or otherwise unsafe startup signal shall use a
disconnectable routed path instead.

## 4. Accepted Common Route Inventory

The common routed form provides the following legal paths:

| Route entry | Legal destination | Target role at destination |
|---|---|---|
| R0 | `TI_ANALOG_ADC_IN` | Analogue input |
| R0 | `TI_ONEWIRE_DQ` | Bidirectional open-drain |
| R1 | `TI_GPIO_LOOP_A_OUT` | Output |
| R1 | `TI_SPI_MISO` | Input |
| R2 | `TI_GPIO_LOOP_A_IN` | Input |
| R2 | `TI_I2C_FB` | Input |
| R2 | `TI_SPI_CS_ADC` | Output |
| R2 | `TI_ONEWIRE_GPIO_A_FB` | Input |
| R3 | `TI_GPIO_LOOP_B_OUT` | Output |
| R3 | `TI_SPI_MOSI` | Output |
| R3 | `TI_UART_A_TX` | Output |
| R4 | `TI_SPI_SCK` | Output |
| R4 | `TI_UART_A_RX` | Input |
| R5 | `TI_ANALOG_PWM_OUT` | Output |
| R5 | `TI_RGB_DATA` | Output |
| R6 | `TI_GPIO_LOOP_B_IN` | Input |
| R6 | `TI_I2C_INT` | Input |
| R6 | `TI_SPI_CS_EXT` | Output |
| R6 | `TI_ONEWIRE_GPIO_B_FB` | Input |

This is a 19-path route-selection inventory. `TI_I2C_SDA` and `TI_I2C_SCL`
remain mandatory direct connections and are not route selections.
`TI_UART_B_TX` and `TI_UART_B_RX` are additional direct endpoint-B signals for
targets that support the full two-UART crosslink.

Only one destination may be active for one route entry at a time. The
connection matrix may remove a path only if an accepted upstream specification
is revised; it may add a path only for a documented Test Block, Control Service
or peer requirement.

## 5. Required Route Configurations

The fabric shall support these complete common-route configurations:

| Configuration | Required active route selections | Direct or block-local requirement |
|---|---|---|
| GPIO loopback | R1 to loop A output; R2 to loop A input; R3 to loop B output; R6 to loop B input | Both pairs operate concurrently |
| Analogue feedback | R5 to PWM output; R0 to target ADC input | `ANALOG_FB` is also observed by MCP3008 CH0 |
| I2C functional device | R2 to I2C feedback; R6 to I2C interrupt | Direct SDA/SCL remain active |
| SPI | R4 to SCK; R3 to MOSI; R1 to MISO; R2 to ADC CS; R6 to extension CS | Both chip selects are independently available and default inactive |
| Analogue plus SPI observation | All R0-R6 selections required by the preceding analogue and SPI rows | Direct SDA/SCL and routing control remain available |
| 1-Wire and GPIO | R0 to 1-Wire DQ; R2 to feedback A; R6 to feedback B | Both feedback inputs operate concurrently |
| UART crosslink | R3 to UART A TX; R4 to UART A RX | Direct UART B plus Block 7 crosslink switches |
| UART external peer | R3 to UART A TX; R4 to UART A RX | Block 7 peer switches; endpoint B isolated |
| Addressable RGB | R5 to RGB data | Protected 3.3 V node before level translation |
| Supervisor event wake | R6 to I2C interrupt | Direct SDA/SCL and the fixed protected `SUP_EVENT_OUT`/`SUP_EVENT_IN` paths remain available |

Arbitrary simultaneous operation of all Test Blocks is not required.
Configurations that are not explicitly legal shall be rejected.

## 6. Block-Local Switching Inventory

The minimum accepted block-local inventory is the four Block 7 paths:

| Controlled path | Crosslink state | External-peer state |
|---|---|---|
| UART A TX to UART B RX | On | Off |
| UART B TX to UART A RX | On | Off |
| UART A TX to peer RX | Off | On |
| peer TX to UART A RX | Off | On |

The crosslink paths shall operate together for full-duplex testing. The peer
paths shall operate together only after endpoint B and every other possible
source are isolated. The inactive state leaves all four paths open.

The accepted combined connection matrix identifies no other required
software-controlled Test Block path. Ordinary Test Block protection, manual
diagnostic isolation, power switches, fixed Supervisor event-handshake paths
and fixed I2C power-domain isolation are not counted as target route
selections.

## 7. Switching-Hardware Direction

### 7.1 Required Switch Characteristics

Every signal-path switch shall:

* be bidirectional
* pass the complete 0 V to 3.3 V harness signal range
* provide a defined high-impedance off state
* remain high impedance when its supply is absent if either signal endpoint
  can still be powered
* default off without relying on target firmware
* have on-resistance, leakage, capacitance and bandwidth suitable for every
  role assigned to that path
* tolerate the required power-up and power-down order without signal injection
  or back-power

Route-selection paths may carry analogue, open-drain or digital signals in
different Target Profiles. They shall therefore use analogue-capable
bidirectional switches rather than unidirectional logic gates.

### 7.2 Preferred Prototype Switch

The preferred schematic baseline is the Texas Instruments `TMUX1511` in its
14-pin TSSOP package. It provides four independently controlled bidirectional
1:1 switches, internal control pull-downs and powered-off signal-path
protection up to 3.6 V.

One side of several channels may be joined to form the legal fan-out from a
route entry. Software and the control-bit truth table enforce one active
destination. Channels may instead be grouped by physical placement where that
shortens sensitive paths; the logical allocation remains unchanged.

The accepted 23 controlled paths require six four-channel devices, leaving one
spare channel. One additional four-channel device provides the accepted fixed
direct-I2C power-domain isolation described in Section 9.3. The schematic
baseline therefore uses seven `TMUX1511` packages: six for
software-controlled routing and one for fixed, power-qualified I2C isolation.

The authoritative component reference is the
[TMUX1511 data sheet](https://www.ti.com/lit/ds/symlink/tmux1511.pdf).

### 7.3 Earlier Candidates

| Candidate | Disposition |
|---|---|
| `TMUX1511` | Preferred baseline: independent channels, low resistance and capacitance, TSSOP option and powered-off signal-path protection |
| `TMUX1204` | Not the baseline because its 4:1 decoder is attractive but its signal pins do not provide powered-off protection; it may remain a comparison device |
| `DG409LE` | Not the baseline because paired channels share selection, its 3.3 V on-resistance is materially higher and its signal pins are constrained to the powered supply rails |
| Generic 74HC405x/4066 | Not accepted without device-specific powered-off, resistance, capacitance, voltage-range and reset-state evidence |

Use of another switch family requires a reviewed comparison against the
requirements in Section 7.1. Package availability alone is not sufficient.

## 8. Routing-Control Hardware

### 8.1 I2C Control Plane

The baseline control plane uses two MCP23017 devices on the mandatory direct
target I2C bus:

| Device | Provisional address | Role |
|---|---:|---|
| Functional Block 3 MCP23017 | `0x20` | Test device and Supervisor event handshake; not routing control |
| `RCTRL0` MCP23017 | `0x21` | Route-selection controls |
| `RCTRL1` MCP23017 | `0x22` | Remaining route and block-local controls |

Addresses shall be fixed by explicit hardware straps and reserved in the
Target Profile. An external Grove device must not use a reserved address
without an explicit diagnostic configuration.

At 3.3 V, the design shall use an I2C rate supported by every fitted device;
400 kHz is the maximum normal routing-control rate unless prototype bus
validation establishes a stricter limit. Pull-up population, aggregate
capacitance and any external Grove branch shall be measured.

The routing-control bus is not itself routed. It shall be available before a
route is established and shall recover without any route state change.

The authoritative controller reference is the
[MCP23017 data sheet](https://ww1.microchip.com/downloads/aemDocuments/documents/APID/ProductDocuments/DataSheets/MCP23017-Data-Sheet-DS20001952.pdf).

### 8.2 Provisional Control-Bit Allocation

The following allocation makes the current design concrete enough for the
connection-matrix and schematic review:

| Controller bit | Path ID | Controlled path |
|---|---|---|
| `RCTRL0.GPA0` | `RP01` | R0 to `TI_ANALOG_ADC_IN` |
| `RCTRL0.GPA1` | `RP02` | R0 to `TI_ONEWIRE_DQ` |
| `RCTRL0.GPA2` | `RP03` | R1 to `TI_GPIO_LOOP_A_OUT` |
| `RCTRL0.GPA3` | `RP04` | R1 to `TI_SPI_MISO` |
| `RCTRL0.GPA4` | `RP05` | R2 to `TI_GPIO_LOOP_A_IN` |
| `RCTRL0.GPA5` | `RP06` | R2 to `TI_I2C_FB` |
| `RCTRL0.GPA6` | `RP07` | R2 to `TI_SPI_CS_ADC` |
| `RCTRL0.GPA7` | `RP08` | R2 to `TI_ONEWIRE_GPIO_A_FB` |
| `RCTRL0.GPB0` | `RP09` | R3 to `TI_GPIO_LOOP_B_OUT` |
| `RCTRL0.GPB1` | `RP10` | R3 to `TI_SPI_MOSI` |
| `RCTRL0.GPB2` | `RP11` | R3 to `TI_UART_A_TX` |
| `RCTRL0.GPB3` | `RP12` | R4 to `TI_SPI_SCK` |
| `RCTRL0.GPB4` | `RP13` | R4 to `TI_UART_A_RX` |
| `RCTRL0.GPB5` | `RP14` | R5 to `TI_ANALOG_PWM_OUT` |
| `RCTRL0.GPB6` | `RP15` | R5 to `TI_RGB_DATA` |
| `RCTRL0.GPB7` | `RP16` | R6 to `TI_GPIO_LOOP_B_IN` |
| `RCTRL1.GPA0` | `RP17` | R6 to `TI_I2C_INT` |
| `RCTRL1.GPA1` | `RP18` | R6 to `TI_SPI_CS_EXT` |
| `RCTRL1.GPA2` | `RP19` | R6 to `TI_ONEWIRE_GPIO_B_FB` |
| `RCTRL1.GPA3` | `UP01` | UART A TX to UART B RX |
| `RCTRL1.GPA4` | `UP02` | UART B TX to UART A RX |
| `RCTRL1.GPA5` | `UP03` | UART A TX to peer RX |
| `RCTRL1.GPA6` | `UP04` | Peer TX to UART A RX |
| `RCTRL1.GPA7` | Reserved | Reserved |
| `RCTRL1.GPB0-GPB7` | Reserved | Reserved low-speed control capacity |

The allocation provides 23 used outputs and nine provisional spares. Reserved
outputs do not authorise additional Target Interface signals or external
connectors.

The connection matrix may rearrange physical bits for layout or package
convenience. It shall preserve stable logical names and publish any resulting
register-map change before target-support software depends on it.

### 8.3 Output Initialisation And Readback

After power-up or Hardware Clear, both routing MCP23017 devices have their GPIO
configured as inputs. Before changing any routing GPIO to an output, firmware
shall:

1. write zero to both output-latch banks
2. verify the zero latch values
3. configure only implemented control bits as outputs
4. read back direction, latch and GPIO state
5. leave reserved pins as inputs unless a later accepted requirement assigns
   them

Normal writes shall use a complete software shadow of both output banks.
Uncontrolled read-modify-write operations are not permitted.

Readback verifies the commanded controller and pin state. It does not prove
analogue-switch continuity or isolation; prototype electrical tests provide
that evidence.

## 9. Hardware Clear And Safe State

### 9.1 Hardware Clear

Both routing-control expanders shall share an active-low `ROUTE_CLEAR_N`
hardware reset net. It shall:

* assert during invalid or rising Routing Logic Supply Rail power
* be invokable by the Supervisor through a direct open-drain action when the
  Supervisor is present
* remain independent of target firmware and the target I2C bus
* be accessible at a labelled diagnostic test point
* reset route-selection and block-local controls together

A local manual clear control may be fitted for prototype diagnosis. It is not
a routine test configuration control and does not add a Target Interface
signal.

Every signal-switch control shall have a hardware pull-down sufficient to hold
the switch off while its controller is unpowered, in reset or configured as an
input. Internal switch pull-downs may supplement but shall not replace the
documented external safe-state bias unless schematic review explicitly accepts
them.

### 9.2 Inactive State

The inactive state is:

* every route-selection path open
* every Block 7 crosslink and peer path open
* both SPI chip-select destinations disconnected and their block-side nodes
  biased inactive as defined by Block 4
* no peer output connected to a target input
* no target output connected to another active output

Hardware Clear establishes only this inactive state. Target firmware must
subsequently establish and verify a functional configuration.

### 9.3 Powered-Off Isolation

The design shall remain safe in all combinations where the target, Routing
Logic Supply Rail or Test Block Supply Rail is absent while another domain is
powered.

In particular:

* an independently USB-powered target shall not back-power unpowered routing
  switches or controllers through R0-R6, direct I2C or direct Test Block pins
* harness pull-ups, Test Blocks and routing devices shall not back-power an
  unpowered target
* an unpowered Test Block device shall not load or be back-powered from the
  direct I2C bus
* switch control pins shall not power an unpowered switch or controller

Signal switches without signal-path powered-off protection cannot satisfy
these conditions merely by holding their enable input inactive.

The accepted baseline uses one additional four-channel `TMUX1511` on the
Reusable Harness Board to create two fixed SDA/SCL isolation boundaries:

1. two channels between the Target Interface and the Routing Control Service
2. two channels between the Routing Control Service and the I2C Functional
   Device and external Grove branch in Standard Test Blocks

The isolation device shall be powered from the Routing Logic Supply Rail.
Target-side channels shall become conductive only while both the Routing Logic
Supply Rail and the target I/O domain are valid. Test Block-side channels shall
become conductive only while both the Routing Logic Supply Rail and Test Block
Supply Rail are valid. Hardware power-valid qualification and external
pull-downs shall hold all four channels open during invalid, rising and falling
rail conditions; target or Supervisor software shall not be required to
establish isolation.

Each isolated bus segment shall have pull-ups to its own valid 3.3 V domain:

* the target segment to the target I/O-domain reference
* the routing-control segment to the Routing Logic Supply Rail
* the Test Block segment to the Test Block Supply Rail

`TI_TARGET_3V3` shall remain available as a bounded, low-current target
I/O-domain reference whenever the target is powered, including in
`STANDALONE EXT`. In that mode the Operating Mode selection disconnects it from
the Routing Logic Supply Rail; it supplies only approved reference loads such
as target-side I2C pull-ups and target-domain-valid qualification. It is not a
second harness supply source.

This fixed isolation is infrastructure, not a software-selected route. The
accepted connection matrix confirms the four required isolation paths.
Schematic design and prototype verification shall establish the exact enable
thresholds, pull-ups, rail-ramp behaviour, leakage and I2C timing before the
circuit is frozen.

The shared direct bus is retained instead of adding a second Target Interface
I2C pair. The ESP32-C3 design-basis target has
[one hardware I2C controller](https://docs.espressif.com/projects/esp-idf/en/stable/esp32c3/api-reference/peripherals/i2c.html)
and no unallocated safe GPIO pair after the mandatory direct bus and R0-R6 are
assigned. A second target bus would consume two more signals and would still
cross into an independently powered harness domain requiring powered-off
protection.

## 10. Configuration And Reconfiguration

A requested configuration shall be validated as a complete logical state
before any control output changes.

A route change shall use this order:

1. place affected target and peer drivers in their inactive or high-impedance
   states
2. clear every old or conflicting block-local path
3. clear every old or conflicting route-selection path
4. read back and verify the inactive control state
5. enable the required route-selection paths
6. enable the required block-local paths
7. read back and verify the complete commanded state
8. enable target or Test Block drivers

After a test, the same process runs in reverse: drivers are disabled first,
then block-local and route-selection paths are cleared and verified.

For each R0-R6 entry, at most one of its route-selection bits may be high.
Crosslink and external-peer Block 7 states are mutually exclusive. An invalid
one-hot, source-contention or direct/routed combination shall be rejected
before any write.

Functional I2C tests may deliberately disrupt and restore the shared bus. The
routing expanders shall retain their latched state during that interruption.
After bus restoration, target firmware shall verify that the route state is
unchanged before continuing.

## 11. Electrical And Performance Requirements

All routing logic and target-facing signal paths use the 3.3 V harness domain
and common ground.

The normal path budget is:

* one route-selection switch between R0-R6 and a Test Block endpoint
* no route-selection switch on a fixed direct path
* one additional block-local switch where Block 7 requires it
* the protection resistance and test circuitry owned by the applicable Test
  Block

Cascading additional signal switches requires a reviewed reason and
signal-integrity evidence.

The selected implementation shall preserve:

* the complete 0 V to 3.3 V analogue range for R0
* the provisional 5 kHz PWM baseline and target ADC accuracy for Block 2
* direct target I2C operation at the selected tested bus rate
* the selected SPI clock and both independent chip selects
* full 1-Wire reset, presence, read and write timing with the complete device
  population
* the proven 115200-baud UART baseline and any higher accepted prototype rate
* the target's addressable-RGB waveform at the protected 3.3 V node
* GPIO edge, pulse and interrupt behaviour used by the accepted tests

The preferred TMUX1511 has substantial nominal resistance, capacitance and
bandwidth margin for these uses, but the complete routed path, PCB layout,
protection resistors and attached devices determine acceptance.

## 12. Diagnostics And Evidence

The prototype shall provide:

* labelled SDA, SCL and ground observation points
* labelled `ROUTE_CLEAR_N` and Routing Logic Supply Rail test points
* access to each routing-controller reset, address and interrupt pin
* representative switch-control and signal-path observation points
* documented zero-ohm or DNP isolation provisions where they materially improve
  fault diagnosis

Routine route changes shall not require manual shunts. Diagnostic provisions
shall not create parallel active paths.

For every requested configuration, evidence shall record:

* Target Profile revision
* requested capability
* resolved direct, route-selection and block-local paths
* control-bank values written
* direction, latch and GPIO readback
* inactive state before and after the test
* Hardware Clear use, if any
* rejected or failed operations

## 13. Schematic Implementation Decisions

`CombinedCapabilityConnectionMatrix_V2.md` confirms the 19 route-selection
paths, four Block 7 block-local paths, four fixed I2C-isolation paths, required
simultaneous configurations and direct/routed conflict rules. It identifies no
additional accepted software-controlled path.

The Rev-A schematic baseline implements that matrix as follows:

1. `RCTRL0` is strapped to `0x21` and controls `RP01` to `RP16`.
2. `RCTRL1` is strapped to `0x22`; `GPA0` to `GPA2` control `RP17` to
   `RP19`, and `GPA3` to `GPA6` control `UP01` to `UP04`. `GPA7` and
   `GPB0` to `GPB7` remain reserved and unconnected.
3. Five `TMUX1511` packages implement `RP01` to `RP19`; the fourth channel
   in the final package is hard disabled. The existing Block 7 `TMUX1511`
   implements `UP01` to `UP04`.
4. A separate `TMUX1511` implements fixed paths `IP01` to `IP04`.
   Target-side and Test Block-side channel pairs have independent,
   hardware-qualified enables.
5. `TPS3808G30` supervisors qualify `TI_TARGET_3V3`,
   `TEST_BLOCK_3V3` and the Routing Logic Supply Rail. Their nominal
   2.79 V threshold and delayed release keep the I2C boundaries open and the
   routing controllers clear while the relevant rails are invalid or
   starting.
6. The target and routing-control I2C segments each have 4.7 kΩ pull-ups to
   their own 3.3 V domains. The Test Block segment retains the configurable
   pull-ups defined in Block 3.
7. Every `RPxx` control has a 100 kΩ external pull-down in addition to the
   switch's internal bias. Each switch and controller has local 100 nF
   decoupling, and the required routing diagnostic points are provided.

The schematic and exported netlist shall be checked against this allocation
after every interactive routing-sheet edit. Changing the accepted
seven-`TMUX1511` or two-routing-MCP23017 baseline requires a reviewed
specification revision. Implementation shall not reduce the accepted R0-R6
envelope or weaken safe-state, powered-off or concurrency requirements.

## 14. Prototype Acceptance

Before the routing topology and Target Interface are frozen, the prototype
shall demonstrate:

1. both GPIO loopback pairs operating concurrently
2. SPI operation with both chip-select paths available
3. UART crosslink operation with an independent console and recovery path
4. UART external-peer operation with endpoint B isolated
5. 1-Wire operation with both feedback inputs available
6. analogue feedback observed concurrently by the target ADC and MCP3008 CH0
7. addressable-RGB operation through R5
8. target-controlled route establishment and readback
9. Hardware Clear returning every controlled path inactive without target I2C
10. no damaging or measurable back-power in every supported power sequence
11. direct-path operation for a generous target without topology changes
12. a non-ESP32 Target Profile without reusable-fabric changes
13. the accepted C3 Supervisor-event wake path through R6
14. Target Interface I2C isolation with Routing Logic powered and the target
    unpowered, including bounded leakage and absence of target back-power
15. Test Block I2C isolation with target and Routing Logic powered and the Test
    Block Supply Rail off
16. functional I2C operation at the accepted rate with both fixed isolation
    boundaries enabled

Continuity and static electrical checks precede firmware conclusions.
Signal-integrity limits, measured resistance, leakage, bus loading and maximum
validated rates shall be retained with the prototype evidence.

## 15. Summary

The V2 controlled routing fabric is a fixed set of legal, independently
controlled connections. Its initial hardware budget is 19 route-selection
paths, four UART block-local paths, six four-channel routing-switch packages,
one four-channel fixed I2C-isolation package and two MCP23017 routing
controllers.

The preferred TMUX1511 direction removes the shared-selection constraint of the
earlier DG409LE proposal and provides the accepted target-to-routing and
routing-to-Test-Block powered-off isolation. The accepted matrix provides the
stable path IDs, topology, conflicts and provisional control allocation needed
for the Target Interface and schematic work.
