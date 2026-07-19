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

The conceptual model, Standard Test Blocks and Target Routing Envelope are now
accepted. The next specification work defines the Standard Control Services
and aligns the routing-fabric proposal with the accepted seven-entry envelope.
Their requirements will then be combined before the physical Target Interface
contract is fixed. The current KiCad project is a prototype implementation and
must not be mistaken for a frozen production design.

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
- `arch/StandardTestBlocks_V2.md`
- `arch/StandardControlServices_V2.md`
- `arch/TargetRoutingEnvelope_V2.md`
- `../../handoff/2026-07-17-v2-services-and-routing.md`

### KiCad implementation

Implements accepted architecture in:

- `../../../KICAD_V2/Espruino_Harness_V2/`

The project currently contains:

- an exploratory hierarchical schematic
- project-local `V2_Harness` component libraries
- project-local `V2_Targets` symbol and footprint libraries
- reviewed target assets for the main ESP32, ESP32-S3, Pico and Espruino
  target set

Read `../../../KICAD_V2/Espruino_Harness_V2/TARGET_LIBRARY_PROVENANCE.md`
before modifying target assets. Several footprints contain authoritative
interactive edits.

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
- `arch/StandardControlServices_V2.md` owns reusable power, Supervisor,
  event-handshake and later routing, reset and boot service behaviour.
- a combined capability connection matrix will integrate Test Block and
  Control Service requirements for routing and Target Interface design without
  duplicating their behavioural specifications.
- `arch/I2CControlledRouting_V2.md` is the working routing-layer proposal.
- `arch/HybridHarnessArchitecture_V2.md` defines the prototype boundary and
  records the removable daughter-board decision in Appendix A.
- `targets/esp32-c3-devkitc-02/gpio-allocation-and-routing-design.md` is a
  provisional target study, not an implemented wiring specification.
- `../../handoff/2026-07-17-v2-services-and-routing.md` transfers the current
  accepted architecture into the next Control Service and routing-design
  thread.

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

KICAD_V2/Espruino_Harness_V2/
├── project files and hierarchical sheets
├── V2_Harness.*      Project component libraries
├── V2_Targets.*      Curated target libraries
└── TARGET_LIBRARY_PROVENANCE.md
```

Repository-relative paths are canonical on both Windows and Ubuntu.
