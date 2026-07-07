# Espruino Test Harness Architecture

**Status:** Draft
**Version:** 0.1
**Last Updated:** 7 July 2026

---

# 1. Introduction

The Espruino Test Harness provides a hardware platform for validating Espruino firmware running on supported microcontroller targets.

The original **ESP32_SGATest** project demonstrated the value of a dedicated hardware test harness for validating GPIO, communications interfaces and other hardware peripherals. As additional target platforms are supported, the objective is no longer to develop individual test boards independently, but to define a common architecture that can be reused across all future harnesses.

This document defines that architecture.

It describes the logical organisation of future test harnesses, identifies the reusable architectural components and establishes the design principles that will guide future development.

This document intentionally concentrates on architecture rather than implementation. Detailed hardware designs and board-specific implementations are described separately.

---

# 2. Objectives

The architecture has the following objectives:

* Provide a common architecture for hardware test harnesses across multiple Espruino targets.
* Maximise reuse of hardware, software and documentation.
* Support automated execution of hardware validation tests.
* Minimise manual configuration during testing.
* Remain suitable for low-volume manufacture by contributors and hobbyists.
* Build incrementally upon proven hardware rather than replacing successful designs.

---

# 3. Design Principles

## Simplicity

Hardware should remain understandable, buildable and maintainable without specialist manufacturing techniques or expensive components.

Where several solutions exist, the simplest solution should normally be preferred.

---

## Incremental Evolution

The existing ESP32_SGATest project forms the baseline for future development.

Future harnesses should evolve from proven designs rather than introducing unnecessary architectural change.

---

## Standardisation

Future harnesses should share a common logical architecture wherever practical.

Although individual targets require different PCB layouts and routing, they should expose a common set of logical test resources to the software test suite.

---

## Automation

Automation should only be introduced where it significantly reduces manual intervention or enables unattended testing.

Automation is not an objective in itself.

---

## Separation of Responsibilities

The software test suite requests logical hardware resources.

The hardware implementation determines how those resources are physically connected.

Software must never depend upon PCB routing, jumper locations or board-specific wiring.

---

# 4. Architectural Overview

Each target harness is considered to consist of three logical layers.

```text
                Target Interface
                       │
                       ▼
             Routing Layer (optional)
                       │
                       ▼
             Standard Test Blocks
```

Each layer has a distinct responsibility.

---

## Target Interface

The Target Interface provides the physical connection between the target development board (or target MCU) and the remainder of the harness.

It is the only part of the architecture that is inherently target specific.

Responsibilities include:

* Physical connector or socket.
* Target power.
* Reset and Boot control.
* Available GPIO connections.
* Target-specific electrical considerations.

---

## Routing Layer

The Routing Layer provides optional programmable routing between target GPIO pins and selected test resources.

Not every harness requires programmable routing.

Targets with plentiful GPIO resources may connect directly to many test blocks, while targets with limited GPIO resources may selectively share hardware resources using the Routing Layer.

The Routing Layer presents a consistent logical interface to the software while allowing different electrical implementations on different targets.

Further details are provided in *I2CControlledRouting.md*.

---

## Standard Test Blocks

Standard Test Blocks implement reusable hardware functions.

Where practical, every target harness should contain the same logical collection of test blocks.

Typical examples include:

* GPIO loopback
* UART loopback
* SPI interface
* I²C interface
* OneWire interface
* ADC reference source
* PWM measurement
* Interrupt generation
* LEDs
* Push buttons
* Reset and Boot controls
* Power monitoring

The implementation of these blocks should be standardised and reused across future harnesses wherever practical.

---

# 5. Resource Model

Each logical test resource is classified as one of the following.

## Direct Resource

The test block is permanently connected to the target.

No routing is required.

---

## Routed Resource

The test block is connected through the Routing Layer.

The software requests the logical resource while the Routing Layer determines the physical connection.

---

## Unimplemented Resource

The test resource is not implemented for a particular target.

The software framework should be capable of recognising unavailable resources.

---

# 6. Software Model

The software test framework should operate entirely in terms of logical resources.

For example:

* Request a OneWire interface.
* Request a PWM measurement input.
* Request an interrupt generator.
* Request an ADC reference source.

The software should not require knowledge of:

* GPIO numbers used by the harness.
* PCB routing.
* Jumper locations.
* Switching hardware.

This abstraction allows identical software tests to execute across multiple target harnesses.

---

# 7. Relationship to ESP32_SGATest

The original ESP32_SGATest project forms the foundation of this architecture.

Future harnesses are expected to retain the successful concepts developed during the original project while introducing improvements in areas such as:

* Reduction of manual configuration.
* Increased automation.
* Improved reuse of hardware blocks.
* Support for additional target platforms.

The objective is evolution rather than replacement.

---

# 8. Future Work

The following architectural components will be documented separately as they mature.

* Standard Test Blocks
* Routing Layer
* Harness Control Interface
* Board Profiles
* Software Harness API

This document defines the architectural framework into which those components will fit.

---

# 9. Architecture Summary

The architecture is based upon four fundamental concepts.

1. **Target Interface**

   Provides the physical interface to the target hardware.

2. **Routing Layer**

   Optionally connects target GPIO resources to hardware test resources.

3. **Standard Test Blocks**

   Implements reusable hardware functions that are common across multiple harnesses.

4. **Common Software Framework**

   Executes hardware tests using logical resources rather than board-specific implementations.

By separating these concerns, future harnesses can evolve independently while remaining compatible with a common software test framework and a common set of architectural principles.
