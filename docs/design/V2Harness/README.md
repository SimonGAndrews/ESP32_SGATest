# Espruino Test Harness V2

**Status:** Early Architecture and Design

---

## Overview

This directory contains the design work for the next generation of the Espruino hardware test harness.

The original **ESP32_SGATest** project demonstrated the value of a dedicated hardware platform for validating Espruino firmware running on ESP32 targets. It provides a practical foundation for hardware-assisted testing and has successfully supported development of the ESP32 platform.

The objective of the V2 Harness project is not to replace the original design, but to build upon the experience gained during its development and define a reusable architecture suitable for future Espruino targets.

The long-term vision is to establish a common hardware architecture that can be adapted for multiple microcontroller families while maintaining a consistent software testing framework.

---

## Project Objectives

The V2 Harness project aims to:

* Define a common architecture for future Espruino hardware test harnesses.
* Maximise reuse of hardware design across multiple target platforms.
* Reduce manual test configuration.
* Improve support for automated and unattended testing.
* Maintain a simple, low-cost design suitable for small production runs.
* Continue evolving from the proven ESP32_SGATest implementation.

---

## Current Status

The project is currently in the architectural design phase.

Work is presently focused on defining the logical structure of future harnesses rather than detailed hardware implementation.

Current areas of investigation include:

* Overall harness architecture.
* Hybrid manufactured-PCB plus target-wirewrap prototype structure.
* Standard hardware test blocks.
* A programmable Routing Layer for targets with limited GPIO resources.
* Common software abstractions for hardware resource allocation.
* Reusable design patterns that can be applied across multiple target platforms.

No final implementation decisions have yet been made.

## Current Scope

The current scope of V2 work is deliberately limited.

At present, V2 is a parallel architecture workstream only. It exists to define
concepts, terminology and design direction for future harness generations.

It is **not** currently the active delivery path for:

* shared functional test development
* bench regression execution
* day-to-day harness refinement
* target bring-up or firmware issue investigation

Those activities remain focused on the existing V1 harnesses.

In practical terms:

* V1 remains the active platform for test development and harness refinement
* V2 remains a design study until architectural ideas are mature enough to
  justify hardware and software implementation work

---

## Guiding Principles

The architecture is being developed around several key principles.

* **Evolution rather than replacement** – build upon the successful ESP32_SGATest project.
* **Simplicity first** – favour understandable, maintainable hardware over unnecessary complexity.
* **Standardisation** – reuse common hardware building blocks wherever practical.
* **Automation where it adds value** – reduce manual intervention without introducing excessive complexity.
* **Separation of concerns** – isolate target-specific hardware from reusable architectural components.

---

## Repository Structure

The V2 Harness documentation will gradually expand as the architecture matures.

At present the following areas are planned.

```text
V2Harness/

├── arch/
│   Architecture specifications
│
├── targets/
│   Provisional target-specific architecture and routing studies
│
├── schematics/
│   Hardware schematics and PCB development
│
├── research/
│   Design investigations and technical studies
│
└── decisions/
    Architecture Decision Records (ADRs)
```

Additional directories may be introduced as the project evolves.

---

## Relationship to ESP32_SGATest

The V2 Harness project should be regarded as the architectural successor to ESP32_SGATest.

Existing hardware designs remain the reference implementation.

Future harnesses are expected to retain successful concepts from the original project while introducing improvements that simplify configuration, improve reuse and support greater levels of automation.

The V1 harnesses and their functional tests are also the practical evidence base
for V2. New architectural ideas should be checked against proven V1 block
designs, bench workflows and software test structure before they are treated as
general patterns.

---

## Current Architecture Documents

The following documents provide the current architectural direction for the project.

* **TestHarnessArchitecture_V2.md**
  Defines the overall architecture and guiding principles for future harnesses.

* **I2CControlledRouting_V2.md**
  Explores a proposed Routing Layer to support programmable allocation of hardware test resources.

* **HybridHarnessArchitecture_V2.md**
  Defines the current hybrid prototype direction: a reusable manufactured PCB
  containing test blocks, routing hardware and named target-interface pins,
  combined with a target-specific wirewrap adaptation area.

Current target studies:

* **targets/esp32-c3-devkitc-02/gpio-allocation-and-routing-design.md**
  Captures the provisional ESP32-C3 V2 GPIO rationalisation, routing model,
  prototype component direction and unresolved design questions. It is the V2
  design-phase precursor to a target wiring specification, not an implemented
  wiring definition.

These documents represent the current design direction and are expected to evolve as the project progresses.

The architecture documents currently have different roles:

* `TestHarnessArchitecture_V2.md` is the top-level architectural definition and
  should change only when a genuine architectural decision is made.
* `I2CControlledRouting_V2.md` is a working proposal for one important part of
  that architecture and can evolve more freely as implementation thinking
  matures.
* `HybridHarnessArchitecture_V2.md` captures the current prototype build
  approach and is the bridge between the general architecture and the first V2
  KiCad schematic work.

---

## Project Philosophy

The intention of the V2 Harness project is to create a reusable hardware framework rather than a collection of independent test boards.

Future harnesses should share common architectural concepts, common software interfaces and reusable hardware building blocks while allowing each target platform to implement those concepts in the most appropriate manner.

The architecture is expected to evolve incrementally as practical experience is gained through implementation and testing.

## Relationship to V1 Development

Development of the V2 Harness architecture will progress in parallel with the continued development and expansion of the existing V1 test harnesses.

The V1 harnesses remain the primary platform for developing, validating and refining the Espruino hardware test framework. Experience gained from practical implementation and day-to-day use of these harnesses will continue to inform the V2 architecture.

In practical terms, V1 remains the active delivery path for:

* new shared REPL functional tests
* runner and evidence conventions
* target-specific block coverage
* bench validation of assumptions that may later become V2 architectural rules

This parallel approach provides several advantages:

* Continued delivery of practical testing capability using proven hardware.
* Validation of software test methodologies before new hardware is introduced.
* Opportunity to evaluate architectural ideas against real-world experience.
* Reduced project risk through incremental evolution rather than wholesale redesign.

The V2 Harness project should therefore be viewed as the long-term architectural evolution of the existing platform, with both hardware and software development expected to progress together as the architecture matures.
