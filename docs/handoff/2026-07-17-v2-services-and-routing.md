# V2 Services And Routing Design Handover

**Date:** 17 July 2026
**Status:** Current V2 architecture and Rev-A implementation handover
**Updated:** 12 August 2026
**Scope:** Carry the accepted V2 architecture and Target Interface contract
through Rev-A circuit-block verification and PCB implementation

## 1. Purpose

This handover provides continuity from the accepted V2 architecture into the
Rev-A implementation baseline. The conceptual model, Test Blocks, Control
Services, routing envelope, combined connection matrix, controlled-routing
design and 48-contact Target Interface contract are accepted. The first-pass
Rev-A schematic hierarchy is implemented. `PC01`, `PC02`, `RC01`, `RC02` and
`TB01` are verified at schematic-baseline level; their physical and
manufacturing actions remain in the PCB implementation register. The next
review area is `TB02` analogue/PWM feedback.

The detailed target assessments should be consumed as accepted design input,
not repeated in the new thread.

## 2. Required Reading

Read in this order:

1. `AGENTS.md`
2. `docs/design/V2Harness/README.md`
3. `docs/design/V2Harness/arch/TestHarnessArchitecture_V2.md`
4. `docs/design/V2Harness/arch/HarnessConceptualModel_V2.md`
5. `docs/design/V2Harness/arch/HybridHarnessArchitecture_V2.md`
6. `docs/design/V2Harness/arch/StandardTestBlocks_V2.md`
7. `docs/design/V2Harness/arch/StandardControlServices_V2.md`
8. `docs/design/V2Harness/arch/TargetRoutingEnvelope_V2.md`
9. `docs/design/V2Harness/arch/I2CControlledRouting_V2.md`
10. `docs/design/V2Harness/arch/CombinedCapabilityConnectionMatrix_V2.md`
11. `docs/design/V2Harness/arch/TargetInterfaceContract_V2.md`

`I2CControlledRouting_V2.md` and
`CombinedCapabilityConnectionMatrix_V2.md` are accepted implementation inputs
to the Target Interface and schematic work.

## 3. Accepted Outputs From The Completed Thread

### 3.1 Conceptual and physical architecture

* The reusable harness is described through Test Blocks, Control Services and
  target-specific Adapter Services.
* Removable target daughter boards provide target-specific physical mapping to
  a fixed Target Interface.
* The reusable harness PCB owns the Standard Test Blocks, routing fabric and
  reusable Control Services.
* Harness modes are not part of the V2 software-facing model. Tests request
  capabilities; the Target Profile and Target Support Module resolve the
  required assignments and actions.
* The daughter-board schematic is the controlled physical description of the
  target mapping. The Target Profile is its software-facing expression.

### 3.2 Standard Test Blocks

`StandardTestBlocks_V2.md` is accepted and defines:

* digital GPIO loopback
* analogue/PWM feedback
* I2C functional device and extension facilities
* SPI functional device, MCP3008 observation and removable microSD extension
* the merged 1-Wire functional-device and DS2413 GPIO block
* UART crosslink and external-peer operation
* addressable-RGB output through the prototype Pixel Shifter module

The document also owns Test Block safe states, isolation, diagnostic
provisions, programmable-peer requirements and the provisional target-facing
signal inventory.

### 3.3 Target Routing Envelope

`TargetRoutingEnvelope_V2.md` is accepted. Its principal result is:

* a minimum of seven simultaneously usable Test Block route entries, R0-R6
* mandatory direct `TI_I2C_SDA` and `TI_I2C_SCL`
* a common seven-entry routed form for the assessed ESP targets
* independent direct Test Block entry points and selective routing for targets
  whose GPIO/peripheral mux favours that form
* two-UART crosslink and single-UART external-peer forms for Block 7
* high-impedance defaults, one-active-source rules, reset-safe strapping-pin
  treatment and powered-off isolation

The seven entries are the Test Block route-selection minimum. They are not the
total switch-channel count. Block-local switches, Control Service connections
and programmable-peer paths are additional and remain to be designed.

The design-basis set covers ESP32-C3, classic ESP32, ESP32-S3, Raspberry Pi
Pico 1/2 families, Espruino Pico and MDBT42Q. Post-design checks against the
Seeed Studio XIAO ESP32-S3 and ESP32-C3-DevKitM-1 required no expansion of the
envelope. No further target what-if exercise is required at this stage.

## 4. Accepted Decisions To Carry Forward

* The standard harness remains usable without a Harness Supervisor; the target
  owns routing in every powered Operating Mode.
* The Supervisor may invoke Hardware Clear but does not own the target
  routing-control I2C or select arbitrary routes.
* The optional Harness Supervisor is a separate MCU assembly, potentially
  ESP32-C3 based, coordinated by the host over USB and connected to rack
  positions through its Supervisor-owned Rack Control Backplane.
* Route-selection switching and block-local connection switching are distinct
  inventories even if they share I2C control hardware.
* Routing-control and switching devices use an independently powered harness
  3.3 V domain and must remain safe when the target is unpowered.
