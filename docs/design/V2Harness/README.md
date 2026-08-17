# Espruino Test Harness V2

**Status:** Active architecture and prototype implementation

## Purpose

V2 develops a reusable hardware architecture for Espruino target validation.
It builds on the completed ESP32-family V1 harnesses while separating reusable
test circuitry from target-specific physical adaptation.

V1 remains the stable bench platform for shared functional-test and runner
development. V2 architecture and KiCad implementation proceed in parallel and
consume lessons proved on V1.

## Current Direction

The agreed prototype direction is:

- a reusable manufactured harness PCB containing standard test blocks,
  routing, control and fixed Target Interface pin banks
- removable target daughter boards containing the target socket and
  target-specific mapping to that interface
- wirewrapped prototype daughter boards first, with manufactured passive
  adapter PCBs possible after mappings are stable

```text
Target module
     │ target-specific socket and wirewrap
     ▼
Target daughter board
     │ fixed Target Interface contract
     ▼
Reusable V2 harness PCB
     ├── Standard Test Blocks
     ├── Standard Control Services
     └── direct and routed connections
```

The conceptual model, Standard Test Blocks, Target Routing Envelope and
Standard Control Services are accepted. The accepted combined capability
connection matrix turns those requirements into a concrete path inventory,
simultaneous-use model and provisional Target Interface contact count. The
controlled-routing specification is also accepted against that matrix. The
accepted Target Interface uses two 24-pin connectors, each with two rows of
12 pins. Its complete 48-pin Connector A and Connector B pinout is fixed.
Exact connector parts, plating and KiCad footprints still need to be selected
and mechanically checked before the Rev-A harness is released. The current
KiCad project is a prototype implementation and must not be mistaken for a
frozen production design.

## Active V2 Workstreams

### Architecture and Target Interface

Defines:

- logical resource inventory
- direct, routed, optional and reserved signals
- connector-bank semantics and electrical safety
- daughter-board responsibilities
- cross-target compatibility rules
- Standard Test Blocks and Control Services
- combined direct, routed, simultaneous-use and recovery requirements

Start with:

- `arch/TestHarnessArchitecture_V2.md`
- `arch/HarnessConceptualModel_V2.md`
- `arch/HybridHarnessArchitecture_V2.md`
- `arch/DaughterBoardMatrix_V2.md`
- `arch/StandardTestBlocks_V2.md`
- `arch/StandardControlServices_V2.md`
- `arch/TargetRoutingEnvelope_V2.md`
- `arch/CombinedCapabilityConnectionMatrix_V2.md`
- `arch/TargetInterfaceContract_V2.md`
- `arch/ReusableHarnessPrototypeStrategy_V2.md`
- `../../handoff/2026-07-17-v2-services-and-routing.md`

### KiCad implementation

The accepted architecture will be implemented in a fresh Rev-A project under:

- `../../../KICAD/V2/RevA/Espruino_Harness_RevA/`

The earlier exploratory project is preserved under
`../../../KICAD/V2/Exploration/Espruino_Harness_V2/`. It contains:

- an exploratory hierarchical schematic
- project-local `V2_Harness` component libraries
- project-local `V2_Targets` symbol and footprint libraries
- reviewed target assets for the main ESP32, ESP32-S3, Pico and Espruino
  target set

Read `../../../KICAD/V2/Exploration/Espruino_Harness_V2/TARGET_LIBRARY_PROVENANCE.md`
before modifying target assets. Several footprints contain authoritative
interactive edits.

### Rev-A implementation baseline

The draft manufacturing baseline, circuit-block review records and visual
review images live under:

- `implementation/ReusableHarnessRevA_DesignBaseline.md`
- `implementation/ReusableHarnessRevA_ConnectivityChecker.md`
- `implementation/ReusableHarnessRevA_PCBImplementationAndVerification.md`
- `implementation/review-images/`

The design baseline requires the deterministic connectivity check and decides
whether its evidence is accepted for Rev-A release. The connectivity-checker
specification defines the tool that performs that check.

`PC01` Operating mode and 3.3 V rails, `PC02` Target 5 V switch and two-range
monitor, `RC01` Routing Fabric, `RC02` routing controllers and fixed I2C
isolation, and `TB01` digital GPIO loopback are verified at schematic-baseline
level. Their PCB, physical-test and AISLER actions remain in the implementation
register. The next planned baseline-review area is `TB02` analogue/PWM
feedback on `standard_test_blocks.kicad_sch`.

