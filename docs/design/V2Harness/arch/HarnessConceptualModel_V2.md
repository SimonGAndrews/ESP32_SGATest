# V2 Harness Conceptual Model

**Status:** Accepted  
**Version:** 0.1  
**Last Updated:** 12 July 2026

## 1. Purpose

This document defines the conceptual model and shared vocabulary for the V2
Espruino test harness.

It refines the model developed through the completed ESP32-family V1 harnesses
for a reusable V2 harness PCB with removable target daughter boards, automatic
routing and software-facing target descriptions.

This document defines how the main V2 concepts relate. It does not define the
detailed circuitry of individual test blocks, the Target Interface connector
or pin assignment, routing-device implementation, a Target Profile file format,
the detailed Target Support Module API, or target-specific daughter-board
mappings. Those subjects belong in focused specifications that use this model.

## 2. Four Questions

The V2 model separates four questions that were partly combined in the V1
hardware and documentation:

1. **What hardware capabilities exist?**
2. **How can a particular target use those capabilities?**
3. **How is the required hardware configuration established?**
4. **What does a test ask the system to do?**

| Question | Primary concept |
|---|---|
| What hardware capabilities exist? | Harness Capabilities |
| How can this target use them? | Target Profile |
| How is the configuration established? | Target Support Module and Resolved Test Configuration |
| What behaviour is requested and validated? | Test |

Keeping these questions separate allows the reusable harness hardware, target
adaptation and functional tests to evolve without embedding one another's
implementation details.

## 3. Physical Model

The V2 harness has a fixed physical and logical boundary between the removable
target daughter board and the reusable harness PCB:

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
              |-- test blocks
              |-- routing fabric
              `-- harness control services
```

The target daughter board maps the target's physical pins and target-specific
requirements onto the fixed Target Interface. The reusable harness operates in
terms of Target Interface signals and does not depend on the target's physical
header layout or GPIO numbering.

The Target Interface pin banks are simultaneously:

* the physical connector boundary
* the electrical compatibility boundary
* the logical signal boundary
* the schematic net-name boundary

The daughter-board mapping may initially be implemented with wirewrap and may
later become a manufactured passive adapter PCB without changing the reusable
harness contract.

## 4. Harness Capabilities

A **Harness Capability** is hardware functionality made available by the V2
harness system. Harness Capabilities are divided into Test Blocks, Control
Services and Adapter Services.

```text
Harness Capabilities
  |-- Test Blocks
  |     GPIO, analogue, I2C, SPI, OneWire, UART, ...
  |
  |-- Control Services
  |     control connection, routing, reset, boot, power, ...
  |
  `-- Adapter Services
        exceptional target-specific support on a daughter board
```

This distinction separates hardware used as the subject or physical context of
a functional test from hardware used to configure and operate the test system.

### 4.1 Test Blocks

A **Test Block** is a reusable hardware capability implemented on the harness
PCB and exposed through one or more named Target Interface signals.

Each Test Block has:

* a fixed physical implementation on the reusable harness PCB
* a defined logical test purpose
* a fixed set of relevant Target Interface signals
* target-specific pin assignments supplied through a Target Profile

| Element | Source |
|---|---|
| Block identity and behaviour | Reusable harness specification |
| Target Interface signals used by the block | Target Interface contract |
| Target GPIO or peripheral assignment | Target Profile |
| Direct or routing-fabric connection used for a test | Resolved Test Configuration |

The initial V2 Test Block inventory is expected to evolve from the proven V1
blocks, including GPIO loopback, analogue/PWM feedback, I2C, SPI, OneWire and
UART capabilities. The final inventory and electrical implementation belong in
a separate V2 standard-block specification.

A Test Block can participate in more than one test, and a test can require
more than one Test Block.

### 4.2 Control Services

A **Control Service** is a harness capability used to configure, operate,
observe or recover the test system. Examples include:

* the normal target control or console connection
* routing control and route-state verification
* reset and boot control
* target power control or measurement
* other reusable measurement or supervision functions

A Control Service can be infrastructure for one test and the subject of
another. For example, reset can prepare an ordinary peripheral test, while a
reset-recovery test deliberately validates behaviour across reset.

The control connection requires particular care. A test may request a control
path with defined properties, such as one independent of the UART being tested.
The Target Profile identifies the available paths and the Target Support Module
establishes or confirms the selected path. A control connection must be
established before an operation that could disrupt or replace it.

### 4.3 Adapter Services

An **Adapter Service** is exceptional target-specific support implemented on a
target daughter board because it cannot reasonably be standardised on the
reusable harness.

Examples may include target-specific reset or boot adaptation, open-drain or
polarity adaptation, a USB-to-UART interface, a Raspberry Pi Pico debug-probe
connection, other target-specific USB, serial or debug access, voltage
translation or protection, and target-specific power selection or measurement.

Daughter boards should normally remain passive adapters. Adapter Services are
an explicit exception and should not duplicate general test circuitry or
routing that belongs on the reusable harness. A service that proves generally
useful may later be promoted into the reusable harness architecture.

## 5. Target Interface Signals

A **Target Interface signal** is a named electrical connection crossing the
daughter-board and reusable-harness boundary. After the formal term has been
introduced, **Interface signal** may be used as its short form.

Interface signals include functional test signals, routing entries, control
signals, power rails, voltage references, grounds and optional target-service
signals.

An Interface signal is named by its harness role rather than by a target GPIO
number. For example:

```text
Target pin D21
      |
      | daughter-board mapping
      v