* Hardware reset is a direct Control Service represented provisionally by
  active-low open-drain `TI_TARGET_RESET_N`.
* Boot request is a related optional target-adapted service represented
  provisionally by `TI_BOOT_REQUEST`.
* `SUPERVISOR` mode provides controlled target-power cycling and power
  measurement using an independent switch and Target Power Monitor per rack
  position.
* Hardware debugging is coordinated by the host and normally uses a
  target-specific connector or pad transfer on the daughter board as an
  Adapter Service. A debug probe is not integrated into the reusable harness.

All Interface names remain provisional until accepted by the Target Interface
contract.

## 5. Recommended Next Work

### 5.1 Standard Control Services — Completed

The accepted `docs/design/V2Harness/arch/StandardControlServices_V2.md`
defines:

* host and target test-control paths
* firmware upload and console ownership
* routing-control ownership, establishment, verification and recovery
* direct reset and optional boot sequencing
* target and routing-logic power, controlled power cycling and supply sensing
* Harness Supervisor and programmable-peer responsibilities
* Wi-Fi and Bluetooth peer functions
* safe state, back-power prevention and evidence requirements for each service

Keep reusable Control Service behaviour separate from target-specific Adapter
Service implementation.

### 5.2 Controlled routing — Completed

The accepted `I2CControlledRouting_V2.md` fixes:

* the 19 R0-R6 route-selection paths and four Block 7 UART paths
* six software-controlled and one fixed-I2C-isolation `TMUX1511`
* two routing-control MCP23017 devices
* target-owned control, Hardware Clear, safe defaults and readback
* direct-I2C power-domain isolation and separate pull-up domains
* electrical, diagnostic and prototype-acceptance requirements

### 5.3 Target Interface and Rev-A implementation progress

`CombinedCapabilityConnectionMatrix_V2.md` is accepted. It resolves the
current 19 route-selection paths, four UART block-local paths, fixed direct
and I2C-isolation paths, two fixed Supervisor event-handshake paths,
simultaneous configurations and direct/routed conflicts without increasing
the seven-`TMUX1511` baseline.

The Target Interface pin allocation is accepted as two 24-pin banks and is
implemented provisionally in the Rev-A hierarchy. Exact connector sourcing,
plating, footprint and mechanical verification remain downstream release
work.

The Rev-A project now contains the first-pass hierarchy for the Target
Interface, Standard Test Blocks, Routing Control, Power Control and Rack
Control Endpoint. The complete hierarchy passes ERC, and the deterministic
connectivity checker records accepted evidence for `PC01`, `PC02`, `RC01`,
`RC02`, `TB01` and the cross-sheet `SYS01` power-event contract.

Continue implementation review in this order:

1. verify `TB02` analogue/PWM feedback, using the retained V1 prototype results
   as functional evidence while independently checking the Rev-A SMD passives,
   connectors, connectivity and PCB actions
2. continue block-by-block through the Standard Test Blocks and remaining
   interfaces
3. carry every physical-layout consequence into the baseline PCB
   implementation action register

The Generic Daughter Board is a separate KiCad project and workstream. Its
project-local libraries and exploratory layout are not part of the reusable
harness baseline review.

## 6. Deliberate Boundaries

Do not reopen the accepted Test Block inventory or target mappings without new
bench, target or implementation evidence. Assign physical Target Interface
contacts only through the Target Interface specification and preserve the
accepted matrix, routing and safety requirements. Do not put completion of the
optional Harness Supervisor on the critical path for the first routing
prototype.

Maintainer and wider design feedback should be prepared through a separate,
high-level architecture presentation. The detailed target-routing assessment
is an engineering authority, not the preferred feedback document.

KiCad implementation consumes the accepted architecture but does not redefine
it silently. Record any material requirement change in the owning architecture
document before accepting the corresponding circuit. Preserve interactive
library, schematic and footprint edits, and follow the Rev-A design-baseline
process for circuit signoff.

## 7. Relevant Commits

* `58cb90e` — accepted V2 Target Routing Envelope
* `a9d7003` — V2 routing, debug and Control Service working assumptions

Additional implementation milestones:

* `f52c8d4` — accepted routing and Target Interface contracts
* `cdf6e10` — completed the first-pass Standard Test Block schematic
* `726792a` — implemented the routing fabric and controllers
* `10b6998` — recorded the first-pass Rev-A schematic milestone
* `e1d2ed9` — added the deterministic connectivity checker
* `bc7aeb5` — verified the PC01/PC02 power-control baseline
* `65768cf` — updated the permanent Rev-A review context

## 8. Suggested New-Thread Prompt

> Workstream: V2 KiCad implementation
> Current objective: complete `TB02` analogue/PWM feedback baseline
> verification and signoff.
> Read `AGENTS.md`, `docs/design/V2Harness/README.md`, the Rev-A Design
> Baseline and Connectivity Checker specification, then Standard Test Blocks
> and the combined-matrix specification. Follow the accepted baseline process:
> requirements and manufacturer-source review, circuit analysis, exact-part
> and package evidence, visual review, deterministic connectivity contracts,
> full-hierarchy ERC and recorded PCB-stage actions.