PCB-layout work starts with the **PCB implementation action register** in
Section 6 of the design baseline. It is the single handover list for physical
layout, mechanical, DFM and release actions accumulated by the block reviews.

Generated KiCad evidence and the machine-readable connectivity contract live
under `../../../KICAD/V2/RevA/Espruino_Harness_RevA/verification/`.

## Document Roles

- `arch/TestHarnessArchitecture_V2.md` defines the overall architecture and
  should change only for genuine architectural decisions.
- `arch/HarnessConceptualModel_V2.md` owns the shared capability vocabulary and
  relationships.
- `arch/StandardTestBlocks_V2.md` owns reusable Test Block behaviour and
  electrical requirements.
- `arch/TargetRoutingEnvelope_V2.md` owns the accepted seven-entry Test Block
  routing minimum, legal common route functions, direct-path alternatives and
  cross-target routing constraints.
- `arch/StandardControlServices_V2.md` owns reusable power, target-control,
  routing, reset and boot, Supervisor, event-handshake and rack-service
  behaviour.
- `arch/WiFi_V1SupervisorPeerEvidence.md` assesses the completed V1 Wi-Fi
  Supervisor Peer evidence and open gaps; it is an evidence input, not a
  second Control Service specification.
- `arch/CombinedCapabilityConnectionMatrix_V2.md` is the accepted integration
  of Test Block and Control Service requirements for routing and Target
  Interface design without duplicating their behavioural specifications.
- `arch/I2CControlledRouting_V2.md` is the accepted controlled-routing
  specification.
- `arch/TargetInterfaceContract_V2.md` owns the physical Target Interface
  electrical and connector contract. Its complete two-connector 48-pin pinout
  is accepted; exact connector parts, plating, footprints and mechanical
  verification remain in progress.
- `arch/HybridHarnessArchitecture_V2.md` defines the prototype boundary and
  records the removable daughter-board decision in Appendix A.
- `arch/DaughterBoardMatrix_V2.md` owns the three-board target allocation,
  exact-variant matrix, mounting and shared-footprint compatibility decisions,
  and the complex-board-first implementation gates.
- `arch/ReusableHarnessPrototypeStrategy_V2.md` defines the Rev-A manufactured
  harness, wire-wrap daughter-board and pre-manufacture validation approach.
- `implementation/ReusableHarnessRevA_DesignBaseline.md` records the selected
  Rev-A implementation and the evidence required before manufacturing release.
- `implementation/ReusableHarnessRevA_ConnectivityChecker.md` specifies the
  deterministic checker used by that baseline to verify the complete root
  KiCad netlist against the independently reviewed connectivity contracts.
- `implementation/ReusableHarnessRevA_PCBImplementationAndVerification.md`
  will guide and record board placement, routing and PCB verification without
  duplicating the authoritative KiCad PCB database or the baseline action
  register.
- `targets/esp32-c3-devkitc-02/gpio-allocation-and-routing-design.md` is a
  provisional target study, not an implemented wiring specification.
- `../../handoff/2026-07-17-v2-services-and-routing.md` transfers the accepted
  architecture and Control Services into the routing-design thread.

## Relationship to V1

Routine V1 hardware construction and prototyping have stopped. The completed
ESP32-C3 and classic ESP32 harnesses are used for:

- shared REPL functional-test development
- runner and result-format development
- regression testing and firmware comparison
- bench evidence for assumptions that may inform V2

V2 does not replace this active bench role. It generalises the proven ideas
into a reusable future harness.

## Guiding Principles

- Evolution rather than replacement.
- Simplicity before unnecessary automation.
- Stable logical interfaces and explicit physical boundaries.
- Separation of reusable harness functions from target-specific adaptation.
- Hardware proof before firmware conclusions.
- Prototype and measure before committing to manufactured adapters.
- Preserve replaceability, inspectability and independent fault diagnosis.

## Repository Layout

```text
docs/design/V2Harness/
├── README.md
├── arch/             Current architecture specifications
└── targets/          Provisional target allocation studies

KICAD/
├── V1/               Completed V1 harness projects
└── V2/
    ├── Exploration/  Preserved exploratory V2 work
    ├── ComponentDevelopment/
    │   └── EspruinoPicoDirectMount/
    ├── RevA/         Fresh Rev-A implementation
    └── upstream/     Ignored upstream reference checkouts
```

Repository-relative paths are canonical on both Windows and Ubuntu.
