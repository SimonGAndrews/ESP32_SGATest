# V2 Hybrid Harness Architecture

**Status:** Draft
**Version:** 0.1
**Last Updated:** 12 July 2026

---

# 1. Purpose

This document defines the current hybrid prototype direction for the V2
Espruino test harness.

The V2 hybrid harness is intended to bridge the gap between the proven V1
wirewrap harnesses and later target-specific manufactured PCBs. It uses a
manufactured PCB for the reusable harness circuitry, while preserving a
wirewrapped target-adaptation area for the development board under test.

The goal is to make the standard test blocks and routing hardware repeatable
without forcing every supported target board to have its own complete PCB from
the start.

This is an architecture and prototype-design note. It is not yet a schematic,
PCB layout, target mapping, or bill of materials.

---

# 2. Hybrid Harness Concept

The hybrid harness divides the hardware into two parts:

* a reusable PCB-resident harness area
* a target-specific wirewrap adaptation area

The PCB-resident area contains the reusable parts of the harness:

* standard test blocks
* routing and switching components
* route-control hardware
* power, reset, boot and control provisions
* named target-interface pin banks
* permanent PCB wiring from the target-interface banks to test blocks or to the
  routing layer

The target-specific area contains a generous through-hole grid where a target
development board, module breakout, or adapter can be mounted. The target's
GPIO and control pins are then wirewrapped to named target-interface pins on
the reusable PCB.

Conceptually:

```text
target board pins
   |
   | target-specific wirewrap
   v
named target-interface pins
   |
   | reusable PCB wiring
   v
direct test-block inputs and/or switch-layer-routed inputs
   |
   v
standard test blocks
```

The target-interface pin banks are the contract between the generic V2 PCB and
the target-specific adaptation wiring.

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
most: adapting a specific target board to the generic harness. At the same
time, it moves the more stable circuitry onto a manufactured PCB:

* MCP3008 SPI ADC block
* MCP23008 functional I2C block
* OneWire devices and extension points
* GPIO loopback and feedback paths
* UART crosslink provisions
* route-control expander
* analog switches or multiplexers
* labelled test points, bypass links and evidence-friendly debug access

This should reduce build variability in the reusable harness blocks while
allowing target mappings to evolve through hands-on prototype work.

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
same physical GPIO allocation. Instead, each target mapping decides which
logical resources are direct, routed, unavailable, or excluded by target
constraints.

---

# 5. Target Interface Pin Banks

The schematic should use explicit net names on the target-interface pin banks.

The target area itself is intentionally generic, so the reusable PCB side must
be unambiguous before any target-specific wirewrap exists.

Representative target-interface net classes include:

* control and power:
  * `TI_GND`
  * `TI_3V3`
  * `TI_5V`
  * `TI_RESET`
  * `TI_BOOT`
  * `TI_CTRL_I2C_SDA`
  * `TI_CTRL_I2C_SCL`
* routed GPIO entries:
  * `TI_ROUTE_0`
  * `TI_ROUTE_1`
  * `TI_ROUTE_2`
  * additional routed entries as required by the switching design
* direct test-block entries:
  * `TI_GPIO_LOOP_A_OUT`
  * `TI_GPIO_LOOP_A_IN`
  * `TI_GPIO_LOOP_B_OUT`
  * `TI_GPIO_LOOP_B_IN`
  * `TI_PWM_OUT`
  * `TI_ADC_IN`
  * `TI_SPI_MISO`
  * `TI_SPI_MOSI`
  * `TI_SPI_SCK`
  * `TI_SPI_CS_ADC`
  * `TI_SPI_CS_FLASH`
  * `TI_I2C_SDA`
  * `TI_I2C_SCL`
  * `TI_ONEWIRE_DQ`
  * `TI_UART_A_TX`
  * `TI_UART_A_RX`
  * `TI_UART_B_TX`
  * `TI_UART_B_RX`

USB, SWD, JTAG, battery and power-sense signals may also need target-interface
provisions, but they should be treated as target services rather than ordinary
test-block GPIO.

The final names may change during schematic work. The important architectural
rule is that target-interface pins should be labelled by harness role, not by a
specific target's GPIO number.

---

# 6. Connection Categories

Each target-to-harness connection should fall into one of the following
categories.

## Mandatory Direct Services

Mandatory direct services are target-support paths that should not pass through
the switch layer.

Examples:

* target ground
* target 3.3 V reference or supply where required
* reset
* boot or programming-mode control
* normal console, USB or flashing path
* native USB, SWD or JTAG paths where they are part of target bring-up
* permanent route-control I2C bus

These paths are part of the Target Interface, not ordinary routed test
resources.

## Direct Test Resources

Direct test resources connect a target-interface pin to a standard test block
without passing through the switch layer.

This is useful when a target has enough GPIO to dedicate pins to stable test
roles. It is also useful for signal-sensitive paths where the extra resistance,
capacitance or switching complexity of the routing layer is not needed.

