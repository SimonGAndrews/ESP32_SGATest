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
| Prototype daughter-board provision | `prototype_daughter_board.kicad_sch` |

The standalone `draft_workbench.kicad_sch` is not part of the production
hierarchy and cannot provide baseline evidence.

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
| EP01 | Rack Control Endpoint and direct reset/boot stages | High | Root schematic | Standard Control Services | TBD | Draft |

## 4. Circuit-block analyses

This section records the analysis and verification state of each implemented
circuit block. Each block has its own subsection and follows the template in
Appendix A.

### 4.1 PC02 — Target 5 V switch and two-range power monitor

**Purpose and requirements:** Provide Supervisor-controlled target power,
observe the delivered voltage, current and power, cover both 100 µA sleep
measurements and target loads up to 1.5 A, and remain non-loading and
reverse-isolated while ordinary USB powers the target in Standalone modes.
See Standard Control Services Sections 3.1, 3.5 and 3.5.1.
**Source schematic:** `power_control.kicad_sch`, references `U1101`–`U1105`
and associated `Q1101`, `R11xx` and `C11xx` components.
**Visual review:**
[`PC02-target-5v-switch-and-two-range-monitor.png`](review-images/PC02-target-5v-switch-and-two-range-monitor.png).
**Status:** Draft; topology and exported connectivity reviewed, release
verification pending.

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

#### Interfaces and domains

| Type | Signals or rails | Function |
|---|---|---|
| Power input | `EXT_5V` | Source for Supervisor-controlled target power and the 5 V range driver |
| Always-on control supply | `RACK_CONTROL_3V3` | Supplies both monitors and the control gates |
| Control inputs | `MODE_SUPERVISOR`, `TARGET_POWER_EN`, `TARGET_LOW_RANGE_EN` | Qualify target power and low-range selection |
| Rack Control bus | `RACK_CONTROL_SDA`, `RACK_CONTROL_SCL` | Reads the two power monitors |
| Power output | `TI_SWITCHED_TARGET_5V` | Measured and switched 5 V delivered to the Target Interface |
| Status outputs | `TARGET_POWER_ALERT_N`, `TARGET_POWER_FAULT_N` | Normal-range monitor alert and hardware switch overload/thermal fault indication to Rack Control |
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
  Its alert output qualifies `TARGET_LOW_RANGE_EN` through the second `U1105`
  gate.
- `U1102`, powered from `EXT_5V`, translates the 3.3 V range-selection result
  into the 5 V gate drive required to turn the P-channel bypass MOSFET off.
- Both monitors are powered from always-on `RACK_CONTROL_3V3` and share
  `RACK_CONTROL_SDA` and `RACK_CONTROL_SCL`. Their bus-voltage inputs observe
  `TI_SWITCHED_TARGET_5V`.
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
`LOW_RANGE_GATE_3V3` keeps `Q1101` on and bypasses the 1 Ω shunt. A high value
turns `Q1101` off and inserts `R1102`.

| Supervisor mode | Target-power request | Low-range request | `LOW_RANGE_OK_N` | Expected hardware state |
|---:|---:|---:|---:|---|
| 0 | X | X | X | `U1101` off; target 5 V not supplied |
| 1 | 0 | X | X | `U1101` off; target 5 V not supplied |
| 1 | 1 | 0 | X | Target powered through `R1101`; `R1102` bypassed |
| 1 | 1 | 1 | 0 | Target powered; low range rejected and `R1102` bypassed |
| 1 | 1 | 1 | 1 | Target powered; `R1102` inserted for low-current measurement |

`X` means that the input does not change the expected state for that row.
Firmware shall request low range only after the normal-range monitor indicates
that target current is within the permitted transition threshold. The
`U1104` alert then provides the hardware qualification represented by
`LOW_RANGE_OK_N`.

The intended uncommanded state is target power off with `R1102` bypassed:

- `MODE_SUPERVISOR`, `TARGET_POWER_EN` and `TARGET_LOW_RANGE_EN` have external
  pull-downs.
- `LOW_RANGE_GATE_3V3` and `LOW_SHUNT_BYPASS_GATE` have pull-downs, so the
  1 Ω shunt is bypassed when range control is unavailable.
