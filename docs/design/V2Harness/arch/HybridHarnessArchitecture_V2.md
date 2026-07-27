# V2 Hybrid Harness Architecture

**Status:** Accepted
**Version:** 0.5
**Last Updated:** 27 July 2026

---

# 1. Purpose

This document defines the current hybrid prototype direction for the V2
Espruino test harness.

The V2 hybrid harness is intended to bridge the gap between the proven V1
wirewrap harnesses and a reusable manufactured harness system. It combines a
reusable harness PCB with removable target daughter boards. Initial daughter
boards may use wirewrap; stable mappings may later become manufactured passive
adapter PCBs.

The goal is to make the standard Test Blocks and routing hardware repeatable
without forcing every supported target board to have its own complete PCB from
the start.

This is a physical architecture and prototype-design note. The shared V2
vocabulary and functional relationships are defined in
`HarnessConceptualModel_V2.md`. This document is not yet a schematic, PCB
layout, target mapping, Target Interface contract or bill of materials.

---

# 2. Hybrid Harness Concept

The hybrid harness divides the V2 harness system into three assemblies and one
fixed boundary:

* the target module or development board
* a removable target daughter board
* the reusable harness PCB
* the Target Interface pin banks between the daughter board and harness PCB

The reusable harness PCB contains:

* standard Test Blocks
* routing and switching components
* route-control hardware
* reusable Control Services for power, reset, boot and operation
* named Target Interface pin banks
* permanent PCB wiring from the Interface signals to Test Blocks or to the
  routing fabric

The target daughter board contains the target socket or header arrangement and
the target-specific mapping onto the fixed Target Interface signals. A
prototype daughter board may use a generous through-hole grid, turned-pin
connectors and wirewrap. Exceptional target-specific circuitry is represented
as an Adapter Service and belongs on the daughter board only when it cannot
reasonably be standardised on the reusable harness PCB.

Conceptually:

```text
target module or development board
   |
   | target-specific socket and mapping
   v
target daughter board
   |
   | Target Interface pin banks
   v
reusable harness PCB
   |
   |-- Test Blocks
   |-- routing fabric
   `-- Control Services
