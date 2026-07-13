# V2 Target Interface Contract Handover

**Date:** 12 July 2026
**Status:** Ready for a dedicated architecture workstream
**Scope:** Define the fixed Target Interface contract between removable target
daughter boards and the reusable V2 harness PCB

---

## 1. Purpose of This Handover

This document transfers the current V2 target-adaptation context into a
dedicated architecture thread.

The new thread should define a working Target Interface pin-bank contract for
removable target daughter boards. Practical KiCad construction, library editing
and schematic implementation will continue as a parallel workstream in the
existing KiCad-focused thread.

The contract is not yet defined. The daughter-board architectural direction is
agreed and recorded.

---

## 2. Required Reading

Read these documents before proposing the contract:

1. `AGENTS.md`
2. `docs/design/V2Harness/README.md`
3. `docs/design/V2Harness/arch/HybridHarnessArchitecture_V2.md`
4. `docs/design/V2Harness/arch/TestHarnessArchitecture_V2.md`
5. `docs/design/V2Harness/arch/TargetInterfaceArchitecture_V2.md`, if present
6. `docs/design/common-harness-design-and-blocks.md`
7. `docs/design/harness-modes.md`
8. the relevant target documents under `docs/targets/`

The authoritative statement of the newly agreed daughter-board direction is
Appendix A, **Plug-In Target Daughter-Board Direction**, in
`HybridHarnessArchitecture_V2.md`.

---

## 3. Agreed Architectural Direction

V2 will use removable target daughter boards for target-specific physical and
electrical adaptation.

The Target Interface pin banks form the fixed physical and logical boundary
between a daughter board and the reusable harness PCB:

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

The harness-side pin assignments are fixed. Each daughter board maps the
target's physical pins and constraints onto that contract.

Initial daughter boards may be constructed using prototype board, turned-pin
male and female connectors, and wirewrap. Stable target adapters may later be
implemented as manufactured passive PCBs without changing the harness-side
contract.

---

## 4. Functional Boundary

### 4.1 Target module or development board

The target provides:

* the MCU and target-board support circuitry
* the firmware instance under test
* native USB, UART, SWD, JTAG or other service connectors where fitted

### 4.2 Target daughter board

The daughter board provides:

* the target footprint, socket or removable header arrangement
* all target-specific physical-pin-to-interface mapping
* target-specific wirewrap and its build documentation
* target-specific straps, exclusions and optional selection links
* target and adapter identity and revision markings
* target-specific protection or level translation only when required

It should normally be a passive adapter. General test circuitry and reusable
routing logic belong on the harness PCB.

### 4.3 Reusable harness PCB

The harness PCB provides:

* the fixed Target Interface connectors and signal allocation
* standard functional test blocks
* direct test-resource paths
* routing, switching and route-control hardware
* reusable power, reset, boot and measurement provisions

The harness should operate in terms of logical interface resources, not target
header locations.

---

## 5. Reasons for the Decision

The daughter-board approach provides:

* rapid exchange of targets without rebuilding the permanent harness
* convenient comparison of targets carrying different firmware versions
* fewer reusable harness boards for a larger supported-target collection
* good use of available turned-pin wirewrap connector systems
* visible and inspectable target-specific wiring during prototyping
* independent continuity testing of each target adapter
* clean fault isolation between target, adapter and reusable harness
* easy MCU or development-board replacement after hardware failure
* reproducible spares and known-good substitution during diagnosis
* containment of target-specific straps and electrical exceptions
* a migration path from wirewrapped prototype to manufactured adapter PCB

The useful replacement boundaries are:

```text
Replace target MCU/module
          ↓ if fault remains
Replace target daughter board
          ↓ if fault remains
Diagnose reusable harness
```

The intended maturity path is:

```text
Wire-wrapped prototype daughter board
              ↓ mapping proven
Tidied/repeatable wire-wrapped revision
              ↓ target support stable
Manufactured passive adapter PCB
```

---

## 6. Alternatives Already Considered

| Approach | Strength | Main limitation |
|---|---|---|
| Target directly mounted and wired on each harness | Simplest electrical path | Requires another permanent build or wiring rework for each target |
| Universal socket or patch field on the harness | Highly flexible during experimentation | Target-specific wiring remains on the main harness and is harder to reproduce or exchange |
| Ribbon-cabled external target adapter | Flexible physical positioning | Adds cable-related power, grounding, contact and signal-integrity uncertainty |
| Plug-in target daughter board | Reusable, inspectable, replaceable and independently testable | Requires a disciplined connector and interface contract |
| Fully active switching matrix | Maximum software-controlled flexibility | Much greater hardware, firmware, cost and debugging complexity |

The plug-in daughter board is the selected direction.

---

## 7. Current KiCad State

The V2 KiCad project is under:

`KICAD_V2/Espruino_Harness_V2/`

Project libraries include:

* `V2_Harness.kicad_sym`
* `V2_Harness.pretty/`
* `V2_Targets.kicad_sym`
* `V2_Targets.pretty/`

The current schematic hierarchy contains sheets for:

* target interface
* routing control
* routing switches
* GPIO loopbacks
* analogue/PWM
* I2C functional testing
* SPI ADC
* one-wire
* UART
* power/reset/boot

This hierarchy is exploratory and may be revised after the interface contract
is defined.

The target libraries currently contain usable, manually reviewed symbols and
footprints for the main target set:

