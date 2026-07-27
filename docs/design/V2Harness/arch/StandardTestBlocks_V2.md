# V2 Standard Test Blocks

**Status:** Accepted

**Version:** 0.4

**Last Updated:** 26 July 2026

## 1. Purpose

This document defines the standard Test Blocks provided by the reusable V2
harness PCB.

Its scope is Test Block hardware and behaviour, not the complete harness
hardware specification. A block may require a Control Service such as an
independent console, routing, reset, boot or power operation. The block
definition records that dependency, while the service behaviour is owned by
the accepted `StandardControlServices_V2.md` specification.

It uses the completed V1 harnesses, functional tests and bench evidence as the
starting point for the accepted V2 block definitions. A V1 block is not carried
into V2 unchanged merely because it exists on the current harnesses.

This document establishes:

* the purpose and boundary of each standard Test Block
* which V1 behaviour is retained, changed or removed
* the Target Interface signals required by each block
* direct and routable connection requirements
* safe inactive states and electrical constraints
* isolation, replacement and diagnostic provisions
* functional-test coverage enabled by the block
* prototype-verification and downstream-design responsibilities

Detailed component selection, routing-fabric implementation, connector pin
allocation and target-specific GPIO mappings belong in their focused
specifications.

## 2. Architectural Context

The accepted V2 conceptual model defines a Test Block as a reusable hardware
capability implemented on the reusable harness PCB and exposed through named
Target Interface signals.

```text
Target
  |
  v
Target daughter board
  |
  v
Target Interface signals
  |
  | direct path and/or routing fabric
  v
Standard Test Block
```

The reusable harness specification defines block identity and behaviour. The
Target Interface contract defines the crossing signals. A Target Profile
supplies target-specific assignments, and the Resolved Test Configuration
records the direct or routed paths used for a test run.

The authoritative conceptual and physical context is defined in:

* `HarnessConceptualModel_V2.md`
* `HybridHarnessArchitecture_V2.md`
* `TestHarnessArchitecture_V2.md`

## 3. Common V2 Block Principles

The following principles apply to every standard Test Block unless its
definition records a justified exception.

### 3.1 Stable Logical Purpose

A block is named and documented by the behaviour it makes testable, not by a
particular target GPIO, component location or routing implementation.

### 3.2 Fixed Reusable Implementation

Standard Test Block circuitry belongs on the reusable harness PCB. A target
daughter board should not duplicate it. Target-specific Adapter Services are
permitted only where the accepted conceptual model requires an exception.

### 3.3 Explicit Interface Signals

Every target-facing electrical connection must use a named Target Interface
signal. Internal block nets remain local to the reusable harness PCB and do not
become Interface signals without a demonstrated target-facing requirement.

All `TI_*` names in this document are provisional logical names until accepted
by the Target Interface contract. That contract owns final signal naming and
physical connector-pin allocation; this qualification applies throughout and
is not repeated in each block definition.

This document uses **1-Wire** for the bus and protocol in prose, `OneWire` only
for the Espruino API or class name, and `ONEWIRE_*` / `TI_ONEWIRE_*` for signal
identifiers.

### 3.4 Direct And Routed Access

The block definition identifies which signals require direct paths and which
may be connected through the routing fabric. Direct and routed access to the
same block must not create contention or an unreviewable parallel path.

### 3.5 Safe Inactive State

Each block must have a defined state when it is not selected, during target
reset and before route control has been configured. It must not interfere with
normal target boot, flashing or the selected control connection.

### 3.6 Isolation And Diagnosis

V2 shall provide practical means to isolate a block, remove or replace a test
device where useful, and observe relevant signals. Fixed loads that obstruct
fault isolation should be avoided or made disconnectable.

Unless a block records a justified exception, observation test points use
individual 2.54 mm header pins, external stimulus connections use 2.54 mm
two-pin headers with signal and adjacent ground, and manually removable
isolation links use 2.54 mm two-pin headers with shunts. This provides a compact
and consistent connection system across the reusable harness PCB.

### 3.7 Electrical Baseline

The standard harness logic and Test Block domain is 3.3 V with a common
reference ground. Standard block signal and external peripheral connections
are 3.3 V-only. A target requiring another logic domain needs an Adapter
Service rather than a voltage exception within a standard block.

A standard block may generate a contained local rail solely for an internal or
removable test-device implementation where its block definition records the
reason, isolation, current demand and safe-state behaviour. Such a rail must
not reach the Target Interface or become a general-purpose harness peripheral
supply. Block 9 records the initial exception to this rule.

Each block definition identifies pull-ups, biasing, current paths, analogue
loading and power-off behaviour. USB VBUS and other service supplies are not
Test Block logic rails. Final 3.3 V source, control, measurement and ownership
rules belong in the Control Service, power and Target Interface work.

### 3.8 Test And Capability Separation

A Test Block provides hardware capability; it does not define one mandatory
test sequence. A test may use one or several blocks. A target may report block
coverage as available, partially available, unavailable or deliberately
excluded without converting that capability result into a false test failure.

API coverage is resolved for the exact loaded firmware build, not inferred from
the target or available harness hardware. Each relevant API maps to a Test
Block, Control Service, external test peer, target self-test or explicit
exclusion. A deliberately omitted API is unavailable coverage; an API expected
for that build but missing at runtime is a build or configuration discrepancy.
The full rule is defined in `HarnessConceptualModel_V2.md`.

### 3.9 Prototype Packaging And Manufacturing Review

The prototype should use socketed through-hole devices where a suitable package
exists and removal or substitution materially assists diagnosis. SMD devices
are permitted where the required part or function is not available in a
practical through-hole package. A combined through-hole and SMD footprint is
not required merely to anticipate manufacture.

After prototype testing, each applicable device shall receive a deliberate
manufacturing-package review. Any transition to SMD must preserve the required
electrical behaviour, isolation, observation and repair strategy rather than
being treated as a footprint-only substitution.

## 4. Block Definition Structure

Each accepted block is recorded under the following concise structure:

1. **Purpose** — behaviour the block makes observable.
2. **V1 evidence** — proven implementation and practical lessons.
3. **V2 decision** — retained, changed, split, combined or removed behaviour.
4. **Required Interface signals** — logical target-facing connections.
5. **Connection behaviour** — direct, routable and simultaneous-use needs.
6. **Electrical and safe-state rules** — loading, biasing and inactive state.
7. **Isolation and diagnostics** — links, sockets, test points or removal needs.
8. **Functional coverage** — Espruino behaviour the block enables tests to
   validate.
9. **Prototype verification or downstream decisions** — follow-up owned outside
   the accepted block definition.

The block definitions establish requirements before final component selection
or physical Target Interface pin allocation.

Target-specific selection of permitted direct or routed paths is a common
downstream decision. It is not repeated as a block-specific downstream item
unless a block introduces a special constraint beyond the requirements
recorded in its connection behaviour.

## 5. Accepted Block Inventory

References 1 through 8 preserve the V1 review numbering for traceability.
Block 9 is new in V2. Absorbed V1 entries remain visible so their disposition
is unambiguous.

| Traceability reference | Accepted V2 block or treatment | Status |
|---:|---|---|
| 1 | Digital GPIO loopback | Accepted and complete |
| 2 | Analogue/PWM feedback | Accepted and complete |
| 3 | I2C functional device and external extension | Accepted and complete |
| 4 | SPI functional device and removable storage extension | Accepted and complete |
| 5 | 1-Wire functional devices | Accepted and complete; includes V1 Blocks 5 and 6 |
| 6 | 1-Wire GPIO device | Absorbed into the V2 1-Wire Functional Device Block |
| 7 | UART functional crosslink and external peer | Accepted and complete |
| 8 | External I2C extension | Absorbed into Block 3; no separate V2 block |
| 9 | Addressable RGB output | Accepted and complete |

## 6. Accepted Block Definitions

The following sections record the accepted V2 requirements. Prototype
verification and downstream decisions do not reopen a block unless new evidence
requires an architectural change.

### 6.1 Block 1 — Digital GPIO Loopback

**Status:** Accepted and complete; retained from V1

#### Purpose

The Digital GPIO Loopback Block provides two independent resistor-protected
connections from target GPIO outputs to target GPIO inputs. It makes digital
output, input, event and pulse behaviour observable without an external peer.

#### V1 Evidence

Both completed V1 harnesses implement two loopback pairs and have exercised
them successfully through the shared functional tests. No functional or
electrical issue requiring a V2 redesign has been identified.

The proven V1 connections are:

| Pair | Connection | Series protection |
|---|---|---:|
| A | `GPIO_LOOP_A_OUT` to `GPIO_LOOP_A_IN` | 470 Ω |
| B | `GPIO_LOOP_B_OUT` to `GPIO_LOOP_B_IN` | 470 Ω |

#### V2 Decision

Retain the V1 functionality and baseline circuit:

* two independent digital loopback pairs
* one target output and one target input per pair
* 470 Ω series protection in each loopback path
* a 2.54 mm two-pin isolation header and removable shunt in each loopback path
* individual 2.54 mm header-pin test points on both sides of each complete
  protected and isolated loopback path

The block remains a standard Test Block on the reusable harness PCB.

#### Required Interface Signals

The block requires four logical Target Interface signals:

* `TI_GPIO_LOOP_A_OUT`
* `TI_GPIO_LOOP_A_IN`
* `TI_GPIO_LOOP_B_OUT`
* `TI_GPIO_LOOP_B_IN`

#### Connection Behaviour

Each pair may use direct Interface signal paths or legal paths through the
routing fabric. The selected configuration must preserve the output-to-input
direction and the 470 Ω protected loopback path.

Both pairs must be usable concurrently. Routing must not connect two target
outputs together or leave a parallel direct and routed path active without
explicit isolation.

#### Electrical And Safe-State Rules

* The block operates in the 3.3 V harness logic domain.
* The loopback paths add no fixed pull-up or pull-down.
* The inactive or disconnected block must not load target boot, strap, console
  or debug signals.
* Before a loopback is enabled, both target pins and the route state must be
  configured so that output contention cannot occur.

#### Isolation And Diagnostics

Each pair shall provide a manually operable hard-isolation point independent of
the routing-control state. The implementation is a 2.54 mm two-pin header with
a removable shunt:

```text
Loopback output
      |
 output-side test point
      |
    470 Ω
      |
 two-pin isolation header and shunt
      |
 input-side test point
      |
Loopback input
```

The normal test state has the shunt fitted. Removing it shall open the physical
loopback path even if a routing switch is incorrectly enabled or shorted.

The test points shall make both sides of the complete resistor-and-shunt path
available for continuity checks, voltage measurement, oscilloscope or logic
analyser observation, and fault isolation. They shall remain usable with the
shunt fitted or removed.

#### Functional Coverage

The block enables functional validation of:

* `pinMode`
* `digitalWrite`
* `digitalRead`
* `digitalPulse`
* `shiftOut`
* `setWatch`

Tests may use one or both pairs according to the behaviour under test.

#### Downstream Decisions

None.

### 6.2 Block 2 — Analogue/PWM Feedback

**Status:** Accepted and complete; retained from V1 with V2 diagnostic
enhancements

#### Purpose

The Analogue/PWM Feedback Block converts a target-generated PWM signal into a
filtered analogue voltage and returns that voltage to a target ADC input. It
also makes the same voltage available to the harness MCP3008 ADC so that the
target ADC result can be compared with an independent measurement of the
actual stimulus.

An external analogue stimulus may be injected for measurements that require a
voltage generated independently of the target PWM output.

#### V1 Evidence

Both completed V1 harnesses use the following circuit successfully, and no
functional issue requiring a change to its basic operation has been identified:

| Connection | Value or behaviour |
|---|---|
| `PWM_OUT` to `ANALOG_FB` | 10 kΩ series resistor |
| `ANALOG_FB` to GND | 0.1 µF filter capacitor |
| `ANALOG_FB` to `ADC_IN` | target ADC feedback path |
| `ANALOG_FB` to MCP3008 CH0 | external ADC comparison path |

V1 functional tests exercised digital low and high levels, filtered PWM levels
and comparison of the target ADC result with MCP3008 channel 0.

#### V2 Decision

Retain the proven V1 filtered PWM feedback circuit and MCP3008 comparison
function. Add hard-isolation points, accessible test points and an external
analogue stimulus injection point.

The V2 baseline filter is 10 kΩ and 1 µF. The 10 kΩ resistor retains the
proven GPIO protection, while the increased capacitance improves PWM ripple
suppression across targets, remains comfortably settled within the initial
150 ms test delay, and provides a stable node for comparison by the target ADC
and MCP3008.

The PWM/RC path is the standard target-generated stimulus. The MCP3008 measures
the resulting voltage rather than assuming that a requested PWM duty cycle
produces an exact voltage.

#### Required Interface Signals

The block requires two logical Target Interface signals:

* `TI_ANALOG_PWM_OUT`
* `TI_ANALOG_ADC_IN`

`ANALOG_FB` is an internal harness node and is not a Target Interface signal.

#### Connection Behaviour

The selected PWM output shall drive `ANALOG_FB` through the 10 kΩ resistor and
1 µF filter. The selected target ADC input and MCP3008 channel 0 shall both
be able to measure that same filtered node concurrently.

The Interface signals may use direct paths or legal paths through the routing
fabric. A selected configuration must not connect multiple driven sources to
`ANALOG_FB`. The PWM source path shall therefore be disconnected before an
external analogue source is applied.

The MCP3008 comparison connection is a cross-block dependency on Block 4. The
Block 4 review shall preserve MCP3008 channel 0 for measurement of the selected
Block 2 stimulus.

#### Electrical And Safe-State Rules

* The block uses a 0 V to 3.3 V analogue range referenced to harness ground;
  final limits and tolerances follow the Target Interface and power
  specifications.
* No external stimulus may exceed the safe input range of either the target ADC
  or MCP3008.
* The external source and harness must share a reference ground.
* The block shall not apply a fixed pull-up or pull-down to either Interface
  signal.
* When the block is inactive or isolated, it must not load target boot, strap,
  console or debug signals.
* Route changes and source selection shall occur only while no source can
  contend with another source on `ANALOG_FB`.
* Analogue-feedback tests shall select and record the PWM frequency explicitly
  rather than depend on a target-specific default. The provisional V2 baseline
  is 5 kHz.
* Tests shall allow at least five RC time constants before comparing ADC
  results. The initial 150 ms delay provides a conservative common baseline.

The filtered PWM voltage is suitable for functional and comparative ADC
testing. It is not treated as an absolute precision-voltage reference; the
MCP3008 reading records the voltage actually produced for comparison with the
target ADC.

Tests of target-specific ADC attenuation or range settings shall apply known
external voltages within the safe range shared by the target ADC and MCP3008.
The MCP3008 reading records the actual applied voltage. Tests shall exercise
only the settings declared by the Target Profile and supported by the loaded
firmware; they shall not assume that attenuation names, values or useful ranges
are identical across ESP32-family targets.

`Waveform.startInput` uses the target ADC path with a time-varying 0 V to 3.3 V
external stimulus applied at `ANALOG_FB`. The target PWM-source path must be
isolated during external injection. `Waveform.startOutput` uses the target
output path; its unfiltered output is observable at `TI_ANALOG_PWM_OUT`, while
`ANALOG_FB` and MCP3008 channel 0 provide the corresponding filtered response.

On targets supporting an analogue comparator, a slowly swept or stepped
external stimulus may cross selected thresholds while comparator events and
hysteresis behaviour are recorded. This uses the existing target ADC path and
requires no fixed comparator circuit on the harness.

These API-coverage extensions require no additional Block 2 hardware beyond
the accepted isolation, external-stimulus and observation connections.

#### Isolation And Diagnostics

The block shall provide manually operable hard-isolation points independent of
the routing-control state for:

* the target PWM source path into the RC filter
* the `ANALOG_FB` path to the target ADC input
* the `ANALOG_FB` path to MCP3008 channel 0

Standard 2.54 mm two-pin headers with removable shunts are the implementation.
Each of the three isolation headers normally has its shunt fitted.

The block shall provide accessible test points using individual 2.54 mm header
pins for:

* `TI_ANALOG_PWM_OUT`, on the target side of its isolation point
* `ANALOG_FB`
* `TI_ANALOG_ADC_IN`, on the target side of its isolation point
* MCP3008 channel 0, on the ADC side of its isolation point
* a nearby ground reference

`ANALOG_FB` shall also provide a clearly identified 2.54 mm two-pin external
stimulus connection with signal and adjacent ground pins. Its silkscreen shall
identify the signal, ground and permitted voltage range. Removing the
PWM-source shunt shall isolate the target PWM output while an external voltage
is injected. The target ADC and MCP3008 shunts may then remain fitted so that
both devices measure the same external voltage, or be removed independently
for construction checks and fault diagnosis.

#### Functional Coverage

The block enables functional validation of:

* `analogWrite` and PWM generation
* `analogRead` at digital low and high levels
* `analogRead` across multiple filtered PWM duty cycles
* target ADC response and monotonic behaviour
* comparison of target ADC results with MCP3008 channel 0
* comparison of both ADCs against an externally generated analogue voltage
* supported ESP32 ADC attenuation and range settings through
  `ESP32.setAtten`, using externally injected voltages and MCP3008 comparison
* `Waveform.startInput` capture of a known external analogue waveform,
  including buffer completion, sample ordering and approximate amplitude
* `Waveform.startOutput` generation from known sample buffers, including
  completion, repetition and observation of output timing and amplitude
* analogue threshold-event behaviour through `E.setComparator` on applicable
  targets, including rising and falling crossings and documented hysteresis

These additional cases are conditional on the API and hardware capabilities
reported for the target and loaded firmware. `ESP32.setAtten` is ESP32-specific,
`E.setComparator` is currently nRF52-specific, and `Waveform` may be absent from
low-flash builds. A correctly reported unavailable capability is not a Block 2
test failure.

#### Prototype Verification

Prototype evidence shall determine permissible external-source impedance and
any additional input protection.

### 6.3 Block 3 — I2C Functional Device

**Status:** Accepted and complete; retains the V1 behaviour with a 16-bit V2
device, shared-bus, event-handshake, diagnostic and external-extension
enhancements

#### Purpose

The I2C Functional Device Block provides a known register-addressable device,
GPIO feedback and interrupt generation for validating a target's I2C and event
behaviour. It also provides one standard Grove I2C connection for an additional
device or externally connected Grove hub.

The same physical target I2C bus is also used by the routing-control devices.
Block 3 owns the functional I2C test capability, while the routing system
consumes the shared bus as a Control Service.

#### V1 Evidence

Both V1 harnesses use an MCP23008 at address `0x20` with the following
functional connections:

| MCP23008 function | V1 connection |
|---|---|
| SDA | `I2C_SDA` |
| SCL | `I2C_SCL` |
| INT | target `I2C_INT` input |
| GP0 | 470 Ω to target `I2C_FB` input |
| GP1 | direct to GP2 for internal feedback and interrupt stimulus |
| A0, A1 and A2 | GND, selecting address `0x20` |
| RESET | held inactive at 3.3 V |

V1 testing proved register read/write, GP0 target feedback, interrupt
idle/assert/clear behaviour and target event observation. The classic ESP32
IDF4 failure occurred during `I2C1.setup(...)`, before bus traffic. The same
hardware passed after the firmware defect was corrected, confirming that the
failure was not caused by the MCP23008 or harness wiring. The evidence is
recorded in:

* `../../../investigations/i2c/esp32-devkitc-v4-idf4-i2c-bringup-2026-07-01.md`
* `../../../investigations/i2c/upstream-idf4-pr-draft-2026-07-01.md`

SDA and SCL logic-analyser access proved necessary during diagnosis. The V1
Grove connection and an external Grove hub also proved useful for attaching and
expanding additional-device tests.

#### V2 Decision

Preserve the proven MCP23008 functional paths but implement the V2 block with a
socketed through-hole MCP23017. Its first 8-bit bank retains the V1 feedback
and interrupt behaviour. Its second bank provides the two low-speed Supervisor
event-handshake roles defined by `StandardControlServices_V2.md` and leaves
controlled expansion capacity without requiring another I2C expander.