```

The Target Interface pin banks are the fixed physical, electrical, logical and
schematic net-name boundary between the target daughter board and reusable
harness PCB.

---

# 3. Motivation

The V1 ESP32-family harnesses proved that wirewrap is practical for early
hardware-test development. They also showed that the test blocks, evidence
process and runner model benefit from being repeatable across targets.

The V2 project adds two new objectives:

* support future manufactured PCBs
* support a wider set of targets without designing a full PCB for each one at
  the first prototype stage

The hybrid approach keeps the useful flexibility of wirewrap where it matters
most: adapting a specific target on a replaceable daughter board. At the same
time, it moves the stable reusable circuitry onto a manufactured harness PCB:

* MCP3008 SPI ADC block
* MCP23017 functional I2C and Supervisor event-handshake block
* OneWire devices and extension points
* GPIO loopback and feedback paths
* UART crosslink provisions
* route-control expander
* analog switches or multiplexers
* labelled test points, bypass links and evidence-friendly debug access

This should reduce build variability in the reusable Test Blocks while
allowing each target mapping to be constructed, inspected, continuity-tested
and replaced independently.

---

# 4. Target Envelope

The current V2 target envelope includes:

* classic ESP32 targets, including the Espressif ESP32-DevKitC V4 family and the
  Olimex ESP32-DevKit-LiPo already used by the V1 harness work
* ESP32-C3 targets, including the Espressif ESP32-C3-DevKitC-02 family and the
  Olimex ESP32-C3-DevKit-LiPo class
* ESP32-S3 targets, including the Espressif ESP32-S3-DevKitC-1 and the Olimex
  ESP32-S3-DevKit-LiPo-EA
* Espruino MDBT42Q breakout/module targets
* Espruino Pico
* Raspberry Pi Pico W and Pico 2 W, which share the Pico-family board shape and
  pinout concept

Where practical, target mappings should be developed against the Espressif
DevKitC family, which provides the documented reference hardware and pin layouts
for the ESP32 MCU families. Alternative development boards, such as the Olimex
variants, remain fully supported through target-specific mappings to the common
Target Interface (`TI_*`) signals. This allows the reusable V2 harness
architecture to remain independent of any particular development board while
encouraging a consistent baseline for future target definitions.

These targets differ substantially in:

* exposed GPIO count
* ADC availability
* peripheral pin flexibility
* USB, serial and flashing paths
* boot and reset behavior
* board-mounted LEDs, buttons, power monitors and battery circuitry
* strapping, debug and deep-sleep constraints

The hybrid harness must therefore avoid assuming that all targets can use the
same physical GPIO allocation. A Target Profile describes the target and
daughter-board capabilities, Interface signal mappings, legal routes,
conflicts, exclusions and unavailable capabilities. A test request and Target
Profile are resolved into the concrete configuration used for that run.

---

# 5. Target Interface Pin Banks

The schematic should use explicit net names on the Target Interface pin banks.

The daughter-board side is target-specific, so the reusable harness PCB side
must be unambiguous and unchanged when a new target daughter board is added.

The reusable harness logic and standard Test Block domain is fixed at 3.3 V
with a common reference ground. Standard Test Block signals and external
peripheral connections are 3.3 V-only. A target requiring another logic domain
must provide an Adapter Service on its daughter board. USB VBUS and any other
service supply remain separate from the 3.3 V logic domain; their source,
isolation and ownership belong to the power-service and Target Interface work.

A Test Block may generate a contained local rail solely for its own documented
test-device implementation. Such a rail is not a Target Interface voltage
domain or general-purpose peripheral supply and must not reach the target.
`StandardTestBlocks_V2.md` defines and constrains any accepted exception.

`TargetInterfaceContract_V2.md` owns the complete current contact inventory.
Its first accepted stage comprises seven R0-R6 route entries, 23 logical Test
Block contacts, two target-power/reference contacts, two reset/boot controls
and a distributed common-ground class.

USB, SWD, JTAG, UART CTS/RTS, battery services, Supervisor event signals, Rack
Control I2C and target-power-monitor connections do not cross this boundary.
Where required, target-specific functions belong to onboard connectors or
daughter-board Adapter Services. Each Target Interface signal is labelled by
its harness role, not by a particular target's GPIO number. Electrical rules,
connector banks and pin assignments belong in the Target Interface contract
and shall not be settled incidentally during schematic work.

---

# 6. Connection Properties

Direct, routed, optional, unavailable and excluded connections are physical and
configuration properties rather than a separate test-facing category model.
Tests request Harness Capabilities; the Target Profile and Target Interface
rules describe how, or whether, the target can provide them.

Some Interface signals should remain direct because they are Control Services,
power or reference connections, or because routing would create unnecessary
electrical risk. Examples include ground, permitted target supply or reference
rails, reset, boot, a normal console path and the route-control bus.

Test Block signals may use direct PCB paths where a stable dedicated assignment
is appropriate. They may instead use the routing fabric where target GPIOs must
serve different test roles. The routing fabric provides a controlled set of
legal connections, not a full arbitrary crosspoint matrix.

A Target Profile must also be able to identify a capability as unavailable or
deliberately excluded. The Target Support Module and test evidence should
report that result explicitly rather than turning it into a misleading test
failure.

The detailed connection properties remain necessary for electrical review,
conflict detection, routing, acceptance testing and diagnosis.
`CombinedCapabilityConnectionMatrix_V2.md` consolidates the requirements from
Test Block and Control Service specifications as the design-stage input to
routing and Target Interface work. It records ownership, direct and routed
paths, simultaneous use, conflicts, safe states and recovery dependencies
without becoming a second behavioural specification.

The accepted connection properties ultimately belong in the Target Interface
contract, Target Profiles and Resolved Test Configurations.

---

# 7. Routing Fabric Policy

The reusable harness PCB should include a standard routing fabric designed
around the tightest useful GPIO target in the current envelope. The routing
fabric is the physical implementation of the routing Control Service, not a
separate class of Harness Capability.

At the current design stage, ESP32-C3-class targets provide the main routing
pressure because their practical GPIO budget is limited once boot, UART0,
native USB, strapping, board loads and debug paths are respected.

Designing the routing fabric around the constrained target has two advantages:

* the same PCB can support pin-limited targets without manual selector rewiring
* more generous targets can still use the routing fabric where route-control
  behavior itself needs to be tested

However, generous GPIO targets should not be forced to route every Test Block
through the routing fabric. Their target mappings may use clean direct
connections for high-value or signal-sensitive paths.

The resulting policy is:

* the routing fabric is the standard populated implementation of the routing
  Control Service on the reusable harness PCB
* the Target Profile records legal assignments, routes, conflicts, unavailable
  capabilities and exclusions
* direct and routed access to the same Test Block must be isolated by explicit
  links, selectors, solder jumpers or another reviewable mechanism
* route state must be written, read back and recorded before dependent tests run
* routing failures must be reported as routing failures, not as cascades of
  peripheral test failures

The Test requests the required Test Blocks and Control Services. The Target
Support Module uses the Target Profile to apply and verify the required routes.
The actual route state forms part of the Resolved Test Configuration.

---

# 8. Target Mapping Examples

Each daughter-board schematic should be the controlled physical description of
how target pins map to the Target Interface signals. Its Target Profile is the
software-facing expression of the same mapping.

For a constrained target, the mapping may expose several GPIOs as routing
entries:

```text
D6  -> TI_I2C_SCL
D7  -> TI_I2C_SDA
D0  -> R0
D1  -> R1
D2  -> R2
```

For a more generous target, the mapping may dedicate pins directly to test
blocks:

```text
A5  -> TI_SPI_SCK
A6  -> TI_SPI_MISO
A7  -> TI_SPI_MOSI
B1  -> TI_ONEWIRE_DQ
```

These examples are illustrative only. Authoritative mappings belong in
target-specific daughter-board schematics and supporting V2 documents after
the relevant board references and electrical constraints have been reviewed.

---

# 9. Schematic Implications

The initial V2 KiCad schematic should make the hybrid boundary visible.

Recommended schematic structure:

* reusable-harness instances of the Target Interface pin banks
* direct Control Service, power and reference connections
* direct Test Block entry points
* routing-fabric entry points
* route-control I2C controller
* switch or mux devices
* standard Test Blocks
* bypass, isolation and measurement links

The schematic should distinguish:

* the daughter-board boundary and Interface signals
* reusable harness PCB nets that are part of the manufactured board
* direct block paths
* routing-fabric paths
* reset-safe default states

Every functional circuit, component, connector and net must be traceable to an
accepted requirement owned by one or more of:

* a Standard Test Block
* a Standard Control Service
* the Target Interface contract
* electrical safety, protection or power distribution
* physical and mechanical implementation requirements

Protection components, decoupling, connectors, routing devices and other
shared implementation infrastructure do not create additional Harness
Capability categories. Where hardware supports more than one capability, the
combined capability connection matrix records each relationship, concurrency
rule and conflict while the hardware itself is defined once. Reserved
expansion must also be identified explicitly rather than appearing as
unexplained circuitry.

The first schematic should be treated as a routing and hybrid-architecture
evaluation harness, not as the final V2 production design.

---

# 10. Target Profile Requirements

The accepted conceptual model defines a Target Profile as the software-facing
description of how a particular target and daughter board use the V2 harness.
It must describe more than a list of usable GPIOs.

For each candidate target pin, the profile should eventually capture:

* Espruino pin name
* physical target pin or header location
* allowed harness roles
* ADC, PWM, SPI, I2C, UART and watch capability
* boot, reset, strap, USB, SWD or JTAG constraints
* onboard LED, button, battery or power-control connections
* voltage tolerance and 3.3 V-only constraints
* deep-sleep or wake limitations where relevant
* legal Interface signal assignments, routes, conflicts and exclusions

The complete Target Profile responsibilities are defined in
`HarnessConceptualModel_V2.md`. Its schema and its relationship to the Target
Support Module API remain later design work. This physical architecture only
requires that the profile express the daughter-board mapping and the routing
and electrical constraints needed to use it safely.

---

# 11. Open Decisions

The following items remain open:

* target daughter-board envelope and mechanical retention
* Target Interface physical pin numbering, connector keying and final signal
  placement across the accepted two 2×12 banks
* number of routed Target Interface entries
* detailed implementation of the accepted power architecture, including switch
  ratings, monitoring range, protection, discharge behaviour and physical
  Target Interface contacts
* direct versus routed isolation method for each test block
* switch truth table and route-control register map
* reset-safe switch defaults and enable/address biasing
* whether USB, SWD and JTAG should be routed through the reusable harness PCB,
  supplied by Adapter Services, or provided as optional target-service headers
* how to sense or record target-specific external preconditions, such as an
  unplugged USB cable during a UART test
* target profile schema and storage format
* efficient division of Target Profile and Target Support Module data between
  the target, host runner and harness controller

---

# 12. Summary

The V2 hybrid harness system combines removable target daughter boards with a
reusable manufactured harness PCB and a fixed Target Interface between them.

The reusable harness PCB contains the standard Test Blocks, routing fabric,
Control Services and Target Interface pin banks. Each daughter board maps a
particular target onto the fixed Interface signals and may be prototyped with
wirewrap before evolving into a manufactured passive adapter.

The routing fabric should support the most GPIO-constrained useful target, but
the Target Profile determines the legal direct and routed paths for each target.
Tests request capabilities through the Target Support Module, and the applied
configuration is verified and recorded rather than represented by a separate
V2 harness mode.

This preserves the inspectability and adaptability of the V1 wirewrap process
while making the repeatable harness circuitry reusable and manufacturable.

---

# Appendix A. Daughter-Board Decision Rationale

The main body defines the accepted removable daughter-board architecture and
the functional ownership of the target, target daughter board, Target
Interface and reusable harness PCB. This appendix preserves the reasons for
that decision and is not a second definition of the architecture.

## A.1 Decision Context

V2 selected a removable target daughter board rather than a target wirewrapped
directly onto the reusable harness PCB. Sections 1 and 2 define the resulting
architecture; the summary below records the physical idea considered when the
decision was made.

The Target Interface pin banks form the physical and electrical boundary
between the two assemblies. Their signals and pin assignments are fixed on the
harness side. Each target daughter board implements the target-specific
mapping needed to meet that common interface contract.

Conceptually:

```text
Target module
     │
     │ target-specific sockets and wirewrap
     ▼