Examples:

* a dedicated SPI bus to MCP3008
* a dedicated OneWire pin
* fixed GPIO loopbacks
* fixed UART crosslink pins
* fixed PWM-to-ADC feedback

## Routed Test Resources

Routed test resources connect target-interface pins to standard test blocks via
the switch layer.

This is useful for targets with limited GPIO resources, where one target pin
must serve different logical test roles in different modes.

The routed resources must be a controlled set of legal connections, not a full
arbitrary crosspoint matrix.

## Unimplemented Or Excluded Resources

A resource may be unavailable for a target if the target lacks the required
GPIO, peripheral capability or safe electrical conditions.

A resource may also be deliberately excluded if the only candidate pins are
reserved for boot, console, power control, USB, debug, onboard LEDs, onboard
buttons, or other target-specific functions.

The software and evidence model should report unavailable or excluded resources
explicitly rather than turning them into misleading test failures.

---

# 7. Routing Layer Policy

The hybrid PCB should include a standard switch layer designed around the
tightest useful GPIO target in the current envelope.

At the current design stage, ESP32-C3-class targets provide the main routing
pressure because their practical GPIO budget is limited once boot, UART0,
native USB, strapping, board loads and debug paths are respected.

Designing the routing layer around the constrained target has two advantages:

* the same PCB can support pin-limited targets without manual selector rewiring
* more generous targets can still use the switch layer where route-control
  behavior itself needs to be tested

However, generous GPIO targets should not be forced to route every block
through the switch layer. Their target mappings may choose clean direct
connections for high-value or signal-sensitive blocks.

The resulting policy is:

* the switch layer is a standard populated capability on the hybrid PCB
* each target mapping decides whether a logical resource is direct, routed,
  unavailable, or excluded
* direct and routed access to the same test block must be isolated by explicit
  links, selectors, solder jumpers or another reviewable mechanism
* route state must be written, read back and recorded before dependent tests run
* routing failures must be reported as routing failures, not as cascades of
  peripheral test failures

---

# 8. Target Mapping Examples

Target-specific documents should describe how target pins are wirewrapped to
the target-interface banks.

For a constrained target, the mapping may route many GPIOs through the switch
layer:

```text
D6  -> TI_CTRL_I2C_SCL
D7  -> TI_CTRL_I2C_SDA
D0  -> TI_ROUTE_0
D1  -> TI_ROUTE_1
D2  -> TI_ROUTE_2
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
target-specific V2 documents after the relevant board references and electrical
constraints have been reviewed.

---

# 9. Schematic Implications

The initial V2 KiCad schematic should make the hybrid boundary visible.

Recommended schematic structure:

* target area and target-interface banks
* mandatory direct service connections
* direct test-resource entry points
* routing-layer entry points
* route-control I2C controller
* switch or mux devices
* standard test blocks
* bypass, isolation and measurement links

The schematic should distinguish:

* target-specific wirewrap that is outside the reusable PCB logic
* reusable PCB nets that are part of the manufactured board
* direct block paths
* switch-layer-routed block paths
* reset-safe default states

The first schematic should be treated as a routing and hybrid-architecture
evaluation harness, not as the final V2 production design.

---

# 10. Target Profile Requirements

V2 target profiles need to describe more than a list of usable GPIOs.

For each candidate target pin, the profile should eventually capture:

* Espruino pin name
* physical target pin or header location
* allowed harness roles
* ADC, PWM, SPI, I2C, UART and watch capability
* boot, reset, strap, USB, SWD or JTAG constraints
* onboard LED, button, battery or power-control connections
* voltage tolerance and 3.3 V-only constraints
* deep-sleep or wake limitations where relevant
* default use as direct, routed, reserved, excluded or unimplemented

This keeps target-specific quirks visible while still allowing the reusable PCB
to expose a common target-interface contract.

---

# 11. Open Decisions

The following items remain open:

* target-area physical size and mounting assumptions
* target-interface pin-bank count, grouping and final net names
* number of routed target-interface entries
* direct versus routed isolation method for each test block
* switch truth table and route-control register map
* reset-safe switch defaults and enable/address biasing
* whether USB, SWD and JTAG should be PCB-routed, wirewrap-only, or provided as
  optional target-service headers
* how to sense or record target-specific external preconditions, such as an
  unplugged USB cable during a UART crosslink mode
* target profile schema and storage format
* first KiCad project naming and sheet hierarchy under `KICAD_V2/`

---

# 12. Summary

The V2 hybrid harness is a reusable manufactured PCB plus a target-specific
wirewrap adaptation area.

The reusable PCB contains the standard test blocks, routing hardware, control
hardware and named target-interface pin banks. The target area allows different
development boards to be mounted and wirewrapped to those named interface pins.

The switch layer should be standardised around the most GPIO-constrained useful
target, but each target mapping remains free to use direct, routed,
unimplemented or excluded resources as appropriate.

This preserves the flexibility of the V1 wirewrap process while moving the
repeatable harness circuitry toward a manufacturable V2 PCB.

---

# Appendix A. Plug-In Target Daughter-Board Direction

## A.1 Agreed Direction

The preferred V2 target-adaptation approach is a removable target daughter
board rather than a target wirewrapped directly onto the reusable harness PCB.

The target-interface pin banks become the physical and electrical boundary
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
it sees only the fixed logical target-interface signals.

## A.2 Functional Roles

The target module or development board provides:

* the MCU and its target-board support circuitry
* the firmware instance under test
* native target connectors such as USB, UART, SWD or JTAG where fitted

The target daughter board provides:

* the physical target footprint, socket or removable header arrangement
* target-specific mapping from physical target pins to the interface banks
* target-specific wirewrap and construction documentation
* target-specific straps, exclusions and optional selection links
* target and daughter-board identity and revision markings
* target-specific protection or level translation only where genuinely needed

The reusable harness PCB provides:

* fixed target-interface pin-bank connectors and signal assignments
* standard test blocks and direct test connections
* reusable routing, switching and route-control hardware
* reusable power, reset, boot and measurement provisions
* stable logical test resources independent of target header layout

General test circuitry and active routing should remain on the reusable harness
by default. A daughter board should normally be a passive adapter. This keeps
the common harness behaviour consistent and confines target-specific details to
the replaceable assembly.

## A.3 Construction and Operating Model

A daughter board can be continuity-tested and inspected independently before
it is connected to the reusable harness. Once proved, it becomes the physical
target profile for that board family.

Different targets, board revisions or firmware versions can then be exchanged
without rebuilding the permanent harness. A small number of reusable harness
PCBs can support a larger collection of targets and daughter boards. This is
particularly useful during early development, when several target mappings
need to be proved and corrected.

The connector system should be keyed or unmistakably marked. Power and ground
should use sufficient contacts, and sensitive analogue or faster signals
should be placed with suitable adjacent ground returns. Connector orientation,
pin numbering and safe insertion/removal practice form part of the interface
contract.

## A.4 Resilience and Replacement Boundaries

The removable target and daughter board add resilience compared with a target
hardwired directly into the harness. An MCU or development-board failure does
not require the permanent harness wiring to be disturbed.

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

## A.5 Evolution into Permanent Adapter PCBs

The daughter-board boundary provides a deliberate migration path:

```text
Wire-wrapped prototype daughter board
              ↓ mapping proven
