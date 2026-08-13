# Reusable Harness Rev-A Design Baseline

**Status:** Draft
**Baseline decision:** Not released for manufacture

## Purpose

This document defines the exact Rev-A implementation of the V2 Reusable
Harness Board and the evidence required before it is released to a PCB
manufacturer.

The architecture specifications define the required behaviour. This baseline
records how Rev A implements that behaviour. The KiCad project is the
authoritative implementation, while generated ERC, connectivity, BOM and DRC
outputs provide verification evidence.

The deterministic connectivity evidence required by this baseline is produced
by the tool defined in the
[Rev-A Connectivity Checker specification](ReusableHarnessRevA_ConnectivityChecker.md).

Rev A is ready for manufacture only when every applicable requirement maps to
an implemented and reviewed circuit, all release checks pass, and the accepted
baseline is identified by a Git commit.

## 1. Board identity, scope and implementation

| Item | Value |
|---|---|
| Board | V2 Reusable Harness Board |
| Revision | Rev A |
| Baseline status | Draft |
| Baseline Git commit | TBD |
| KiCad version | KiCad 9.0.x; exact release version TBD |
| Review date | TBD |
| Manufacturing release decision | Not approved |

### Included scope

- Reusable Harness Board implementation.
- Standard Test Blocks.
- Routing Control Service and Routing Fabric.
- Power Control Service.
- Target Interface connector banks.
- Provisional Rack Control and backplane interface.
- Rev-A isolation, diagnostic and test provisions.

Any excluded or provisional function shall be identified in its owning block
analysis before release.

### KiCad implementation structure

| Area | Owning schematic |
|---|---|
| Board integration and external interfaces | `Espruino_Harness_RevA.kicad_sch` |
| Standard Test Blocks | `standard_test_blocks.kicad_sch` |
| Routing Control and Routing Fabric | `routing_control.kicad_sch` |
| Power Control | `power_control.kicad_sch` |
| Rack Control Endpoint and direct reset/boot stages | `rack_control.kicad_sch` |
| Prototype daughter-board provision | `prototype_daughter_board.kicad_sch` |

The standalone `draft_workbench.kicad_sch` is not part of the production
hierarchy and cannot provide baseline evidence.

### First-pass schematic milestone

The first-pass functional schematic for the Rev-A Reusable Harness Board is
complete. Every circuit block in the register has an implementation in the
production hierarchy, and the root export dated 2026-08-05 completed with
zero ERC errors and zero warnings. This establishes schematic coverage and
hierarchical integration; it does not establish that any `Draft` block is
electrically verified or ready for manufacture.

The clean working exports are currently named `Rack_Control.net` and
`Rack_Control_ERC.rpt`. Subsequent baseline-review exports shall use the
full-hierarchy names defined in Appendix A so they cannot be mistaken for
sheet-only evidence.

The first-pass netlist contains 225 components. The following symbols do not
yet have footprints and therefore remain manufacturing-release gaps:

- `J900`, `J901` — Target Interface connector banks
- `J2`, `J301` — Grove I2C connectors
- `JBP2` — second provisional backplane connector

The prototype daughter-board sheet remains a provision rather than a
populated daughter-board design. The Shared Supervisor Assembly and physical
rack backplane are separate hardware designs outside this board baseline.

## 2. Governing requirements and artifact authority

### Governing specifications

- [V2 architecture](../arch/TestHarnessArchitecture_V2.md)
- [Conceptual model](../arch/HarnessConceptualModel_V2.md)
- [Hybrid harness architecture](../arch/HybridHarnessArchitecture_V2.md)
- [Standard Test Blocks](../arch/StandardTestBlocks_V2.md)
- [Standard Control Services](../arch/StandardControlServices_V2.md)
- [Target Routing Envelope](../arch/TargetRoutingEnvelope_V2.md)
- [Combined Capability Connection Matrix](../arch/CombinedCapabilityConnectionMatrix_V2.md)
- [Controlled routing](../arch/I2CControlledRouting_V2.md)
- [Target Interface contract](../arch/TargetInterfaceContract_V2.md)
- [Rev-A prototype strategy](../arch/ReusableHarnessPrototypeStrategy_V2.md)

### Artifact roles

| Artifact | Role |
|---|---|
| V2 architecture and interface specifications | Define required behaviour and accepted contracts |
| This baseline | Defines the selected Rev-A implementation and its acceptance state |
| `KICAD/V2/RevA/Espruino_Harness_RevA/` | Authoritative schematic, symbols, footprints and PCB implementation |
| Connectivity contract | Machine-readable required and forbidden connectivity |
| [Connectivity checker specification](ReusableHarnessRevA_ConnectivityChecker.md) | Defines the tool that compares the complete root netlist with the connectivity contract and produces deterministic evidence |
| Generated ERC, connectivity, BOM and DRC reports | Repeatable verification evidence |
| Review images | Visual record of the circuit that was reviewed; not connectivity authority |
| AISLER BOM Assign and final quote | Confirms the manufacturer part selections, exclusions, availability and assembly cost used for release |

When artifacts disagree, resolve the discrepancy explicitly. Do not silently
change a requirement to match the schematic or treat a generated report as a
replacement for design intent.

## 3. Circuit-block register

Use `Draft`, `Reviewed` or `Verified` for block status. Manufacturing release
is a board-level decision. A material change returns the affected block to
`Draft`.

| ID | Circuit block | Risk | Owning sheet | Requirements | Visual review | Status |
|---|---|---|---|---|---|---|
| PC01 | Operating mode and 3.3 V rail | High | `power_control.kicad_sch` | Standard Control Services | [PNG](review-images/PC01-operating-mode-and-3v3-rail.png) | Verified |
| PC02 | Target 5 V switch and two-range monitor | High | `power_control.kicad_sch` | Standard Control Services | [PNG](review-images/PC02-target-5v-switch-and-two-range-monitor.png) | Verified |
| RC01 | Routing Fabric | High | `routing_control.kicad_sch` | Controlled routing | [PNG](review-images/RC01-routing-fabric.png) | Verified |
| RC02 | Routing controllers and fixed I2C isolation | High | `routing_control.kicad_sch`; Hardware Clear request stage on `rack_control.kicad_sch` | Controlled routing and Standard Control Services | [Full sheet](review-images/RC02-routing-controllers-and-fixed-i2c-isolation.png); [Hardware Clear](review-images/RC02-hardware-clear-request.png) | Verified |
| TB01 | Digital GPIO loopback | Standard | `standard_test_blocks.kicad_sch` | Standard Test Blocks | [PNG](review-images/TB01-digital-gpio-loopback.png) | Verified |
| TB02 | Analogue/PWM feedback | Standard | `standard_test_blocks.kicad_sch` | Standard Test Blocks | [PNG](review-images/TB02-analogue-pwm-feedback.png) | Verified |
| TB03 | I2C functional device | Standard | `standard_test_blocks.kicad_sch` | Standard Test Blocks | TBD | Draft |
| TB04 | SPI device and removable storage | Standard | `standard_test_blocks.kicad_sch` | Standard Test Blocks | TBD | Draft |
| TB05 | 1-Wire devices and GPIO | Standard | `standard_test_blocks.kicad_sch` | Standard Test Blocks | TBD | Draft |
| TB07 | UART crosslink and external peer | Standard | `standard_test_blocks.kicad_sch` | Standard Test Blocks | TBD | Draft |
| TB09 | Addressable RGB output | Standard | `standard_test_blocks.kicad_sch` | Standard Test Blocks | TBD | Draft |
| TI01 | Target Interface connector banks | High | Root schematic | Target Interface contract | TBD | Draft |
| BP01 | Rack Control and backplane interface | High | Root schematic | Standard Control Services | TBD | Draft |
| EP01 | Rack Control Endpoint and direct reset/boot stages | High | `rack_control.kicad_sch` | Standard Control Services | TBD | Draft |

## 4. Circuit-block analyses

This section records the analysis and verification state of each implemented
circuit block. Each block has its own subsection and follows the template in
Appendix A.

### 4.1 PC01 — Operating mode and 3.3 V rails

**Purpose and requirements:** Select the permitted Routing Logic 3.3 V source,
hold the harness inactive in `OFF`, and provide either automatic or
Supervisor-controlled Test Block 3.3 V without joining the target and external
supplies. See Standard Control Services Sections 3.1–3.3 and Appendix C.2.
**Source schematic:** `power_control.kicad_sch`, references `U1001`, `U1002`,
`D1001`–`D1005`, `Q1001`, `R1001`–`R1004`, `R1009` and `C1001`–`C1005`.
**Visual review:** Accepted
[`PC01-operating-mode-and-3v3-rail.png`](review-images/PC01-operating-mode-and-3v3-rail.png).
**Risk:** High
**Status:** Verified; functional topology, exported connectivity, Test Block
inrush implementation, discrete control margins, exact principal devices,
engineering package evidence, visual review, ERC and deterministic
connectivity checks are accepted. PCB implementation, AISLER commercial
assignments and physical Rev-A measurements remain manufacturing-release
actions.

#### Interfaces and domains

| Type | Signals or rails | Function |
|---|---|---|
| Source inputs | `TI_TARGET_3V3`, `EXT_3V3` | Alternative Routing Logic supplies; they must never be directly joined |
| Mode inputs | `MODE_STANDALONE`, `MODE_STANDALONE_EXT`, `MODE_SUPERVISOR` | One-of-three outputs from the grouped Operating Mode header |
| Supervisor input | `TEST_BLOCK_POWER_EN` | Enables Test Block power only in Supervisor mode |
| Power outputs | `ROUTING_LOGIC_3V3`, `TEST_BLOCK_3V3` | Supplies routing-control circuits and Standard Test Blocks |
| Ground | `TI_GND` | Common 0 V reference |

#### Resolved design issue — Test Block turn-on current