Target daughter board
     │
     │ fixed Target Interface pin-bank contract
     ▼
Reusable harness PCB
     │
     ├── direct test connections
     └── routing/switching → functional test blocks
```

The initial daughter boards may use through-hole prototype board, turned-pin
male and female connectors, and point-to-point wirewrap. The reusable harness
PCB is not expected to know the target's physical pin names or header layout;
it sees only the fixed Target Interface signals.

## A.2 Ownership Rationale

The selected boundary keeps the MCU and native target-board support with the
target, confines target-specific mapping and exceptional adaptation to the
daughter board, and keeps reusable Test Blocks, routing and Control Services on
the reusable harness PCB. A daughter board should normally remain a passive
adapter.

The normative ownership model is now defined by sections 2 and 4 and by
`HarnessConceptualModel_V2.md`. The summary above is retained only to explain why
the selected boundary keeps reusable circuitry on the harness PCB.

## A.3 Construction and Operating Rationale

A daughter board can be continuity-tested and inspected independently before
it is connected to the reusable harness PCB. Once proved, its schematic is the
controlled physical mapping for that board family and its Target Profile is the
software-facing expression of the same mapping.

Different targets, board revisions or firmware versions can then be exchanged
without rebuilding the reusable harness PCB. A small number of reusable harness
PCBs can support a larger collection of targets and daughter boards. This is
particularly useful during early development, when several target mappings
need to be proved and corrected.

The connector system should be keyed or unmistakably marked. Power and ground
should use sufficient contacts, and sensitive analogue or faster signals
should be placed with suitable adjacent ground returns. Connector orientation,
pin numbering and safe insertion/removal practice form part of the interface
contract. These are requirements for the later Target Interface specification,
not assignments made by this appendix.

## A.4 Resilience and Replacement Rationale

The removable target and daughter board add resilience compared with a target
hardwired directly into the harness. An MCU or development-board failure does
not require the reusable harness PCB to be disturbed.

Depending on the target socket arrangement, either the target alone or the
complete daughter-board assembly can be exchanged. A known-good spare also
provides a quick diagnostic boundary:

```text
Replace target MCU/module
          ↓ if fault remains