Interface signal TI_I2C_SDA
      |
      | reusable direct or routed harness path
      v
I2C Test Block
```

The detailed signal inventory, electrical rules and physical pin-bank
assignments belong in the Target Interface contract.

## 6. Target Profile

A **Target Profile** is the software-facing description of how a particular
target and daughter board use the V2 harness.

It is expected to describe:

* target identity, board revision and capabilities
* daughter-board identity, revision and compatibility
* target pin names and relevant peripheral capabilities
* mappings between target pins and Target Interface signals
* Test Blocks and Control Services available to the target
* legal pin roles, routes and simultaneous combinations
* control-connection options
* reset, boot and power behaviour
* unavailable or deliberately excluded capabilities
* electrical and target-specific constraints
* any Adapter Services and external preconditions

The daughter-board schematic is the controlled physical description of the
mapping. The Target Profile is its software-facing expression. The profile
should be checked against the schematic so that both describe the same mapping.

The Target Profile does not independently select a complete configuration. A
configuration is resolved from both the test request and the profile:

```text
Test requirements + Target Profile = Resolved Test Configuration
```

This allows one Target Profile to support many tests and the same logical test
to run across many target profiles.

## 7. Target Support Module

A **Target Support Module** provides an agreed software API through which tests
request Harness Capabilities and obtain target-specific assignments.

The initial design assumption is that target-specific support may be uploaded
with, or alongside, the functional test. The eventual implementation may use
shared code plus target-specific modules or data, but every implementation
should present the same conceptual API to tests.

Using the selected Target Profile, the Target Support Module is expected to:

* resolve requested Test Blocks and Control Services
* supply target pin and peripheral assignments to the test
* request and verify the necessary harness routing
* configure target-side pins and peripherals where appropriate
* establish or confirm the required control connection
* operate reset, boot or power services where requested
* reject unsupported or conflicting configurations
* expose the resolved configuration for evidence and diagnosis

The detailed division between target-side code, host runner and harness-control
hardware is intentionally deferred. The conceptual requirement is that tests
use an agreed API rather than containing their own target-detection and
hardcoded assignment tables.

## 8. Tests

A **Test** is Espruino JavaScript uploaded to the target to validate defined
firmware behaviour using requested Test Blocks and Control Services.

A V2 test should:

* state its functional scope
* request required and optional Harness Capabilities
* obtain target-specific variables through the Target Support Module
* perform any explicit setup or Control Service operations required by the test
* validate the target behaviour
* report unavailable optional coverage without treating it as a false failure
* record the Resolved Test Configuration with its results

```text
Test
  |
  | declares scope and required blocks or services
  v
Target Support Module
  |
  | reads target-specific knowledge
  v
Target Profile
  |
  | supplies capabilities, constraints and legal assignments
  v
Resolved Test Configuration
  |
  | applies routing and target setup
  v
Harness Test Blocks and Control Services
  |
  v
