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

- `U1101` — TPS2559-Q1 exposed-PowerPAD package
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
| PC01 | Operating mode and 3.3 V rail | High | `power_control.kicad_sch` | Standard Control Services | TBD | Draft |
| PC02 | Target 5 V switch and two-range monitor | High | `power_control.kicad_sch` | Standard Control Services | [PNG](review-images/PC02-target-5v-switch-and-two-range-monitor.png) | Draft |
| RC01 | Routing Fabric | High | `routing_control.kicad_sch` | Controlled routing | TBD | Draft |
| RC02 | Routing controllers and fixed I2C isolation | High | `routing_control.kicad_sch` | Controlled routing | TBD | Draft |
| TB01 | Digital GPIO loopback | Standard | `standard_test_blocks.kicad_sch` | Standard Test Blocks | TBD | Draft |
| TB02 | Analogue/PWM feedback | Standard | `standard_test_blocks.kicad_sch` | Standard Test Blocks | TBD | Draft |
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
**Visual review:** Pending
[`PC01-operating-mode-and-3v3-rail.png`](review-images/PC01-operating-mode-and-3v3-rail.png).
**Risk:** High
**Status:** Draft; functional topology, exported connectivity, Test Block
inrush implementation, discrete control margins and selected BAT54C/MOSFET
metadata are synchronized and reviewed. Exact orderable principal ICs are
selected. Passive selection, package evidence, the visual-review capture and
physical Rev-A measurement still block PC01 verification.

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
| `U1001` | Texas Instruments | [TPS2116DRLR](https://www.ti.com/product/TPS2116/part-details/TPS2116DRLR) | SOT-5X3 (DRL), 8 pin | `Package_TO_SOT_SMD:SOT-583-8` | [TPS2116](https://www.ti.com/lit/ds/symlink/tps2116.pdf), Rev A | Data-sheet pins 1–8 and KiCad pads 1–8 reviewed; final land-pattern/orientation check pending | Exact active-production MPN selected; assign and confirm AISLER availability |
| `U1002` | Texas Instruments | [TPS22917DBVR](https://www.ti.com/product/TPS22917/part-details/TPS22917DBVR) | SOT-23 (DBV), 6 pin | `Package_TO_SOT_SMD:SOT-23-6` | [TPS22917](https://www.ti.com/lit/ds/symlink/tps22917.pdf), Rev B | Data-sheet pins 1–6 and KiCad pads 1–6 reviewed; final land-pattern/orientation check pending | Exact active-production MPN selected; assign and confirm AISLER availability |
| `D1001`–`D1005` | Vishay | BAT54C-E3-08 | SOT-23 | `Package_TO_SOT_SMD:SOT-23` | [BAT54C-E3-08](https://www.vishay.com/docs/86410/bat54_bat54a_bat54c_bat54s.pdf) | Common-cathode pin mapping reviewed; footprint pad inspection pending | Accepted exact MPN and KiCad instance metadata synchronized; assign in AISLER |
| `Q1001` | Diodes Incorporated | DMN2024UQ-7 | SOT-23 | `Package_TO_SOT_SMD:SOT-23` | [DMN2024UQ](DataSheets/3168380-DMN2024UQ.pdf) | Pin 1 gate, pin 2 source, pin 3 drain; footprint pad inspection pending | Accepted exact MPN and KiCad value synchronized; assign in AISLER |
| `R1001`, `R1003`, `R1004`, `R1009` | TBD | 100 kΩ, standard passive policy | 0603 | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Connectivity reviewed | Grouped assignment pending |
| `R1002` | TBD | 10 kΩ, standard passive policy | 0603 | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Connectivity reviewed | Assignment pending |
| `C1001`–`C1004` | TBD | 1 µF, voltage rating and dielectric pending | 0603 | `Capacitor_SMD:C_0603_1608Metric` | Standard policy | Connectivity reviewed | Grouped assignment pending |
| `C1005` | TBD | 2.2 nF, C0G/NP0, ±10% or better, at least 10 V | 0603 | `Capacitor_SMD:C_0603_1608Metric` | [TPS22917](https://www.ti.com/lit/ds/symlink/tps22917.pdf) | `U1002.CT` to `U1002.VIN`; connectivity reviewed | Assign exact approved part; pending |

#### Verification

| Check | Evidence | Result |
|---|---|---|
| Requirements inspection | Standard Control Services 3.1–3.3 and Appendix C.2 | Mode truth table and source ownership agree |
| Behaviour and safe-state analysis | Truth table, unpowered-state review, control-margin, maximum-drop/thermal and inrush calculations above | Functional topology and principal-device implementation supported; physical measurement pending |
| Manufacturer source screen | Product-linked documents summarized above | Complete for current principal-device choices |
| Connectivity contract | `verification/contracts/PC01-operating-mode-and-3v3-rail.yaml` and root netlist | All pin/net, component-value and forbidden-connection assertions pass against the refreshed full-hierarchy netlist dated 2026-08-07 |
| Full-hierarchy ERC | KiCad 9 report dated 2026-08-07 after exact-part metadata synchronization | Zero errors and zero warnings; release rerun pending |
| Symbol-to-footprint mapping | Manufacturer pin tables, full-hierarchy netlist and installed KiCad footprints | Principal IC pin functions and footprint pad numbering agree; final land-pattern dimensions and PCB orientation review pending |
| Visual schematic review | `review-images/PC01-operating-mode-and-3v3-rail.png` | Pending capture of the current reviewed circuit |

#### Open issues and accepted exceptions

- Perform the defined Rev-A inrush measurements with both permitted sources
  and the 50 µF maximum load.
- During PCB review, place `C1001`–`C1004` close to their devices and use short,
  wide VIN/VOUT/GND paths. Confirm that the backplane and target sources tolerate
  the specified load step or add connector-side bulk capacitance.
- Confirm accessible Rev-A measurement points for `TI_TARGET_3V3`, `EXT_3V3`,
  `ROUTING_LOGIC_3V3`, `TEST_BLOCK_3V3`, `MUX_MODE` and `MUX_PR1`. The unused
  TPS2116 `ST` output may remain unconnected because it is not a requirement.
- Complete the final land-pattern dimension/orientation review and AISLER
  assignments. Principal IC pin functions and footprint pad numbering have
  been checked against the manufacturer pin tables.
- Capture the PC01 visual review image after the accepted exact parts are
  synchronized into the schematic.

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
**Status:** Draft; topology, exported connectivity, principal-device sources,
control behaviour, exact shunt selection and the analytical electrical
budgets are reviewed. PCB implementation, sourcing and physical Rev-A
verification remain pending.

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
| Normal-range shunt dissipation | 1.5 A² × 50 mΩ | 112.5 mW; exact shunt package and thermal margin remain open |
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
surface within the manufacturer's 105°C full-load limit. Both parts still
require a project-local Kelvin footprint and AISLER availability
confirmation.

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
| `U1102` | Texas Instruments | TXU0101DBVR | DBV, SOT-23-6 | Project-local `TXU0101_RANGE_DRIVER` | `Package_TO_SOT_SMD:SOT-23-6` | [TXU0101](https://www.ti.com/lit/ds/symlink/txu0101.pdf), SCES940A, Rev A | Data-sheet pins 1–6 and KiCad pads 1–6 reviewed; final land-pattern/orientation check pending | Assign and confirm AISLER availability; pending |
| `U1103` | Texas Instruments | [INA226AIDGSR](https://www.ti.com/product/INA226/part-details/INA226AIDGSR) | DGS, VSSOP-10 | Project-local `INA226_HIGH_RANGE` | `Package_SO:VSSOP-10_3x3mm_P0.5mm` | [INA226](https://www.ti.com/lit/ds/symlink/ina226.pdf), SBOS547B, Rev B | Data-sheet pins 1–10 and KiCad pads 1–10 reviewed; final land-pattern/orientation check pending | Exact active-production MPN selected and visible in AISLER matching; final assignment pending |
| `U1104` | Texas Instruments | [INA228AIDGSR](https://www.ti.com/product/INA228/part-details/INA228AIDGSR) | DGS, VSSOP-10 | Project-local `INA228_LOW_RANGE` | `Package_SO:VSSOP-10_3x3mm_P0.5mm` | [INA228](https://www.ti.com/lit/ds/symlink/ina228.pdf), SLYS021A, Rev A | Data-sheet pins 1–10 and KiCad pads 1–10 reviewed; final land-pattern/orientation check pending | Exact active-production MPN selected and visible in AISLER matching; final assignment pending |
| `U1105` | Texas Instruments | [SN74LVC2G08DCUR](https://www.ti.com/product/SN74LVC2G08/part-details/SN74LVC2G08DCUR) | DCU, VSSOP-8 | Project-local `74LVC2G08_POWER_INTERLOCK` | `Package_SO:VSSOP-8_2.3x2mm_P0.5mm` | [SN74LVC2G08](https://www.ti.com/lit/ds/symlink/sn74lvc2g08.pdf), Rev N | Data-sheet pins 1–8 and KiCad pads 1–8 reviewed; final land-pattern/orientation check pending | Exact active-production MPN selected; confirm AISLER availability and assign |
| `Q1101` | Alpha & Omega Semiconductor | AO3401A | SOT-23 | Project-local `AO3401A_LOW_RANGE_BYPASS` | `Package_TO_SOT_SMD:SOT-23` | [AO3401A](https://www.aosmd.com/res/data_sheets/AO3401A.pdf), Rev 3.1 | Symbol pins reviewed; footprint pads pending | Assign and confirm AISLER availability; pending |
| `R1101` | Yageo | PE2512FKF7W0R05L; 50 mΩ, 1%, 100 ppm/°C, 2 W | 2512 | Standard resistor | Project-local `R_Shunt_Yageo_PE2512_CurrentSense` | [Yageo part specification](https://www.yageogroup.com/component-documentation/download/specsheet/PE2512FKF7W0R05L) | Two-terminal symbol maps to pads 1 and 2. The current root netlist confirms pad 1 on `HIGH_SHUNT_P` and pad 2 on `HIGH_SHUNT_N`; the assigned footprint was inspected in the PCB editor. Final packaging review remains pending. | Accepted exact candidate; AISLER assignment pending |
| `R1102` | Bourns | CHP2512-FX-1R00ELF; 1 Ω, 1%, 100 ppm/°C, 3 W, RoHS | 2512 | Standard resistor | Project-local `R_Shunt_Bourns_CHP2512_CurrentSense` | [Bourns CHP data sheet](https://www.bourns.com/docs/product-datasheets/chp.pdf) | Two-terminal symbol maps to pads 1 and 2. The current root netlist confirms pad 1 on `HIGH_SHUNT_N` and pad 2 on `TI_SWITCHED_TARGET_5V`; the assigned footprint was inspected in the PCB editor. Final packaging and full-load copper-area reviews remain pending. | Accepted exact candidate; AISLER assignment pending |
| `R1103`, `R1104`, `R1106`, `R1107` | TBD | 100 kΩ; standard passive policy | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Pending | Assign as one grouped 100 kΩ part; pending |
| `R1105`, `R1108` | TBD | 10 kΩ; standard passive policy | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Pending | Assign as one grouped 10 kΩ part; pending |
| `R1110` | TBD | 100 kΩ `TARGET_SWITCH_EN` safe-state pull-down | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Connectivity reviewed | Assign in the grouped 100 kΩ AISLER part selection; pending |
| `R1111` | TBD | 66.5 kΩ 1% `U1101` current-limit programming resistor | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | TPS2559-Q1 current-limit programming | Pending | Assign exact approved part; pending |
| `C1101` | TBD | 1 µF; standard passive policy | 0603 | Standard capacitor | `Capacitor_SMD:C_0603_1608Metric` | Standard policy | Pending | Assign; pending |
| `C1102`–`C1107` | TBD | 100 nF; standard passive policy | 0603 | Standard capacitor | `Capacitor_SMD:C_0603_1608Metric` | Standard policy | Pending | Assign as one grouped 100 nF part; pending |

#### Verification

| Check | Evidence | Result |
|---|---|---|
| Requirements inspection | Standard Control Services 3.5, 3.5.1 and Appendix C.3 | Topology covers the required switching and two measurement ranges |
| Behaviour and safe-state analysis | Operating table, unpowered-state review and current schematic | Logic recorded and required `TARGET_SWITCH_EN` pull-down implemented as `R1110` |
| Manufacturer source screen and pin functions | Product pages, data sheets and applicable application documents summarized above | Pin functions and I2C addresses reviewed; TXU0101 closes the range-driver partial-power blocker, low-range alert integration is implemented, and exact shunt candidates support the analytical accuracy budget |
| Connectivity contract | `verification/contracts/PC02-target-5v-switch-and-two-range-monitor.yaml`, `verification/contracts/SYS01-power-events-to-rack-control.yaml` and root netlist | PC02 shunt values and block assertions are synchronized to the current full-hierarchy netlist. `SYS01` asserts that `U1104.Alert`, `U1105.2B` and `U1201.GPB3` share `LOW_RANGE_OK_N`; the complete checker/release run remains pending. |
| Full-hierarchy ERC | `ERC.rpt`, root export dated 2026-08-08 | Complete hierarchy passes with zero errors and zero warnings; final release rerun remains pending |
| Symbol-to-footprint pin mapping | Manufacturer pin tables, full-hierarchy netlist, project-local and installed KiCad footprints | U1101–U1105 pin functions and footprint pad numbering agree. KiCad parses and renders the U1101 project-local footprint; PCB-editor inspection confirmed its top-view orientation, perimeter pad order and exposed pad 11 on `TI_GND`. R1101 and R1102 values, metadata and project-local footprints are assigned and visible in the current netlist; their final packaging review remains pending. |
| Visual schematic review | `review-images/PC02-target-5v-switch-and-two-range-monitor.png` | Existing image must be refreshed after the completed TPS2559-Q1 implementation |
| Electrical limits | Calculations above | Protection topology and analytical component-path voltage-drop, dissipation and accuracy budgets are supported; PCB/contact resistance, inrush and physical accuracy remain release measurements |

#### Open issues and accepted exceptions

- Confirm the TPS2559-Q1 no-via-in-pad assembly choice with AISLER during PCB
  review and place short, wide PowerPAD-to-ground copper with nearby ground
  vias. The project-local DRC0010K footprint and its top-view orientation,
  symbol mapping, 66.5 kΩ `ILIM` resistor, `TARGET_SWITCH_EN` pull-down,
  `TARGET_POWER_FAULT_N` and PC02 connectivity contract are implemented.
  Refresh the review image after the completed schematic changes; retain a
  final release ERC run after all remaining edits.
- Synchronize the selected exact IC MPNs into the KiCad BOM metadata and
  complete their AISLER assignments. TPS2559-Q1 and SN74LVC2G08 availability
  in AISLER remains to be confirmed; the selected INA226 and INA228 variants
  were visible in the AISLER matching results.
- Complete the deliberately deferred packaging review and AISLER availability
  check for the accepted R1101 and R1102 shunts. Their 1% schematic values,
  exact-part metadata and project-local 2512 footprints are synchronized and
  visible in the current root netlist. Pad-level Kelvin routing remains a PCB
  implementation action.
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
| Off/safe state | Standard Control Services | `PC01`, `PC02`, `RC01` | Draft |

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
- [ ] Full-hierarchy ERC is accepted.
- [ ] Connectivity contract passes.
- [ ] All IC and connector package/pin mappings are checked.
- [ ] BOM matches the intended fitted and DNP configuration.
- [ ] PCB DRC is accepted.
- [ ] Mechanical dimensions and connector placements are checked.
- [ ] AISLER BOM groups match the intended references, values and footprints.
- [ ] AISLER assignments/exclusions match the approved component tables.
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
connectivity checker against the complete contract set and resolve every
mismatch. A material circuit or contract change returns the block to `Draft`.

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