Replace target daughter board
          ↓ if fault remains
Diagnose reusable harness
```

This helps separate target failure, daughter-board mapping faults and reusable
harness faults. Mechanical wear, damaged GPIOs and early wiring mistakes are
also confined to a smaller and more easily reproduced assembly.

## A.5 Evolution into Manufactured Adapter PCBs

The daughter-board boundary provides a deliberate migration path:

```text
Wire-wrapped prototype daughter board
              ↓ mapping proven
Tidied/repeatable wire-wrapped revision
              ↓ target support stable
Manufactured passive adapter PCB
```

All stages remain interchangeable with the reusable harness because they meet
the same Target Interface contract. Early adapters remain inexpensive and easy
to correct, while mature or frequently used targets can later receive durable
manufactured PCBs.

The target daughter-board schematic should be the controlled description of
the mapping. Initially it acts as a wirewrap build and verification guide;
later it becomes the source for the adapter PCB layout. This avoids committing
to manufacture before pin allocation, strapping, power behaviour and test
routing have been proved.

## A.6 Alternatives Considered

| Approach | Strength | Main limitation |
|---|---|---|
| Target directly mounted and wired on each harness | Simplest electrical path and fewest connector contacts | Requires another permanent harness build or wiring rework for each target |
| Universal socket or patch field on the harness | Highly flexible during experimentation | Target-specific wiring remains on the main harness and is harder to reproduce or exchange |
| Ribbon-cabled external target adapter | Allows flexible physical positioning | Adds cable-related power, grounding, contact and signal-integrity uncertainty |
| Plug-in target daughter board | Reusable, inspectable, replaceable and independently testable | Requires a disciplined connector and Target Interface contract |
| Fully active switching matrix | Maximum software-controlled routing flexibility | Much greater circuit, firmware, cost and debugging complexity |

For V2, the plug-in daughter board gives the best balance of prototype
flexibility, serviceability, repeatability and a credible path to manufactured
hardware.

## A.7 Decision Benefits

The selected approach provides:

* rapid target interchange without rebuilding the reusable harness PCB
* convenient exchange of targets carrying different firmware versions
* easy replacement after MCU, development-board or connector failure
* independent construction, continuity testing and fault diagnosis
* good use of available turned-pin wirewrap male and female connectors
* visible and inspectable target-specific wiring during early development
* fewer reusable harness PCBs for a larger supported-target collection
* containment of target-specific straps, exceptions and physical layouts
* stable reusable Test Blocks, routing and Control Services
* reproducible spare adapters and known-good diagnostic substitutions
* a direct evolution from wirewrapped prototype to manufactured adapter PCB

## A.8 Provisional Inputs To The Target Interface Contract

This decision makes definition of the Target Interface pin-bank contract a
prerequisite for final daughter-board and reusable-harness layout. The contract
should define at least the following. These are provisional inputs until the
dedicated Target Interface specification accepts or refines them:

* connector type, count, numbering, keying and physical orientation
* logical signal name, direction and required or optional status
* voltage domain, current allowance and default safe state
* allocation of duplicated power and ground contacts
* direct, routable, reserved and target-service signals
* treatment of unimplemented resources on a particular target
* insertion/removal and power-off requirements
* daughter-board identity, target compatibility and revision scheme

Each daughter-board schematic and build document must map the target's physical
pins to this contract explicitly. The reusable harness schematic should show
the fixed interface-bank connectors and remain unchanged when a new target
daughter board is introduced.