**Status:** Accepted and implemented; Rev-A measurement remains required
before PC01 acceptance and manufacturing release.
**Affected requirement:** Each valid mode must power its selected source and
the Test Blocks without collapsing the target or rack 3.3 V rail.
**Evidence:** `U1002` is a TPS22917 with its adjustable-rise-time `CT` pin open.
The current full-hierarchy netlist places at least 23.3 µF of fixed capacitance
on `TEST_BLOCK_3V3`: `C1004` 1 µF, `C401`, `C402` and `C901` 100 nF each, and
`C403` 22 µF. Removable Test Block modules can add more. TI's
[Managing Inrush Current](https://www.ti.com/lit/an/slva670a/slva670a.pdf)
shows that charging current is `C × dV/dt`, can collapse a shared source rail,
and must be designed from total load capacitance and an acceptable peak.
**Decision:** Limit the complete `TEST_BLOCK_3V3` switched load to 50 µF and
fit `C1005`, 2.2 nF C0G/NP0, from `U1002.CT` to
`ROUTING_LOGIC_3V3` (`U1002.VIN`). Using the TPS22917 typical 3.6 V timing
constant, the resulting 10%–90% output rise is approximately 3.5 ms. Charging
current is approximately 20 mA for the present 23.3 µF fixed load and 43 mA at
the 50 µF design limit. Because TI specifies the relevant timing constants as
typical rather than guaranteed limits, Rev A shall verify no more than 100 mA
peak charging current, acceptable source disturbance and successful startup
from both permitted 3.3 V sources. A later load above 50 µF requires renewed
calculation and validation.

#### Resolved design issue — discrete control-voltage margins

**Status:** Resolved and synchronized at design, component-selection,
schematic-metadata and connectivity-contract level; physical Rev-A validation
remains required.
**Affected requirement:** Every fitted Operating Mode row must select the stated
rail, while `OFF` must leave `ROUTING_LOGIC_3V3` high impedance.
**Decision:** `TI_TARGET_3V3` is specified as 3.00 V to 3.60 V at the Target
Interface. Use Vishay BAT54C-E3-08 for `D1001`–`D1005` and Diodes Inc.
DMN2024UQ-7 for `Q1001`. The diode guarantees at most 0.24 V forward drop at
0.1 mA. The MOSFET guarantees at most 29 mOhm on-resistance at 2.5 V gate
drive and retains the existing SOT-23 gate/source/drain pin mapping.
**Evidence:** The 100 kOhm decode loads keep D1001, D1002, D1004 and D1005
below the diode's 0.1 mA test current. The worst two-diode target-powered high
is 3.00 V - 2 x 0.24 V = 2.52 V, giving 1.52 V margin over the 1.0 V TPS2116
`MODE` and TPS22917 `ON` high thresholds. The external-source result is at
least 3.23 V - 2 x 0.24 V = 2.75 V. In external modes, Q1001 gate drive is at
least 3.23 V - 0.24 V = 2.99 V. `R1002` limits drain current to less than
0.34 mA, so 29 mOhm produces less than 0.01 mV at `MUX_PR1`, versus the
TPS2116 0.92 V minimum selection reference. With Q1001 off, target-derived
`MUX_PR1` is at least 3.00 V - 0.24 V = 2.76 V, giving 1.68 V margin over the
TPS2116 1.08 V maximum selection reference.

#### Selected implementation

- `U1001`, TPS2116DRL, is used in manual mode as a break-before-make 2:1 power
  multiplexer. `VIN1` receives `TI_TARGET_3V3`, `VIN2` receives `EXT_3V3`, and
  `VOUT` drives `ROUTING_LOGIC_3V3`.
- `D1001`, `D1002`, `Q1001` and their bias resistors decode the three fitted
  Operating Mode rows into TPS2116 `MODE` and `PR1` without software.
- `U1002`, TPS22917DBV, switches `ROUTING_LOGIC_3V3` to `TEST_BLOCK_3V3`.
  `D1004` enables it automatically in either Standalone mode; `D1005` ORs that
  result with `TEST_BLOCK_POWER_EN` for Supervisor control. `C1005`, 2.2 nF,
  controls its output slew and Test Block charging current.
- `D1003` Schottky-ORs the available 3.3 V inputs only to create the low-current
  `MODE_BIAS_3V3` control bias. It does not join the power rails.
- `C1001`–`C1004` provide the local source, mux-output and Test Block output
  bypassing shown by the schematic. `C1005` is the separate TPS22917 timing
  capacitor and does not add to the switched-load capacitance.

#### Operating logic and safe states

| Operating Mode | TPS2116 `MODE` | TPS2116 `PR1` | Routing source | Test Block switch |
|---|---:|---:|---|---|
| `OFF` | 0 | 1 when a source exists | High impedance | Off |
| `STANDALONE` | 1 | 1 | `TI_TARGET_3V3` | On automatically |
| `STANDALONE EXT` | 1 | 0 | `EXT_3V3` | On automatically |
| `SUPERVISOR` | 1 | 0 | `EXT_3V3` | Controlled by `TEST_BLOCK_POWER_EN`, default off |

The grouped header is a power-configuration device and shall be changed only
with the associated sources off. The design therefore does not rely on live
source transfer. `R1001`, `R1003`, `R1004` and `R1009` hold the decoded control
nodes inactive when their inputs are absent. If either 3.3 V source remains
present in `OFF`, `D1003` and `R1002` hold `PR1` high while `MODE` remains low,
which is the TPS2116 shutdown state. TPS2116 reverse-current blocking and
break-before-make behaviour prevent the unselected source from being powered
through the mux. TPS22917 `QOD` is intentionally tied to its output to discharge
`TEST_BLOCK_3V3` when disabled; no alternative source may drive that rail.

#### Key calculations and limits

| Subject | Calculation or limit | Reviewed result |
|---|---|---|
| Maximum specified steady load | U1001: Routing allocation 50 mA + selected Test Blocks 250 mA; U1002: selected Test Blocks 250 mA | 300 mA through U1001 and 250 mA through U1002, well below the 2.5 A and 2 A ratings |
| TPS2116 maximum hot path drop | 300 mA × 59 mΩ, using the 3.3 V, −40°C to 105°C data-sheet limit | 17.7 mV and 5.3 mW |
| TPS22917 conservative hot path drop | 250 mA × 185 mΩ, using the conservative 1.8 V, −40°C to 105°C limit because 3.3 V is below the tabulated 3.6 V point | 46.3 mV and 11.6 mW |
| Complete external-source path | 3.234 V minimum external supply − 17.7 mV − 46.3 mV | Approximately 3.170 V minimum at `TEST_BLOCK_3V3` before connector and PCB losses |
| Estimated junction rise | Data-sheet JEDEC `θJA`: 111.5°C/W for U1001 and 183°C/W for U1002 | Approximately 0.6°C and 2.1°C respectively; thermal performance is not a blocker at the specified load |
| Fixed switched capacitance | 1 µF + 22 µF + three × 100 nF | 23.3 µF before removable modules |
| Maximum switched capacitance | Fixed and removable loads combined | 50 µF; later increases require renewed analysis |
| Selected TPS22917 timing capacitor | `C1005 = 2.2 nF`; typical `dV/dt = 1900 / 2200` mV/µs at 3.6 V | Approximately 0.864 mV/µs and 3.5 ms 10%–90% rise |
| Calculated charging current | `I_INRUSH = C_LOAD × dV/dt` | Approximately 20 mA at 23.3 µF and 43 mA at 50 µF |
| Rev-A inrush acceptance | Measured at both permitted sources with the 50 µF maximum load | No more than 100 mA peak and no unacceptable source-rail disturbance |
| TPS22917 protection | Product data: no current limit | Source and wiring protection must not be inferred from this load switch |
| Minimum target-domain decode high | 3.00 V minimum `TI_TARGET_3V3` - 2 × 0.24 V BAT54C maximum forward drop | 2.52 V; at least 1.52 V above the 1.0 V input-high requirement |
| Minimum external-domain decode high | 3.23 V minimum external rail - 2 × 0.24 V | 2.75 V; at least 1.75 V above the 1.0 V input-high requirement |
| Q1001 minimum gate drive | 3.23 V - 0.24 V | 2.99 V; above the DMN2024UQ-7 2.5 V guaranteed on-resistance test point |
| Q1001 low-state current | 3.37 V maximum bias / 10 kΩ `R1002` | Less than 0.34 mA |
| `MUX_PR1` low | 0.34 mA × 29 mOhm | Less than 0.01 mV; far below the 0.92 V TPS2116 minimum reference |
| `MUX_PR1` target-derived high | 3.00 V - 0.24 V | At least 2.76 V; 1.68 V above the 1.08 V TPS2116 maximum reference |

#### Manufacturer source and application review

The source screen below covers every principal PC01 component. Product pages
are retained because they are the current index of manufacturer-linked data
sheets and application material; the data sheets remain the authority for
guaranteed limits.

The reviewed local data-sheet snapshots are
[`tps2116.pdf`](DataSheets/tps2116.pdf) and
[`tps22917.pdf`](DataSheets/tps22917.pdf). The live manufacturer links below
remain authoritative for current revisions.

| Device | Manufacturer sources screened | Consequence for PC01 |
|---|---|---|
| TPS2116 | [Product page and all four linked documents](https://www.ti.com/product/TPS2116), [data sheet](https://www.ti.com/lit/ds/symlink/tps2116.pdf), [TPS2116EVM user guide](https://www.ti.com/lit/ug/slvubz0a/slvubz0a.pdf), [Basics of Power MUX](https://www.ti.com/lit/pdf/SLVAE51), eMeter and building-automation application briefs, and the linked 24 VAC reference-design guide | PC01 follows the manual `MODE`/`PR1` truth table. True `OFF` requires `MODE` low and `PR1` high; `MODE` low alone is not shutdown. The data sheet supports 1 µF input bypass in most applications and at least 0.1 µF at VOUT, subject to source-transient testing. The EVM independently demonstrates manual control, local capacitors, and VIN1/VIN2/VOUT/MODE/PR1 observability. Its automatic-priority, battery-backup, high-current bulk-capacitance and conversion examples are not copied because the PC01 header is changed with supplies off. Reverse-current blocking is not current limiting. |
| TPS22917 | [Product page and all eleven linked documents](https://www.ti.com/product/TPS22917), [data sheet](https://www.ti.com/lit/ds/symlink/tps22917.pdf), [TPS22917EVM user guide](https://www.ti.com/lit/ug/slvub64/slvub64.pdf), [Managing Inrush Current](https://www.ti.com/lit/an/slva670a/slva670a.pdf), [Timing of Load Switches](https://www.ti.com/lit/an/slva883/slva883.pdf), [On-Resistance](https://www.ti.com/lit/an/slva771/slva771.pdf), [Load Switch Thermal Considerations](https://www.ti.com/lit/pdf/SLVUA74), and [Selecting a Load Switch](https://www.ti.com/lit/pdf/SLVA887) | The exact TPS22917 is active-high; TPS22917L is active-low, despite conflicting generic metadata on the product page. `CT` must be designed from maximum switched capacitance and allowed inrush; timing varies with voltage, load, capacitance and temperature. QOD tied to VOUT is the deliberate fastest discharge path and is valid only because no alternative source drives `TEST_BLOCK_3V3`. The EVM independently demonstrates local input/output capacitance, adjustable `CT` and QOD arrangements, accessible enable and sense points, high-current PCB routing, and bench tests for rise time and on-resistance. Its evaluation jumpers and test fixtures are supporting evidence rather than Rev-A requirements. On-resistance, dissipation and lack of current limiting remain explicit release checks. The remaining linked integrated-vs-discrete, basics and power-consumption documents add no conflicting requirement. |
| BAT54C-E3-08 (`D1001`–`D1005`) | [Vishay BAT54 family data sheet](https://www.vishay.com/docs/86410/bat54_bat54a_bat54c_bat54s.pdf); no product-specific application note relevant to this static low-current decode was identified | The exact common-cathode SOT-23 part is selected. Its 0.24 V maximum forward drop at 0.1 mA supports every reviewed decode-high margin. |
| DMN2024UQ-7 (`Q1001`) | [Local reviewed Diodes Inc. data sheet](DataSheets/3168380-DMN2024UQ.pdf); no product-specific application note relevant to this low-current pull-down was identified | The part guarantees 29 mOhm maximum on-resistance at 2.5 V gate drive and uses the existing SOT-23 pin 1 gate, pin 2 source, pin 3 drain mapping. The calculated minimum gate drive is 2.99 V. |

#### Components and packaging

| References | Manufacturer | Exact orderable part | Package | KiCad footprint | Datasheet/revision | Pin/pad mapping | AISLER assignment |
|---|---|---|---|---|---|---|---|
| `U1001` | Texas Instruments | [TPS2116DRLR](https://www.ti.com/product/TPS2116/part-details/TPS2116DRLR) | SOT-5X3 (DRL), 8 pin | `Package_TO_SOT_SMD:SOT-583-8` | [TPS2116](https://www.ti.com/lit/ds/symlink/tps2116.pdf), Rev A | Pins 1–8 agree. Hidden duplicate VOUT pin 7 is stacked with pin 2 in the symbol; PCB pads 2 and 7 both use `ROUTING_LOGIC_3V3`. The KiCad pad sizes, 0.50 mm pitch, row spacing and pin-1 marker agree with TI DRL0008A. Accepted. | Exact active-production MPN selected; assign and confirm AISLER availability |
| `U1002` | Texas Instruments | [TPS22917DBVR](https://www.ti.com/product/TPS22917/part-details/TPS22917DBVR) | SOT-23 (DBV), 6 pin | `Package_TO_SOT_SMD:SOT-23-6` | [TPS22917](https://www.ti.com/lit/ds/symlink/tps22917.pdf), Rev B | Pins 1–6, including CT pin 4 and QOD pin 5, agree. The KiCad IPC-7351 DBV footprint is a compatible alternate to TI DBV0006A and has the correct pitch, pad order and pin-1 marker. Accepted. | Exact active-production MPN selected; assign and confirm AISLER availability |
| `D1001`–`D1005` | Vishay | BAT54C-E3-08 | SOT-23 | `Package_TO_SOT_SMD:SOT-23` | [BAT54C-E3-08](https://www.vishay.com/docs/86410/bat54_bat54a_bat54c_bat54s.pdf) | Exact common-cathode mapping is pin 1 A1, pin 2 A2 and pin 3 K. The KiCad IPC-7351 TO-236/SOT-23 pad order, dimensions and pin-1 marker are compatible with the Vishay package. Accepted. | Accepted exact MPN and KiCad instance metadata synchronized; assign in AISLER |
| `Q1001` | Diodes Incorporated | DMN2024UQ-7 | SOT-23 | `Package_TO_SOT_SMD:SOT-23` | [DMN2024UQ](DataSheets/3168380-DMN2024UQ.pdf) | Exact mapping is pin 1 gate, pin 2 source and pin 3 drain. The KiCad IPC-7351 TO-236/SOT-23 pad order, dimensions and pin-1 marker are compatible with the Diodes package. Accepted. | Accepted exact MPN and KiCad value synchronized; assign in AISLER |
| `R1001`, `R1003`, `R1004`, `R1009` | TBD | 100 kΩ, standard passive policy | 0603 | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Two-terminal mapping and standard KiCad footprint inspected; accepted | Grouped assignment pending |
| `R1002` | TBD | 10 kΩ, standard passive policy | 0603 | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Two-terminal mapping and standard KiCad footprint inspected; accepted | Assignment pending |
| `C1001`–`C1004` | TBD | 1 µF, X7R, ±20% or better, at least 10 V | 0603 | `Capacitor_SMD:C_0603_1608Metric` | Standard policy | Two-terminal mapping and standard KiCad footprint inspected; accepted | Grouped assignment pending; preserve adequate effective capacitance at 3.3 V bias |
| `C1005` | TBD | 2.2 nF, C0G/NP0, ±10% or better, at least 10 V | 0603 | `Capacitor_SMD:C_0603_1608Metric` | [TPS22917](https://www.ti.com/lit/ds/symlink/tps22917.pdf) | `U1002.CT` to `U1002.VIN`; connectivity reviewed | Assign exact approved part; pending |

The engineering package review is complete for PC01. It accepts the listed
symbol pins, package families, footprint pad order and land patterns. Final PCB
placement, rotation and assembly-rendering checks remain release-stage controls;
AISLER stock and MPN assignment remains a separate commercial selection step.

#### Verification

| Check | Evidence | Result |
|---|---|---|
| Requirements inspection | Standard Control Services 3.1–3.3 and Appendix C.2 | Mode truth table and source ownership agree |
| Behaviour and safe-state analysis | Truth table, unpowered-state review, control-margin, maximum-drop/thermal and inrush calculations above | Functional topology and principal-device implementation supported; physical measurement pending |
| Manufacturer source screen | Product-linked documents summarized above | Complete for current principal-device choices |
| Connectivity contract | `verification/contracts/PC01-operating-mode-and-3v3-rail.yaml`, canonical full-hierarchy netlist and `verification/baseline/Espruino_Harness_RevA_FullHierarchy_Connectivity.json` | Refreshed 2026-08-11: PC01 passes all 73 assertions; complete PC01/PC02/SYS01 set passes 186 checks |
| Full-hierarchy ERC | `verification/baseline/Espruino_Harness_RevA_FullHierarchy_ERC.rpt`, refreshed from the root schematic on 2026-08-12 | Accepted: zero errors and zero warnings |
| Symbol-to-footprint mapping | Manufacturer pin tables, package drawings, full-hierarchy netlist, installed KiCad footprints and current PCB pad nets | Principal IC, diode, MOSFET and passive mappings agree; package land patterns and intrinsic pin-1 orientation accepted |
| Visual schematic review | `review-images/PC01-operating-mode-and-3v3-rail.png` | Accepted current reviewed circuit capture |

#### Open issues and accepted exceptions

- Perform the defined Rev-A inrush measurements with both permitted sources
  and the 50 µF maximum load.
- During PCB review, place `C1001`–`C1004` close to their devices and use short,
  wide VIN/VOUT/GND paths. Confirm that the backplane and target sources tolerate
  the specified load step or add connector-side bulk capacitance.
- Confirm accessible Rev-A measurement points for `TI_TARGET_3V3`, `EXT_3V3`,
  `ROUTING_LOGIC_3V3`, `TEST_BLOCK_3V3`, `MUX_MODE` and `MUX_PR1`. The unused
  TPS2116 `ST` output may remain unconnected because it is not a requirement.
- Complete AISLER assignments and the release-stage PCB placement, rotation
  and assembly-rendering review. The engineering package and footprint review
  is complete.
No exceptions are accepted at this stage.

### 4.2 PC02 — Target 5 V switch and two-range power monitor

**Purpose and requirements:** Provide Supervisor-controlled target power,
observe the delivered voltage, current and power, cover both 100 µA sleep
measurements and target loads up to 1.5 A, and remain non-loading and
reverse-isolated while ordinary USB powers the target in Standalone modes.
See Standard Control Services Sections 3.1, 3.5 and 3.5.1.
**Source schematic:** `power_control.kicad_sch`, references `U1101`–`U1105`
and associated `Q1101`, `R11xx` and `C11xx` components.
**Visual review:**
[`PC02-target-5v-switch-and-two-range-monitor.png`](review-images/PC02-target-5v-switch-and-two-range-monitor.png).
**Status:** Verified; topology, exported connectivity, principal-device
sources, control behaviour, exact shunt selection, analytical electrical
budgets, engineering package evidence, visual review, ERC and deterministic
connectivity checks are accepted. PCB implementation, AISLER commercial
assignments and physical Rev-A measurements remain manufacturing-release
actions.

#### Key design issue — Integrated per-position target-power protection

**Status:** Accepted; schematic implementation complete and release
verification pending.
**Decision:** `U1101` shall be TPS2559-Q1 with a provisional 66.5 kΩ 1%
`ILIM` resistor. Each harness position therefore owns its target-power switch,
soft start, overload limit, fast short-circuit response, thermal protection
and active-low fault indication. The data-sheet tolerance gives an initial
limit range of approximately 1.63 A to 1.89 A: above the permitted 1.5 A load
at the low limit and bounded below 1.9 A at the high limit.
**Reason:** The earlier TPS22964C candidate conflicted with Standalone USB
power because its Quick Output Discharge loaded the disabled output. Removing
that discharge with TPS22963C preserved Standalone operation but left the
1.5 A position without hardware overload or short-circuit protection.
TPS2559-Q1 resolves both requirements in the normal switch position and is the
production-intent architecture for Rev A and subsequent revisions.
**Verification impact:** The schematic, project-local symbol and footprint,
connectivity contract, component record, netlist, ERC and visual review shall
all implement TPS2559-Q1. Review shall independently confirm the `ILIM`
tolerance, exposed-PowerPAD layout, voltage-drop and thermal budgets,
supported target capacitance, valid boot/radio transients, fault response and
disabled-state Standalone reverse isolation before PC02 is accepted.

#### Resolved design issue — Partial-power-safe range driver

**Status:** Accepted; schematic implementation complete and release
verification pending.
**Affected requirement:** The monitor and range-control circuit shall remain
safe when rack control is powered but external 5 V is absent, including
Standalone operation and arbitrary supply sequencing.
**Decision:** `U1102` is a TXU0101 fixed-direction dual-supply translator.
`VCCA` and its constant-high `A` input use `RACK_CONTROL_3V3`; `VCCB` uses
`EXT_5V`; `OE` receives `LOW_RANGE_GATE_3V3`; and output `B` drives
`LOW_SHUNT_BYPASS_GATE`. `R1106` and `R1107` hold `OE` and the MOSFET gate
low when the corresponding driver is unavailable.
**Evidence:** The
[TXU0101 data sheet](https://www.ti.com/lit/ds/symlink/txu0101.pdf) specifies
`Ioff` partial-power-down protection and disables the outputs to high
impedance if either supply is below 100 mV or disconnected. It also permits
either supply power-up order. The external pull-down on
`LOW_SHUNT_BYPASS_GATE` therefore restores the high-current bypass whenever
the translator cannot drive it.
**Verification impact:** The project-local symbol, SOT-23-6 pad mapping,
dual-supply decoupling, partial-power states and connectivity contract remain
release checks; the earlier SN74AHCT1G125 blocker is closed.

#### Resolved design issue — Low-range alert is latched and observable

**Status:** Accepted schematic implementation; firmware and release
verification remain pending.
**Affected requirement:** An unsafe low-range current shall restore the
high-current bypass and remain observable without oscillating or depending on
polling latency.
**Evidence:** `U1104` asserts `LOW_RANGE_OK_N` when its shunt-overvoltage
threshold is exceeded. That low state immediately disables `U1102` through
`U1105` and restores the `Q1101` bypass. Restoring the bypass also removes the
1 Ω shunt voltage that caused the alert. In the INA228 default transparent
mode, the alert can therefore clear while `TARGET_LOW_RANGE_EN` remains high
and reinsert the shunt. The INA228 data sheet states that `ALATCH = 1` holds
the alert and its flag active until `DIAG_ALRT` is read.
**Resolution:** `LOW_RANGE_OK_N` connects the `U1104` alert to the existing
`U1105` hardware interlock and to `GPB3` of Rack Control MCP23017 `U1201`.
`GPB3` contributes to the active-low open-drain `RACK_INT_N` interrupt. The
accepted firmware contract configures `U1104` for its ±40.96 mV range,
active-low latched shunt-overvoltage alert and accepted threshold. Firmware
clears `TARGET_LOW_RANGE_EN` before reading INA228 `DIAG_ALRT`, then clears the
MCP23017 capture. The refreshed root netlist contains the complete path and
the full hierarchy passes ERC with zero errors and zero warnings.

#### Key design issue — Low-range physical accuracy is not yet proved

**Severity:** Major; blocks acceptance of the 100 µA measurement claim.
**Affected requirement:** Sleep-current measurements shall achieve the agreed
5%–10% practical accuracy at 100 µA.
**Evidence:** The required signal is only 100 µV across `R1102`. INA228 offset
is small enough in the ±40.96 mV range, but `Q1101` remains connected across
the 1 Ω shunt while off. The selected AO3401A data sheet specifies 1 µA
maximum off leakage at 25°C and 5 µA at 55°C, measured at a much higher
drain-source voltage than this circuit. The 55°C limit therefore consumes up
to 5% of the 100 µA measurement allowance before shunt tolerance, thermal
EMF, PCB leakage, input bias, noise and layout are included.
**Analytical resolution:** Retain AO3401A as the exact Rev-A bypass MOSFET.
The component budget below gives a 7.71% known worst-case subtotal at 100 µA
with the accepted 1%, 100 ppm/°C shunt, leaving 2.29% for residual physical
effects within the ±10% requirement. The resulting 1% shunt requirement and
the exact Rev-A candidates are accepted in Standard Control Services.
**Required physical resolution:** Verify zero-offset and known-current points
on Rev A through 55°C. Cooling shall keep the circuit at or below 55°C when
the guaranteed low-current accuracy is required. Measured characterization
remains mandatory before the 100 µA claim is accepted because the data sheet
does not characterize leakage at the actual low drain-source voltage and the
remaining noise, thermal-EMF and PCB-leakage allowance is only 2.29%.

#### Interfaces and domains

| Type | Signals or rails | Function |
|---|---|---|
| Power input | `EXT_5V` | Source for Supervisor-controlled target power and the 5 V range driver |
| Always-on control supply | `RACK_CONTROL_3V3` | Supplies both monitors and the control gates |
| Control inputs | `MODE_SUPERVISOR`, `TARGET_POWER_EN`, `TARGET_LOW_RANGE_EN` | Qualify target power and low-range selection |
| Rack Control bus | `RACK_CONTROL_SDA`, `RACK_CONTROL_SCL` | Reads the two power monitors |
| Power output | `TI_SWITCHED_TARGET_5V` | Measured and switched 5 V delivered to the Target Interface |
| Status outputs | `TARGET_POWER_ALERT_N`, `TARGET_POWER_FAULT_N`, `LOW_RANGE_OK_N` | Normal-range alert, hardware switch fault and latched low-range qualification event observed by Rack Control |
| Ground | `TI_GND` | Common reference for the circuit and Target Interface |

#### Selected implementation

- TPS2559-Q1 `U1101` switches and protects `EXT_5V` only when both
  `MODE_SUPERVISOR` and `TARGET_POWER_EN` are asserted through `U1105`.
  Its 66.5 kΩ `ILIM` resistor sets the provisional per-position overload
  threshold, and `TARGET_POWER_FAULT_N` reports an overload or thermal fault.
- `R1101` is the always-present 50 mΩ normal-range shunt. `U1103` is the
  normal-range INA226 monitor at I2C address `0x40`.
- `R1102` is the 1 Ω low-range shunt. `Q1101` normally bypasses it so boot and
  active target current do not pass through 1 Ω.
- `U1104` is the low-offset INA228 low-range monitor at I2C address `0x41`.
  Its latched active-low alert output `LOW_RANGE_OK_N` qualifies
  `TARGET_LOW_RANGE_EN` through the second `U1105` gate and is observed by the
  Rack Control Endpoint.
- `U1102` is a TXU0101 powered from `RACK_CONTROL_3V3` on its A side and
  `EXT_5V` on its B side. It translates the qualified 3.3 V selection into
  the 5 V gate drive required to turn the P-channel bypass MOSFET off. Its
  `Ioff` and supply-disconnect behaviour make the output high impedance if
  either domain is unavailable.
- Both monitors are powered from always-on `RACK_CONTROL_3V3` and share
  `RACK_CONTROL_SDA` and `RACK_CONTROL_SCL`. Their bus-voltage inputs observe
  `TI_SWITCHED_TARGET_5V`.
- `U1103` senses `R1101` through `HIGH_SHUNT_P` and `HIGH_SHUNT_N`; `U1104`
  senses `R1102` through `HIGH_SHUNT_N` and `TI_SWITCHED_TARGET_5V`. The PCB
  shall route a separate Kelvin pair directly from each shunt's pads to its
  corresponding monitor inputs.
- `TARGET_POWER_ALERT_N` exposes the normal-range monitor alert to Rack
  Control. `TI_SWITCHED_TARGET_5V` feeds the Target Interface after both
  measurement elements.

The hardware-safe state is target power off and the low-range shunt bypassed.
`R1009`, owned by PC01, holds `MODE_SUPERVISOR` low; `R1103` and `R1104` hold
the two Rack Control requests low. `R1106` holds the range-driver input low and
`R1107` holds the P-channel MOSFET gate low if its driver is unavailable.

#### Operating logic and safe states

`U1105` implements two independent AND functions:

- `TARGET_SWITCH_EN = MODE_SUPERVISOR AND TARGET_POWER_EN`
- `LOW_RANGE_GATE_3V3 = TARGET_LOW_RANGE_EN AND LOW_RANGE_OK_N`

`U1102` drives the P-channel bypass gate. A low
`LOW_RANGE_GATE_3V3`, loss of either translator supply or a low
`LOW_RANGE_OK_N` makes the output high impedance; `R1107` then keeps `Q1101`
on and bypasses the 1 Ω shunt. A valid high value drives the gate towards
`EXT_5V`, turns `Q1101` off and inserts `R1102`.

| Supervisor mode | Target-power request | Low-range request | `LOW_RANGE_OK_N` | Expected hardware state |
|---:|---:|---:|---:|---|
| 0 | X | X | X | `U1101` off; target 5 V not supplied |
| 1 | 0 | X | X | `U1101` off; target 5 V not supplied |
| 1 | 1 | 0 | X | Target powered through `R1101`; `R1102` bypassed |
| 1 | 1 | 1 | 0 | Target powered; low range rejected and `R1102` bypassed |
| 1 | 1 | 1 | 1 | Target powered; `R1102` inserted for low-current measurement |

`X` means that the input does not change the expected state for that row.
Firmware shall request low range only after the normal-range monitor indicates
that target current is within the permitted transition threshold. `U1104`
shall use its active-low latched shunt-overvoltage alert for
`LOW_RANGE_OK_N`. If it asserts, hardware restores the bypass. Firmware shall
then clear `TARGET_LOW_RANGE_EN` before reading `DIAG_ALRT` to clear the
latched alert and shall not retry until normal-range current is verified.

The intended uncommanded state is target power off with `R1102` bypassed:

- `MODE_SUPERVISOR`, `TARGET_POWER_EN` and `TARGET_LOW_RANGE_EN` have external
  pull-downs.
- `LOW_RANGE_GATE_3V3` and `LOW_SHUNT_BYPASS_GATE` have pull-downs, so the
  1 Ω shunt is bypassed when range control is unavailable.
- Loss of `EXT_5V` removes the target supply regardless of the logic state;
  the TXU0101 becomes high impedance and cannot back-power either domain.

The [SN74LVC2G08 data sheet](https://www.ti.com/lit/ds/symlink/sn74lvc2g08.pdf)
specifies partial-power-down protection: `U1105` outputs become high impedance
when `RACK_CONTROL_3V3` is absent. The
[TPS2559-Q1 data sheet](https://www.ti.com/lit/ds/symlink/tps2559-q1.pdf)
requires a defined enable state. Therefore the current input-side pull-downs
do not by themselves guarantee the required power-off state across an
unpowered `U1105`. `R1110` therefore provides the required 100 kΩ pull-down
directly from `TARGET_SWITCH_EN` to `TI_GND` on the switch side of `U1105`.

#### Key calculations and limits

| Subject | Calculation | Initial result |
|---|---|---|
| Normal-range shunt drop | 1.5 A × 50 mΩ | 75 mV; exactly the specified shunt limit |
| Normal-range shunt dissipation | 1.5 A² × 50 mΩ | 112.5 mW; accepted 2 W PE2512 part has ample component margin, subject to final PCB thermal review |
| Low-range upper-limit drop | 20 mA × 1 Ω | 20 mV; meets the specified limit |
| Low-range upper-limit dissipation | 20 mA² × 1 Ω | 0.4 mW |
| Low-range minimum signal | 100 µA × 1 Ω | 100 µV |
| Target-switch loss | 1.5 A × 21 mΩ; 1.5 A² × 21 mΩ | 31.5 mV drop and 47.25 mW dissipation at the data-sheet maximum on-resistance |
| Listed-maximum component path | 21 mΩ switch + 50.65 mΩ maximum selected shunt at 55°C + 60 mΩ bypass MOSFET at 25°C | 197.5 mV at 1.5 A; leaves 52.5 mV, or 35 mΩ, for PCB, connectors and backplane |
| Temperature-aware 55°C path estimate | 21 mΩ switch + 50.65 mΩ shunt + approximately 69 mΩ bypass MOSFET | Approximately 211 mV at 1.5 A; leaves approximately 39 mV, or 26 mΩ, for PCB, connectors and backplane |
| Component-path dissipation at 1.5 A | 47.25 mW switch + 114 mW shunt + approximately 155 mW bypass MOSFET | Approximately 316 mW total; individual device dissipation is within rating, subject to the specified PCB copper and footprint implementation |
| Provisional current limit | 66.5 kΩ 1% `ILIM` resistor | Approximately 1.63 A minimum, 1.77 A nominal and 1.89 A maximum |

The listed-maximum bound uses the MOSFET 25°C maximum on-resistance and includes
the selected shunt's 1% initial tolerance plus 100 ppm/°C drift to 55°C. The
55°C estimate applies the AO3401A data-sheet typical normalized-temperature
curve to its 60 mΩ maximum at 25°C; the manufacturer does not guarantee that
combined value. The result shows that the 250 mV complete-path requirement is
feasible but allocates no more than about 26 mΩ to all copper, connector and
backplane contacts. PCB resistance calculation and a 1.5 A end-to-end Rev-A
measurement are therefore release requirements rather than unresolved circuit
topology.

The selection and protection review follows TI's
[Selecting a Load Switch to Replace a Discrete Solution](https://www.ti.com/lit/pdf/SLVA887)
and
[Power Multiplexing Using Load Switches and eFuses](https://www.ti.com/lit/an/slva811a/slva811a.pdf)
application reports. The former requires explicit preservation of current
limit, reverse-current, undervoltage and thermal protections where the system
needs them. The latter makes the coupled output-drop, inrush, reverse-current
and switchover trade-offs explicit. Live source transfer is not a harness
requirement because Operating Mode changes only with its supplies off, but
startup inrush and reverse isolation remain release checks.

The INA226 maximum 10 µV shunt offset is 2% of the 500 µV signal produced by
10 mA through `R1101`. The INA228 maximum 1 µV shunt offset is 1% of the
100 µV minimum low-range signal. These results support the selected split, but
the complete calibrated error budget still needs shunt tolerance, temperature,
layout, noise and zero-offset compensation.

The former 0.1% shunt-tolerance requirement was more restrictive than the
system accuracy requires and led to specialist precision-foil parts with
poor availability and high unit cost. The accepted Rev-A parts are a
[Yageo PE2512FKF7W0R05L](https://www.yageogroup.com/component-documentation/download/specsheet/PE2512FKF7W0R05L)
for `R1101` and a
[Bourns CHP2512-FX-1R00ELF](https://www.bourns.com/docs/product-datasheets/chp.pdf)
for `R1102`. Both are 2512, 1%, 100 ppm/°C parts. The Yageo `R1101` is rated
2 W and dissipates only 112.5 mW at 1.5 A. The RoHS-compliant Bourns `R1102`
is rated 3 W at 70°C and for high-power surge operation, so it covers the
2.25 W worst-case dissipation that would occur if 1.5 A persisted while the
low range was inserted. Its PCB land and copper area must keep the board
surface within the manufacturer's 105°C full-load limit. Both parts have
accepted project-local, manufacturer-derived two-terminal footprints.
Separate Kelvin traces must leave directly from their pads during PCB routing,
and AISLER availability still requires confirmation.

The conservative uncalibrated low-range budget at 100 µA and 55°C is:

| Contribution | Maximum allowance at 100 µA | Percentage of reading |
|---|---:|---:|
| AO3401A bypass off leakage | 5 µA | 5.00% |
| INA228 input offset at 25°C | 1 µV across 1 Ω | 1.00% |
| INA228 offset drift, 25°C to 55°C | 0.3 µV | 0.30% |
| INA228 gain error and 30°C drift | 0.11% combined | 0.11% |
| Proposed 1% shunt initial tolerance | 1% | 1.00% |
| Proposed 100 ppm/°C shunt drift, 25°C to 55°C | 0.30% | 0.30% |
| INA228 input bias, conservatively treated as 2.5 nA measurement current | 0.0025 µA | 0.003% |
| **Known worst-case subtotal** |  | **7.71%** |

This leaves approximately 2.29% for quantization, noise, thermal EMF, PCB
leakage and residual zero-compensation error within the ±10% requirement.
At 1 mA the bypass-leakage and monitor-offset percentages each reduce by a
factor of ten, leaving more than 2.5 percentage points inside the ±5%
requirement. In the normal range, the INA226 10 µV offset contributes 1% at
20 mA through 50 mΩ; including a 1% shunt, 0.3% shunt drift, 0.1% gain error
and 0.15% gain drift gives a known subtotal below 2.6%. The analytical result
therefore supports the accepted 1% shunt requirement, provided the required
zero measurement, averaging and Rev-A known-current calibration are retained.

The INA226 ±81.92 mV shunt range corresponds to 1.6384 A through the 50 mΩ
normal-range shunt. This covers the 1.5 A permitted load but can saturate
before the provisional TPS2559-Q1 upper current-limit tolerance. That is
acceptable only if firmware treats INA226 as the normal operating monitor and
uses `TARGET_POWER_FAULT_N`, rather than an INA226 current reading, as the
authoritative overload indication. INA228 shall use its ±40.96 mV range for
the 1 Ω low-current path, giving a 40.96 mA measurement ceiling.

#### Manufacturer source and application review

| Device | Manufacturer sources screened | Consequence for PC02 |
|---|---|---|
| TPS2559-Q1 | [Product page and both linked technical documents](https://www.ti.com/product/TPS2559-Q1), [data sheet](https://www.ti.com/lit/ds/symlink/tps2559-q1.pdf), [Basics of Load Switches](https://www.ti.com/lit/an/slva652/slva652.pdf), [MFi overcurrent-test application note](https://www.ti.com/lit/an/slvaeq2/slvaeq2.pdf), and [TPS2559-Q1 EVM guide](https://www.ti.com/lit/pdf/SLUUB15) | Adjustable current limit, soft start, fast short response, thermal retry, disabled reverse blocking, FAULT pull-up and PowerPAD layout apply. SLVA652A confirms the 1 µF local input bypass, the decision not to use output discharge where Standalone USB can power the output, and the need to calculate inrush, local bulk capacitance, voltage drop and thermal behaviour from the complete target load and PCB implementation. It introduces no topology change. The MFi compliance procedure itself does not apply, but its overload/fault test method supports Rev-A protection tests. |
| INA226 | [Product page and linked technical documents](https://www.ti.com/product/INA226), [data sheet](https://www.ti.com/lit/ds/symlink/ina226.pdf), [Getting Started with Digital Power Monitors](https://www.ti.com/lit/an/sboa511a/sboa511a.pdf), and [Digital Interfaces for Current-Sense Devices](https://www.ti.com/lit/an/sboa203a/sboa203a.pdf) | Shunt range, calibration, averaging, conversion timing, alert programming, I2C pull-ups and Kelvin connections apply. Copper-trace shunts, high-voltage, power-amplifier, heater, solar and ESD/EOS application examples do not change this precision 5 V external-shunt design. |
| INA228 | [Product page and linked technical documents](https://www.ti.com/product/INA228), [data sheet](https://www.ti.com/lit/ds/symlink/ina228.pdf), and the same digital-monitor and interface guides | ±40.96 mV range, averaging, conversion timing, calibration and Kelvin layout support the low range. Energy/charge accumulation is useful but not required. High-voltage, E3/solenoid, robot and heater examples do not alter this application. |
| SN74LVC2G08 | [Product page](https://www.ti.com/product/SN74LVC2G08), [data sheet](https://www.ti.com/lit/ds/symlink/sn74lvc2g08.pdf), and [Implications of Slow or Floating CMOS Inputs](https://www.ti.com/lit/an/scba004e/scba004e.pdf) | `Ioff` explicitly protects inputs/outputs when its 3.3 V supply is absent. External pull-downs keep all CMOS inputs defined; the product-linked solid-state-relay application brief is unrelated. |
| TXU0101 | [Product page and linked technical documents](https://www.ti.com/product/TXU0101) and [data sheet](https://www.ti.com/lit/ds/symlink/txu0101.pdf) | Fixed A-to-B translation, Schmitt-trigger input, output enable, `Ioff` protection, supply-disconnect isolation and arbitrary power sequencing implement the partial-power-safe 3.3 V-to-5 V range driver. The device becomes high impedance if either supply is absent; external pull-downs establish the bypass state. |
| AO3401A | [Alpha & Omega AO3401A data sheet](https://www.aosmd.com/res/data_sheets/AO3401A.pdf); no product-specific application note identified | The exact AO3401A is accepted for the Rev-A bypass path. Its on-resistance supports 1.5 A operation. Its 5 µA maximum off-leakage specification at 55°C can consume 5% of the 100 µA measurement allowance, and the actual low-`VDS` condition is not characterized; Rev-A leakage and accuracy verification through 55°C remain mandatory. |
| PE2512FKF7W0R05L (`R1101`) | [Yageo part specification](https://www.yageogroup.com/component-documentation/download/specsheet/PE2512FKF7W0R05L) | The exact 50 mΩ, 1%, 100 ppm/°C, 2 W, RoHS 2512 candidate has ample dissipation margin at 1.5 A. Pad-level Kelvin routing and AISLER assignment remain required. |
| CHP2512-FX-1R00ELF (`R1102`) | [Bourns CHP data sheet](https://www.bourns.com/docs/product-datasheets/chp.pdf) | The exact 1 Ω, 1%, 100 ppm/°C, 3 W, RoHS 2512 candidate supports the analytical accuracy budget and remains within its continuous rating even for the abnormal 2.25 W case. Its specified land pattern, copper area and 105°C board-surface limit apply. |

The product-page screen also covered documents linked to these devices that
address unrelated end equipment or sensing topologies. They are excluded above
by application rather than silently omitted.

#### Components and packaging

| References | Manufacturer | Exact orderable part | Package | KiCad symbol | KiCad footprint | Datasheet/revision | Pin/pad mapping | AISLER assignment |
|---|---|---|---|---|---|---|---|---|
| `U1101` | Texas Instruments | [TPS2559QWDRCRQ1](https://www.ti.com/product/TPS2559-Q1/part-details/TPS2559QWDRCRQ1) | DRC0010K, 10-pin 3 mm × 3 mm VSON with exposed PowerPAD and wettable flanks | Project-local `TPS2559Q1_TARGET_POWER_SWITCH` | Project-local `TPS2559Q1_DRC0010K_VSON10_EP` | [TPS2559-Q1](https://www.ti.com/lit/ds/symlink/tps2559-q1.pdf), SLVSD03 | Pins 1–10 map directly; symbol PowerPAD pin 11 maps to the 1.65 mm × 2.40 mm exposed pad. TI land dimensions and 81% paste coverage are implemented. PCB-editor inspection confirmed pin 1 at upper left, pins 1–5 down the left side, pins 6–10 up the right side and pad 11 on `TI_GND`. | Exact active-production MPN selected; confirm AISLER availability and assign |
| `U1102` | Texas Instruments | TXU0101DBVR | DBV, SOT-23-6 | Project-local `TXU0101_RANGE_DRIVER` | `Package_TO_SOT_SMD:SOT-23-6` | [TXU0101](https://www.ti.com/lit/ds/symlink/txu0101.pdf), SCES940A, Rev A | Exact mapping is pin 1 VCCA, pin 2 GND, pin 3 A, pin 4 B, pin 5 OE and pin 6 VCCB. The standard KiCad IPC-7351 DBV footprint is a compatible alternate to TI DBV0006A and has the correct 0.95 mm pitch, pad order and pin-1 marker. Accepted. | Exact active-production MPN selected; assign and confirm AISLER availability |
| `U1103` | Texas Instruments | [INA226AIDGSR](https://www.ti.com/product/INA226/part-details/INA226AIDGSR) | DGS, VSSOP-10 | Project-local `INA226_HIGH_RANGE` | `Package_SO:VSSOP-10_3x3mm_P0.5mm` | [INA226](https://www.ti.com/lit/ds/symlink/ina226.pdf), SBOS547B, Rev B | Pins 1–10 and their functions agree. The standard KiCad DGS/VSSOP footprint has the correct 3 mm × 3 mm body, 0.50 mm pitch, pad order and intrinsic pin-1 marker. Accepted. | Exact active-production MPN selected and visible in AISLER matching; final assignment pending |
| `U1104` | Texas Instruments | [INA228AIDGSR](https://www.ti.com/product/INA228/part-details/INA228AIDGSR) | DGS, VSSOP-10 | Project-local `INA228_LOW_RANGE` | `Package_SO:VSSOP-10_3x3mm_P0.5mm` | [INA228](https://www.ti.com/lit/ds/symlink/ina228.pdf), SLYS021A, Rev A | Pins 1–10 and their functions agree. The standard KiCad DGS/VSSOP footprint has the correct 3 mm × 3 mm body, 0.50 mm pitch, pad order and intrinsic pin-1 marker. Accepted. | Exact active-production MPN selected and visible in AISLER matching; final assignment pending |
| `U1105` | Texas Instruments | [SN74LVC2G08DCUR](https://www.ti.com/product/SN74LVC2G08/part-details/SN74LVC2G08DCUR) | DCU, VSSOP-8 | Project-local `74LVC2G08_POWER_CONTROL` | `Package_SO:VSSOP-8_2.3x2mm_P0.5mm` | [SN74LVC2G08](https://www.ti.com/lit/ds/symlink/sn74lvc2g08.pdf), Rev N | Exact mapping is pins 1/2 to gate 1 inputs, pin 7 gate 1 output, pins 5/6 to gate 2 inputs, pin 3 gate 2 output, pin 4 GND and pin 8 VCC. The standard KiCad DCU/VSSOP footprint has the correct 2.3 mm × 2 mm body, 0.50 mm pitch, pad order and intrinsic pin-1 marker. Accepted. | Exact active-production MPN selected; confirm AISLER availability and assign |
| `Q1101` | Alpha & Omega Semiconductor | AO3401A | SOT-23 | Project-local `AO3401A_LOW_RANGE_BYPASS` | `Package_TO_SOT_SMD:SOT-23` | [AO3401A](https://www.aosmd.com/res/data_sheets/AO3401A.pdf), Rev 3.1 | Exact mapping is pin 1 gate, pin 2 source and pin 3 drain. The standard KiCad IPC-7351 TO-236/SOT-23 footprint pad order, dimensions and pin-1 marker are compatible with the AOS package. Accepted. | Assign and confirm AISLER availability; pending |
| `R1101` | Yageo | PE2512FKF7W0R05L; 50 mΩ, 1%, 100 ppm/°C, 2 W | 2512 | Standard resistor | Project-local `R_Shunt_Yageo_PE2512_CurrentSense` | [Yageo part specification](https://www.yageogroup.com/component-documentation/download/specsheet/PE2512FKF7W0R05L) | Two-terminal symbol maps to pads 1 and 2. The manufacturer-derived footprint implements the PE2512 7 mΩ–910 mΩ land dimensions: 7.36 mm overall span, 4.06 mm inner gap and 1.65 mm × 3.68 mm pads. The root netlist and PCB agree on pad 1 `HIGH_SHUNT_P` and pad 2 `HIGH_SHUNT_N`. Accepted. | Accepted exact candidate; AISLER assignment pending |
| `R1102` | Bourns | CHP2512-FX-1R00ELF; 1 Ω, 1%, 100 ppm/°C, 3 W, RoHS | 2512 | Standard resistor | Project-local `R_Shunt_Bourns_CHP2512_CurrentSense` | [Bourns CHP data sheet](https://www.bourns.com/docs/product-datasheets/chp.pdf) | Two-terminal symbol maps to pads 1 and 2. The manufacturer-derived footprint implements the CHP2512 recommended 2.45 mm × 3.70 mm pads and 7.60 mm overall land span. The root netlist and PCB agree on pad 1 `HIGH_SHUNT_N` and pad 2 `TI_SWITCHED_TARGET_5V`. Accepted; the data-sheet copper-area requirement remains a PCB-layout control. | Accepted exact candidate; AISLER assignment pending |
| `R1103`, `R1104`, `R1106`, `R1107` | TBD | 100 kΩ; standard passive policy | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Two-terminal mapping and standard KiCad footprint inspected; accepted | Assign as one grouped 100 kΩ part; pending |
| `R1105`, `R1108`, `R1112` | TBD | 10 kΩ; standard passive policy | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Two-terminal mapping and standard KiCad footprint inspected; accepted | Assign as one grouped 10 kΩ part; pending |
| `R1110` | TBD | 100 kΩ `TARGET_SWITCH_EN` safe-state pull-down | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Two-terminal mapping and standard KiCad footprint inspected; accepted | Assign in the grouped 100 kΩ AISLER part selection; pending |
| `R1111` | TBD | 66.5 kΩ, 1%, `U1101` current-limit programming resistor | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | TPS2559-Q1 current-limit programming | Two-terminal mapping and standard KiCad footprint inspected; accepted | Assign exact approved part; pending |
| `C1101` | TBD | 1 µF, X7R, ±20% or better, at least 10 V | 0603 | Standard capacitor | `Capacitor_SMD:C_0603_1608Metric` | TPS2559-Q1 input bypass | Two-terminal mapping and standard KiCad footprint inspected; accepted | Assign exact approved part; preserve adequate effective capacitance at 5 V bias |
| `C1102`–`C1107` | TBD | 100 nF, X7R, ±20% or better, at least 10 V | 0603 | Standard capacitor | `Capacitor_SMD:C_0603_1608Metric` | Principal-device local bypass | Two-terminal mapping and standard KiCad footprint inspected; accepted | Assign as one grouped 100 nF part; pending |

The engineering package review is complete for PC02. It accepts the listed
symbol pins, package families, footprint pad order and land patterns,
including the project-local PowerPAD and shunt footprints. Final PCB
placement, rotation, Kelvin routing, power/thermal copper and assembly-
rendering checks remain release-stage controls; AISLER stock and MPN
assignment remains a separate commercial selection step.

#### Verification

| Check | Evidence | Result |
|---|---|---|
| Requirements inspection | Standard Control Services 3.5, 3.5.1 and Appendix C.3 | Topology covers the required switching and two measurement ranges |
| Behaviour and safe-state analysis | Operating table, unpowered-state review and current schematic | Logic recorded and required `TARGET_SWITCH_EN` pull-down implemented as `R1110` |
| Manufacturer source screen and pin functions | Product pages, data sheets and applicable application documents summarized above | Pin functions and I2C addresses reviewed; TXU0101 closes the range-driver partial-power blocker, low-range alert integration is implemented, and exact shunt candidates support the analytical accuracy budget |
| Connectivity contract | `verification/contracts/PC02-target-5v-switch-and-two-range-monitor.yaml`, `verification/contracts/SYS01-power-events-to-rack-control.yaml`, canonical full-hierarchy netlist and `verification/baseline/Espruino_Harness_RevA_FullHierarchy_Connectivity.json` | Refreshed 2026-08-11: PC02 passes all 110 assertions and SYS01 passes all 3; complete PC01/PC02/SYS01 set passes 186 checks. `SYS01` confirms that `U1104.Alert`, `U1105.2B` and `U1201.GPB3` share `LOW_RANGE_OK_N`. |
| Full-hierarchy ERC | `verification/baseline/Espruino_Harness_RevA_FullHierarchy_ERC.rpt`, refreshed from the root schematic on 2026-08-12 | Accepted: zero errors and zero warnings |
| Symbol-to-footprint pin mapping | Manufacturer pin tables and package drawings, full-hierarchy netlist, project-local and installed KiCad footprints, and current PCB pad nets | U1101–U1105 and Q1101 pin functions, package pads and intrinsic pin-1 orientation agree. The project-local U1101 footprint implements the TI perimeter pads, exposed pad 11 and segmented paste opening. The manufacturer-derived R1101 and R1102 footprints implement their accepted two-terminal land patterns. Engineering package review complete; release-stage placement, Kelvin, copper and assembly checks remain. |
| Visual schematic review | `review-images/PC02-target-5v-switch-and-two-range-monitor.png` | Accepted current reviewed circuit capture |
| Electrical limits | Calculations above | Protection topology and analytical component-path voltage-drop, dissipation and accuracy budgets are supported; PCB/contact resistance, inrush and physical accuracy remain release measurements |

#### Open issues and accepted exceptions

- Confirm the TPS2559-Q1 no-via-in-pad assembly choice with AISLER during PCB
  review and place short, wide PowerPAD-to-ground copper with nearby ground
  vias. The project-local DRC0010K footprint and its top-view orientation,
  symbol mapping, 66.5 kΩ `ILIM` resistor, `TARGET_SWITCH_EN` pull-down,
  `TARGET_POWER_FAULT_N` and PC02 connectivity contract are implemented.
- Synchronize exact MPN metadata and complete component assignments together
  during the later board-wide AISLER BOM Assign stage. TPS2559-Q1 and
  SN74LVC2G08 availability remains to be confirmed; the selected INA226 and
  INA228 variants were visible in the AISLER matching results.
- Complete AISLER assignments and the release-stage PCB placement, rotation
  and assembly-rendering review. The PC02 engineering package and footprint
  review is complete. Pad-level Kelvin routing and the Bourns full-load copper
  area remain PCB implementation actions.
- Keep the combined PCB, connector and backplane resistance below the
  provisional 26 mΩ allocation, verify it from the completed PCB layout, and
  measure at least 4.75 V at `TI_SWITCHED_TARGET_5V` with a 5.00 V source and
  1.5 A Rev-A load. The AO3401A temperature coefficient is typical rather
  than guaranteed, so the physical test remains authoritative.
- Determine the maximum complete target-side capacitance, calculate the
  TPS2559-Q1 turn-on transient, provide the required local `EXT_5V` bulk
  capacitance and confirm the measured rail rise, rack-rail disturbance and
  observation delay on Rev A.
- Measure target-rail decay with TPS2559-Q1 and define the Target Power Monitor
  threshold and timeout that confirm the rail is off before power-cycle
  sequencing continues.
- Exercise valid target boot, radio and peripheral transients at the minimum
  current-limit tolerance, then verify overload, short-circuit, thermal-retry
  and `TARGET_POWER_FAULT_N` behaviour at the maximum tolerance.
- Implement and verify the firmware configuration for the `U1104` ±40.96 mV
  range, active-low latched shunt-overvoltage alert and accepted threshold.
  Enable the `U1201.GPB3` interrupt and verify the specified request-clear /
  `DIAG_ALRT`-read / MCP23017-capture-clear order.
- Verify both TXU0101 local decoupling capacitors and all partial-power states
  on Rev A. Its data-sheet pin mapping and KiCad footprint pad numbering now
  agree; the PC02 connectivity assertions are refreshed.
- The analytical low-range budget supports the proposed 1% shunts with a
  7.71% known worst-case subtotal at 100 µA. Characterize AO3401A bypass
  leakage, noise, thermal EMF, PCB leakage and zero-offset at 100 µA through
  55°C before accepting the stated minimum measurement.
- Configure INA228 for its ±40.96 mV shunt range and define conversion time,
  averaging and calibration. Treat INA226 saturation above 1.6384 A as an
  overload-region limitation and use `TARGET_POWER_FAULT_N` for protection.
- Confirm Rack Control I2C pull-ups and the total always-on
  `RACK_CONTROL_3V3` load in the Rack Control/backplane design.

No exceptions are accepted at this stage.

### 4.3 RC01 — Routing Fabric

**Purpose and requirements:** Implement the accepted 19 independently
controlled route-selection paths `RP01`–`RP19` between Target Interface route
entries R0–R6 and their legal Test Block endpoints. Every path shall default
open, pass bidirectional analogue and digital signals over the complete 0 V to
3.3 V harness range, remain isolated with the Routing Logic Supply Rail absent,
and preserve the required simultaneous configurations. See Controlled Routing
Sections 4, 5, 7, 9, 11 and 13 and the Combined Capability Connection Matrix
Sections 4, 7 and 9.
**Source schematic:** `routing_control.kicad_sch`, references `U601`–`U605`,
`C601`–`C605`, the 19 functional 100 kΩ `RPxx_EN` pull-downs and representative
test points `TP612`–`TP614`.
**Visual review:** Accepted after the redundant-resistor cleanup:
[`RC01-routing-fabric.png`](review-images/RC01-routing-fabric.png).
**Risk:** High
**Status:** Verified; the TMUX1511 circuit approach, current manufacturer
application material, exact `TMUX1511PWR` selection, PW package implementation,
100 nF decoupling-capacitor policy, 100 kΩ route-enable pull-down policy, visual
schematic and current full-hierarchy ERC have been reviewed and are suitable.
The board-wide 2.54 mm through-hole test-point policy and exact part are
accepted, and the DNP state is verified on all 38 test points in the saved
schematic hierarchy and current PCB. The independent RC01 connectivity contract
passes against a fresh root netlist. AISLER's interpretation of the test-point
DNP state remains a release-stage BOM-reconciliation issue and does not block
the schematic baseline.

#### Interfaces and domains

| Type | Signals or rails | Function |
|---|---|---|
| Route entries | `R0`–`R6` | Seven target-facing common route-entry nodes |
| Route destinations | `TI_ANALOG_ADC_IN`, `TI_ONEWIRE_DQ`, `TI_GPIO_LOOP_A_OUT`, `TI_SPI_MISO`, `TI_GPIO_LOOP_A_IN`, `TI_I2C_FB`, `TI_SPI_CS_ADC`, `TI_ONEWIRE_GPIO_A_FB`, `TI_GPIO_LOOP_B_OUT`, `TI_SPI_MOSI`, `TI_UART_A_TX`, `TI_SPI_SCK`, `TI_UART_A_RX`, `TI_ANALOG_PWM_OUT`, `TI_RGB_DATA`, `TI_GPIO_LOOP_B_IN`, `TI_I2C_INT`, `TI_SPI_CS_EXT`, `TI_ONEWIRE_GPIO_B_FB` | Accepted `RP01`–`RP19` Test Block endpoints |
| Control inputs | `RP01_EN`–`RP19_EN` | Active-high independent TMUX1511 channel controls from the routing controllers |
| Supply | `ROUTING_LOGIC_3V3` | Powers all five RC01 switch packages |
| Ground | `TI_GND` | Signal, control-bias and decoupling reference |

#### Key design issues

**Shared route-entry capacitance — accepted for the circuit approach; complete
path validation remains required.** Each R0–R6 entry is connected to every
TMUX1511 source pin assigned to that entry. An active route therefore sees the
active channel's maximum 6 pF on-capacitance plus the maximum 4 pF off-
capacitance of every alternative channel. The switch-only maximum contribution
is approximately 10 pF for the two-destination R0, R1, R4 and R5 entries,
14 pF for the three-destination R3 entry, and 18 pF for the four-destination R2
and R6 entries. These values exclude PCB, connector, daughter-board, protection
and Test Block capacitance. They do not challenge the selected device, but the
complete analogue, SPI, 1-Wire, UART, RGB and GPIO path budgets and prototype
tests shall use the fan-out totals rather than one channel's nominal
capacitance.

**Powered-off leakage and 3.6 V boundary — bounded and subject to physical
acceptance.** TMUX1511 powered-off protection maintains the signal path high
impedance and prevents ordinary ESD-diode back-power when `VDD = 0 V`. The
guaranteed powered-off signal range ends at 3.6 V, which equals the accepted
maximum `TI_TARGET_3V3` domain voltage. The data sheet permits up to 2 µA
powered-off I/O leakage per pin at that boundary. A deliberately conservative
19-channel RC01 aggregate is therefore 38 µA if every target-facing switch pin
simultaneously has worst-case leakage in the same direction. Rev A shall verify
that the supported partial-power sequences produce no functional or damaging
back-power, record the actual leakage and resulting unpowered-rail voltage, and
keep switching overshoot within the powered-off operating limit.

**Route-change charge injection and settling — implementation action.** The
data sheet gives 2 pC typical charge injection. The accepted reconfiguration
sequence establishes routes while target and peer drivers are inactive, which
prevents a route-change transient from becoming contention. Analogue tests
shall additionally allow the routed node to settle after `RP01` or `RP14`
changes and shall determine whether the first ADC conversion must be discarded.

**Simultaneous analogue and SPI operation — PCB and prototype action.** The
accepted analogue-plus-SPI configuration operates multiple switch channels at
the same time, including `RP01` and `RP04` in `U601`. TMUX1511 has substantial
typical bandwidth, off-isolation and crosstalk margin, but those figures do not
replace complete-board validation. Placement and routing shall separate the
analogue path from SPI clock and control edges, and Rev A shall compare analogue
results with SPI idle and active.

No application-note finding requires an architecture change. Netlist review
identified six copied 100 kΩ positions whose two pads were already on
`TI_GND`: `R603`, `R608`, `R13`, `R18`, `R23` and `R25`. They provided no
pull-down or isolation function and were removed on 2026-08-11. Their former
positions now directly connect `U601`–`U605.GND` and the deliberately disabled
`U605.SEL4` to `TI_GND`. Exact passive MPN selection remains a later RC01
implementation-review item.

#### Selected implementation

- `U601` implements `RP01`–`RP04`, `U602` implements `RP05`–`RP08`, `U603`
  implements `RP09`–`RP12`, `U604` implements `RP13`–`RP16`, and `U605`
  implements `RP17`–`RP19`. `U605` channel 4 is unused, its select input is
  grounded, and its signal pins are marked unconnected.
- Every selected channel is an independently controlled bidirectional 1:1
  switch. No shared address or select line couples route entries.
- Each switch has a local schematic 100 nF `ROUTING_LOGIC_3V3` decoupling
  capacitor. The data sheet accepts 0.1 µF to 10 µF from VDD to GND.
- Each implemented `RPxx_EN` input has a 100 kΩ external pull-down in addition
  to the TMUX1511 nominal 6 MΩ internal pull-down. With the switch's maximum
  ±2 µA control-input leakage considered alone, 100 kΩ develops no more than
  0.2 V, below the 0.45 V maximum input-low threshold. Routing-controller
  reset-state leakage and combined margin remain part of RC02 review.
- The accepted exact orderable device is `TMUX1511PWR`, the PW TSSOP-14 tape-
  and-reel variant. AISLER BOM Assign groups and assigns this part to all seven
  current PW-package instances: RC01 `U601`–`U605`, RC02 `U606` and TB07
  `U701`. This assignment accepts the RC01 devices commercially; RC02 and TB07
  retain their independent circuit-block reviews. The schematic value remains
  the functional base name `TMUX1511` while this baseline records the exact
  orderable MPN.

#### Operating logic and safe states

| Condition | Required and reviewed state |
|---|---|
| `ROUTING_LOGIC_3V3` absent or below the TMUX1511 operating range | Every RC01 signal path remains high impedance through powered-off protection for signal pins held within 0 V to 3.6 V |
| Routing controller reset, unpowered or configured as inputs | External 100 kΩ and internal nominal 6 MΩ pull-downs hold every implemented select input low; all paths remain open |
| Valid route state | At most one destination is enabled for each R0–R6 entry; other destinations remain open |
| Route change | Target and peer drivers inactive; old paths cleared and verified before a new path is enabled |
| Test complete or failed configuration | Drivers inactive before the selected paths are cleared and verified |
| Unused `U605` channel 4 | Select held low; S4 and D4 remain unconnected |

The TMUX1511 fixed logic thresholds accept the 3.3 V routing-controller
outputs with substantial high-level margin. Fail-safe control inputs prevent a
controller output from back-powering an unpowered switch, although RC01 and its
controllers normally share `ROUTING_LOGIC_3V3`.

#### Key calculations and limits

| Subject | Data-sheet or application-note basis | RC01 conclusion |
|---|---|---|
| Signal and supply range | VDD 1.5 V to 5.5 V; powered signal range 0 V to `VDD × 2` subject to 5.5 V maximum; powered-off range 0 V to 3.6 V | Suitable for the 3.3 V harness domain; 3.6 V is a no-margin powered-off boundary to be protected and measured |
| On-resistance | 2 Ω typical, 4.5 Ω maximum at 8 mA | Suitable for the high-impedance and protected Test Block loads; include 4.5 Ω in complete path budgets |
| Continuous signal current | ±25 mA maximum | Above normal routed signal currents; contention remains prohibited rather than treated as a valid load case |
| On/off capacitance | 6 pF maximum on and 4 pF maximum off | Fan-out contribution is 10 pF, 14 pF or 18 pF depending on route entry |
| Powered-off leakage | Up to ±2 µA per I/O pin over 0 V to 3.6 V | Conservative 19-target-pin aggregate 38 µA; physical partial-power verification required |
| On/off leakage while powered | 50 nA maximum on; 100 nA maximum off | Suitable at device level; complete analogue-node leakage remains a board-level check |
| Logic thresholds | `VIH` 1.2 V minimum; `VIL` 0.45 V maximum | Compatible with 3.3 V MCP23017 outputs; external pull-down margin accepted provisionally |
| Bandwidth and propagation | 3 GHz typical bandwidth and 67 ps typical propagation delay | Substantial device-level margin for the accepted SPI, UART, RGB and GPIO rates; PCB and attached loading determine the validated limits |
| Charge injection | 2 pC typical | Route before enabling drivers; allow analogue settling and assess first-sample discard |
| Crosstalk and off-isolation | Typical −90 dB channel crosstalk at 100 kHz and −75 dB off-isolation at 1 MHz | Supporting evidence only; verify the simultaneous analogue/SPI configuration on the completed board |

#### Manufacturer source and application review

The current [TMUX1511 product page](https://www.ti.com/product/TMUX1511) and
[Rev. B data sheet](https://www.ti.com/lit/ds/symlink/tmux1511.pdf) were
reviewed on 2026-08-10. The product page lists TMUX1511 as active and provides
the PW TSSOP-14 option. The data sheet is the authority for pin functions,
guaranteed electrical limits and powered-off behaviour.

| Manufacturer material | RC01 consequence |
|---|---|
| TMUX1511 data sheet, Rev. B | Confirms independent bidirectional channels, PW pinout, 0.1 µF to 10 µF decoupling, fixed logic thresholds, fail-safe control inputs, powered-off range and leakage, resistance, capacitance, current and timing limits. Its protocol-isolation example matches the RC01 use. |
| [Selecting the Correct Texas Instruments Signal Switch, Rev. E](https://www.ti.com/lit/an/szza030e/szza030e.pdf) | Confirms that configuration, signal/supply range, resistance, capacitance, leakage, bandwidth, charge injection, crosstalk, off-isolation and powered-off behaviour are the applicable selection criteria. RC01 satisfies the device-level screen; complete-board loading remains to be checked. |
| [Eliminate Power Sequencing with Powered-off Protection Signal Switches, Rev. C](https://www.ti.com/lit/ab/scda015c/scda015c.pdf) | Confirms that a switch without powered-off protection can back-power its supply and unintentionally pass signals. TMUX1511 is appropriate for the V2 target/routing partial-power boundary; data-sheet leakage and prototype evidence still bound acceptance. |
| [1.8-V Logic for Multiplexers and Signal Switches, Rev. C](https://www.ti.com/lit/pdf/SCAA126) | Confirms direct logic control without a translator when output-high and output-low margins satisfy the fixed thresholds. RC01 uses 3.3 V control and needs no translation. |
| [Enabling SPI-Based Flash Memory Expansion by Using Multiplexers, Rev. B](https://www.ti.com/lit/ab/scda016b/scda016b.pdf) | Identifies TMUX1511 as a suitable 1:1 SPI isolation switch based on low resistance and capacitance, high bandwidth, powered-off protection and logic compatibility. RC01 shall still validate its complete fan-out and PCB loading at the accepted SPI rate. |
| [Multiplexers and Signal Switches Glossary, Rev. B](https://www.ti.com/lit/an/slla471b/slla471b.pdf) | Supports the interpretation of bidirectionality, fail-safe logic, integrated pull-downs, leakage, charge injection and isolation terms; it adds no separate circuit requirement. |
| Selecting the Right Multiplexer for a Discrete PGA and Improve Stability Issues with Low-CON Multiplexers | The op-amp feedback applications do not apply directly. Their low-resistance and low-capacitance guidance supports the selected device and the requirement to include all shared-node capacitance. |
| Product-linked powered-off-protection and servo-drive technical articles | Supporting explanations only; they reinforce the authoritative powered-off application brief and add no new RC01 implementation requirement. |

#### Components and packaging

| References | Manufacturer | Exact orderable part | Package | KiCad symbol | KiCad footprint | Datasheet/revision | Pin/pad mapping | AISLER assignment |
|---|---|---|---|---|---|---|---|---|
| `U601`–`U605` | Texas Instruments | [`TMUX1511PWR`](https://www.ti.com/product/TMUX1511/part-details/TMUX1511PWR) | PW0014A, 14-pin TSSOP, 4.4 mm × 5.0 mm nominal body, 0.65 mm pitch | `Espruino_Harness_RevA:TMUX1511_PW` | `Package_SO:TSSOP-14_4.4x5mm_P0.65mm` | [TMUX1511 Rev. B, SCDS390B, March 2025](https://www.ti.com/lit/ds/symlink/tmux1511.pdf) | Accepted. Symbol pins agree exactly with the PW top-view table: `SEL1/S1/D1/SEL2/S2/D2/GND/D3/S3/SEL3/D4/S4/SEL4/VDD` on pins 1–14. The footprint has 14 sequential pads, the required 0.65 mm pitch, compatible 4.4 mm × 5.0 mm body outline and intrinsic pin-1 indication. Its IPC pads are 1.475 mm × 0.40 mm versus TI's 1.50 mm × 0.45 mm example; TI explicitly permits IPC-7351 alternate designs. | Assigned in AISLER on 2026-08-11 as one seven-component group covering `U601`–`U606` and `U701`; RC01 allocation is `U601`–`U605` |
| `C601`–`C605` | AISLER-selected commodity MLCC | Manufacturer intentionally open; controlled by `AISLER_MPN = 100nF 10% 16V X7R 0603` | 0603 (1608 metric) | `Device:C` | `Capacitor_SMD:C_0603_1608Metric` | TMUX1511 Rev. B requires 0.1 µF to 10 µF local VDD bypass; final supplied-part data applies at release | Accepted. Non-polarized two-terminal mapping agrees with the standard footprint. The 100 nF nominal value meets the TMUX1511 recommendation; 16 V provides nearly 5× rating margin over `ROUTING_LOGIC_3V3`, and X7R/10% controls dielectric and initial tolerance. Local placement and short VDD/GND connections remain PCB action `PCB-RC01-01`. | KiCad Smart Match requirement accepted. The current AISLER capture retains an earlier generic assignment for `C601`–`C605`; reject/reassign it and verify all parameters during final BOM reconciliation. |
| Nineteen functional `RPxx_EN` pull-downs: `R601`, `R602`, `R604`–`R607`, `R609`, `R610`, `R11`, `R12`, `R14`–`R17`, `R19`–`R22`, `R24` | AISLER-selected commodity resistor | Manufacturer intentionally open; controlled by `AISLER_MPN = 100k 0603 1% 0.1W` | 0603 (1608 metric), 0.1 W | `Device:R` | `Resistor_SMD:R_0603_1608Metric` | TMUX1511 Rev. B control-input limits and [AISLER Smart Match resistor parameters](https://community.aisler.net/t/documenting-parts/56) | Accepted. The refreshed hierarchy confirms exactly one 100 kΩ pull-down from each `RP01_EN`–`RP19_EN` to `TI_GND` and the standard two-terminal mapping. At the 1% high limit, 2 µA leakage develops 0.202 V, below the 0.45 V maximum input-low threshold without relying on the internal pull-down. Dissipation at 3.3 V is approximately 0.109 mW, more than 900 times below 0.1 W. | KiCad Smart Match requirement accepted on exactly the nineteen listed references. Reassign the current generic AISLER 100 kΩ entries and verify tolerance, power and package during final BOM reconciliation. |
| `TP612`–`TP614` | Würth Elektronik | [`61300111121`](https://www.we-online.com/components/products/datasheet/61300111121.pdf) | One-position, single-row, vertical 2.54 mm THT pin header; 0.64 mm square pin, 3.0 mm PCB tail and 6.0 mm exposed post | `Connector:TestPoint` | `Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical` | Würth `61300111121`, drawing revision 003.001, 2023-08-15 | Accepted under board-wide decision `INT02`. The KiCad footprint uses a 1.0 mm drill and 1.7 mm pad; the drill lies within the manufacturer's recommended 1.10 ±0.15 mm hole range and gives a 0.35 mm nominal annular ring. The single electrical pin maps directly to pad 1. | Exact `MPN = 61300111121` and DNP state are verified on all 38 board test points, including RC01 `TP612`–`TP614`. Retain them in the overall KiCad BOM and hand-fit after manufacture. AISLER exclusion interpretation remains a final BOM-reconciliation check. |

#### Verification

| Check | Evidence | Result |
|---|---|---|
| Requirements inspection | Controlled Routing and Combined Capability Connection Matrix | Accepted: the selected five-switch approach implements the complete 19-path inventory and preserves the required route-entry grouping |
| Behaviour and safe-state analysis | Operating table, partial-power review and current full-hierarchy normalized connectivity | Circuit approach accepted; powered-off leakage, 3.6 V boundary and complete controller-reset margin remain physical/RC02 checks |
| Manufacturer source screen | Sources and conclusions above | Accepted for circuit approach; no architecture or topology change required |
| Connectivity contract | `verification/contracts/RC01-routing-fabric.yaml` and `verification/baseline/Espruino_Harness_RevA_FullHierarchy_Connectivity.json` | Accepted: 164 RC01 checks pass against the fresh root netlist: 116 pin/net, 29 component-value and 19 forbidden-direct-path assertions; the complete four-contract set passes 350 checks |
| Full-hierarchy ERC | `verification/baseline/Espruino_Harness_RevA_FullHierarchy_ERC.rpt`, refreshed from the root schematic on 2026-08-12 | Accepted: zero errors and zero warnings after removal of the six redundant ground-to-ground resistors and application of the board-wide test-point metadata |
| Symbol-to-footprint pin mapping | TMUX1511 Rev. B PW pin table, PW0014A package drawing, project-local symbol, installed KiCad footprint and current PCB pads | Accepted: pins 1–14, package family, body size, pitch, pad order and pin-1 orientation agree; the footprint's IPC land pattern is a permitted alternate to TI's example pattern |
| Visual schematic review | `review-images/RC01-routing-fabric.png` | Accepted current reviewed circuit capture after removal of the six redundant resistors |
| Electrical limits | Calculations above | Device-level margins supported; complete path and prototype evidence pending |

#### Open issues and accepted exceptions

- The accepted DNP state is present on all 38 `INT02` test points in the saved
  hierarchy and PCB, but the latest AISLER upload did not exclude them as
  expected. Resolve the importer or assignment-state behaviour and verify the
  exclusion during final BOM reconciliation; retain the exact test-point MPNs
  in the overall KiCad BOM for hand fitting. Also reassign the current generic AISLER entries
  for `C601`–`C605` and the nineteen route-enable pull-downs to their accepted
  Smart Match requirements. The six redundant ground-to-ground positions have
  been removed and do not belong in the BOM or PCB.
- Include the maximum fan-out capacitance and 4.5 Ω switch resistance in every
  affected complete Test Block path budget.
- Define the analogue route-settling and first-sample policy from prototype
  evidence.
- Measure powered-off leakage and unpowered-rail voltage across the supported
  target/routing power sequences, including the 3.6 V boundary.
- Validate analogue performance with the required concurrent SPI activity and
  retain the maximum proven SPI, UART, 1-Wire, RGB and GPIO rates.

No exception is accepted at this stage.

### 4.4 RC02 — Routing controllers and fixed I2C isolation

**Purpose and requirements:** Provide the target-owned direct I2C control
plane at `RCTRL0 = 0x21` and `RCTRL1 = 0x22`, qualify the target, Test Block
and Routing Logic 3.3 V rails before connecting the fixed I2C branches, and
hold both routing controllers in hardware reset until the Routing Logic Supply
Rail is valid. Hardware Clear shall return every route-control output to its
safe inactive state independently of responsive target firmware. See
Controlled Routing Sections 3, 8, 9, 10 and 13 and Standard Control Services
Sections 5 and 8.
**Source schematic:** `routing_control.kicad_sch`, references `U606`–`U611`,
`C606`–`C611`, `C621`–`C623`, `R620`–`R623`, `R630`–`R634`, `JP610`–`JP615`
and diagnostic points `TP601`–`TP611`; the cross-sheet Hardware Clear request
stage is `Q1203`, `R1209` and `R1210` on `rack_control.kicad_sch`.
**Visual review:** Accepted full-sheet
[`RC02-routing-controllers-and-fixed-i2c-isolation.png`](review-images/RC02-routing-controllers-and-fixed-i2c-isolation.png)
and cross-sheet
[`RC02-hardware-clear-request.png`](review-images/RC02-hardware-clear-request.png).
**Risk:** High
**Status:** Verified at schematic-baseline level. Manufacturer-source review,
the corrected TPS3808 SENSE bypassing and address notes, the independent
Hardware Clear implementation, visual review, full-hierarchy ERC and the RC02
connectivity contract are accepted. PCB-layout and physical waveform/loading
actions remain open in Section 6.

#### Functional control, signal and safety flow

This subsection maps the accepted functional flow onto the implemented RC02
references. It introduces no additional route or behaviour; the owning
Controlled Routing and Standard Control Services specifications remain
authoritative.

Target firmware owns route configuration. Commands and controller-state
readback use the permanently assigned direct I2C path rather than any `RPxx`
route-selection path:

```text
Target firmware / Target Support Module
        |
        | bidirectional TI_I2C_SDA / TI_I2C_SCL
        v
R620 / R621 target-domain pull-ups
        |
        | U606 channels 1 and 2 (IP01 / IP02)
        | enabled by U607 only while TI_TARGET_3V3 is valid
        v
ROUTE_I2C_SDA / ROUTE_I2C_SCL
        |
        +----> U610 / RCTRL0 / 0x21
        |          +----> RP01_EN-RP16_EN
        |
        +----> U611 / RCTRL1 / 0x22
        |          +----> RP17_EN-RP19_EN
        |          +----> UP01_EN-UP04_EN
        |
        | U606 channels 3 and 4 (IP03 / IP04)
        | enabled by U608 only while TEST_BLOCK_3V3 is valid
        v
Standard Test Block I2C segment
```

`R622` and `R623` pull the routing-controller segment up to
`ROUTING_LOGIC_3V3`. Pull-ups on an enabled target or Test Block segment act
in parallel and are therefore part of the complete bus-current and rise-time
calculation. `U606` is itself powered from `ROUTING_LOGIC_3V3`; if that rail is
absent, its powered-off protection holds all four fixed I2C paths high
impedance even if an endpoint rail remains present.

The routing controllers convert the requested state into individual
active-high switch controls:

```text
verified U610 / U611 GPIO state
        |
        +----> RP01_EN-RP19_EN ----> U601-U605 routing-fabric channels
        |                                  |
        |                                  v
        |                         one legal R0-R6 destination
        |
        +----> UP01_EN-UP04_EN ----> U701 Block 7 local switching
```

`JP610`–`JP612` establish the `U610` default address `0x21`; `JP613`–`JP615`
establish the `U611` default address `0x22`. Firmware preloads the relevant
`OLAT` registers low before changing `IODIR` from inputs to outputs, reads the
actual `GPIO` state back, and enables target or Test Block drivers only after
the complete route state is verified. Controller readback proves the control
pin state; it does not prove TMUX1511 continuity or isolation.

Rail qualification and Hardware Clear form an out-of-band safety path:

```text
TI_TARGET_3V3 invalid                TEST_BLOCK_3V3 invalid
        |                                      |
        v                                      v
U607 RESET asserted                    U608 RESET asserted
        |                                      |
TARGET_I2C_ISO_EN low                  TEST_I2C_ISO_EN low
        |                                      |
U606 IP01 / IP02 open                  U606 IP03 / IP04 open

ROUTING_LOGIC_3V3 invalid       Supervisor Hardware Clear request
        |                       U1201.GPA6 -> R1209 -> Q1203
        v                                      |
U609 RESET asserted                            |
        +------------------+-------------------+
                           v
                    ROUTE_CLEAR_N low
                           |
                           v
                  U610 and U611 in reset
                           |
                           v
                controller GPIO high impedance
                           |
                           v
        external 100 kΩ RPxx_EN / UPxx_EN pull-downs
                           |
                           v
                 all controlled switches open
```

`R630/R631` and `R632/R633` provide the pull-up and disabled-state bias for
the two fixed-I2C enable groups. `R634` pulls `ROUTE_CLEAR_N` high only after
`U609` releases it. `C606`–`C611` are the local active-device supply bypasses;
`C621`–`C623` separately filter `U607`–`U609.SENSE` with 4.7 nF to `TI_GND`.
`TP601`–`TP611` expose representative rails, I2C, clear, interrupt and enable
states for bring-up without participating in normal control flow.

| References | Functional role |
|---|---|
| `U606` | Four-channel powered-off-protected fixed I2C boundary: IP01/IP02 connect target I2C to routing I2C and IP03/IP04 connect routing I2C to the Standard Test Block segment. |
| `U607` | Qualifies `TI_TARGET_3V3` and releases `TARGET_I2C_ISO_EN` after the rail-valid delay. |
| `U608` | Qualifies `TEST_BLOCK_3V3` and releases `TEST_I2C_ISO_EN` after the rail-valid delay. |
| `U609` | Qualifies `ROUTING_LOGIC_3V3` and releases the common active-low `ROUTE_CLEAR_N` reset after the rail-valid delay. |
| `U610`, `U611` | Target-owned MCP23017 routing controllers. `U610` owns `RP01`–`RP16`; `U611` owns `RP17`–`RP19` and `UP01`–`UP04`. |
| `R620`–`R623` | Target-side and routing-side direct-I2C pull-ups; their enabled parallel combinations set bus sink current and rise time. |
| `R630`–`R634` | TPS3808 output pull-ups and disabled-state bias: paired pull-up/pull-down networks for the two U606 enable groups and the pull-up for `ROUTE_CLEAR_N`. |
| `Q1203`, `R1209`, `R1210` | Rack Control-domain open-drain Hardware Clear stage. `U1201.GPA6` drives the `DMG2302UKQ-7` gate through 10 kΩ; 100 kΩ holds the gate inactive and the NMOS drain asserts `ROUTE_CLEAR_N`. |
| `JP610`–`JP615` | Reworkable hardware address straps establishing controller defaults `0x21` and `0x22`. |
| `C606`–`C611` | Local 100 nF active-device supply bypasses. |
| `C621`–`C623` | Separate 4.7 nF TPS3808 SENSE-to-`TI_GND` bypass capacitors for `U607`–`U609`. |
| `TP601`–`TP611` | DNP/hand-fit diagnostic access to the principal rail, I2C, clear, interrupt and enable signals. |
| RC01 and TB07 switch-control pull-downs | The nineteen `RPxx_EN` 100 kΩ pull-downs and `R705`–`R708` on `UP01_EN`–`UP04_EN` hold all controlled switch inputs inactive while `U610/U611` are reset or configured as inputs. |

#### Manufacturer source and application review

The current manufacturer product pages, data sheets, associated application
material and published MCP23017 errata were reviewed on 2026-08-11, with the
Q1203 exact-part review completed on 2026-08-12. Third-party data-sheet mirrors
were used only to discover source material; the evidence below cites the
original manufacturer documents.

| Manufacturer material | RC02 consequence |
|---|---|
| [MCP23017/MCP23S17 data sheet, DS20001952D](https://ww1.microchip.com/downloads/aemDocuments/documents/APID/ProductDocuments/DataSheets/MCP23017-Data-Sheet-DS20001952.pdf) | Confirms the `MCP23017-E/SO` wide-SOIC package, address pins, reset timing, I2C modes and reset defaults. `IODIRA` and `IODIRB` reset to inputs and the output latches reset low, so the external 100 kΩ `RPxx_EN` pull-downs retain the hardware-safe open state while either controller is reset or unconfigured. |
| [AN1043 — Unique Features of the MCP23X08/17 GPIO Expanders](https://ww1.microchip.com/downloads/en/AppNotes/01043a.pdf) | Confirms that `IODIR = 1` disables the output driver, `IODIR = 0` drives the corresponding `OLAT` value, and a `GPIO` read observes the actual pad state. Firmware shall leave the pins as inputs, write zero to both relevant output latches, then configure the allocated pins as outputs and read `GPIO` back before enabling any route. Reading only `OLAT` is not sufficient operational verification. Firmware shall also set and verify the intended `IOCON.BANK` and `IOCON.SEQOP` conventions rather than assuming a library default. |
| [AN1081 — Interfacing a 4x4 Matrix Keypad with an 8-Bit GPIO Expander](https://ww1.microchip.com/downloads/en/AppNotes/01081a.pdf) | Screened because Microchip associates it with the MCP23X17 family. Its keypad scanning and interrupt-on-change sequence does not apply to the routing controllers. It reinforces that writes to `GPIO` update the output latch and reads of `GPIO` return the pin state; it adds no RC02 circuit requirement. |
| [MCP23017 Rev. A Silicon Errata, DS80252A](https://www.microchip.com/content/dam/mchp/documents/OTH/ProductDocuments/MISC/80252A.pdf) | Revision A0 could falsely acknowledge non-address data on a shared I2C bus. Microchip states that date code `0542` and earlier is affected and `0543` and later is corrected. Current production parts require no workaround, but obsolete, reclaimed or otherwise untraceable date-code `0542` or earlier devices shall not be fitted. |
| [TPS3808 data sheet, Rev. M](https://www.ti.com/lit/ds/symlink/tps3808.pdf) | Confirms the `TPS3808G30DBVR` DBV SOT-23-6 pinout, nominal 2.79 V falling threshold, open-drain active-low output, 10 kΩ to 1 MΩ permitted RESET pull-up, open-`CT` nominal 20 ms release delay, 100 nF local VDD bypass and 1 nF to 10 nF SENSE bypass recommendation. `U607`–`U609` therefore each require a dedicated SENSE-to-`TI_GND` bypass capacitor in addition to `C607`–`C609`. A nominal 4.7 nF 0603 capacitor is the proposed value. |
| [Voltage Supervisors (Reset ICs): Frequently Asked Questions, SLVAE47A](https://www.ti.com/lit/pdf/slvae47) | Supports using the supervisor output to hold an enable or reset inactive until the monitored rail is valid, and requires output pull-up current, supervisor leakage, load-input leakage, `VOL`/`VIL`, `VOH`/`VIH`, threshold accuracy, hysteresis and indeterminate output below the power-on-reset voltage to be considered explicitly. |
| [Mitigating the Indeterminate Output of a Voltage Supervisor During Power Up/Down, SNVA845](https://www.ti.com/lit/pdf/snva845) | An active-low supervisor output is undefined below its power-on-reset voltage because its internal pull-down device cannot yet operate. No extra JFET stage is required here: each TPS3808, its output pull-up and the controlled TMUX1511 or MCP23017 share `ROUTING_LOGIC_3V3`. Below the approximately 0.8 V TPS3808 power-on-reset boundary, the divided output remains below the TMUX1511 1.2 V input-high threshold and the controlled devices are themselves below their operating range. Validate this conclusion on the actual rail ramp and power-down waveform. |
| [Setting the SVS Voltage Monitor Threshold, SLVA521](https://www.ti.com/lit/pdf/slva521) | Confirms that threshold selection must include rail tolerance, supervisor accuracy and the minimum operating voltage of the protected circuitry. The fixed 2.79 V nominal threshold provides substantial separation from a valid nominal 3.3 V rail and asserts while the routing devices still have supply headroom. It qualifies rail presence; it does not replace endpoint-specific power-good or functional checks. |
| [Choosing an Appropriate Pull-up/Pull-down Resistor for Open Drain Outputs, SLVA485](https://www.ti.com/lit/pdf/slva485) | Requires the asserted output to satisfy `VOL < VIL` at a bounded sink current and the released output to satisfy `VOH > VIH` after leakage and load currents. The current 10 kΩ pull-up and 100 kΩ disabled-state pull-down produce approximately 3.0 V released, well above the TMUX1511 1.2 V `VIH`. TPS3808 guarantees at most 0.4 V at 1 mA versus the TMUX1511 0.45 V `VIL`; the approximately 0.33 mA circuit current should produce a lower voltage, but the 50 mV guaranteed-limit separation is small and remains a layout and prototype measurement action. |
| [TMUX1511 product page](https://www.ti.com/product/TMUX1511), [Rev. B data sheet](https://www.ti.com/lit/ds/symlink/tmux1511.pdf), [1.8-V Logic for Multiplexers and Signal Switches, SCAA126C](https://www.ti.com/lit/pdf/SCAA126), [Selecting the Correct Texas Instruments Signal Switch, SZZA030E](https://www.ti.com/lit/pdf/SZZA030) and [Powered-off Protection Signal Switches, SCDA015C](https://www.ti.com/lit/ab/scda015c/scda015c.pdf) | Confirm that TMUX1511 supports I2C, independent bidirectional channels, fixed 1.2 V/0.45 V logic thresholds, fail-safe controls, powered-off high-impedance isolation to 3.6 V, 4.5 Ω maximum on-resistance and approximately 3.3 pF typical on-capacitance. The fixed-isolation topology is suitable; include switch resistance and capacitance in the complete I2C calculation and keep every partial-power signal within 3.6 V. The remaining product-linked PGA, SPI-flash, op-amp-stability and general glossary material adds no separate RC02 requirement. |
| [I2C Bus Pull-up Resistor Calculation, SLVA689](https://www.ti.com/lit/an/slva689/slva689.pdf) | Requires pull-ups to be strong enough to meet rise time but weak enough for every participant to sink the bus low. Two enabled 4.7 kΩ branches give 2.35 kΩ; three give approximately 1.57 kΩ. At 3.3 V and a 0.4 V low level these draw approximately 1.23 mA and 1.85 mA respectively, below the 3 mA standard/fast-mode basis. At 400 kHz, the 300 ns rise-time limit permits approximately 151 pF at 2.35 kΩ or 225 pF at 1.57 kΩ. At 100 kHz the calculated resistance limits exceed the I2C 400 pF bus limit, so 400 pF remains the governing maximum. Measure the completed configurations rather than accepting the resistor value alone. |
| [DMG2302UKQ product page](https://www.diodes.com/part/view/DMG2302UKQ) and [data sheet, DS40354](https://www.diodes.com/datasheet/download/DMG2302UKQ.pdf) | Select exact orderable `DMG2302UKQ-7` for `Q1203`. Its SOT-23 gate/source/drain mapping is 1/2/3 and matches the implemented symbol and footprint. The 10 kΩ/100 kΩ network gives approximately 3.0 V gate drive; the device specifies 120 mΩ maximum `RDS(on)` at 2.5 V gate drive and 25 °C, at a test current vastly above the approximately 0.33 mA Hardware Clear sink current. This removes the generic 2N7002's unsupported low-gate-drive assumption while retaining the prototype `ROUTE_CLEAR_N` low-level measurement. |

#### Exact active components and package mapping

| References | Exact MPN | Package and KiCad footprint | Review result |
|---|---|---|---|
| `U606` | `TMUX1511PWR` | PW, 14-pin TSSOP; `Package_SO:TSSOP-14_4.4x5mm_P0.65mm` | Pin mapping and grouped AISLER selection accepted with RC01. |
| `U607`–`U609` | `TPS3808G30DBVR` | DBV, SOT-23-6; `Package_TO_SOT_SMD:SOT-23-6` | Data-sheet top-view pin table and footprint pad numbering agree. Exact schematic MPN metadata present. |
| `U610`, `U611` | `MCP23017-E/SO` | SO, 28-pin wide SOIC; `Package_SO:SOIC-28W_7.5x17.9mm_P1.27mm` | Data-sheet pin table and footprint pad numbering agree. Exact schematic MPN metadata present. |
| `Q1203` | `DMG2302UKQ-7` | SOT-23; `Package_TO_SOT_SMD:SOT-23` | Gate/source/drain pins 1/2/3 agree with the data sheet and implemented netlist. Exact value and MPN metadata present. |

The 100 nF and 4.7 nF capacitors and the pull-up, pull-down and series
resistors use standard 0603 footprints. Their values are controlled by the
schematic; final manufacturer assignment remains part of BOM reconciliation.

#### Application-review outputs and retained physical checks

- The three required TPS3808 SENSE bypass capacitors are implemented as
  `C621`–`C623`, 4.7 nF 0603, while `C607`–`C609` remain separate 100 nF VDD
  bypass capacitors.
- The displayed `RCTRL1` address-jumper defaults now read `JP613 A0 default 0`,
  `JP614 A1 default 1` and `JP615 A2 default 0`, preserving address `0x22`.
- The independent Hardware Clear path is implemented from `U1201.GPA6`
  through `R1209`, `Q1203` and `R1210`, with exact
  `Q1203 = DMG2302UKQ-7` metadata.
- Exact schematic MPN metadata is present for `U606`–`U611` and `Q1203`.
- Treat MCP23017 initialization and route-state readback as part of the
  controlled-routing firmware contract: preload zero, establish output
  direction, read actual GPIO state, then enable only an accepted route set.
- Validate TPS3808 assert and release waveforms, SENSE transient filtering,
  output-low margin and route-clear timing across cold start, brownout and
  power-down. Validate direct-I2C rise time, low level and current with every
  permitted combination of target, routing and Test Block pull-ups.

#### Verification and acceptance

| Evidence | Result |
|---|---|
| Requirements and manufacturer review | Accepted against Controlled Routing and Standard Control Services, including MCP23017, TPS3808, TMUX1511 and DMG2302UKQ manufacturer sources. |
| Full-hierarchy ERC | Accepted root report dated 2026-08-12: zero errors and zero warnings. |
| Connectivity contract | `verification/contracts/RC02-routing-controllers-and-fixed-i2c-isolation.yaml` passes 210 checks: 160 pin/net, 39 component-value and 11 forbidden-direct-path assertions. The complete seven-contract set passes all 626 checks. |
| Visual schematic review | Accepted full Routing Control sheet and focused cross-sheet Hardware Clear request-stage images linked above. |
| Package and metadata review | Exact active-device MPNs and symbol/footprint pin mappings accepted as recorded above. |
| Remaining work | Physical waveform, I2C loading, layout, BOM assignment and assembly checks remain in the PCB action and release registers; they do not reopen the accepted schematic topology. |

No RC02 exception is accepted at this stage.

### 4.5 TB01 — Digital GPIO loopback

**Purpose and requirements:** Provide two independent, concurrently usable
target-output-to-target-input loopback paths for digital output, input, pulse,
shift and event testing. Each path shall retain 470 Ω series protection, a
removable 2.54 mm hard-isolation shunt and diagnostic access on both external
sides. See Standard Test Blocks Section 6.1 and the Combined Capability
Connection Matrix GPIO-loopback configuration.
**Source schematic:** `standard_test_blocks.kicad_sch`, references `R101`,
`R102`, `JP101`, `JP102` and `TP101`–`TP104`.
**Visual review:** Accepted focused
[`TB01-digital-gpio-loopback.png`](review-images/TB01-digital-gpio-loopback.png).
**Risk:** Standard
**Status:** Verified at schematic-baseline level. Requirements, V1 functional
evidence, circuit operation, exact parts, package mappings, visual review,
full-hierarchy ERC and the deterministic connectivity contract are accepted.
The draft PCB is synchronized with the accepted components and nets; layout
and completed-board measurements remain open in Section 6.

#### V1 evidence and Rev-A boundary

Both completed V1 harnesses proved the two-pair 470 Ω loopback pattern through
the shared `gpio_block1` tests. Retained results cover static high/low reads,
edge watches, `digitalPulse` and `shiftOut`. The deliberate removal of the V1
loopback links caused the expected high-state failures, and restoring the links
restored passing results. This is useful positive and negative physical
evidence for the circuit function and hard-isolation concept.

The V1 passive components were through-hole. That construction is not package
evidence for Rev A: `R101` and `R102` are deliberately SMD 0603 parts. The
two-pin isolation headers, removable shunts and individual diagnostic pins
remain through-hole because they are user-operated mechanical interfaces.

Primary retained V1 evidence:

- `tests/Results/gpio_block1/Initial_runs.md`
- `docs/handoff/2026-06-25-esp32-family-tests.md`
- `tests/repl/gpio_block1/`

#### Implemented functional flow

```text
TI_GPIO_LOOP_A_OUT -- TP101 -- R101 470 Ω -- JP101 + fitted shunt -- TP102 -- TI_GPIO_LOOP_A_IN
TI_GPIO_LOOP_B_OUT -- TP103 -- R102 470 Ω -- JP102 + fitted shunt -- TP104 -- TI_GPIO_LOOP_B_IN
```

The saved hierarchy implements those two paths exactly. `R101.2/JP101.1` and
`R102.2/JP102.1` are private intermediate nets. Removing either shunt opens
only its own loopback. The block adds no supply connection, pull-up or
pull-down, and the two pairs are not joined.

The complete Target Interface configuration still depends on the accepted
routing one-hot rules: `RP03`, `RP05`, `RP09` and `RP16` select the four TB01
endpoints. Firmware shall configure the intended input directions and verified
route state before driving either loopback output.

#### Electrical and fault review

At nominal 3.3 V, an accidental opposite-level output configuration is limited
by 470 Ω to approximately 7.0 mA before including output-driver and switch
resistance. At 3.6 V and the proposed resistor's 1% minimum value, the
conservative resistor-only current is approximately 7.7 mA and its dissipation
approximately 28 mW. This is below the selected 0.1 W resistor rating with more
than 3.5:1 power margin. It limits rather than makes output contention safe;
the required direction and route sequencing remains mandatory.

The additional 470 Ω is negligible for static CMOS input sensing. The V1
edge, pulse and shift results support the functional pattern, while maximum
Rev-A pulse and shift rates remain a completed-board measurement because the
TMUX1511, Target Interface, daughter-board and PCB capacitances are new.

#### Exact components and package mapping

| References | Selected part | Package and KiCad footprint | Review result |
|---|---|---|---|
| `R101`, `R102` | Yageo [`RC0603FR-07470RL`](https://www.yageogroup.com/component-documentation/download/specsheet/RC0603FR-07470RL), 470 Ω, 1%, 100 ppm/°C, 0.1 W | 0603/1608; `Resistor_SMD:R_0603_1608Metric` | Accepted Rev-A SMD part. Manufacturer dimensions are 1.6 mm × 0.8 mm; the standard KiCad 0603 footprint is compatible. Exact MPN and data-sheet metadata are present in the saved schematic. |
| `JP101`, `JP102` | Würth Elektronik [`61300211121`](https://www.we-online.com/components/products/datasheet/61300211121.pdf), two-position straight 2.54 mm header | Project-local `LOOPBACK_ISOLATION_HEADER`; THT, 0.64 mm square pins; `Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical` | Accepted header. The 1.0 mm KiCad drills lie within the manufacturer's 1.10 ±0.15 mm recommendation; pad pitch and numbering agree. Exact MPN metadata is present. The project-local symbol preserves pins 1/2 and removes dependence on modified global-library copies. |
| One fitted shunt per `JP101`/`JP102` | Würth Elektronik [`60900213421`](https://www.we-online.com/components/products/datasheet/60900213421.pdf), black 2.54 mm jumper with test point | Removable accessory fitted over the two header contacts | Accepted proposed normal-state shunt. Record as `SHUNT_MPN` on each owning header so the deterministic KiCad BOM can account for one accessory per header. Hand fit after manufacture. |
| `TP101`–`TP104` | Würth Elektronik `61300111121` | THT single pin; `Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical` | Already accepted by board-wide decision `INT02`; DNP records hand fitting rather than absence from the completed board. |

No active-device application note applies to TB01. The authoritative sources
are the governing functional specification, retained V1 evidence and the
manufacturer component drawings/specifications above.

#### Verification state

| Evidence | Result |
|---|---|
| Requirements and functional review | Accepted circuit approach; no architecture change required. |
| V1 prototype evidence | Accepted as proof of the two-pair 470 Ω functional pattern, including link-removal negative control; not used as Rev-A package proof. |
| Connectivity contract | `verification/contracts/TB01-digital-gpio-loopback.yaml` passes 28 checks against a fresh full-hierarchy export: 12 pin/net, 8 component-value and 8 forbidden-direct-path assertions. The accepted seven-contract baseline passes all 626 checks. |
| Package review | Accepted SMD resistors, THT headers, shunts and existing test pins are compatible with their intended roles and footprints. |
| Full-hierarchy ERC | Accepted root report dated 2026-08-12: zero errors and zero warnings after migrating `JP101/JP102` to the project-local symbol. |
| Visual schematic review | Accepted focused image linked above; both paths, values, endpoints, assembly-stage DNP test points and operating notes are legible. |
| PCB synchronization | Accepted: the current PCB contains exactly one each of `R101`, `R102`, `JP101` and `JP102`, with the accepted values, footprints, MPN/accessory metadata and pad nets. The board remains an unrouted provisional placement, so final physical placement is still open. |
| Remaining work | Complete the layout and physical checks in Section 6. |

#### Open issues and accepted exceptions

- Measure the complete Rev-A loopback waveform at the required pulse and shift
  rates after routing, including the routing fabric and target daughter board.

No TB01 exception is accepted at this stage.

### 4.6 TB02 — Analogue/PWM feedback

**Purpose and requirements:** Convert a target-generated PWM signal into a
stable `ANALOG_FB` voltage that can be measured concurrently by the selected
target ADC and MCP3008 CH0. Provide independent hard isolation of the PWM
source and both ADC branches, a 0 V to 3.3 V external-stimulus input, and
diagnostic access to every functional node. See Standard Test Blocks Section
6.2 and the Combined Capability Connection Matrix analogue-feedback
configuration.
**Source schematic:** `standard_test_blocks.kicad_sch`, references `R201`,
`C201`, `J201`, `JP201`–`JP203` and `TP201`–`TP205`; cross-block endpoints
`U401.1` and `J401.1` are owned by TB04.
**Visual review:** [Focused accepted image](review-images/TB02-analogue-pwm-feedback.png).
**Risk:** Standard
**Status:** Verified. Requirements, V1 functional evidence, circuit operation,
exact TB02 parts, package mappings, full-hierarchy ERC, deterministic
connectivity, focused visual review and PCB synchronization are accepted.

#### V1 evidence and Rev-A boundary

Both completed V1 harnesses proved the basic 10 kOhm filtered-PWM feedback
pattern. The shared `analog_block2` tests passed target ADC low/high/span checks
and produced monotonic useful readings at 25%, 50% and 75% PWM duty. The shared
`spi_block4` test additionally passed MCP3008 CH0 low, mid and high conversion,
monotonicity and agreement with the target ADC. This is direct physical
evidence for the functional concept and concurrent two-ADC comparison.

V1 used a 100 nF through-hole filter capacitor and through-hole resistor. Rev A
deliberately changes the filter to 10 kOhm and 1 uF in SMD 0603 packages to
reduce PWM ripple. V1 therefore proves function but not the Rev-A time
constant, package implementation, routing fabric, three isolation headers or
PCB analogue performance.

Primary retained V1 evidence:

- `tests/Results/analog_block2/Initial_runs.md`
- `tests/Results/spi_block4/Initial_runs.md`
- `tests/repl/analog_block2/`
- `tests/repl/spi_block4/`

#### Implemented functional flow and isolation

```text
TI_ANALOG_PWM_OUT -- TP201 -- JP201 -- R201 10 kOhm --+-- ANALOG_FB -- TP202
                                                       |
                                                       +-- C201 1 uF -- TI_GND
                                                       +-- J201.1 external stimulus
                                                       +-- JP202 -- TP203 -- TI_ANALOG_ADC_IN
                                                       +-- JP203 -- TP204 -- U401.1 MCP3008 CH0
                                                                            +-- J401.1 breakout
J201.2 --------------------------------------------------------------- TI_GND -- TP205
```

All three shunts are fitted for normal operation. Removing `JP201` disconnects
the target PWM source before an external 0 V to 3.3 V stimulus is applied at
`J201`. `JP202` and `JP203` independently disconnect the target ADC and
MCP3008 CH0 branches. The saved corrected hierarchy places `U401.1`, `J401.1`
and `TP204` together on the ADC side of `JP203`; removing that shunt therefore
isolates the complete MCP3008 CH0 branch rather than only its diagnostic point.

The Target Interface configuration remains subject to the accepted routing
rules: `RP01` selects `TI_ANALOG_ADC_IN` and `RP14` selects
`TI_ANALOG_PWM_OUT`. Firmware shall disable the source before route or shunt
changes and shall not connect an external source until `JP201` is open.

#### Electrical review and calculations

The selected 10 kOhm and 1 uF values give a nominal time constant of 10 ms and
a -3 dB corner of approximately 15.9 Hz. Five time constants are 50 ms; the
standard 150 ms test delay is 15 nominal time constants. At the provisional
5 kHz PWM frequency, the nominal worst ripple near 50% duty is approximately
16.5 mV peak-to-peak. Component tolerance, MLCC DC bias, target output
resistance, TMUX1511 resistance and PCB parasitics remain included in the
completed-board measurements rather than being treated as guaranteed by this
ideal calculation.

Microchip's MCP3008 data sheet shows a 20 pF sample/hold capacitor and warns
that a non-low-impedance source can cause conversion error. In this circuit,
`C201` is the local charge reservoir on `ANALOG_FB`, while `R201` determines the
slower duty-cycle settling. The 1 uF nominal reservoir is many orders of
magnitude larger than the MCP3008 sampling capacitor, supporting the selected
functional sample strategy. The data sheet also requires the SPI conversion
to complete quickly enough to prevent stored charge decay and recommends
analogue/digital separation and local bypass placement; those SPI timing and
layout checks remain owned jointly by TB04 and the PCB stage.

The external stimulus limit is 0 V to 3.3 V relative to `TI_GND`. It must not
exceed the safe range of either selected target ADC or the 3.3 V-powered
MCP3008. The external equipment and harness must share ground. This connector
does not provide overvoltage protection, so its voltage limit and the required
open `JP201` state must be clear on the silkscreen.

#### Manufacturer source and application review

- Microchip's current
  [MCP3004/MCP3008 data sheet](https://ww1.microchip.com/downloads/aemDocuments/documents/MSLD/ProductDocuments/DataSheets/MCP3004-MCP3008-Data-Sheet-DS20001295.pdf)
  supports the CH0 sampling analysis, SPI timing requirement, input filtering,
  local bypass and analogue-layout actions above.
- Microchip
  [AN688, Layout Tips for 12-Bit A/D Converter Application](https://www.microchip.com/en-us/application-notes/an688),
  is conservative guidance for this 10-bit design. Keep the RC node and
  analogue return compact, keep SPI clock and other fast digital traces away
  from it, avoid routing digital signals underneath the ADC or its bypass, and
  preserve a low-impedance common ground implementation.
- Other product-linked MCP3008 application notes concern particular sensors or
  higher-order signal-conditioning designs. They do not change this low-rate,
  target-generated functional stimulus circuit. The device data sheet and
  AN688 provide the applicable implementation consequences.

#### Exact components and package mapping

| References | Selected part | Package and KiCad footprint | Review result |
|---|---|---|---|
| `R201` | Yageo [`RC0603FR-0710KL`](https://www.yageogroup.com/component-documentation/download/specsheet/RC0603FR-0710KL), 10 kOhm, 1%, 0.1 W, 100 ppm/degC | 0603/1608; `Resistor_SMD:R_0603_1608Metric` | Accepted Rev-A SMD filter resistor. Manufacturer dimensions are 1.6 mm x 0.8 mm and are compatible with the standard KiCad 0603 footprint. Exact MPN metadata is present. |
| `C201` | TDK [`C1608X7R1C105K080AC`](https://product.tdk.com/en/search/capacitor/ceramic/mlcc/info?part_no=C1608X7R1C105K080AC), 1 uF, 10%, 16 V, X7R | 0603/1608; `Capacitor_SMD:C_0603_1608Metric` | Accepted Rev-A SMD filter capacitor. The 16 V rating gives useful DC-bias headroom at 3.3 V; manufacturer dimensions and recommended reflow lands are compatible with the KiCad footprint. Exact MPN metadata is present. |
| `JP201`–`JP203`, `J201` | Würth Elektronik [`61300211121`](https://www.we-online.com/components/products/datasheet/61300211121.pdf), two-position straight 2.54 mm header | THT; `Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical` | Accepted user-operated isolation and stimulus headers. The 1.0 mm KiCad drills lie within the 1.10 +/-0.15 mm recommendation; pitch and numbering agree. Exact MPN metadata is present. |
| One fitted shunt per `JP201`–`JP203` | Würth Elektronik [`60900213421`](https://www.we-online.com/components/products/datasheet/60900213421.pdf), 2.54 mm jumper with test point | Removable accessory fitted over each isolation header | Accepted normal-state shunt, recorded as `SHUNT_MPN` on each owning header and hand fitted after manufacture. `J201` does not receive a shunt. |
| `TP201`–`TP205` | Würth Elektronik `61300111121` | THT single pin; `Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical` | Accepted by board-wide decision `INT02`; DNP records hand fitting rather than absence from the completed board. |

`U401` and `J401` remain TB04 component selections. Their CH0 pin mappings
are nevertheless checked here because they form the far side of the TB02
isolation boundary.

#### Verification state

| Evidence | Result |
|---|---|
| Requirements and functional review | Accepted circuit approach; the corrected MCP3008 isolation topology implements the existing architecture without changing it. |
| V1 prototype evidence | Accepted for the 10 kOhm filtered-PWM function and concurrent target/MCP3008 ADC comparison; not used as Rev-A package or 1 uF performance proof. |
| Connectivity contract | `verification/contracts/TB02-analogue-pwm-feedback.yaml` passes 38 checks: 19 pin/net, 11 component-value and 8 forbidden-direct-path assertions. The complete seven-contract baseline passes all 626 checks. |
| Package review | Accepted `R201`, `C201`, three isolation headers, three shunts, stimulus header and existing board-wide test-pin selection. |
| Full-hierarchy ERC | Accepted root report dated 2026-08-13: zero errors and zero warnings. |
| Visual schematic review | Accepted focused image linked above. It shows the complete Block 2 path, all three isolation boundaries, stimulus precautions, filter values and the MCP3008 CH0/`J401.1` cross-block endpoint. |
| PCB synchronization | Accepted. The current PCB contains exactly one each of `R201`, `C201`, `J201`, `JP201`–`JP203` and `TP201`–`TP205`. `JP201` now carries the accepted PWM-source description, value, MPN and shunt metadata. The isolation pad nets are correct: `JP201` separates `TI_ANALOG_PWM_OUT` from `Net-(JP201-B)`, `JP202` separates `ANALOG_FB` from `TI_ANALOG_ADC_IN`, and `JP203` separates `ANALOG_FB` from `MCP3008_CH0`. Final physical placement and routing remain PCB-stage work. |

#### Open issues and accepted exceptions

- At PCB layout, place `C201` at the `ANALOG_FB` branch point with a short
  ground return, keep the complete analogue node compact, and keep SPI clock
  and other fast digital routing away from it.
- Clearly mark `J201` as `0–3V3`, signal and ground, and mark all three shunts'
  normal fitted state and isolation function on the silkscreen.
- Measure settling time, PWM ripple, target/MCP3008 agreement and external
  stimulus behaviour on the completed Rev-A board.
- TB04 shall resolve the manufacturer recommendation for 1 uF local MCP3008
  bypassing against the currently specified `C401` 100 nF before TB04
  acceptance. This cross-block action does not alter the accepted TB02 filter.

No TB02 exception is accepted at this stage.

## 5. System integration review

Use this section for checks that cross circuit-block ownership. Do not repeat
calculations or verification already recorded in the owning block.

| Interface or mode | Governing contract | Implemented by | Status |
|---|---|---|---|
| Target Interface | Target Interface contract | `TI01` | Draft |
| Rack Control/backplane | Standard Control Services | `BP01` | Draft |
| Supervisor | Standard Control Services | `PC01`, `PC02` | Draft |
| Standalone | Standard Control Services | `PC01`, `PC02` | Draft |
| Standalone external | Standard Control Services | `PC01`, `PC02` | Draft |
| Off/safe state | Standard Control Services | `PC01`, `PC02`, `RC01`, `RC02` | Draft |

The final integration review shall trace every power source, ground, connector,
control signal and operating mode across the complete hierarchy. It shall
also challenge startup, shutdown, missing-supply, partial-power and incorrect-
mode cases.

### 5.1 Accepted integration decisions

This table records accepted decisions that cross circuit-block ownership.
Their circuit implementation and release evidence remain subject to the owning
block review.

| ID | Decision | Implementation contract | Status |
|---|---|---|---|
| `INT01` | Use one MCP23017 for each Rack Control Endpoint | Port A owns six control outputs; Port B observes `TARGET_POWER_FAULT_N`, `TARGET_POWER_ALERT_N`, `SUP_EVENT_IN` and the latched `LOW_RANGE_OK_N`; `INTB` is the sole active-low open-drain `RACK_INT_N` source. Fault and alert events are host-only; `SUP_EVENT_OUT` changes only on an explicit Supervisor operation. The exact allocation is defined by Standard Control Services Section 8.3. | Accepted; schematic implementation complete and full-hierarchy ERC clean; firmware and release verification pending |
| `INT02` | Use one consistent fitted diagnostic test-point part across Rev A | All 38 `TP` references use Würth Elektronik `61300111121`, a one-position vertical 2.54 mm through-hole header pin, with `Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical`. Scope is Routing Control `TP601`–`TP614` and Standard Test Blocks `TP101`–`TP104`, `TP201`–`TP205`, `TP301`–`TP306`, `TP401`–`TP402`, `TP501`–`TP505` and `TP901`–`TP902`. Keep each part in the overall KiCad BOM with exact `MPN = 61300111121`. Mark each DNP so AISLER excludes it from its assembly stage, then hand-fit it after manufacture. For `INT02` only, DNP records an assembly-stage boundary rather than absence from the completed Rev-A board. This retains the accepted individual 2.54 mm header-pin architecture and common compatibility with probes, hooks, clips and female jumper leads. | Accepted policy, package mapping and MPN metadata; hierarchy-wide DNP application, PCB metadata and final accessibility review pending |

### 5.2 Open integration gaps

No cross-block schematic integration gap is currently recorded.
`LOW_RANGE_OK_N` is connected from PC02 to Rack Control `U1201.GPB3`, the
`SYS01` contract records that cross-block path, and the refreshed full
hierarchy passes ERC. Firmware verification remains a release check. Other
block-local issues and release checks remain in their owning analyses.

The clean first-pass ERC is an integration checkpoint, not the final accepted
release ERC. The release checklist remains unchecked until the block reviews,
connectivity contracts, packaging review and final cold review are complete.

## 6. Manufacturing release checks and decision

### PCB implementation action register

This register is the single handover point for PCB-stage work. It collects
physical implementation actions from the reviewed circuit blocks and governing
Rev-A specifications; it does not replace those sources or create new design
requirements. Add an action when a block review identifies a PCB dependency,
and close it only with the evidence named below.

| ID | Source | PCB action | Completion evidence | Status |
|---|---|---|---|---|
| `PCB-GEN-01` | Prototype Strategy Sections 5 and 10 | Hold the harness height at 100 mm, extend only its length if more area is required, and preserve the backplane datum, mounting-hole positions and mechanically fixed connector locations. | Dimensioned board drawing, KiCad measurements and printed 1:1 review | Open |
| `PCB-GEN-02` | Prototype Strategy Section 4 | Begin with the accepted two-layer preference, preserve a materially continuous ground reference, and change to four layers if placement or routing demonstrates one of the documented two-layer failure conditions. | Reviewed stack-up decision plus ground-plane and critical-route inspection | Open |
| `PCB-GEN-03` | Prototype Strategy Sections 3 and 7 | Keep isolation links, selectors, test points, removable modules and diagnostic access usable with the target fitted; retain clear pin-1, polarity and mode markings. | 3D review, printed 1:1 review and access checklist | Open |
| `PCB-PC01-01` | PC01 open issues | Place `C1001`–`C1004` at their owning devices and use short, wide VIN, VOUT and ground paths. Assess connector-side bulk capacitance after the complete load and source path are known. | Placement inspection, routed-copper review and recorded capacitance decision | Open |
| `PCB-PC01-02` | PC01 open issues | Provide accessible measurement points for `TI_TARGET_3V3`, `EXT_3V3`, `ROUTING_LOGIC_3V3`, `TEST_BLOCK_3V3`, `MUX_MODE` and `MUX_PR1`. | PCB inspection and probe-access review | Open |
| `PCB-PC02-01` | PC02 and TPS2559-Q1 data sheet | Connect U1101 PowerPAD pad 11 to `TI_GND` with short, wide copper and nearby ground vias. Keep vias out of the paste-covered pad unless AISLER accepts a changed via-in-pad process. | Routed-layout inspection, thermal/ground review and AISLER DFM confirmation | Open |
| `PCB-PC02-02` | PC02 measurement design | Use the accepted project-local footprints for `R1101` and `R1102`; take separate Kelvin sense traces directly from the corresponding shunt pads to each monitor IN+/IN− pair, away from load-current copper and noisy switching routes. | Pad-level net inspection, routed Kelvin-pair review and PCB DRC | Open |
| `PCB-PC02-03` | PC02 voltage-drop budget | Size and review the complete 1.5 A path so PCB, Target Interface, backplane and connector resistance remains within the provisional combined 26 mΩ allocation. | KiCad conductor calculation, connector/contact calculation and completed-layout path review | Open |
| `PCB-PC02-04` | PC02 transient and accuracy budgets | Keep power-monitor decoupling local, minimize low-current leakage and thermal-gradient error around the 1 Ω path, and determine the required local `EXT_5V` bulk capacitance from the completed target-load estimate. | Placement review, leakage/thermal review and recorded transient calculation | Open |
| `PCB-RC01-01` | RC01 TMUX1511 data sheet and application review | Place each `C601`–`C605` 100 nF capacitor at its owning switch VDD/GND pins with short, low-inductance connections. | Placement inspection and routed power/ground review | Open |
| `PCB-RC01-02` | RC01 shared-node capacitance and simultaneous-use review | Keep route-entry and switch-to-endpoint paths short over a materially continuous ground reference. Separate the analogue route from SPI clock and control edges, and review the complete PCB, connector and daughter-board capacitance against the recorded 10 pF, 14 pF and 18 pF switch contributions. | Routed-layout inspection, complete path-capacitance record and signal-integrity review | Open |
| `PCB-RC01-03` | RC01 powered-off protection review | Control ringing and overshoot so target-facing switch pins remain within the 3.6 V powered-off limit, then measure leakage and resulting unpowered-rail voltage for every supported target/routing power sequence. | Oscilloscope captures, leakage measurements and partial-power acceptance record | Open |
| `PCB-RC01-04` | RC01 analogue and SPI concurrency review | Provide practical access to the representative route, endpoint and enable observation points and compare analogue accuracy/noise with SPI idle and active. Establish route-settling and first-ADC-sample handling from the measurements. | Probe-access inspection and retained analogue/SPI prototype results | Open |
| `PCB-RC01-05` | RC01 redundant-resistor cleanup | Update the PCB from the accepted root schematic so obsolete footprints `R603`, `R608`, `R13`, `R18`, `R23` and `R25` are removed without disturbing the 19 functional pull-downs or direct TMUX ground connections. | PCB component inspection, refreshed BOM and PCB DRC | Open |
| `PCB-RC02-01` | RC02 TPS3808 data-sheet review | After the schematic correction, place each 4.7 nF SENSE bypass directly between its owning `U607`–`U609.SENSE` pin and `TI_GND`. Keep `C607`–`C609` as separate 100 nF VDD bypasses placed at the corresponding VDD/GND pins; place `C606`, `C610` and `C611` locally at their owning TMUX1511 and MCP23017 supplies. | Placement inspection and routed power, SENSE and ground review | Open |
| `PCB-RC02-02` | RC02 I2C pull-up and TMUX1511 application review | Keep the fixed-I2C paths short over a materially continuous ground reference and record total PCB, connector, endpoint and enabled-switch capacitance. Verify the 2.35 kΩ and approximately 1.57 kΩ effective pull-up cases against the selected bus rate. | Completed capacitance/rise-time calculation, routed-layout inspection and oscilloscope captures for every permitted isolation state | Open |
| `PCB-RC02-03` | RC02 supervisor output-margin and indeterminate-state review | Keep each TPS3808 RESET connection short and referenced to the same local ground as the controlled device. Measure RESET/enable, `ROUTE_CLEAR_N`, monitored rail and `ROUTING_LOGIC_3V3` during cold start, slow ramp, brownout and power-down; confirm no false TMUX1511 enable or premature MCP23017 reset release and retain the asserted-low margin evidence. | Layout inspection and retained multi-channel rail/reset oscilloscope captures including the worst measured `VOL` | Open |
| `PCB-TB01-01` | TB01 isolation and diagnostic review | PCB metadata synchronization is complete. During real placement, keep `JP101/JP102` and `TP101`–`TP104` where both shunts can be changed and every test pin can be probed with the target fitted. Mark pair A/B, OUT/IN and the normal fitted-shunt state clearly on silkscreen. | Placement, 3D and printed 1:1 access review | Open |
| `PCB-TB01-02` | TB01 signal and fault review | Keep each output-resistor-header-input path short and keep pairs A and B visually and electrically distinct. Review the complete routed and daughter-board loading, then measure representative static, edge, pulse and shift behaviour through the selected routes. | Routed-path inspection, PCB DRC and retained prototype waveforms/results | Open |
| `PCB-IF-01` | Target Interface Contract and Prototype Strategy | Verify Target Interface and backplane connector position, orientation, pin 1, keying, current paths and mechanical engagement using the actual mating parts. | 3D model, printed 1:1 check and physical mating-part review | Open |
| `PCB-PANEL-01` | Prototype Strategy Section 6 | Implement the harness/daughter-board breakaway geometry, Breakaway Links and local trace neck-down rules without vias or layer changes in the bridges. | Panel drawing, PCB DRC and AISLER manufacturing review | Open |
| `PCB-REL-01` | Prototype Strategy Section 9 | Complete final PCB DRC, 3D and printed 1:1 reviews, silkscreen/polarity review, AISLER rendering/orientation review and BOM Assign before release. | Accepted reports, review record and final AISLER project/quote | Open |

Rows for Routing Control, Standard Test Blocks, Rack Control and the remaining
interfaces shall be added as their block reviews reach the same maturity as
PC01 and PC02. PCB work may start before then, but manufacturing release
remains blocked until the register and release checklist are complete.

### Accepted ERC and DRC exclusions

No exclusion is accepted without a specific explanation.

| Check | Location | Justification | Approved |
|---|---|---|---|
| None recorded | — | — | — |

### Release checklist

- [ ] All applicable requirements map to implemented circuit blocks.
- [ ] Every circuit block is `Verified`.
- [ ] Every high-risk block has an accepted logic/state or electrical-limit analysis.
- [ ] Every key design issue has a recorded disposition and verification result.
- [ ] No unresolved major design issue remains.
- [x] Full-hierarchy ERC is accepted.
- [x] Connectivity contract passes.
- [ ] All IC and connector package/pin mappings are checked.
- [ ] BOM matches the intended fitted and DNP configuration.
- [ ] PCB DRC is accepted.
- [ ] Mechanical dimensions and connector placements are checked.
- [ ] AISLER BOM groups match the intended references, values and footprints.
- [ ] AISLER assignments/exclusions match the approved component tables.
- [ ] Deterministic KiCad-to-AISLER BOM reconciliation passes with no
      unassigned, unreviewed, mismatched or unexpected references.
- [ ] Final AISLER part availability and quoted assembly cost are accepted.
- [ ] Rev-A first-power and bring-up procedure is prepared.
- [ ] Open issues and accepted exceptions are recorded.
- [ ] Baseline Git commit is recorded above.
- [ ] Manufacturing release decision is approved.

### Release decision

**Current decision:** Not approved for manufacture.

Before approval, perform a final cold review from the governing requirements,
this baseline, the complete schematic, the contracts, PCB, BOM and AISLER
upload. Do not rely on the original drafting discussion as evidence. Record
the accepted Git commit and decision in Section 1.

## Appendix A — Rev-A circuit design and verification method

### A.1 Purpose

The process exists to maximise the chance that the first manufactured Rev-A
board works without building separate circuit prototypes. It must establish
two things:

1. the selected circuit should meet its requirements and behave safely
2. KiCad and the manufactured board implement that reviewed circuit

Retain information only when it supports one of those conclusions or provides
necessary traceability.

### A.2 Block review cycle

#### A.2.1 Define the required behaviour

Record the block's inputs, outputs, power and ground domains, operating modes,
safe state and electrical limits. Link the governing requirement rather than
repeating it.

#### A.2.2 Prove the circuit approach

Explain how the selected circuit provides the required behaviour. Logic,
switching and sequencing blocks require a concise truth or state table.
Analogue and power blocks require the applicable threshold, polarity,
startup, shutdown, partial-power, back-power, voltage-drop, dissipation,
accuracy and datasheet-support checks.

For every principal device, review the current manufacturer product page,
data sheet and every product-linked application note, application brief or
design guide before accepting the circuit approach. Record the documents that
affect this use and their implementation consequences. Group documents that
do not apply and state why they were excluded; a long bibliography without an
engineering conclusion is not evidence. Application material guides the
design, while guaranteed limits and pin behaviour come from the current data
sheet. Repeat this source screen when a principal device changes.

Any finding that conflicts with a required operating mode, safety property or
interface contract shall be recorded prominently in the block's **Key design
issues** subsection. Record its severity, affected requirement, evidence,
resolution or blocking status, and verification impact. Do not bury such a
finding in implementation detail, a component table or a general open-issues
list. A major unresolved issue keeps the block in `Draft` and blocks
manufacturing release.

Use simulation only where it resolves a material uncertainty.

#### A.2.3 Implement and visually review

Draft the bounded circuit in the workbench or production sheet, then inspect
it interactively in KiCad. Correct placement, grid alignment, symbol
orientation, labels and visible wiring. Save one readable accepted screenshot
under `implementation/review-images/`. The screenshot records the circuit
reviewed; it is not connectivity authority.

#### A.2.4 Check parts and physical implementation

For every IC, connector and critical passive:

- select an exact orderable part
- confirm its electrical and package limits
- check symbol pin numbers against the data sheet
- check footprint pads and dimensions against the package drawing
- confirm symbol-to-footprint mapping
- record whether AISLER should assign, exclude or leave the part for hand
  fitting

Ordinary passives may follow an agreed package policy. Shunts, precision,
high-current and unusual parts require individual checks.

Use the following KiCad symbol-field policy:

- `Value` records the functional component identity or nominal value. It is not
  the definitive purchasing field.
- `MPN` records an approved exact, orderable manufacturer part number.
- `AISLER_MPN` records an approved AISLER Smart Match specification when the
  manufacturer part is intentionally left open but its required
  characteristics are controlled.
- `SHUNT_MPN` records one required removable shunt fitted to the owning header.
  It is an accessory field rather than a substitute for that header's `MPN`;
  the deterministic BOM shall expand one shunt for each populated field.
- A fitted assembly component shall normally use either `MPN` or `AISLER_MPN`,
  not both. Explain any deliberate exception in its block component table.
- A required fitted component may not reach release with both fields blank.
  Record DNP, excluded and hand-fitted dispositions explicitly instead.

By default, DNP means that a component is absent from the completed board. A
recorded staged-assembly decision may define a narrower meaning. `INT02` is the
Rev-A exception: its test points are DNP for the AISLER assembly stage but are
mandatory hand-fitted parts on the completed board. They retain their exact MPN
and remain in the overall KiCad BOM.

Use the block component table as the engineering reference during AISLER BOM
Assign. For each presented group:

1. confirm that AISLER has grouped the intended references and interpreted the
   KiCad value/comment and footprint correctly
2. select the approved exact MPN, or an alternative that meets the recorded
   requirements
3. use the presented data-sheet link to recheck package, pinout and critical
   electrical characteristics
4. record the accepted MPN and assignment/exclusion state in this baseline

Live stock and unit price remain in the AISLER project or quote. Record them
here only when cost or availability causes a design or part-selection change.

#### A.2.5 Create the independent connectivity contract

Author one compact YAML contract from the accepted circuit analysis, not by
copying the KiCad netlist. Add it to the manifest only when it contains real
reviewed intent.

Record only assertions the checker can evaluate:

- important component pin to expected net
- operationally significant value or fitted/DNP state
- critical connector contact to net
- forbidden direct connection
- exact net membership where an unexpected member would be dangerous

Explanations, status, evidence and open issues remain in this baseline.

#### A.2.6 Verify the KiCad implementation

Run ERC and export the netlist from the root production schematic. Run the
[specified connectivity checker](ReusableHarnessRevA_ConnectivityChecker.md)
against the complete contract set and resolve every mismatch. A material
circuit or contract change returns the block to `Draft`.

Use these block states:

- `Draft`: design or evidence incomplete
- `Reviewed`: circuit behaviour and implementation accepted; deterministic
  checks not all accepted
- `Verified`: behaviour, parts, visual review, ERC and connectivity checks
  accepted

Manufacturing release is a board-level decision, not a fourth block state.

### A.3 System and release review

After all blocks are verified:

1. Trace every power source, ground, connector, control signal and operating
   mode across the complete hierarchy.
2. Challenge startup, shutdown, missing-supply, partial-power and incorrect-
   mode cases.
3. Complete BOM, footprint, PCB DRC and mechanical checks.
4. Upload the production PCB to AISLER and complete BOM Assign against the
   approved component tables. Confirm the final part selection, exclusions
   and quoted assembly cost.
5. Perform a cold review from the requirements, baseline and production
   artifacts without relying on the drafting discussion.
6. Record the accepted Git commit and manufacturing decision in this
   baseline.

### A.4 Connectivity checker behaviour

The detailed requirements, design, invocation, outputs and scope limits of the
tool required by this baseline are defined in the
[Rev-A Connectivity Checker specification](ReusableHarnessRevA_ConnectivityChecker.md).
The summary below records the acceptance intent within the Rev-A process.

The checker shall:

1. read the manifest and every referenced substantive contract
2. reject missing files, duplicate IDs and contradictory definitions
3. read the raw full-hierarchy KiCad netlist
4. produce a sorted, path-free normalized connectivity model
5. report missing required connections, forbidden connections, unexpected
   critical-net membership and contract entries that cannot be resolved
6. return a failing result for every unresolved mismatch
7. produce the deterministic connectivity report retained as release evidence

Each mismatch shall be classified as:

- a schematic defect, requiring a KiCad correction
- a contract defect, requiring renewed requirements or datasheet review
- an unresolved design decision, which keeps the block in `Draft`

After correction, regenerate the full-hierarchy netlist and run the complete
contract again so that a local fix cannot introduce a cross-block regression.

A checker pass means that the production schematic matches the independently
reviewed connectivity contract for the recorded scope. It does not prove
analogue performance, component suitability, package mapping, PCB layout or
complete system behaviour.

At release, the manifest, substantive contracts, KiCad sources and generated
evidence are frozen by the Git commit recorded in this baseline.

### A.5 Circuit-block record template

Create one subsection per block under Section 4. Keep it concise and refer to
the governing specification rather than repeating it. In Section 4, use a
level-three heading for the block and level-four headings for its internal
analysis.

#### XX00 — Circuit name

**Purpose and requirements:** TBD
**Source schematic:** TBD
**Visual review:** TBD
**Risk:** Standard/High
**Status:** Draft

##### Interfaces and domains

| Type | Signals or rails | Function |
|---|---|---|
| TBD | TBD | TBD |

##### Key design issues

Record each material requirement conflict and its disposition. State `None`
only after the operating modes, safe states, partial-power cases and principal
device data sheets have been reviewed.

##### Selected implementation

- Circuit approach: TBD
- Principal devices: TBD

##### Operating logic and safe states

Add the applicable truth/state table and startup, shutdown, unpowered or
partial-power conclusions. For a simple passive block, state the normal and
isolated configurations instead.

##### Key calculations and limits

TBD.

##### Components and packaging

| References | Manufacturer | Exact orderable part | Package | KiCad symbol | KiCad footprint | Datasheet/revision | Pin/pad mapping | AISLER assignment |
|---|---|---|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | Pending | Pending |

Ordinary passives may be covered by an agreed package policy. ICs, connectors,
unusual passives and safety-critical components require an individual record.

##### Verification

| Check | Evidence | Result |
|---|---|---|
| Requirements inspection | Governing specification | Pending |
| Behaviour and safe-state analysis | Logic/state table or electrical analysis | Pending |
| Datasheet and pin functions | Datasheet reference | Pending |
| Connectivity contract | Normalized connectivity report | Pending |
| Full-hierarchy ERC | ERC report | Pending |
| Symbol-to-footprint pin mapping | Library/footprint inspection | Pending |
| Visual schematic review | Review image | Pending |

##### Open issues and accepted exceptions

TBD.

### A.6 Visual review images

Store one current accepted PNG for each circuit block, using the block ID and a
short lower-case description:

```text
PC01-operating-mode-and-3v3-rail.png
PC02-target-5v-switch-and-two-range-monitor.png
RC01-routing-fabric.png
TB03-i2c-functional-device.png
```

Replace the image under the same name after a material change; Git preserves
the earlier version. Intermediate screenshots need not be retained unless they
record an important defect or decision.

A review image should show the circuit title, references, values, pin numbers,
net labels, support components, notes and the complete circuit boundary at a
readable scale. It is visual review evidence, not the source of connectivity.

### A.7 Verification artifact names

Production evidence is always generated from the root schematic and uses:

```text
Espruino_Harness_RevA_FullHierarchy.net
Espruino_Harness_RevA_FullHierarchy_ERC.rpt
```

Workbench-only diagnostics use:

```text
draft_workbench_Working.net
draft_workbench_Working_ERC.rpt
```

Do not name a full-hierarchy export after an individual sheet. Sheet-only
checks are working diagnostics and are not baseline evidence.

Raw KiCad netlists are placed under `verification/generated/`. They are not
tracked because they contain volatile timestamps and checkout-specific paths.
The normalized, path-free connectivity report and other accepted release
evidence are tracked under `verification/baseline/`. This document records the
manufacturing decision; no second manually maintained summary is required.

### A.8 BOM and assembly-assignment reconciliation

Final manufacturing release shall include a per-reference comparison between
the BOM defined by the KiCad hierarchy and the component assignments presented
by AISLER. This is a release-stage check and does not block acceptance of an
individual circuit block while the remaining schematic is still under
development.

The KiCad BOM is the authoritative statement of design intent. Generate it
deterministically from the root schematic with, at minimum, reference,
quantity, value, footprint, DNP state, exact `MPN` and `AISLER_MPN` Smart Match
requirements. The overall BOM shall include DNP rows; do not use an export mode
that removes them. `Value` and footprint provide supporting identity checks but
do not override either sourcing field.

Capture the corresponding AISLER assignment data from the live BOM page:

1. open the browser developer tools and select **Network** and **Fetch/XHR**
2. reload the BOM page and locate the `bom.json` request
3. use **Copy response**, not **Copy as cURL**
4. save the response as dated JSON
5. after all assignments are confirmed, print the complete grouped BOM page to
   PDF as human-readable evidence

Use these release-evidence names:

```text
YYYY-MM-DD-AISLER-BOM-confirmed.json
YYYY-MM-DD-AISLER-BOM-confirmed.pdf
```

A working capture taken before final confirmation may instead use
`YYYY-MM-DD-AISLER-BOM-assigned.json`. Do not retain a saved AISLER HTML page:
it contains no embedded BOM rows and may contain session-related metadata.

Normalize the JSON to a naturally sorted, one-row-per-reference representation
before comparison. Omit volatile AISLER identifiers, prices and timestamps from
the comparison keys. Retain the dated raw JSON and PDF as source evidence.

The reconciliation shall verify:

1. every assembly reference occurs exactly once in both sources
2. each exact KiCad `MPN` directly matches the AISLER-assigned physical-part
   manufacturer part number
3. each KiCad `AISLER_MPN` requirement is represented by AISLER's parsed Smart
   Match value, tolerance, voltage, dielectric, power rating and package
   parameters, as applicable
4. KiCad DNP and BOM-exclusion states agree with the AISLER state, including
   every staged hand-assembly exception recorded by this baseline
5. every hand-fitted test point under `INT02` retains exact
   `MPN = 61300111121` in the overall KiCad BOM, is DNP and excluded from AISLER
   assembly, and is classified `HAND_FIT` rather than absent
6. no required assembler-fitted component is unassigned or awaiting assignment
   review
7. no footprint mismatch or unexpected component assignment remains

The structured comparison provides deterministic coverage. The PDF records
what the AISLER interface displayed at the release point. Neither artifact
replaces the KiCad schematic as the source of component requirements.