- Loss of `EXT_5V` removes the target supply regardless of the logic state.

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
| Initial high-current path estimate | 21 mΩ switch + 50 mΩ shunt + 60 mΩ bypass MOSFET | 196.5 mV at 1.5 A before PCB, connector and backplane losses |
| Provisional current limit | 66.5 kΩ 1% `ILIM` resistor | Approximately 1.63 A minimum, 1.77 A nominal and 1.89 A maximum |

The path estimate uses listed maximum on-resistance values at their stated
conditions and leaves 53.5 mV of the complete 250 mV path budget. A
temperature-aware calculation using the selected orderable parts and PCB
layout is therefore required.

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

#### Components and packaging

| References | Manufacturer | Exact orderable part | Package | KiCad symbol | KiCad footprint | Datasheet/revision | Pin/pad mapping | AISLER assignment |
|---|---|---|---|---|---|---|---|---|
| `U1101` | Texas Instruments | TPS2559-Q1; exact tape-and-reel suffix pending | DRC, 10-pin 3 mm × 3 mm VSON/SON with exposed PowerPAD | Project-local `TPS2559Q1_TARGET_POWER_SWITCH` | Project-local footprint pending | [TPS2559-Q1](https://www.ti.com/lit/ds/symlink/tps2559-q1.pdf), SLVSD03 | Symbol pin mapping reviewed; exposed-pad footprint mapping pending | Confirm AISLER availability and assign; pending |
| `U1102` | Texas Instruments | TBD; SN74AHCT1G125 DBV candidate | SOT-23-5 | Project-local `74AHCT1G125_RANGE_DRIVER` | `Package_TO_SOT_SMD:SOT-23-5` | [SN74AHCT1G125](https://www.ti.com/lit/ds/symlink/sn74ahct1g125.pdf), Rev P | Symbol pins reviewed; footprint pads pending | Assign; pending |
| `U1103` | Texas Instruments | TBD; INA226 | DGS, VSSOP-10 | Project-local `INA226_HIGH_RANGE` | `Package_SO:VSSOP-10_3x3mm_P0.5mm` | [INA226](https://www.ti.com/lit/ds/symlink/ina226.pdf), SBOS547B, Rev B | Symbol pins reviewed; footprint pads pending | Assign; pending |
| `U1104` | Texas Instruments | TBD; INA228 | DGS, VSSOP-10 | Project-local `INA228_LOW_RANGE` | `Package_SO:VSSOP-10_3x3mm_P0.5mm` | [INA228](https://www.ti.com/lit/ds/symlink/ina228.pdf), SLYS021A, Rev A | Symbol pins reviewed; footprint pads pending | Assign; pending |
| `U1105` | Texas Instruments | TBD; SN74LVC2G08 DCU candidate | DCU, VSSOP-8 | Project-local `74LVC2G08_POWER_INTERLOCK` | `Package_SO:VSSOP-8_2.3x2mm_P0.5mm` | [SN74LVC2G08](https://www.ti.com/lit/ds/symlink/sn74lvc2g08.pdf), Rev N | Symbol pins reviewed; footprint pads pending | Assign; pending |
| `Q1101` | Alpha & Omega Semiconductor | AO3401A; ordering suffix TBD | SOT-23 | Project-local `AO3401A_LOW_RANGE_BYPASS` | `Package_TO_SOT_SMD:SOT-23` | [AO3401A](https://www.aosmd.com/res/data_sheets/AO3401A.pdf), Rev 3.1 | Symbol pins reviewed; footprint pads pending | Assign; pending |
| `R1101` | TBD | 50 mΩ, 0.1%, low-TCR; TBD | Current schematic: 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | TBD | Package suitability not accepted | Assign exact approved shunt; pending |
| `R1102` | TBD | 1 Ω, 0.1%, low-TCR; TBD | Current schematic: 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | TBD | Package and fault behaviour pending | Assign exact approved shunt; pending |
| `R1103`, `R1104`, `R1106`, `R1107` | TBD | 100 kΩ; standard passive policy | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Pending | Assign as one grouped 100 kΩ part; pending |
| `R1105`, `R1108` | TBD | 10 kΩ; standard passive policy | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Pending | Assign as one grouped 10 kΩ part; pending |
| `R1110` | TBD | 100 kΩ `TARGET_SWITCH_EN` safe-state pull-down | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | Standard policy | Connectivity reviewed | Assign in the grouped 100 kΩ AISLER part selection; pending |
| `R1111` | TBD | 66.5 kΩ 1% `U1101` current-limit programming resistor | 0603 | Standard resistor | `Resistor_SMD:R_0603_1608Metric` | TPS2559-Q1 current-limit programming | Pending | Assign exact approved part; pending |
| `C1101` | TBD | 1 µF; standard passive policy | 0603 | Standard capacitor | `Capacitor_SMD:C_0603_1608Metric` | Standard policy | Pending | Assign; pending |
| `C1102`–`C1106` | TBD | 100 nF; standard passive policy | 0603 | Standard capacitor | `Capacitor_SMD:C_0603_1608Metric` | Standard policy | Pending | Assign as one grouped 100 nF part; pending |

#### Verification

| Check | Evidence | Result |
|---|---|---|
| Requirements inspection | Standard Control Services 3.5, 3.5.1 and Appendix C.3 | Topology covers the required switching and two measurement ranges |
| Behaviour and safe-state analysis | Operating table, unpowered-state review and current schematic | Logic recorded and required `TARGET_SWITCH_EN` pull-down implemented as `R1110` |
| Datasheet and pin functions | Manufacturer data sheets linked from the project symbols | Functional pin connections and I2C addresses reviewed; exact MPNs pending |
| Connectivity contract | `verification/contracts/PC02-target-5v-switch-and-two-range-monitor.yaml` and root netlist | All PC02 pin-to-net assertions pass by manual comparison; automated checker pending |
| Full-hierarchy ERC | Current `ERC.rpt` and `PowerControl_ERC.rpt` | Failing on incomplete parent-sheet power, Rack Control and hierarchy integration; not acceptable as release evidence |
| Symbol-to-footprint pin mapping | Current project-local symbols and assigned footprints | Pending independent pad-number inspection |
| Visual schematic review | `review-images/PC02-target-5v-switch-and-two-range-monitor.png` | Existing image must be refreshed after the completed TPS2559-Q1 implementation |
| Electrical limits | Calculations above | Protection topology accepted; complete voltage-drop, thermal, inrush, transient and accuracy budgets remain pending |

#### Open issues and accepted exceptions

- Resolve the remaining PC02-related ERC findings through parent-sheet
  integration: external power-source representation, Rack Control I2C drive
  representation and connection of the synchronized hierarchy pins.
- Create and independently verify the TPS2559-Q1 exposed-PowerPAD footprint,
  then refresh the review image and release ERC evidence. The project-local
  symbol, 66.5 kΩ `ILIM` resistor, `TARGET_SWITCH_EN` pull-down,
  `TARGET_POWER_FAULT_N` and PC02 connectivity contract are implemented.
- Select the exact TPS2559-Q1 orderable suffix and confirm AISLER availability.
- Select `R1101` and `R1102` shunt parts. The present 0603 assignment is not
  accepted until current rating, pulse behaviour, temperature coefficient and
  Kelvin-layout suitability are verified.
- Complete the worst-case switched-path voltage-drop and thermal calculation.
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
- Define and verify the `U1104` alert threshold, polarity and software sequence
  that permits low-range selection.
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
| `INT01` | Use one MCP23017 for each Rack Control Endpoint | Port A owns six control outputs; Port B observes `TARGET_POWER_FAULT_N`, `TARGET_POWER_ALERT_N` and `SUP_EVENT_IN`; `INTB` is the sole active-low open-drain `RACK_INT_N` source. Fault and alert events are host-only; `SUP_EVENT_OUT` changes only on an explicit Supervisor operation. The exact allocation is defined by Standard Control Services Section 8.3. | Accepted; schematic implementation and verification pending |

### 5.2 Open integration gaps

No cross-block integration gap is currently recorded. Block-local issues and
release checks remain in their owning analyses.

## 6. Manufacturing release checks and decision

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
