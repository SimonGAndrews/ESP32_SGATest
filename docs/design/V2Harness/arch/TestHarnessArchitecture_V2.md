# V2 Espruino Test Harness Architecture

**Status:** Accepted
**Version:** 0.3
**Last Updated:** 17 July 2026

## 1. Purpose

This document is the top-level architecture entry point for the V2 Espruino
test harness.

It explains the overall system direction, design principles and relationship
between the focused V2 specifications. It does not duplicate their detailed
conceptual, physical, electrical or software definitions.

V2 develops a reusable hardware platform for validating Espruino firmware
across targets with different physical layouts, GPIO budgets, peripheral
capabilities and control paths. It evolves from the proven ESP32-family V1
harnesses while separating reusable harness circuitry from target-specific
adaptation.

## 2. Objectives

The V2 architecture aims to:

* provide a common harness architecture across multiple Espruino targets
* maximise reuse of hardware, functional tests and documentation
* support repeatable and increasingly automated hardware validation
* minimise manual configuration without hiding target-specific constraints
* remain understandable, inspectable and suitable for low-volume manufacture
* support independent construction, continuity testing and fault isolation
* evolve from proven V1 hardware and bench evidence

## 3. System Overview

The V2 harness system combines a target, a removable target daughter board and
a reusable harness PCB:

```text
Target module or development board
              |
              v
Target daughter board
              |
              v
Target Interface pin banks
              |
              | fixed physical, electrical and logical contract
              v
Reusable harness PCB
              |-- Test Blocks
              |-- routing fabric
              `-- Control Services
```

The target daughter board contains the target-specific physical mapping. The
reusable harness PCB contains the standard Test Blocks, routing fabric and
Control Services. The Target Interface pin banks form the stable boundary
between them.

The software-facing model is:

```text
Test requirements + Target Profile
                 |
                 v
        Target Support Module
                 |
                 v
    Resolved Test Configuration
                 |
                 v
     Harness Capabilities in use