Test execution and recorded evidence
```

This evolves the current V1 approach. V1 tests retain visible target presets
and select hardcoded assignments after identifying the target. V2 should keep
test intent and resolved assignments visible and inspectable while moving the
target-specific knowledge into Target Profiles accessed through the common
support API.

The detailed V2 test structure, result format and relationship to the Target
Support Module should be defined in a separate V2 functional-test
specification.

## 9. Resolved Test Configuration

A **Resolved Test Configuration** is the runtime result of combining a test's
requirements with a Target Profile.

It is not a separately authored mode or another hardware specification. It is
a concrete, inspectable and recordable description of how one test run has
been configured.

It should contain enough information to reproduce and diagnose the run,
including where applicable:

* target, daughter-board and profile identity and revision
* requested and available Test Blocks and Control Services
* assigned target pins and peripherals
* associated Target Interface signals
* applied routing and verified route state
* selected control connection
* unsupported optional capabilities
* required external preconditions
* firmware and test-support provenance

The Resolved Test Configuration is part of the test evidence.

The runtime representation must also respect the constrained memory, transfer
size and execution resources of the target. The Target Profile and full
Resolved Test Configuration do not necessarily need to be uploaded as large
data structures with every test. The later API and test specifications should
define an efficient representation while preserving inspectable assignments
and sufficient evidence for reproduction and diagnosis.

## 10. Configuration Without A V2 Mode Model

V1 uses named harness modes to describe operator-established selector states,
active blocks, connectivity paths and test preconditions. V2 distributes these
responsibilities more directly:

| V1 mode responsibility | V2 owner |
|---|---|
| Required blocks | Test |
| Target pin assignments | Target Profile |
| Legal routes and conflicts | Target Profile and Target Interface rules |
| Route selection and verification | Target Support Module and routing Control Service |
| Control connection | Test request resolved through the Target Profile |
| Reset, boot and power operations | Control Services requested by the test |
| External manual condition | Explicit test precondition |
| Actual configuration used | Resolved Test Configuration and test evidence |

V2 therefore does not require a separate family-level harness mode model or
mode categories. A test explicitly requests the capabilities it needs, and the
support system resolves and records the resulting configuration.

Automatic routing removes the need for a special category of alternate
shared-pin modes. Shared pins, legal combinations and conflicts are properties
of the Target Profile and routing rules.

The word `mode` may still be used for a device operating state or other local
implementation concept, but it is not a central V2 harness abstraction.

## 11. Connection Properties

V2 does not expose direct, routed, optional, excluded or unimplemented
connections as a separate test-facing category model.

The underlying properties remain necessary for Target Interface electrical
design, target mapping, conflict detection, acceptance testing, route
diagnostics and test evidence. They should therefore be represented as
properties in the Target Interface contract, Target Profile and Resolved Test
Configuration. Tests normally request a capability and use the resolved
assignment rather than selecting a connection category directly.

## 12. Relationship To V1

The completed V1 harnesses remain the evidence base and stable bench platforms
for functional-test and runner development. This V2 model does not redefine
their implemented wiring or operating documentation.

| V1 concept or practice | V2 treatment |
|---|---|
| Common physical/logical harness blocks | Fixed reusable Test Blocks on the harness PCB |
| Harness nodes | Fixed Target Interface signals at the daughter-board boundary, plus internal block nets |
| Physical block regions | PCB layout concern, not part of the functional model |
| Target-specific selectors and links | Target Profile constraints and profile-driven routing where practical |
| Named harness modes and mode categories | Capability requests resolved into a recorded runtime configuration |
| Alternate shared-pin modes | Legal assignments, conflicts and automatic routing rules |
| Hardcoded target presets in tests | Target Profiles accessed through Target Support Modules |
| Manual mode confirmation | Automatic setup and verification where available; explicit external preconditions where not |

The V1 documents remain authoritative for V1 hardware. V2 specifications use
the V1 block implementations, target wiring and bench evidence as inputs when
deciding which capabilities should be standardised or changed.

The V2 Test Block inventory and implementation should be defined in a separate
V2 standard-block specification. That work should use practical V1 evidence,
including cases where fixed devices or loads impeded isolation and diagnosis,
rather than copying the V1 circuits without review.

## 13. Model Summary

The V2 conceptual model can be summarised as follows:

* The **V2 harness system** comprises the target, target daughter board, Target
  Interface and reusable harness PCB.
* The **reusable harness PCB** provides **Test Blocks** and **Control Services**.
* A removable **target daughter board** maps a target onto fixed **Target
  Interface signals**.
* A **Target Profile** is the software-facing description of that mapping and its
  constraints.
* A **Test** declares its required capabilities and functional intent.
* A **Target Support Module** resolves those requests using the Target Profile
  and establishes the required target and harness configuration.
* The resulting assignments, routes and preconditions form a Resolved Test
  Configuration that is recorded with the test evidence.
* Exceptional target-specific circuitry is represented explicitly as an
  **Adapter Service** rather than being treated as a standard reusable block.

This model makes the test the statement of intent, the Target Profile the
source of target knowledge, the Target Support Module the configuration
mechanism and the reusable harness the provider of stable capabilities.
