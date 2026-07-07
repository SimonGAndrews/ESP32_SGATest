# I²C Controlled Routing Layer

**Status:** Working Proposal
**Version:** 0.1
**Last Updated:** 7 July 2026

---

# 1. Purpose

This document describes the proposed Routing Layer for future generations of the Espruino Test Harness.

The Routing Layer provides programmable electrical connections between target MCU GPIO pins and selected hardware test blocks.

Its purpose is to reduce manual configuration while maintaining a simple, low-cost hardware architecture suitable for low-volume manufacture.

This document represents the current architectural direction and should be regarded as a working proposal rather than a completed design.

---

# 2. Background

The original ESP32_SGATest project demonstrated that a manually configurable hardware test harness is practical and effective.

However, targets with limited GPIO resources (for example ESP32-C3) require individual GPIO pins to perform multiple testing roles.

The original solution uses manual configuration links.

Whilst this is entirely suitable for development, it limits unattended execution and makes automation difficult.

The Routing Layer aims to automate this resource assignment while preserving the simplicity of the existing design.

---

# 3. Design Objectives

The Routing Layer should:

* Reduce manual jumper changes.
* Support automated execution of hardware tests.
* Consume very few target GPIO pins.
* Be controlled through a common interface across all targets.
* Use inexpensive, widely available components.
* Remain easy to understand and debug.
* Build upon the proven ESP32_SGATest architecture.

The objective is **not** to create a general-purpose switching matrix.

---

# 4. Architectural Position

The Routing Layer forms an optional layer between the Target Interface and the Standard Test Blocks.

```text
                 Target Interface
                        │
                        ▼
                 Routing Layer
                        │
                        ▼
              Standard Test Blocks
```

Targets with abundant GPIO resources may bypass the Routing Layer entirely for many resources.

Targets with limited GPIO resources may use the Routing Layer only where necessary.

---

# 5. Routing Philosophy

The Routing Layer routes **test resources** rather than arbitrary GPIO connections.

For example:

```text
                 GPIO4
                   │
        +----------+----------+
        │          │          │
      SW1        SW2        SW3
        │          │          │
    OneWire     PWM       GPIO Loopback
```

Only one route would normally be active.

Likewise, a single test block may support several candidate GPIO pins.

```text
               OneWire Bus
                 │
        +--------+--------+
        │                 │
      SW4               SW5
        │                 │
      GPIO4            GPIO7
```

This architecture provides flexibility while avoiding the complexity of a full crosspoint switch.

Each target harness should define only the routing options that are electrically
valid and practically useful for that target. The Routing Layer is therefore a
controlled set of legal routes, not a mechanism for arbitrary GPIO-to-resource
connection.

This preserves an important balance:

* the PCB and harness designer retains control over what routing combinations
  are electrically sensible
* the software gains flexibility to select among those predefined options

---

# 6. Resource Model

Every routed connection joins:

**Target MCU GPIO**

to

**Logical Test Resource**

The Routing Layer therefore acts as a programmable interconnect rather than a signal source.

Resources may be:

* Bidirectional

  * GPIO
  * OneWire
  * I²C

* MCU Outputs

  * PWM measurement
  * UART transmit

* MCU Inputs

  * Interrupt generation
  * ADC reference

---

# 7. Why I²C?

The current preferred control mechanism is I²C.

Reasons include:

* Available on all supported targets.
* Only two MCU pins required.
* Easily expandable.
* Mature, inexpensive devices.
* Existing software support within Espruino.
* Can simultaneously support functional I²C testing.

The I²C bus controlling the Routing Layer should remain permanently connected.

The Routing Layer must never depend upon itself for configuration.

---

# 8. Proposed Hardware Architecture

```text
                     Target MCU
                         │
                 I²C SDA / SCL
                         │
                +----------------+
                | I²C GPIO        |
                | Expander        |
                +----------------+
                         │
                  Switch Control
                         │
        +--------------------------------+
        |        Routing Layer           |
        |                                |
        |  Analogue Switches / MUXes     |
        +--------------------------------+
              │          │          │
              │          │          │
         OneWire      PWM        Interrupt
          Resource   Resource     Resource
```

The exact implementation may vary between target harnesses.

---

# 9. Candidate Components

## I²C GPIO Expanders

Possible devices include:

* MCP23008
* MCP23017
* PCF8574
* PCF8575
* TCA9534
* TCA9555

These devices provide inexpensive expansion of routing control signals.

---

## Analogue Switches

Candidate devices include:

* 74HC4066
* 74HC4053
* 74HC4051
* 74HC4067

Future evaluation may include lower on-resistance switch families where required.

---

# 10. Design Constraints

The Routing Layer should:

* Switch only where beneficial.
* Avoid introducing unnecessary signal degradation.
* Minimise propagation delay.
* Fail safely after power-up.
* Be capable of manual bypass during development.
* Support incremental implementation.

It should **not** attempt to connect every GPIO to every resource.

It should also avoid creating routing combinations that are not explicitly
supported by the target harness design.

---

# 11. Software Abstraction

The software test framework should request logical resources rather than manipulating switches directly.

Illustrative examples:

```
Assign OneWire to GPIO4

Assign PWM Capture to GPIO5

Assign Interrupt Generator to GPIO7
```

The Routing Layer determines how these requests are implemented electrically.

This abstraction allows the same software tests to execute across multiple target harnesses.

---

# 12. Open Questions

The following topics remain under investigation.

* Preferred analogue switch family.
* Standard register map for Routing Layer control.
* Power-up default routing.
* Behaviour during target reset.
* Signal integrity.
* Support for higher-speed interfaces.
* Board capability description.
* Software Harness API.

---

# 13. Summary

The Routing Layer is intended to provide a simple, low-cost mechanism for sharing limited GPIO resources across multiple hardware test blocks.

Rather than implementing a fully programmable switch matrix, the Routing Layer provides only the routing options that are valid and useful for a particular target.

This approach preserves the simplicity of the original ESP32_SGATest design while enabling increased automation and improved reuse across future Espruino hardware test harnesses.