```

Tests state their functional intent and required capabilities. Target Profiles
provide target-specific knowledge. A Target Support Module resolves and applies
the configuration, which is recorded with the test evidence.

The accepted definitions and relationships for these terms are in
`HarnessConceptualModel_V2.md`.

## 4. Architectural Areas

### 4.1 Conceptual Model

`HarnessConceptualModel_V2.md` defines the accepted V2 thought model and shared
vocabulary, including:

* Harness Capabilities
* Test Blocks
* Control Services
* Adapter Services
* Target Interface signals
* Target Profiles
* Target Support Modules
* Tests
* Resolved Test Configurations

It also defines how V2 absorbs the responsibilities of the V1 harness mode
model without retaining modes as a central V2 abstraction.

### 4.2 Physical Harness Architecture

`HybridHarnessArchitecture_V2.md` defines the accepted physical prototype
direction:

* removable target daughter boards
* the reusable manufactured harness PCB
* the Target Interface pin-bank boundary
* reusable routing and control circuitry
* wirewrapped prototype adapters that may evolve into manufactured passive
  adapter PCBs

It also preserves the decision rationale, replacement boundaries and open
physical-design questions.

### 4.3 Target Interface Contract

The Target Interface specification will define the fixed physical and
electrical contract between every target daughter board and the reusable
harness PCB. It must define:

* the Interface signal inventory
* signal direction, voltage domain and safe-state rules
* power, ground, reference and measurement provisions
* connector banks, numbering, keying and orientation
* direct, routable, optional, unavailable and reserved connection properties
* daughter-board compatibility, identity and acceptance requirements

Connector pin assignments must follow the logical inventory and safety rules;
they must not be settled incidentally during KiCad implementation.

### 4.4 Standard Test Blocks

`StandardTestBlocks_V2.md` defines the reusable Test Block inventory and the
electrical behaviour of each block.

The V1 blocks provide the starting evidence set, but V2 must review rather than
copy them. The review must include practical lessons about isolation,
replaceable devices, debugging access, safe loads and interactions between
blocks.

Test Blocks may declare dependencies on Control Services, but the service
behaviour is owned by its Control Service specification rather than repeated
in the block definition.

### 4.5 Standard Control Services

A focused V2 Control Service specification will define the reusable hardware
and behaviour used to configure, operate, observe and recover the harness. Its
scope includes:

* normal and alternate target control or console connections
* routing control and route-state verification
* reset and boot control
* 3.3 V power ownership, switching, measurement and recovery behaviour
* reusable host-facing serial or supervision facilities
* the boundary between reusable services and target-specific Adapter Services

A service may use routed connections, but the mechanism required to establish
or recover that service must not depend solely on the route being configured.
Route control, reset and the defined recovery path must avoid circular
dependencies.

#### Working Assumption: Optional Harness Supervisor

An optional, removable Harness Supervisor board is expected to provide
advanced host-coordinated Control Services. The current concept uses a simple
MCU such as an ESP32-C3 running a stable Espruino tool build, connected to the
host through USB and to the harness through I2C and selected digital control,
stimulus and capture signals. Expected baseline functions include routing
control, programmable-peer operation and Wi-Fi/Bluetooth functional-test
endpoints.

The standard harness remains independently usable with target-controlled
routing when the supervisor is absent. The Supervisor Interface, hardware,
firmware responsibilities and host protocol shall be designed in the planned
`StandardControlServices_V2.md` specification, after the initial routing
topology analysis and before the combined capability connection matrix and
physical Target Interface are finalised.

#### Working Assumption: Direct Target Reset And Boot Control

Hardware reset is expected to be a standard direct Control Service that remains
usable without responsive target firmware and does not depend on the Test Block
routing fabric. The provisional `TI_TARGET_RESET_N` Interface signal is an
active-low, open-drain harness control output. The reusable harness generates
the reset request; the target daughter board maps it to the target reset or
enable circuit and provides any required polarity, protection or isolation.

Boot-mode control is a related but separate optional service because target
polarity, pins and sequencing differ. `TI_BOOT_REQUEST` is a provisional
logical name only; its electrical contract, reset/boot sequence and interaction
with onboard download circuitry remain to be defined in
`StandardControlServices_V2.md`. Both Interface names remain provisional until
accepted by the Target Interface contract.

#### Working Consideration: Controlled Target Power Cycling

Controlled removal and restoration of target power shall be evaluated as a
standard Power Control Service. It could provide recovery when target firmware
or a direct reset path is unavailable, repeatable cold-start and boot testing,
verification of powered-off isolation, and restoration of a known initial
state. It supplements direct reset and boot control rather than replacing
them.

The planned `StandardControlServices_V2.md` review shall determine whether the
reusable harness provides a switched target supply and shall address:

* an independently powered controller, manual action or timed mechanism able
  to restore power after the target has been switched off
* target, Harness Supervisor and manual control ownership
* switch current rating, voltage drop, rise time, off-state discharge and
  optional supply-state sensing
* reverse-current and back-power prevention through USB, debug and Interface
  signals
* separation from the independently powered harness 3.3 V routing and logic
  domain
* target-specific supply inputs and any daughter-board power adaptation

The switched voltage, circuit topology and physical Target Interface contacts
remain open until that service and the wider power-source architecture are
reviewed.

### 4.6 Routing Fabric

`TargetRoutingEnvelope_V2.md` defines the accepted cross-target Test Block
routing minimum, legal common route functions and direct-path alternatives.
`I2CControlledRouting_V2.md` is the working implementation proposal. The
routing fabric is a standard capability of the reusable harness PCB intended
to support constrained targets without creating a general-purpose crosspoint
matrix.

The routing design must eventually define:

* legal connection topology
* switch and control-component selection
* reset-safe defaults
* route-control addressing and register behaviour
* route application, readback and evidence
* isolation between direct and routed paths

The routing proposal remains subject to alignment with the accepted conceptual,
hybrid, Test Block and Target Routing Envelope specifications and with the
forthcoming Control Service requirements.

### 4.7 Target Profiles And Test Support

Later specifications will define the Target Profile schema, Target Support
Module API and V2 functional-test structure.

Those specifications must keep tests understandable and efficient on
resource-constrained targets. They must also preserve visible target
assignments and reproducible evidence without requiring every test to upload a
large complete profile or configuration structure.

## 5. Design Principles

### Simplicity

Hardware and software should remain understandable, buildable and maintainable
without unnecessary complexity. Automation is introduced where it materially
improves repeatability or unattended execution.

### Incremental Evolution

V2 builds on proven V1 blocks, tests and bench evidence. New architecture is
introduced to solve demonstrated reuse, adaptation or automation needs rather
than to replace successful work without evidence.

### Stable Boundaries

The Target Interface and software-facing capability model should remain stable
while target daughter boards, routing implementation and Test Blocks mature
behind their documented ownership boundaries.

### Separation Of Responsibilities

Tests state intent. Target Profiles contain target knowledge. Target Support
Modules resolve configuration. Daughter boards implement target-specific
physical adaptation. The reusable harness PCB supplies common capabilities.

### Inspectability And Evidence

Target mappings, applied routes, control paths and external preconditions must
remain inspectable and recordable. Automation must not obscure the physical
configuration used to produce a result.

### Safety And Diagnosability

Default states must be safe for boot, flashing and normal control. Power-source
ownership, signal contention, routing defaults and insertion rules must be
explicit. Replaceable assemblies and isolation points should support practical
fault diagnosis.

## 6. Relationship To V1

The completed ESP32-C3 and classic ESP32 V1 harnesses remain the stable bench
platforms for:

* shared functional-test and runner development
* regression evidence and firmware comparisons
* practical evaluation of proposed V2 behaviour
* lessons about test-block loading, isolation and diagnosis

The V1 wiring, harness nodes and named modes remain authoritative for those
built boards. V2 refines the model for future reusable hardware; it does not
retroactively redefine V1 or reopen routine V1 hardware development.

## 7. Specification Authority And Implementation Boundary

Architecture decisions should be recorded in the appropriate V2 specification
before they become KiCad implementation requirements.

Use the following ownership:

| Subject | Authority |
|---|---|
| Shared vocabulary and functional relationships | `HarnessConceptualModel_V2.md` |
| Physical daughter-board and reusable-PCB architecture | `HybridHarnessArchitecture_V2.md` |
| Cross-target Test Block routing minimum and constraints | `TargetRoutingEnvelope_V2.md` |
| Routing implementation proposal | `I2CControlledRouting_V2.md` until refined or accepted |
| Target Interface signals, safety and connector contract | planned Target Interface specification |
| Standard Test Block inventory and electrical behaviour | `StandardTestBlocks_V2.md` |
| Standard Control Service behaviour | planned `StandardControlServices_V2.md` |
| Combined direct, routed, simultaneous-use and safe-state requirements | planned capability connection matrix feeding the routing and Target Interface specifications |
| Target-specific physical mapping | daughter-board schematic and target-specific documentation |
| KiCad symbols, footprints, schematic and PCB implementation | `KICAD_V2/Espruino_Harness_V2/` |

Each requirement has one authority. Other documents should link to that
requirement rather than restating its detailed behaviour. The combined
connection matrix integrates requirements from Test Blocks and Control
Services for implementation; it does not become a second behavioural
specification.

The current KiCad project is exploratory. It may evaluate components, routing
topologies and physical arrangements, but it must not silently establish an
architectural contract.

## 8. Planned Specification Sequence

The conceptual model, physical boundary, Standard Test Blocks and Target
Routing Envelope are accepted. The remaining architecture work should proceed
in this order:

1. define the standard Control Services, including console/control, routing,
   reset, boot and 3.3 V power-service behaviour
2. refine the routing topology and component proposal against the accepted
   routing envelope and emerging Control Service requirements without freezing
   the total channel or Interface contact count
3. derive one combined capability connection matrix covering provisional
   logical Interface signals, direct and routed paths, simultaneous use,
   safe states and recovery dependencies
4. finalise the routing specification against the combined matrix
5. establish the remaining Target Interface electrical safety rules
6. assign physical connector banks only after the capability, routing and
   safety reviews
7. define the Target Profile schema, Target Support Module API and V2 test
   specification
8. prepare a separate high-level architecture presentation for maintainer and
   wider design feedback
9. add minimal V1-to-V2 cross-references without rewriting V1 specifications
10. update the V2 documentation map, implement accepted contracts in KiCad and
    revise the model graphic

The standard harness logic, Target Interface and external Test Block connection
domain is fixed at 3.3 V. A Test Block may generate a contained local rail only
for its own documented test-device implementation; that rail must not reach the
target or become a general-purpose harness supply. Power-source architecture,
including external versus target-board supply, source isolation and prevention
of competing supplies, remains an explicit open Control Service,
physical-architecture and Target Interface subject.

## 9. Summary

V2 separates stable reusable harness capabilities from target-specific
adaptation through removable daughter boards and a fixed Target Interface.

The conceptual model defines what the system means. The hybrid architecture
defines its physical ownership boundaries. Focused specifications will define
the Test Blocks, routing fabric, Target Interface, target software support and
functional tests. The KiCad project implements accepted decisions while
remaining an exploratory prototype until those contracts are sufficiently
complete.