* ESP32-C3-DevKitC-02
* ESP32 DevKitC V4
* ESP32-S3-DevKitC-1 v1.1
* Olimex ESP32-S3-DevKit-LiPo-EA
* Raspberry Pi Pico family
* Espruino Pico
* Espruino MDBT42Q breakout

The footprints have been checked against available target dimensions and
pinout references. They include usable backside board outlines and pin labels
for wirewrap construction. Several footprints contain deliberate interactive
KiCad edits and should be treated as authoritative working copies.

Do not modify V1 projects as part of defining the contract.

---

## 8. Relevant Target Constraints

The contract must not assume that every target has the same available GPIOs,
peripherals or service paths.

Important examples include:

* ESP32-C3 `D18` and `D19` are native USB Serial/JTAG signals.
* ESP32-C3 `D20` and `D21` are UART0 and are normally associated with the
  board USB-UART console/flashing path.
* Classic ESP32 DevKitC V4 UART0 `D1` and `D3` is reserved for board
  USB-UART console/flashing/control.
* Classic ESP32 has strapping pins, module flash pins and input-only pins that
  require explicit treatment.
* ESP32-S3 boards expose native USB and USB-UART paths with target-specific
  connector and GPIO implications.
* Pico-family and Espruino targets have materially different power, debug and
  physical connector arrangements.

The interface should therefore define logical resources and optionality rather
than forcing every target to implement every signal.

Target-specific mappings must continue to preserve Espruino `Dxx` naming where
applicable and document all target constraints explicitly.

---

## 9. Contract Questions to Resolve

The new architecture thread should resolve, or explicitly defer, the following:

### 9.1 Physical connector system

* connector type and turned-pin implementation
* number and size of pin banks
* bank placement, spacing and daughter-board orientation
* keying, polarisation and prevention of offset insertion
* connector pin numbering and top/bottom viewing convention
* mechanical retention and supported daughter-board envelope

### 9.2 Power and safety

* allocation and duplication of ground contacts
* 3.3 V, 5 V, VIN, VBAT or other permitted rails
* source-versus-sink rules and current limits
* target power isolation and measurement links
* powered insertion/removal prohibition
* safe defaults when the daughter board is absent or partially inserted
* handling of target-specific voltage domains

### 9.3 Logical signal allocation

* mandatory service signals such as reset, boot and control
* direct GPIO test channels
* routed GPIO channels
* I2C, SPI, UART, one-wire, ADC and PWM resources
* native USB, USB-UART, SWD and JTAG treatment
* reserved and future-expansion contacts
* required, optional, excluded and unimplemented resource semantics

### 9.4 Electrical behaviour

* signal direction and allowed contention
* reset-safe state and biasing ownership
* analogue and faster-signal ground adjacency
* target-side series resistance, protection or level translation
* whether any target-presence or adapter-identification mechanism is required

### 9.5 Documentation and configuration

* canonical interface signal names
* connector and pin naming convention
* target daughter-board schematic template
* mapping-table format
* target/adapter identity and revision scheme
* continuity-test and acceptance procedure
* relationship between hardware mapping and test-runner target profiles

---

## 10. Expected Outputs from the New Thread

The first useful contract revision should produce:

1. a concise statement of interface scope and invariants
2. a proposed physical bank arrangement and pin count
3. a numbered pin-assignment table for every bank
4. electrical rules for each signal class
5. required, optional, reserved and unimplemented semantics
6. connector orientation and keying diagrams
7. at least two worked target mappings, preferably ESP32-C3 and classic ESP32
8. an initial continuity and insertion-safety checklist
9. a list of remaining risks or deliberately deferred decisions

The contract should be reviewed against all main targets before its pinout is
declared stable.

Once accepted, the KiCad implementation thread can create or update:

* Target Interface connector symbols and footprints
* reusable-harness connector instances
* a daughter-board KiCad project template
* target-specific daughter-board schematics
* pin-bank backside legends and construction documentation

---

## 11. Recommended First Task

Begin by inventorying the logical resources that the reusable harness must
offer and separating them into:

* mandatory direct service connections
* mandatory direct test resources
* switch-routed test resources
* optional target-service connections
* power, ground and measurement contacts
* reserved expansion

Then test the smallest plausible contract against the most GPIO-constrained
useful target and the widest target capability set. Avoid assigning physical
connector pins until the logical resource inventory and safety rules are
understood.

The objective is a practical first contract suitable for prototype daughter
boards, not an attempt to anticipate every future target.

---

## 12. Workstream Boundary

The dedicated architecture thread owns:

* Target Interface requirements and contract definition
* resource allocation and electrical rules
* connector-bank semantics
* cross-target validation of the proposed contract

The existing KiCad-focused thread owns:

* project-library maintenance
* schematic and PCB implementation
* connector symbol and footprint construction
* practical KiCad guidance
* implementation checks against the accepted contract

Contract decisions should be recorded in repository documentation before the
KiCad workstream treats them as implementation requirements.

---

## 13. Suggested New-Thread Prompt

> Please read `AGENTS.md`, `docs/design/V2Harness/README.md`,
> `docs/design/V2Harness/arch/HybridHarnessArchitecture_V2.md`, and
> `docs/handoff/2026-07-12-v2-target-interface-contract.md`. This thread will
> define the V2 Target Interface pin-bank contract for removable target
> daughter boards. Treat the existing KiCad work as a parallel implementation
> workstream. Begin with the logical resource inventory and safety invariants;
> do not fix the physical connector pinout until those are understood.