Tidied/repeatable wire-wrapped revision
              ↓ target support stable
Manufactured passive adapter PCB
```

All stages remain interchangeable with the reusable harness because they meet
the same target-interface contract. Early adapters remain inexpensive and easy
to correct, while mature or frequently used targets can later receive durable
manufactured PCBs.

The target daughter-board schematic should be the controlled description of
the mapping. Initially it acts as a wirewrap build and verification guide;
later it becomes the source for the adapter PCB layout. This avoids committing
to manufacture before pin allocation, strapping, power behaviour and test
routing have been proved.

## A.6 Comparison with Alternative Approaches

| Approach | Strength | Main limitation |
|---|---|---|
| Target directly mounted and wired on each harness | Simplest electrical path and fewest connector contacts | Requires another permanent harness build or wiring rework for each target |
| Universal socket or patch field on the harness | Highly flexible during experimentation | Target-specific wiring remains on the main harness and is harder to reproduce or exchange |
| Ribbon-cabled external target adapter | Allows flexible physical positioning | Adds cable-related power, grounding, contact and signal-integrity uncertainty |
| Plug-in target daughter board | Reusable, inspectable, replaceable and independently testable | Requires a disciplined connector and target-interface contract |
| Fully active switching matrix | Maximum software-controlled routing flexibility | Much greater circuit, firmware, cost and debugging complexity |

For V2, the plug-in daughter board gives the best balance of prototype
flexibility, serviceability, repeatability and a credible path to manufactured
hardware.

## A.7 Summary of Advantages

The selected approach provides:

* rapid target interchange without rebuilding the reusable harness
* convenient exchange of targets carrying different firmware versions
* easy replacement after MCU, development-board or connector failure
* independent construction, continuity testing and fault diagnosis
* good use of available turned-pin wirewrap male and female connectors
* visible and inspectable target-specific wiring during early development
* fewer permanent harness boards for a larger supported-target collection
* containment of target-specific straps, exceptions and physical layouts
* stable reusable test blocks, routing and control circuitry
* reproducible spare adapters and known-good diagnostic substitutions
* a direct evolution from wirewrapped prototype to manufactured adapter PCB

## A.8 Required Target-Interface Contract

This decision makes definition of the target-interface pin-bank contract a
prerequisite for final daughter-board and reusable-harness layout. The contract
should define at least:

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
