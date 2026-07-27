# V2 Services And Routing Design Handover

**Date:** 17 July 2026
**Status:** Current V2 architecture handover
**Updated:** 27 July 2026
**Scope:** Carry the accepted V2 capabilities, combined connection matrix and
controlled-routing specification into the physical Target Interface contract

## 1. Purpose

This handover provides the starting context for the next focused V2 design
thread. The logical-resource, target-envelope, Control Service, combined
connection and controlled-routing reviews are complete. The next work should
define the physical Target Interface electrical and connector contract.

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

### 5.3 Subsequent integration

`CombinedCapabilityConnectionMatrix_V2.md` is accepted. It resolves the
current 19 route-selection paths, four UART block-local paths, fixed direct
and I2C-isolation paths, two fixed Supervisor event-handshake paths,
simultaneous configurations and direct/routed conflicts without increasing
the seven-`TMUX1511` baseline.

The subsequent integration order is:

1. complete the Rev-A connector implementation for the accepted two-connector
   48-pin allocation in `TargetInterfaceContract_V2.md` by selecting the exact
   male and female parts, plating and verified KiCad footprints
2. implement accepted requirements in the V2 KiCad project

The Target Interface pin allocation is accepted. Exact connector sourcing and
footprint/mechanical verification remain downstream work.

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

KiCad work remains a parallel implementation workstream. Preserve interactive
library and footprint edits and do not treat exploratory schematic content as
an accepted architecture requirement.

## 7. Relevant Commits

* `58cb90e` — accepted V2 Target Routing Envelope
* `a9d7003` — V2 routing, debug and Control Service working assumptions

## 8. Suggested New-Thread Prompt

> Workstream: V2 architecture and Target Interface contract
> Current objective: use the accepted combined connection matrix and
> controlled-routing specification to define the physical Target Interface
> electrical contract and connector banks. Read `AGENTS.md`,
> `docs/design/V2Harness/README.md` and
> `docs/handoff/2026-07-17-v2-services-and-routing.md`. Treat
> `CombinedCapabilityConnectionMatrix_V2.md` and
> `I2CControlledRouting_V2.md` as accepted inputs.