The additional GPIO does not create a general routing or capture fabric.
Target power, reset and boot recovery shall remain independent of the
MCP23017. The prototype device shall be removable and isolatable during
diagnosis. The authoritative component reference is the
[Microchip MCP23017/MCP23S17 data sheet](https://ww1.microchip.com/downloads/aemDocuments/documents/APID/ProductDocuments/DataSheets/MCP23017-Data-Sheet-DS20001952.pdf).

Provide one vertical through-hole 2.0 mm Grove connector as part of Block 3.
The prototype component is the Seeed `1125S-4P`, SKU `110990030`, or a verified
mechanically and electrically compatible part. A Grove hub is the standard
means of external expansion; V2 does not require multiple onboard Grove
connectors.

Provide one vertical 2.54 mm 2x8 MCP23017 GPIO breakout connector. It shall
expose GPA0 through GPA7 and GPB0 through GPB7 in two clearly identified banks
and numerical order. This connector provides direct observation of all 16
expander GPIO and supports additional low-speed GPIO experiments without
creating new Target Interface signals.

GPA0, GPA1 and GPA2 retain the proven V1 GP0, GP1 and GP2 feedback and
interrupt-stimulus roles. Two Port B GPIO provide the protected
`SUP_EVENT_OUT` and `SUP_EVENT_IN` connections; their exact bit allocation
belongs to the Control Service connection matrix and schematic. The remaining
GPIO are unallocated expansion provision. Current MCP23017 documentation marks
GPA7 and GPB7 as output-only, which shall be respected when assigning roles.

The design shall provide one `TI_I2C_INT` path that can report both the
standard Port A interrupt test and the Port B Supervisor event. The schematic
shall choose and document MCP23017 interrupt mirroring or an equivalent safe
combination of INTA and INTB.

The Grove I2C pinout shall follow the official Seeed numbering:

| Pin | Signal | Standard cable colour |
|---:|---|---|
| 1 | SCL | Yellow |
| 2 | SDA | White |
| 3 | 3.3 V VCC | Red |
| 4 | GND | Black |

The schematic, footprint and silkscreen shall identify connector pin 1 and the
viewing orientation explicitly. Cable-end illustrations that appear to reverse
the physical order shall not override the official PCB-connector numbering.
The reference definitions are the
[Seeed Grove system specification](https://wiki.seeedstudio.com/Grove_System/)
and
[Seeed Grove designer's guide](https://www.seeedstudio.com/blog/2022/11/18/seeed-grove-designers-guide-pcb-design-guidelines-and-more/).

The V1 external I2C extension is therefore absorbed into Block 3. It is not a
separate V2 Test Block.

#### Required Interface Signals

The block requires four logical Target Interface signals:

* `TI_I2C_SDA`
* `TI_I2C_SCL`
* `TI_I2C_FB`
* `TI_I2C_INT`

The MCP23017 GPA1-to-GPA2 connection is internal to Block 3 and does not require
an Interface signal.

#### Connection Behaviour

`TI_I2C_SDA` and `TI_I2C_SCL` shall form one shared 3.3 V bus connected to:

* the target I2C controller
* the routing-control devices
* the MCP23017 functional device
* the Grove I2C connector

The Interface SDA and SCL paths shall be direct and available before route
control is configured. The routing fabric must not require an I2C-controlled
route to establish access to its own control bus.

The shared-bus design is the mandatory V2 baseline so that GPIO-constrained
targets do not require a second dedicated I2C pair. Routing-control addresses
shall be reserved and must not conflict with the fixed MCP23017 functional
device address or an approved external test device. Tests shall not issue
arbitrary writes to reserved routing-control addresses.

`TI_I2C_FB` and `TI_I2C_INT` may use direct paths or legal paths through the
routing fabric. Their selected configuration must preserve the MCP23017 signal
direction and interrupt electrical mode.

#### Electrical And Safe-State Rules

* The shared bus and Grove VCC use the 3.3 V harness domain. A Grove device that
  requires 5 V signalling or applies fixed 5 V pull-ups is not compatible
  without an explicitly reviewed level-translation arrangement.
* The baseline functional-test speed is 100 kHz.
* Operation at 400 kHz is permitted only when every connected device supports
  it and measured SDA/SCL rise times meet the I2C Fast-mode requirement.
* Routing-control devices must power up without enabling unsafe signal routes
  and must not hold SDA or SCL low during target boot or reset.
* The complete device population, wiring, Grove cable and any hub determine the
  bus capacitance and effective pull-up resistance.
* The bus must remain within the pull-low capability of its weakest connected
  device and the rise-time limit for the selected speed.
* The final Grove supply-current limit and power-isolation treatment belong in
  the V2 power and Target Interface specifications.

The harness shall provide a central 4.7 kΩ pull-up from each of SDA and SCL to
3.3 V as the default 100 kHz prototype configuration. Each pull-up shall be
independently enabled or removed by a shunt. Replaceable or DNP parallel
resistor positions shall permit the effective resistance to be adjusted after
prototype measurement without modifying PCB traces.

Attached Grove devices may contain additional pull-ups. After the connected
device population changes, acceptance shall include:

* an unpowered measurement of effective SDA and SCL pull-up resistance
* a powered logic-analyser or oscilloscope check of SDA and SCL rise time
* confirmation that every device can produce a valid low level

Pull-up selection shall therefore be based on the populated bus rather than an
assumption that 4.7 kΩ is correct for every external configuration.

#### Isolation And Diagnostics

The prototype MCP23017 socket shall provide complete manual removal and
isolation of the functional device. The Grove branch is isolated by unplugging
its connector. Isolation and recovery of non-removable routing-control devices
belong in the routing specification.

Block 3 shall provide individual 2.54 mm header-pin test points for:

* SDA
* SCL
* `TI_I2C_FB`
* `TI_I2C_INT`
* 3.3 V
* GND

The SDA, SCL and GND points shall be placed so that a logic analyser or
oscilloscope can be connected without disturbing the Grove connector or
pull-up configuration. The pull-up enable shunts and optional resistor
positions shall remain accessible with the MCP23017 fitted.

The 2x8 MCP23017 GPIO breakout serves as test-point access for GPA0 through
GPA7 and GPB0 through GPB7. It shall be placed near the 3.3 V and GND test pins
and clearly labelled by bank and bit. External connections must remain within
the 3.3 V domain and the MCP23017 GPIO current limits. External circuitry must
not drive the standard Block 3 or Supervisor event paths against their defined
directions.

Any later MCP23017 SMD transition must meet Section 3.9 and provide an
equivalent means of isolating the functional device.

#### Functional Coverage

The block enables functional validation of:

* I2C controller setup at the selected bus speed
* MCP23017 address and both register-bank read/write behaviour
* repeated transfers and error handling
* MCP23017 GPIO output through GPA0 to a target feedback input
* MCP23017 GPA1-to-GPA2 internal feedback and interrupt generation
* direct observation and additional input/output testing of GPA0 through GPB7
  through the GPIO breakout
* interrupt idle, assertion and clearing behaviour
* target `setWatch` or equivalent observation of `TI_I2C_INT`
* target-configured handling of `SUP_EVENT_OUT` and target-generated
  acknowledgement through `SUP_EVENT_IN`
* coexistence of the functional MCP23017 with routing-control devices
* communication with one additional Grove device or devices attached through
  a Grove hub

#### Downstream Decisions

The block functionality is accepted. The following follow-up is assigned under
Section 7.6:

* the reserved address map for all routing-control devices
* restrictions or address checks applied to external Grove devices
* the final pull-up and optional parallel-resistor values after measuring the
  populated prototype bus
* whether 400 kHz becomes a required or optional tested capability
* final MCP23017 RESET, interrupt mirroring and INTA/INTB treatment
* a V2 Block 3 REPL test using the MCP23017 two-bank register map while
  preserving the existing MCP23008 tests for V1
* the diagnostic or manual fallback if target I2C cannot configure the routing
  Control Service
* the manufactured MCP23017 package and equivalent isolation arrangement

### 6.4 Block 4 — SPI Functional Device And Removable Storage Extension

**Status:** Accepted and complete; retained from V1 with removable microSD
storage, analogue breakout and diagnostic enhancements

#### Purpose

The SPI Functional Device And Removable Storage Extension Block provides a
known SPI ADC for transfer and conversion testing plus a removable microSD
device for validating independent chip selects, shared-bus operation and the
Espruino SD-card and filesystem APIs. It also makes the MCP3008 analogue input
channels available for additional analogue experiments.

#### V1 Evidence

Both V1 harnesses use an MCP3008 as the standard SPI device. Its established
connections are:

| MCP3008 function | V1 connection |
|---|---|
| SCK | `SPI_SCK` |
| DIN | `SPI_MOSI` |
| DOUT | `SPI_MISO` |
| CS/SHDN | `SPI_CS_ADC` |
| CH0 | Block 2 `ANALOG_FB` |
| VDD and VREF | 3.3 V |
| AGND and DGND | GND |

The shared functional tests have repeatedly proved SPI setup and transfers,
MCP3008 low/mid/high conversion, monotonic response and comparison with the
target ADC through Block 2.

The ESP32_V1 harness also provides a second chip select and a six-pin W25xxx
flash-module connection. Earlier testing returned stable JEDEC identification
and status-register data while the MCP3008 remained operational on the same
bus. A later Ubuntu bench run continued to pass the MCP3008 but did not obtain
a valid flash identity. That result localises the remaining question to the
removable extension device, its fit or its chip-select path rather than showing
a bus-wide SPI failure. The evidence is recorded in:

* `../../../../tests/Results/spi_block4/Initial_runs.md`
* `../../../../tests/Results/2026-07-13-ubuntu-v1-next-blocks.md`

This evidence supports retaining the second device while improving its
replacement, orientation and diagnostic provisions.

#### V2 Decision

Retain a socketed through-hole MCP3008 as the prototype's standard SPI
functional device. Preserve MCP3008 channel 0 as the Block 2 measurement input.

Provide one vertical 2.54 mm eight-pin analogue breakout connector exposing
MCP3008 CH0 through CH7 in numerical order, with pin 1 corresponding to CH0.
CH0 shall be clearly identified as already connected to Block 2 `ANALOG_FB`.
In the normal configuration, its breakout pin is an observation point rather
than an independent stimulus input. CH1 through CH7 have no standard fixed load
and are available for external analogue stimulus and additional conversion
tests.

Use a removable passive 3.3 V microSD breakout as the second SPI device. The
prototype implementation shall use The Pi Hut MicroSD Breakout, SKU 106696,
which exposes the card signals on one 2.54 mm 1x9 header and provides cuttable
links for its power LED and onboard pull-ups. The prototype shall normally
disconnect the module power LED and onboard pull-ups so that fixed loading and
pull-up ownership remain controlled by the harness.

The module connection shall provide 3.3 V, GND, SCK, MOSI, MISO and one
active-low extension chip select. SDIO-only contacts need not consume Target
Interface or routing signals.

The preferred initial arrangement uses a suitable double-ended or long-tail
through-hole pin header. The removable microSD breakout mounts horizontally
on the underside of the harness PCB with the card accessible at the PCB edge,
while the same connector pins remain exposed on the top side as SPI test
points. The prototype mechanical evaluation may instead select vertical or
top-side horizontal mounting if clearance, support or card access is better.
The module shall remain removable and its card slot usable without dismantling
the target or daughter board.

The microSD module is the normal fitted extension device because it adds
`E.connectSDCard`, mount, unmount and filesystem coverage while retaining the
shared-SPI and independent-chip-select coverage previously supplied by the
W25xxx module. A W25xxx-compatible flash module may still be connected through
a small adapter or the diagnostic connection for device-specific experiments;
it is not a second permanently allocated SPI extension.

The MCP3008 and one removable extension device provide sufficient SPI API,
full-duplex transfer, chip-select and shared-bus coverage. V2 shall not allocate
a third standard SPI chip select or an additional full-bus connector without
new evidence of a coverage requirement.

#### Required Interface Signals

The block requires five logical Target Interface signals:

* `TI_SPI_SCK`
* `TI_SPI_MOSI`
* `TI_SPI_MISO`
* `TI_SPI_CS_ADC`
* `TI_SPI_CS_EXT`

MCP3008 CH0 through CH7 and the removable-storage module connection are
internal or external harness connections rather than additional Target
Interface signals.

#### Connection Behaviour

The MCP3008 and removable extension device share SCK, MOSI and MISO. Each has a
separate active-low chip select. The selected configuration shall support both
devices concurrently without changing the three shared-bus assignments.

Only one device chip select may be asserted for a transaction. An unselected
device must release MISO and must not interfere with the selected device. Both
chip selects shall be driven inactive before SPI setup, route changes or device
replacement.

The five Interface signals may use direct paths or legal paths through the
routing fabric. The routing design must preserve signal direction, selected
SPI clock performance and the inactive state of both chip selects. It must not
leave parallel routes that connect unrelated target outputs or chip selects.

MCP3008 CH0 remains a cross-block dependency on Block 2. Its analogue
connection and hard-isolation shunt are defined by that block.

#### Electrical And Safe-State Rules

* The SPI bus, MCP3008, analogue breakout and removable extension operate in
  the 3.3 V harness domain.
* MCP3008 VDD and VREF connect to 3.3 V; AGND and DGND connect to the harness
  ground according to the final analogue layout and power rules.
* Provide local 100 nF decoupling at the MCP3008 to reduce supply and reference
  noise during conversion and SPI activity.
* Provide local 100 nF decoupling and a provisional 10 uF to 47 uF bulk
  capacitor at the removable-module supply connection to limit connector- and
  card-access-related supply disturbance.
* `TI_SPI_CS_ADC` and `TI_SPI_CS_EXT` shall each have a local pull-up so both
  devices remain unselected while the target is reset, absent or unconfigured.
* No analogue breakout input may be driven outside the permitted MCP3008 input
  range or while its source ground is disconnected.
* Normal Block 2 and Block 4 tests shall use the same fitted-shunt configuration
  and shall not require manual link changes between tests.
* External circuitry shall not drive CH0 through the analogue breakout. A
  deliberate independent CH0 stimulus shall use the Block 2 external-injection
  and isolation procedure as a diagnostic configuration, not a routine Block 4
  test transition.
* The removable microSD breakout shall be inserted or removed only while power
  is off. A card may be removed while the module remains powered only after the
  test has completed all writes and called `E.unmountSD()`.
* The selected SPI clock must remain within the limits of the MCP3008, the
  fitted extension device and the routing path.

The module connection shall have a prominent pin-1 marker, signal labels and a
module-body outline on the silkscreen. The selected mounting orientation and
card insertion direction shall be unambiguous and must not rely on cable-style
viewing conventions.

#### Isolation And Diagnostics

The prototype MCP3008 socket provides complete removal and isolation of the
standard SPI device. Removing the microSD card from the fitted breakout removes
the active SPI storage device and provides the normal routine isolation method.
With the module power LED and unnecessary onboard pull-ups disconnected, the
empty socket leaves only its passive contacts, PCB traces and small parasitic
loading on the bus.

The screw-supported microSD breakout shall also remain unplug-replaceable from
its module connection. Removing it provides complete physical isolation if the
socket, breakout PCB or connector is suspected. Card removal and breakout
removal therefore provide routine device isolation and full diagnostic
isolation respectively, without adding signal or power shunts to every module
connection.

Power-only isolation shall not be treated as complete MCP3008 isolation while
SPI signals remain connected, because signal pins may load or partially power
an unpowered device. Compact 0 Ω links or solder-jumper provisions may be
considered during the final diagnostic-provision and SMD review; large grouped
shunt headers are not a Block 4 requirement at this stage.

The top-side tails of the through-hole removable-module connector shall serve
as the SCK, MOSI, MISO, `TI_SPI_CS_EXT`, 3.3 V and GND observation points. They
shall remain accessible while the underside microSD module is fitted. Provide
one additional compact header-pin test point for `TI_SPI_CS_ADC` so the shared
bus and both chip selects can be observed concurrently. This combined
arrangement replaces a separate duplicate 2x3 SPI diagnostic header.

The MCP3008 eight-pin analogue breakout serves as the observation and external
connection point for CH0 through CH7. It shall be placed near a ground test pin
and labelled `CH0` through `CH7`.

The removable-storage module connection exposes the complete SPI extension
bus, chip select and power connections. Its module outline and signal labels
shall remain visible when the module is removed. Any later MCP3008 SMD
transition must meet Section 3.9 and provide an equivalent means of isolating
the standard SPI device.

#### Functional Coverage

The block enables functional validation of:

* SPI controller setup and selected clock configuration
* `SPI.send` and full-duplex transfer behaviour
* MCP3008 command framing and conversion readback
* low, mid and high MCP3008 response using Block 2
* comparison of MCP3008 CH0 with the target ADC
* conversion of external analogue values through CH1 to CH7
* CH0 observation and deliberate external-stimulus testing through the Block 2
  diagnostic configuration
* independent ADC and extension-device chip-select behaviour
* microSD connection using `E.connectSDCard`
* mount, file and directory operations through `E.openFile` and `fs`
* clean `E.unmountSD` behaviour before card removal
* repeated switching between two devices on one shared SPI bus
* diagnosis of an absent, incorrectly fitted or non-responding extension device

#### Downstream Decisions

The block functionality is accepted. The following follow-up is assigned under
Section 7.6:

* the baseline and maximum required SPI clock after routing-path validation
* the local chip-select pull-up values
* confirmation of the preferred underside module orientation, long-tail
  connector, support and card-edge clearance during prototype construction
* the final removable-module bulk-capacitance value after prototype measurement
* any additional analogue-input protection required at the CH0-to-CH7 breakout
* the manufactured MCP3008 package and equivalent compact isolation arrangement

### 6.5 V2 1-Wire Functional Device Block — V1 Blocks 5 And 6

**Status:** Accepted and complete; combines the V1 temperature and GPIO device
blocks on their shared bus

#### Purpose

The 1-Wire Functional Device Block provides a known multidrop bus containing
two individually addressable DS18B20 temperature sensors and one removable
DS2413 two-channel GPIO device. It supports device discovery, addressed
transactions, conversion and scratchpad-integrity tests, DS2413 command and
status tests, target-observed GPIO feedback, and practical investigation of
bus timing, loading and mixed-device behaviour.

#### V1 Evidence

Both V1 harnesses implement two powered DS18B20 devices on one data line. This
proved the intended multidrop behaviours, including repeated search, distinct
ROM discovery, addressed conversion, scratchpad readback and CRC validation.
The ESP32_V1 harness added a removable DS2413 breakout to the same bus. Its two
open-drain PIO outputs were pulled up and routed through 470 Ohm protection
resistors to target inputs, proving device-specific write and status operations
plus end-to-end GPIO feedback.

The V1 prototypes were also valuable bench platforms for isolating an
Espruino 1-Wire timing problem and developing the change represented by the
outstanding upstream pull request. Logic analysis, device substitution,
device removal and comparison of different bus populations were important to
that work. The relevant evidence includes:

* `../../../../tests/Results/onewire_block5/Initial_runs.md`
* `../../../investigations/onewire/piggyback-ds18b20-comparison-2026-07-09.md`

The practical hardware lessons were:

* the three-position screw terminals used by the ESP32-C3 prototype made
  sensors easy to replace and also accepted commonly available wired DS18B20
  assemblies
* the fixed sensors on the ESP32_V1 board had to be physically removed during
  fault isolation
* changing the bus population and comparing individual branches was valuable
  during timing and signal-integrity investigation
* the removable DS2413 breakout was practical for both dedicated GPIO tests
  and mixed DS18B20/DS2413 investigation
* the ESP32-C3 4.7 kOhm pull-up and the stronger ESP32_V1 pull-up both worked
  in their respective short-bus builds, so final pull-up selection should be
  confirmed against the complete V2 population and waveform
* a DS2413 may legitimately share the bus, so DS18B20 tests must identify
  devices by family code rather than treating every discovered ROM as a
  temperature sensor
* V1 manually selected the DS2413 feedback paths in place of the digital
  loopback inputs; V2 should retain that resource reuse without retaining the
  manual selector transition

#### V2 Decision

Retain two powered DS18B20 devices on one standard 1-Wire bus. Each device
shall connect through its own three-position screw terminal so it can be
removed, replaced or substituted without desoldering. The prototype terminal
order shall be:

| Position | Signal | DS18B20 function |
|---:|---|---|
| 1 | GND | GND |
| 2 | `ONEWIRE_DQ` | DQ |
| 3 | 3.3 V | VDD |

The PCB shall mark the signal names and terminal order clearly. The normal
population is two powered-mode DS18B20 sensors; parasite-powered DS18B20
operation is not the baseline configuration.

Provide the bus pull-up through a resistor-limited 2.54 mm three-pin selector:

| Selector pin | Connection |
|---:|---|
| 1 | 3.3 V through 2.2 kOhm |
| 2 | `ONEWIRE_DQ` common |
| 3 | 3.3 V through 4.7 kOhm |

A shunt on pins 2–3 selects the normal 4.7 kOhm pull-up. A shunt on pins 1–2
selects the stronger 2.2 kOhm pull-up proven on ESP32_V1. With no shunt fitted,
the harness pull-up is disconnected for diagnosis. Every valid shunt position
therefore includes a resistor and cannot connect `ONEWIRE_DQ` directly to
3.3 V. Fit only one shunt. The silkscreen shall identify the three positions
as `2K2 | DQ | 4K7` and mark pins 2–3 as the normal position.

Other values may be evaluated by connecting an external resistor between the
separated DQ and 3.3 V observation points while the selector is open. Separate
series-link headers are not required in the two sensor branches. Removing a
sensor from its screw terminal provides branch isolation.

Retain the DS2413 as a removable vertical module using the proven 2.54 mm 1x4
connection. The harness shall provide a vertical male header and the breakout
shall use a downward-facing female header, consistent with the general
removable-module approach. Preserve the V1 signal order:

| Pin | Harness signal | Breakout marking/function |
|---:|---|---|
| 1 | `ONEWIRE_PIOB` | IOB / PIOB |
| 2 | `ONEWIRE_PIOA` | IOA / PIOA |
| 3 | `ONEWIRE_DQ` | IO / 1-Wire data and parasite power |
| 4 | GND | GND |

The DS2413 has no separate VDD connection. Its header shall have a prominent
pin-1 marker, signal labels and a module-body outline so its unkeyed vertical
orientation is unambiguous.

The normal complete population contains two family `0x28` DS18B20 devices and
one family `0x3A` DS2413. Routine tests shall filter discovered ROMs by family
and use the same normal 4.7 kOhm selector position without moving any device or
shunt between the temperature-device and GPIO-device test scopes. Removability
is provided for construction checks, replacement, fault diagnosis and
reduced-population experiments.

#### Required Interface Signals

The block requires one bidirectional bus signal and two target-readable GPIO
feedback signals:

* `TI_ONEWIRE_DQ`
* `TI_ONEWIRE_GPIO_A_FB`
* `TI_ONEWIRE_GPIO_B_FB`

The final Target Interface and routing specifications may implement the two
feedback roles by exclusive reuse of suitable digital-loopback input resources
rather than allocating permanently dedicated target pins. Sensor power,
ground, the pull-up selector and the device connectors remain harness
connections rather than additional Target Interface signals.

#### Connection Behaviour

Both DS18B20 devices, the DS2413 module and the bus pull-up share
`ONEWIRE_DQ`. `TI_ONEWIRE_DQ` shall connect the selected target 1-Wire-capable
GPIO to that common bus through a legal bidirectional route.

The route must preserve open-drain operation and the timing of reset, presence,
read and write slots. It must not introduce a unidirectional buffer, an
unreviewed level translator or another active driver onto the bus. Any routing
switch used in this path must be characterised with the full device population.

`ONEWIRE_PIOA` and `ONEWIRE_PIOB` shall each be observable at a target input
through a 470 Ohm series protection path and a legal route to the corresponding
feedback signal. Both PIO channels must be usable independently and
simultaneously while the target continues to control the shared 1-Wire bus.

The standard fitted configuration shall support both temperature-device and
GPIO-device tests without manual changes. If the feedback roles reuse Block 1
inputs, the routing Control Service shall make the normal loopback drivers and
DS2413 PIO paths mutually exclusive. Route changes shall occur while the
target inputs are high impedance and both DS2413 outputs are released.
Target-specific sharing of the bus GPIO with another capability may also use
automated routing, provided the 1-Wire bus is disconnected before that GPIO is
driven for an incompatible purpose.

#### Electrical And Safe-State Rules

* The two DS18B20 devices operate in powered mode from the Test Block Supply
  Rail and common harness ground; source selection and switching follow
  `StandardControlServices_V2.md`.
* Provide one bus pull-up to 3.3 V using the resistor-limited three-pin selector
  defined above. Pins 2–3 and 4.7 kOhm are the normal prototype configuration;
  pins 1–2 and 2.2 kOhm are the stronger alternative.
* Fit no more than one pull-up-selector shunt. With no shunt, any external
  experimental pull-up value and its connection shall be recorded with the
  test evidence.
* Do not fit independent pull-ups at each DS18B20 terminal. Any substituted
  sensor or external device with an onboard pull-up must be included when the
  effective bus resistance is assessed.
* `ONEWIRE_PIOA` and `ONEWIRE_PIOB` shall each have a 4.7 kOhm pull-up to the
  3.3 V harness domain. These PIO pull-ups must not add another pull-up to DQ.
* The PIO signals are open-drain: low is actively asserted by the DS2413 and
  high is the externally pulled-up released state.
* The 470 Ohm resistor in each feedback path limits fault current if a target
  feedback pin is accidentally configured as an output; it does not make
  output-to-output contention an allowed configuration.
* Sensors, the DS2413 and the pull-up-selector shunt shall be changed only
  while power is off.
* The target pin shall be released as an input/open-drain high state before the
  route is connected and whenever 1-Wire is inactive.
* The safe inactive feedback state is both DS2413 PIOs released, the target
  feedback pins configured as inputs and conflicting routes disconnected.

The normal pull-up position shall be confirmed from measured low-level margin,
rise time and transaction reliability with both DS18B20 devices, the DS2413,
the routing path and representative wired-sensor leads fitted.

#### Isolation And Diagnostics

Each DS18B20 can be completely removed at its screw terminal. The removable
DS2413 header completely isolates its DQ, PIOA, PIOB and ground connections
when the module is removed. This supports full-population, reduced-population
and replacement-device diagnosis without desoldering.

Provide individual 2.54 mm observation pins for:

* `ONEWIRE_DQ`
* `ONEWIRE_PIOA`
* `ONEWIRE_PIOB`
* 3.3 V
* GND

The observation points shall remain accessible with all devices fitted. This
allows the complete DQ bus to be captured and each commanded PIO level to be
compared at its source and target feedback input. The removable-module header
is not a sufficient live PIO test point when occupied.

The two screw terminals also permit a known replacement sensor or powered
1-Wire device to be substituted for either standard DS18B20. The prototype
layout shall keep both sensor branches, the pull-up selector and the DS2413
connector clearly identifiable.

Any manufactured implementation shall preserve practical sensor replacement,
safe resistor-limited bus pull-up selection, and a removable or equivalently
isolatable DS2413 function. A permanently fitted device without effective
fault isolation would discard an important lesson from the V1 firmware
investigations.

#### Functional Coverage

The block enables functional validation of:

* Espruino `OneWire` object creation, reset and presence detection
* repeated multidrop search and stable ROM discovery
* family-code filtering in a mixed-device population
* discovery of two distinct family `0x28` DS18B20 ROMs
* `skip` and addressed `select` transactions
* conversion initiation and completion timing
* individual scratchpad readback and Maxim CRC validation
* plausible temperature conversion for both sensors
* stable discovery of one family `0x3A` DS2413 ROM
* addressed DS2413 access-write command framing
* write-complement confirmation and returned status validation
* independent PIOA-low, PIOB-low, both-low and both-released states
* target `digitalRead` observation of each commanded PIO state
* simultaneous use of the 1-Wire control bus and both feedback inputs
* repeated and soak operation under the complete standard bus load
* comparison of device populations and pull-up values during firmware or
  signal-integrity investigation

#### Downstream Decisions

The block concept and prototype arrangement are accepted. The following
follow-up is assigned under Section 7.6:

* whether 4.7 kOhm remains the normal pull-up after validation and when the
  2.2 kOhm alternative is permitted
* acceptable routed-path resistance and capacitance
* representative maximum wired-sensor lead length for standard validation
* whether additional connector-side transient or miswiring protection is
  required
* whether the two feedback roles reuse Block 1 inputs or receive other routed
  Target Interface resources
* the routing implementation that guarantees exclusive loopback and DS2413
  feedback paths
* the accepted DS2413 breakout mechanical envelope and orientation marking
* whether the 4.7 kOhm PIO pull-ups require configurable provisions
* the manufactured sensor-connection, safe pull-up-selection and
  DS2413-isolation implementations

### 6.6 V1 Block 6 — Absorbed Into The V2 1-Wire Block

**Status:** Absorbed; no separate V2 Test Block

The DS2413 GPIO capability and its feedback paths are defined as part of the
V2 1-Wire Functional Device Block in Section 6.5. V1 Block 6 remains listed
only for numbering and evidence traceability.

### 6.7 Block 7 — UART Functional Crosslink And External Peer

**Status:** Accepted and complete; retains the proven V1 bidirectional
crosslink, adds a constrained-target external-peer option and records its
Control Service dependencies

#### Purpose

The UART Functional Crosslink And External Peer Block provides a protected
full-duplex connection between two target UART endpoints. It also permits one
target UART to communicate with an external peer when the target
does not expose a second usable UART or when that second UART is unavailable
because of console, flashing or GPIO constraints.

The block validates physical UART data paths and the Espruino `Serial` API. It
does not define console ownership, native USB Serial/JTAG, USB CDC, host-port
selection or recovery behaviour. Those are Control Service responsibilities
that may be requested by a Block 7 test.

#### V1 Evidence

The classic ESP32_V1 harness crosses UART1 and UART2 in both directions while
UART0 remains the board USB-UART runner and control path. This implementation
proves the value of a two-endpoint crosslink without requiring a second
external serial device.

**Evidence correction:** the ESP32-C3 V1 harness physically provides two
different host connections. Its target-board USB connector uses the onboard
USB-to-UART bridge connected to UART0 on D20/D21. The separate harness
connector wires the C3 native USB Serial/JTAG signals on D18/D19, but that
native path was not exercised in the reported testing. The proposed C3
UART0/UART1 crosslink under independent native-USB control is therefore a V1
hardware provision and V2 design input, not proven Block 7 bench evidence.

Recent ESP32_V1 testing substantially extended the shared Block 7 coverage.
The crosslink reproduced Espruino issue 2718 as a symmetric assertion at the
65-byte receive boundary, distinguished that firmware failure from a wiring
fault, and then verified the upstream fix. Fixed firmware passed complete and
hash-correct transfers in both directions at 32, 64, 65, 96, 128 and 200
bytes, including delivery through multiple receive callbacks. Full-duplex
traffic also passed with simultaneous unequal payloads.

The same hardware exercised:

* setup and reconfiguration at 9600, 57600 and 115200 baud
* 8N1, 7E1 and 8O2 framing configurations
* string, array and typed-array writes plus `print` and `println`
* event-driven reception and polling through `available` and `read`
* listener attachment, ordering, removal and reattachment
* buffered injection and piping received data to a JavaScript sink
* short-transfer `flush`, repeated setup, `unsetup` and mismatch recovery
* observed target-specific behaviour for `errors:true` and `isConnected`

The evidence also parked separate firmware questions around a large
`Serial.flush()` transfer, an ESP32 `Serial.unsetup()` warning and
`isConnected()` semantics. These are not harness failures and do not block the
V2 block definition.

The principal evidence is recorded in:

* `Block7_V1TestNotes.md`
* `../../../../tests/Results/2026-07-13-ubuntu-v1-next-blocks.md`
* `../../../investigations/uart/esp32-v1-block7-followups-2026-07-14.md`

#### V2 Decision

Retain a full-duplex crosslink with two logical UART endpoints, A and B:

```text
UART A TX ---- protected path ----> UART B RX
UART B TX ---- protected path ----> UART A RX
```

Both directions shall be available concurrently and shall not require manual
selector or shunt changes during routine tests. The target-specific assignment
of hardware UARTs and GPIOs to endpoint A or B is supplied by the Target
Profile and established through direct or automated routed connections.

The block shall also support a single-target-endpoint configuration. This
reduces the target-side requirement from two UART endpoints and four GPIOs to
one UART endpoint and two GPIOs; it does not remove the need to wire the tested
target UART. Its selected TX and RX reach the peer connector through direct or
automated routed connections, while the unused target endpoint remains
disconnected.

In this external-peer configuration, a host-controlled 3.3 V USB-UART adapter
or a future programmable harness peer may receive and validate target
transmissions, send known replies, and generate negative or recovery traffic
independently of the target firmware. The test runner coordinates that peer and
combines its observations with the target-side result received through a
separate Control Service connection. Whether the peer becomes a standard
programmable harness or harness-master facility is deferred to the Control
Service specification.

Provide one compact 2.54 mm 2x3 external-peer and diagnostic header with the
following logical arrangement:

| Header row | Position 1 | Position 2 | Position 3 |
|---|---|---|---|
| UART A | A TX | A RX | GND |
| UART B | B TX | B RX | GND |

The header provides no power output. An external USB-UART adapter or other peer
must be independently powered, use 3.3 V signalling and
share harness ground. The final connector footprint and orientation remain
subject to physical layout review.

Dedicated bad-frame or glitch-generation circuitry is not part of this Test
Block. Where required, malformed traffic, mismatched settings, break-like
conditions and recovery sequences should be generated by the host-controlled
adapter or a defined Supervisor peer function.

#### Required Interface Signals

The block requires four logical Target Interface signals:

* `TI_UART_A_TX`
* `TI_UART_A_RX`
* `TI_UART_B_TX`
* `TI_UART_B_RX`

Endpoint names describe block roles rather than fixed target peripheral
numbers. CTS and RTS hardware-flow-control signals are not part of the Rev-A
Standard Test Block or Target Interface inventory. Where their testing is
justified for a particular target, the daughter board may expose the required
target pins through a target-specific Adapter Service for connection to an
independently controlled 3.3 V UART peer. The Target Profile shall identify
that provision, its electrical limits, required peer and test preconditions.

#### Connection Behaviour

In dual-target-endpoint operation, A TX connects only to B RX and B TX connects
only to A RX. Both crossed directions must remain active for simultaneous
full-duplex transfers. The routing design must not connect two target outputs,
leave two sources driving one RX net, or activate parallel direct and routed
paths without explicit isolation.

In external-peer operation, the peer RX observes the selected target TX and
the peer TX drives the selected target RX through a protected path. The other
target endpoint shall be disconnected before the peer is enabled. An external
peer must not be attached as a second driver while the corresponding crossed
target TX path is active.

The block may use direct or legal routed connections. Route application and
verification must complete before either UART is configured to transmit. A
route change shall occur only while both target TX functions and any external
peer transmitter are inactive or disconnected.

Ordinary non-console UART tests require an established control connection that
does not use either UART endpoint under test. Tests that deliberately validate
console movement, console ownership or UART0 reuse shall additionally request
the appropriate console, reset and recovery Control Services. Block 7 does not
define those services.

Where native USB Serial/JTAG supplies that independent control path, use the
target's onboard native-USB connector when it provides one. If the target lacks
a suitable connector and the path is required, the target-specific USB
connector, D+/D- wiring, ESD protection and VBUS treatment shall be a
daughter-board Adapter Service. Native USB signals are not part of Block 7 and
shall remain direct rather than using the ordinary UART or GPIO routing fabric.
The Target Profile records whether the path is onboard, adapter-provided or
unavailable.

On targets with an onboard USB-UART bridge attached to a tested UART, the
Target Profile must identify whether the bridge is electrically isolated,
unpowered or subject to an explicit cable-disconnection precondition. Its TX
output must not contend with the crosslink or external peer.

#### Electrical And Safe-State Rules

* All UART Test Block and external-peer signals use the 3.3 V harness logic
  domain and common ground.
* Each active TX-to-RX path shall include 470 Ohm series protection, retaining
  the proven V1 value unless prototype signal-integrity evidence requires a
  change.
* The series resistance limits fault current but does not make output-to-output
  contention an allowed configuration.
* No fixed UART pull-up or pull-down is required in the initial block. Any
  receive-line idle bias found necessary during prototype testing must not load
  target boot, strap, console or debug functions.
* The safe inactive state disconnects competing sources and leaves routed
  block paths high impedance.
* UART transmitters shall be idle before a route or external-peer connection is
  enabled.
* The selected baud, framing and routed path must remain within the electrical
  and timing limits of the target, routing devices and external peer.
* External peer connections shall be inserted, removed or reconfigured only
  while their transmitters are disabled and the relevant routes are inactive.

The default and recovery console path must remain safe during block reset and
route-controller reset. Its detailed electrical implementation belongs to the
Control Service and Target Interface specifications.

#### Isolation And Diagnostics

Automated route isolation shall replace the V1 manual UART selectors and
links. It must be possible to isolate endpoint A, endpoint B and the external
peer so that each source and receive path can be diagnosed independently.

The 2x3 header exposes A TX, A RX, B TX, B RX and two ground contacts for logic
analysis, baud measurement and connection of external 3.3 V peers. Signal
labels and the two endpoint rows shall be unambiguous on the silkscreen. The
header must remain electrically useful for observation while the internal
crosslink is active.

The final prototype review shall determine whether this shared header alone
provides adequate observation while an external peer is fitted or whether
additional individual header-pin test points are justified. That decision must
consider the cumulative connector and test-point budget in Section 7.

The Resolved Test Configuration and evidence must record the endpoint
assignments, active routes, baud and framing, control connection, external-peer
presence and any required USB-cable or onboard-bridge precondition.

#### Functional Coverage

The block enables functional validation of:

* hardware UART setup, reconfiguration, `unsetup` and repeated setup
* bidirectional and simultaneous full-duplex transfers
* event-driven reception and polling with `available` and `read`
* strings, arrays, typed arrays, binary values, `print` and `println`
* receive callback chunking across and above the 64-byte boundary
* listener ordering, removal, reattachment and buffered delivery
* `inject`, piping and short-transfer `flush` behaviour
* baud-rate, data-bit, parity and stop-bit configurations supported by the
  target
* mismatched-configuration negative tests followed by clean recovery
* externally generated data and device-integration sequences
* target-specific supported and rejected Serial options
* diagnosis of a one-direction wiring, route or UART failure
* console-related UART tests when the required independent Control Services
  and recovery path are available

#### Downstream Decisions

The V1 crosslink behaviour and V2 block requirements are accepted. The
following follow-up is assigned under Section 7.6:

* the exact direct and routed topology used to provide both UART endpoints
* the baseline and maximum baud required after routing-path validation
* any target-specific CTS or RTS Adapter Service and external-peer arrangement
  justified by a target test requirement
* the final standard external-peer connector footprint and orientation,
  preserving the accepted 2x3 logical arrangement without CTS or RTS
* whether the shared peer header requires additional live observation pins
* whether weak RX idle bias is useful and electrically safe across the target
  envelope
* whether the host-controlled USB-UART peer remains external equipment or is
  provided by a defined Supervisor peer function, and when a target-specific
  implementation is an Adapter Service
* the console Control Service paths and guaranteed reset/recovery behaviour
* target-specific isolation or external preconditions for onboard USB-UART
  bridges

### 6.8 Block 8 — External I2C Extension

**Status:** Absorbed into Block 3; no separate V2 Test Block

The single Grove I2C extension and Grove-hub expansion capability are defined
as part of Block 3.

### 6.9 Block 9 — Addressable RGB Output

**Status:** Accepted and complete; new V2 Test Block

#### Purpose

The Addressable RGB Output Block provides a real timing-sensitive
single-data-wire colour device for validating the Espruino `neopixel` library
and the target port's encoded digital output. It gives an immediate visible
indication of successful device control and exposes the data waveform for
electrical and timing diagnosis.

The block validates functional device integration rather than colour accuracy.
Automated optical colour measurement is not an initial requirement.

#### V1 Evidence And V2 Rationale

V1 did not include a standard addressable RGB device. The V2 API-coverage
review identified `require("neopixel").write()` as a hardware-facing Espruino
capability whose high-speed, platform-dependent output is not fully represented
by ordinary static GPIO loopback or filtered PWM testing.

The initial device feedback may be assessed visually. A future programmable
peer or harness-master Control Service may capture and validate pulse timing,
bit encoding and complete transmitted data independently of the target.

#### V2 Decision

Use an Adafruit Pixel Shifter for Addressable LEDs, product 6066, as the
removable prototype Block 9 module. The module accepts the harness 3.3 V supply
and target data signal, generates a small local 5 V rail, translates the data
through its onboard 74HCT2G34 and includes one onboard NeoPixel as the standard
functional load and visible indicator. Its input definitions and order follow
the manufacturer's [Pixel Shifter overview](https://learn.adafruit.com/adafruit-pixel-shifter/overview)
and [pinout](https://learn.adafruit.com/adafruit-pixel-shifter/pinouts).

The reusable harness PCB shall provide a right-angle four-position 2.54 mm male
header at the board edge. Its horizontal pins engage the module's four-position
input screw terminal so that the module is removable and overhangs the harness
PCB edge. The positions follow the module input order:

| Module input | Harness connection |
|---|---|
| `V` | 3.3 V |
| `G` | GND |
| `DAT` | addressable RGB data input |
| `CLK` | no electrical connection |

The `CLK` header position is retained only for mechanical alignment with the
four-input module terminal and shall have no harness PCB copper connection.
The inverted-data and additional shifted outputs are not required by the
baseline Block 9 implementation. The module shall be oriented so that its
onboard pixel remains visible and its overhang does not obstruct adjacent
connectors or the supporting surface. One pixel is sufficient for the baseline
functional test.

#### Required Interface Signals

The block requires one logical Target Interface signal:

* `TI_RGB_DATA`

The module supply and ground are harness power connections rather than
additional target signals.

#### Connection Behaviour

The selected target output drives the module data input through a protected
path. `TI_RGB_DATA` may use a direct connection or a legal routed connection,
but it must not share an active path with another driven source.

The data route shall be applied and verified before the target configures the
pin for output. An external test accessory may observe the protected data node
at high impedance; it must not drive the node while the target output is
active.

Automated waveform validation, when required, shall capture the 3.3 V
target-data node before level translation. This validates the waveform
produced by the target without introducing a 5 V signal into the test
accessory. The module's shifted
output may be observed separately using appropriately rated diagnostic
equipment when translation itself is under investigation.

#### Electrical And Safe-State Rules

* The module input supply and target-facing data connection operate entirely in
  the 3.3 V harness domain.
* The Pixel Shifter's generated 5 V rail and shifted outputs are contained
  module-local implementation details. They shall not connect to the Target
  Interface or a general-purpose harness peripheral connector.
* The generated 5 V rail is approved only for the Pixel Shifter and its onboard
  pixel. It is not an external pixel power supply.
* Provide 470 Ohm series protection in the target-to-module data path, retaining
  the common V1/V2 digital protection value unless prototype waveform evidence
  shows that a lower value is required for reliable encoded output.
* Retain the module manufacturer's onboard decoupling and provide a local 100 nF
  capacitor at the harness-side module supply connection. Additional bulk
  capacitance is not required unless prototype supply measurements justify it.
* The block shall apply no fixed pull-up or pull-down to `TI_RGB_DATA` unless
  required by the selected device and confirmed not to load target boot, strap,
  console or debug functions.
* The target output shall be low or high impedance before the module is powered,
  inserted, removed or routed, preventing signal-powered backfeeding.
* The removable module shall be inserted or removed only while its supply and
  data route are inactive.
* Tests shall limit brightness and duration to the level needed for functional
  validation. The power design must nevertheless tolerate the selected
  module's documented worst-case current.

#### Isolation And Diagnostics

Removing the module provides complete isolation of the addressable RGB device
without requiring a routine selector or shunt. Provide an accessible 2.54 mm
header-pin test point on the protected module-side data node and a nearby
ground point for oscilloscope or logic-analyser connection.

The harness connector shall have unambiguous `3V3`, `GND`, `DATA` and `NC`
labels and a pin-1 or orientation mark. The connector order and module outline
shall be shown on the harness silkscreen. The arrangement must prevent a
reasonable accidental reversal from applying 3.3 V directly to the target
data output.

The Pixel Shifter's 5 V output terminals are module-side diagnostic points,
not standard harness test points. Any measurement there requires 5 V-rated
equipment and must not be connected directly to a 3.3 V-only programmable
peer.

#### Functional Coverage

The block enables functional validation of:

* loading and use of `require("neopixel")`
* `neopixel.write` using arrays and typed arrays supported by the target build
* device-off, red, green, blue and mixed-colour commands
* the selected device's recorded RGB, GRB or other byte ordering
* repeated updates and short pattern sequences
* recovery after an invalid-length or otherwise rejected test input where the
  target implementation defines that behaviour
* visual confirmation of real device response
* observation of encoded data amplitude and timing
* optional automated decoding through an external logic analyser or focused
  test accessory

#### Prototype Verification

Prototype implementation and testing must confirm:

* whether the screw-terminal-to-header engagement requires additional module
  support after prototype mechanical evaluation
* the maximum functional-test brightness and resulting current allowance
* whether 470 Ohm series protection preserves adequate waveform margin on all
  initial targets
* the external measurement method used when prototype RGB waveform capture is
  required

## 7. Cross-Block Review

**Status:** Complete; accepted Test Block input to Control Service, connection
matrix, Target Interface and routing work

This review consolidates the accepted signal inventory, dependencies,
physical provisions and Supervisor event-handshake requirement. It defines the
routing analysis boundary without selecting switches, routes or physical
Interface contacts.

### 7.1 Consolidated Provisional Interface-Signal Inventory

The following table consolidates the logical target-facing signals required by
the accepted Test Blocks. Direction is expressed as the target role: an
**output** is driven by the target towards the harness, an **input** is received
by the target, and **bidirectional** changes direction as part of the protocol.

All names remain provisional until accepted by the Target Interface contract.
The table does not allocate physical contacts or target GPIOs. Where exclusive
reuse is permitted, the connection matrix and Target Profile may satisfy more
than one logical role with one physical target resource.

| Provisional Interface signal | Block | Target role | Access and important constraint |
|---|---:|---|---|
| `TI_GPIO_LOOP_A_OUT` | 1 | Output | Direct or routed; exclusive protected path to A input |
| `TI_GPIO_LOOP_A_IN` | 1 | Input | Direct or routed; usable concurrently with pair B; candidate exclusive reuse by 1-Wire feedback |
| `TI_GPIO_LOOP_B_OUT` | 1 | Output | Direct or routed; exclusive protected path to B input |
| `TI_GPIO_LOOP_B_IN` | 1 | Input | Direct or routed; usable concurrently with pair A; candidate exclusive reuse by 1-Wire feedback |
| `TI_ANALOG_PWM_OUT` | 2 | Output | Direct or routed; disconnected before external stimulus is injected |
| `TI_ANALOG_ADC_IN` | 2 | Analogue input | Direct or routed; measures `ANALOG_FB` concurrently with MCP3008 CH0 |
| `TI_I2C_SDA` | 3 | Bidirectional open-drain | Mandatory direct shared bus; available before route control is configured |
| `TI_I2C_SCL` | 3 | Bidirectional open-drain | Mandatory direct shared bus; available before route control is configured |
| `TI_I2C_FB` | 3 | Input | Direct or routed; MCP23017 GPA0 protected feedback |
| `TI_I2C_INT` | 3 | Input | Direct or routed; preserve the selected interrupt electrical mode |
| `TI_SPI_SCK` | 4 | Output | Direct or routed; shared by ADC and extension device |
| `TI_SPI_MOSI` | 4 | Output | Direct or routed; shared by ADC and extension device |
| `TI_SPI_MISO` | 4 | Input | Direct or routed; only the selected SPI device may drive it |
| `TI_SPI_CS_ADC` | 4 | Output | Direct or routed; defaults inactive and is exclusive of `CS_EXT` assertion |
| `TI_SPI_CS_EXT` | 4 | Output | Direct or routed; defaults inactive and is exclusive of `CS_ADC` assertion |
| `TI_ONEWIRE_DQ` | 5 | Bidirectional open-drain | Direct or characterised bidirectional route; preserves 1-Wire timing |
| `TI_ONEWIRE_GPIO_A_FB` | 5 | Input | Direct or routed; simultaneous with B feedback; may exclusively reuse a Block 1 input |
| `TI_ONEWIRE_GPIO_B_FB` | 5 | Input | Direct or routed; simultaneous with A feedback; may exclusively reuse a Block 1 input |
| `TI_UART_A_TX` | 7 | Output | Direct or routed; crosslinks only to B RX or selected peer RX |
| `TI_UART_A_RX` | 7 | Input | Direct or routed; one active source only |
| `TI_UART_B_TX` | 7 | Output | Direct or routed; crosslinks only to A RX or selected peer RX |
| `TI_UART_B_RX` | 7 | Input | Direct or routed; one active source only |
| `TI_RGB_DATA` | 9 | Output | Direct or routed; protected 3.3 V node before module level translation |

Harness power, ground and Control Service signals are outside this Test Block
inventory. Internal nodes and external harness connections—including
`ANALOG_FB`, MCP3008 channels, the Grove connector, the microSD module and the
Pixel Shifter module—do not add target-facing Interface signals.

The inventory therefore contains 23 logical Test Block signal roles before any
approved exclusive reuse. `SUP_EVENT_OUT` and `SUP_EVENT_IN` belong to the
separate Supervisor Interface and do not add target-facing Interface roles.

### 7.2 Cross-Block And Service Dependencies

| Relationship | Required behaviour | Exclusion or safe-state rule | Downstream owner |
|---|---|---|---|
| Block 1 pair A with pair B | Both loopback pairs operate concurrently | Never connect two target outputs; isolate any reused input role | Connection matrix and routing Control Service |
| Block 2 with Block 4 | Target ADC and MCP3008 CH0 measure the same `ANALOG_FB` stimulus concurrently | Keep the normal three Block 2 shunts fitted; external CH0 drive uses the Block 2 diagnostic procedure only | Block 2/4 schematic implementation and prototype verification |
| Block 3 with routing Control Service | Target, functional MCP23017, Grove branch and routing devices share direct SDA/SCL | Route control must not depend on a routed path to its own bus; reserve addresses and verify aggregate pull-ups | Control Service, routing and prototype bus validation |
| Block 5 with optional Block 1 input reuse | Both DS2413 feedback inputs remain simultaneous while the 1-Wire bus is active | Loopback drivers and DS2413 feedback paths are mutually exclusive; change routes with target inputs high impedance | Connection matrix, routing and Target Profiles |
| Block 7 with console/control services | UART endpoints under test require an independent control and recovery path | External peer and crossed target TX must never drive the same RX; isolate onboard bridges where required | Control Service, Adapter Services and Target Profiles |
| Block 3 with Supervisor event handshake | Target configures the MCP23017 event input, interrupt and acknowledgement output; Supervisor supplies and timestamps the external event | Event lines have hardware-safe defaults and neither side may back-power the other | Standard Control Services, connection matrix and schematic |
| Routable Test Blocks with routing Control Service | Required routes are applied and verified before target pins or peers drive | Reset defaults are high impedance and conflicting direct/routed paths remain isolated | Routing specification and connection matrix |
| All Test Blocks with power Control Service | Standard block-facing supply and logic remain in the controlled 3.3 V domain | Prevent competing sources and back-power; Block 9 local 5 V remains contained | Power Control Service and Target Interface contract |

This table records required relationships rather than a physical route design.
`CombinedCapabilityConnectionMatrix_V2.md` expands it into simultaneous-use
cases, candidate resource reuse, routing-control authority, safe defaults and
recovery dependencies.

### 7.3 Test Block Physical-Provision Review

The following count consolidates the accepted prototype provisions before PCB
placement. It covers Test Blocks only: Target Interface connectors, routing and
other Control Service hardware are not included.

| Block | Isolation or selection | Individual observation pins | Functional, breakout or module connectors | Removable device provision |
|---:|---|---:|---|---|
| 1 | Two 1x2 loopback-isolation headers and two shunts | 4 | None beyond the isolation headers | Loopback paths opened by shunt removal |
| 2 | Three 1x2 path-isolation headers and three shunts | 5 | One 1x2 analogue-stimulus connector | Individual source, target-ADC and MCP3008 paths opened by shunt removal |
| 3 | Two 1x2 I2C pull-up-enable headers and two shunts | 6 | One 2x8 GPIO breakout and one 1x4 2.0 mm Grove connector | Socketed MCP23017; removable Grove branch |
| 4 | No routine shunt header | 1 additional `CS_ADC` pin | One 1x8 analogue breakout and one 1x9 microSD-module connector | Socketed MCP3008; removable card and breakout |
| 5 | One 1x3 resistor-limited pull-up selector and one shunt | 5 | Two three-position sensor screw terminals and one 1x4 DS2413 header | Both sensors and the DS2413 are removable |
| 7 | No manual isolation header | 0 additional pins | One shared 2x3 UART peer/diagnostic header | Route isolation; external peer removable |
| 9 | No routine shunt header | 2 | One 1x4 right-angle Pixel Shifter connection | Complete module removal |

The resulting Test Block baseline is:

| Provision class | Quantity | PCB contact positions |
|---|---:|---:|
| Two-pin shunt headers | 7 | 14 |
| Three-pin pull-up selector | 1 | 3 |
| Fitted shunts | 8 | — |
| Individual observation pins | 23 | 23 |
| Functional, breakout and module connectors | 10 | 59 |
| Socketed integrated circuits | 2 | excluded from the connector-contact total |
| **Header and connector baseline** |  | **99** |

The 99-contact baseline excludes IC-socket contacts, ordinary component leads,
mounting holes, Target Interface banks and all routing or Control Service
hardware. It is therefore a Test Block comparison figure rather than a final
PCB-size estimate.

The cross-block review accepts the following consolidation and priority rules:

* retain the five Block 1 and Block 2 hard-isolation shunts because they provide
  diagnosis independent of routing state
* retain the three pull-up-selection shunts because populated I2C and 1-Wire
  buses require measured, reversible pull-up choices
* use the Block 4 microSD connector's top-side tails as the SPI bus,
  `CS_EXT`, power and ground observation points; do not add a duplicate SPI
  diagnostic header
* use the Block 4 analogue breakout as the CH0-to-CH7 observation and extension
  connection; add only the separate `CS_ADC` observation pin
* retain the five live 1-Wire observation pins because the occupied DS2413
  module header does not expose usable live PIO access
* use the Block 7 2x3 peer connector for routine UART observation; do not add
  separate UART test points unless prototype use proves the shared header
  inaccessible with a peer attached
* use device or module removal for Grove, microSD, DS18B20, DS2413 and RGB
  isolation rather than adding signal shunts to every branch
* do not add a separate spare target-I/O connector until the connection matrix
  and Supervisor event-handshake allocation show unused protected capacity
* allow adjacent blocks to share accessible 3.3 V or ground observation pins
  only when PCB placement preserves a short, obvious probe connection; do not
  remove a required local reference merely to reduce the nominal count
* use compact 0 Ω links or solder-jumper provisions only for construction or
  SMD repair paths that are not expected to change during routine tests

No further duplicate Test Block headers or observation pins shall be added
without identifying the inaccessible signal or test operation that requires
them. Prototype placement must next confirm accessibility, module clearance and
the area consumed by this baseline together with the still-undefined Target
Interface, routing and Control Service hardware.

### 7.4 Derived Supervisor Event-Handshake Requirement

Sleep/wake and wireless-peer tests require one independently generated event
and one target acknowledgement. They do not require a general programmable
stimulus or multi-channel capture fabric.

The Test Block 3 MCP23017 provides the target-programmable endpoint. The
Supervisor drives `SUP_EVENT_OUT` into one protected MCP23017 input. The target
configures that input to assert the existing `TI_I2C_INT` path and may use it
as a wake source. The target acknowledges the event through another MCP23017
GPIO connected to `SUP_EVENT_IN`, which the Supervisor observes and timestamps.

Both event signals shall have hardware-safe states when either endpoint is
absent or unpowered. A Target Profile supporting event wake shall map
`TI_I2C_INT` to a GPIO capable of every declared sleep depth and record those
supported depths. In Standalone operation the event input may be driven
manually through the MCP23017 breakout; automated operation requires the
Supervisor.

The target remains the only controller of the shared I2C bus and establishes
required routes before a test or sleep operation. General waveform capture,
including Stepper or RGB-data decoding, uses observation points and an
external test accessory when required; it is not a standard Control Service.

### 7.5 Routing-Analysis Handoff

The routing analysis shall use the following accepted inputs:

| Subject | Accepted requirement |
|---|---|
| Mandatory direct path | `TI_I2C_SDA` and `TI_I2C_SCL` remain direct and usable before route control is configured |
| Candidate routed roles | The other 21 logical Test Block roles may be direct or routed subject to direction, loading, timing and safe-state validation |
| Within-block concurrency | Every signal listed for one selected block operates concurrently where that block section requires it |
| Cross-block concurrency | Block 2 operates with MCP3008 CH0 in Block 4; routing control operates alongside any routed test; UART tests retain independent console/recovery; the Block 3 event handshake coexists only with its selected sleep/wake or wireless test |
| Reconfiguration | Arbitrary simultaneous operation of all Test Blocks is not required; target resources may be reused between separately resolved test configurations |
| Permitted logical reuse | The two Block 5 feedback roles may exclusively reuse the two Block 1 input roles; no other reuse is accepted without connection-matrix review |
| Reset and route changes | Routed paths default high impedance; establish and verify routes before enabling drivers; disable competing sources before changing or clearing routes |
| Control authority and recovery | The target controls routing I2C and establishes routes before testing; Hardware Clear returns controlled routes to safe states without giving the Supervisor access to routing I2C |
| Performance | Characterise switch resistance, capacitance, leakage and bandwidth against PWM/analogue, SPI, 1-Wire, UART and RGB requirements; retain the direct I2C baseline |
| Expansion | Preserve unused MCP23017 GPIO as low-speed expansion provision; do not allocate another target-I/O or peer connector without a defined test requirement |

These requirements are the accepted Test Block inputs to routing topology and
component analysis. `CombinedCapabilityConnectionMatrix_V2.md` records the
resulting legal source-to-destination paths, simultaneous sets, exclusive
reuse, reset state and Hardware Clear recovery action.

### 7.6 Deferred Decision Ownership

The remaining block-level questions do not block routing analysis. They are
owned downstream as follows:

`StandardControlServices_V2.md` has resolved routing-control authority,
console and recovery, the Supervisor event handshake, wireless-peer services,
reset and boot, and power behaviour.

| Owner | Deferred decisions |
|---|---|
| Prototype verification | Final pull-ups, protection, clock/baud margins, routed signal integrity, module clearance and current measurements |
| Routing and connection matrix | Exact direct/routed topology, Block 1/5 reuse, route exclusivity, Supervisor event paths and switch recovery |
| Target Interface and Target Profiles | Physical contacts, target assignments, unavailable roles, onboard-bridge constraints and Adapter Services |
| Manufacturing review | SMD packages and compact isolation, repair and replacement provisions equivalent to the prototype |

### 7.7 Capabilities Without A Standard Test Block

Wi-Fi and BLE tests that require another endpoint use the Harness Supervisor in
`SUPERVISOR` mode and do not require another fixed Test Block. Formal RF
performance and compliance testing are outside the V2 harness scope.

## 8. Expected Outputs

| Expected output | Status | Recorded in |
|---|---|---|
| Accepted V2 Test Block inventory | Complete | Section 5 |
| Accepted requirement set for each block | Complete | Section 6 |
| Provisional list of required Target Interface signals | Complete | Section 7.1 |
| Direct, routable and simultaneous-use requirements | Complete | Sections 7.1, 7.2 and 7.5 |
| Safe-state, loading, isolation and diagnostic rules | Complete | Sections 3, 6 and 7.2–7.4 |
| Open prototype investigations | Complete: identified and assigned | Block prototype-verification and downstream-decision subsections; Section 7.6 |
| Routing-fabric requirements derived from the blocks | Complete | Section 7.5 |

All expected specification outputs are therefore complete. Prototype
measurements and downstream design decisions remain future work under the
ownership recorded in Section 7.6; they are not missing outputs from this
specification.

Physical connector pin assignment remains outside this document.

## Appendix A — Test Block Functional And Module Connector Register

This appendix expands the ten functional, breakout and module connectors
counted in Section 7.3. It is an implementation aid; the detailed electrical,
mechanical and isolation requirements remain authoritative in the applicable
block sections.

| Block | Connector | Connector format | Primary purpose |
|---:|---|---:|---|
| 2 | External analogue-stimulus connector | 1x2 | Inject `ANALOG_FB` with adjacent ground |
| 3 | MCP23017 GPIO breakout | 2x8 | Expose GPA0 through GPB7 for observation, Supervisor event diagnosis and additional low-speed GPIO experiments |
| 3 | Grove I2C connector | 1x4, 2.0 mm | Attach one standard external I2C device or Grove hub |
| 4 | MCP3008 analogue breakout | 1x8 | Expose CH0 through CH7 for observation and external analogue inputs |
| 4 | MicroSD module connector | 1x9 | Mount the removable passive microSD breakout and expose its useful SPI pins on the top-side tails |
| 5 | DS18B20 sensor connector A | 1x3 screw terminal | Connect or replace the first powered 1-Wire sensor |
| 5 | DS18B20 sensor connector B | 1x3 screw terminal | Connect or replace the second powered 1-Wire sensor |
| 5 | DS2413 module header | 1x4 | Mount and completely remove the 1-Wire GPIO breakout |
| 7 | UART peer and diagnostic header | 2x3 | Expose both UART endpoint pairs and two ground contacts |
| 9 | Pixel Shifter connection | 1x4 right-angle | Mount the removable edge-overhanging RGB module; the `CLK` position is mechanically present but not connected |

The register contains 59 PCB contact positions. It excludes isolation and
pull-up-selector headers, individual observation pins, IC sockets, Target
Interface banks, routing hardware and Control Service connectors.

## Appendix B — Individual Observation-Point Register

This appendix expands the 23 individual observation pins counted in Section
7.3. Each entry is one accessible 2.54 mm header pin.

| Block | Observation point | Primary diagnostic purpose |
|---:|---|---|
| 1 | `TI_GPIO_LOOP_A_OUT` side | Observe the target-driven side of the protected and isolated loopback path |
| 1 | `TI_GPIO_LOOP_A_IN` side | Observe the target-input side of the complete loopback path |
| 1 | `TI_GPIO_LOOP_B_OUT` side | Observe the target-driven side of the protected and isolated loopback path |
| 1 | `TI_GPIO_LOOP_B_IN` side | Observe the target-input side of the complete loopback path |
| 2 | `TI_ANALOG_PWM_OUT` | Observe the target PWM output before its isolation point and RC filter |
| 2 | `ANALOG_FB` | Measure the filtered or externally injected analogue stimulus |
| 2 | `TI_ANALOG_ADC_IN` | Observe the target side of the ADC-input isolation point |
| 2 | MCP3008 CH0 | Observe the MCP3008 side of the CH0 isolation point |
| 2 | GND | Provide a nearby analogue measurement reference |
| 3 | SDA | Observe shared I2C data without disturbing the Grove connector |
| 3 | SCL | Observe shared I2C clock without disturbing the Grove connector |
| 3 | `TI_I2C_FB` | Observe MCP23017 GPA0 target feedback |
| 3 | `TI_I2C_INT` | Observe the MCP23017 interrupt path |
| 3 | 3.3 V | Measure the local I2C device and pull-up supply |
| 3 | GND | Provide a nearby I2C measurement reference |
| 4 | `TI_SPI_CS_ADC` | Observe the MCP3008 chip select concurrently with the shared SPI bus and extension chip select |
| 5 | `ONEWIRE_DQ` | Observe reset, presence, read and write slots on the complete populated bus |
| 5 | `ONEWIRE_PIOA` | Observe the DS2413 PIOA source while the module is fitted |
| 5 | `ONEWIRE_PIOB` | Observe the DS2413 PIOB source while the module is fitted |
| 5 | 3.3 V | Measure the local 1-Wire device and pull-up supply |
| 5 | GND | Provide a nearby 1-Wire measurement reference |
| 9 | Protected module-side RGB data | Capture the target-generated 3.3 V waveform before Pixel Shifter level translation |
| 9 | GND | Provide a nearby RGB waveform measurement reference |

Block 4 also obtains SCK, MOSI, MISO, `TI_SPI_CS_EXT`, 3.3 V and GND
observation through the top-side tails of the microSD connector, and CH0
through CH7 through the analogue breakout. Block 7 obtains UART observation
through its shared 2x3 peer header. Those connector-provided points are listed
in Appendix A and are not counted again as individual observation pins.
