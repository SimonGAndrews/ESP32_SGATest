# Rev-A Library Provenance

The Rev-A project uses one project-local symbol library and one project-local
footprint library:

- `Espruino_Harness_RevA.kicad_sym`
- `Espruino_Harness_RevA.pretty/`

Both are referenced through `${KIPRJMOD}`. Do not register the ignored
`KICAD/V2/upstream/` checkouts as production libraries.

Copy or create an asset only when it is required by an accepted Rev-A circuit.
Record its source, licence, package, datasheet and validation here before
manufacture.

## Symbols

### Standard KiCad symbols used by Routing Control

- `Power_Supervisor:TPS3808DBV` represents the three
  `TPS3808G30DBVR` rail-valid supervisors used by the initial
  `routing_control.kicad_sch` implementation.
- Source: the KiCad 9 standard `Power_Supervisor` symbol library.
- Package: `Package_TO_SOT_SMD:SOT-23-6`.
- Datasheet:
  <https://www.ti.com/lit/ds/symlink/tps3808.pdf>.
- Validation: symbol pin numbers, the `G30` 2.79 V threshold selection,
  open-drain reset behaviour and open-CT release delay were checked against
  the Texas Instruments data sheet when the routing-control sheet was
  scaffolded.

Standard `Device:R`, `Device:C` and `Connector:TestPoint` symbols are also
used directly. Their Rev-A instances use reviewed standard 0603 passive
footprints and explicit diagnostic test-point footprints.

### `BAT54C_AAK`

- Purpose: dual common-cathode Schottky diode used by the Rev-A Operating Mode
  decode and Test Block enable logic.
- Source: project-local adaptation of the KiCad 9
  `Device:D_Schottky_Dual_CommonCathode_AAK` geometry, retaining the compact
  box and adding the internal two-diode graphic.
- Pin convention: pin 1 `A1`, pin 2 `A2`, pin 3 shared `K`.
- Package: `Package_TO_SOT_SMD:SOT-23`.
- Datasheet:
  <https://assets.nexperia.com/documents/data-sheet/BAT54C.pdf>.
- Validation: pin numbering and common-cathode topology checked against the
  Nexperia data sheet; schematic instances retain their existing pin
  locations and connectivity.

### `NMOS_2N7002_GSD`

- Purpose: logic-level N-channel MOSFET used as the open-drain inverter that
  selects the TPS2116 `PR1` state.
- Source: project-local adaptation of the standard KiCad NMOS graphic.
- Pin convention: pin 1 gate, pin 2 source, pin 3 drain.
- Package: `Package_TO_SOT_SMD:SOT-23`.
- Datasheet:
  <https://assets.nexperia.com/documents/data-sheet/2N7002.pdf>.
- Validation: pin numbering and N-channel enhancement topology checked against
  the Nexperia data sheet; the graphic retains Q1001's existing connection
  points.

### `TPS2116DRL_POWER_MUX`

- Purpose: selects either target-provided or external 3.3 V for the Rev-A
  Routing Logic supply rail.
- Source: project-local copy of the KiCad 9
  `Power_Management:TPS2116DRL` symbol.
- Package: `Package_TO_SOT_SMD:SOT-583-8`.
- Datasheet:
  <https://www.ti.com/lit/ds/symlink/tps2116.pdf>.
- Validation: pin numbers, duplicated VOUT pins, control-pin functions and DRL
  package checked when the Power Control Service draft was reviewed. The
  standard KiCad footprint exists in the KiCad 9 installation.

### `TPS22917DBV_LOAD_SWITCH`

- Purpose: switches and discharges the Standard Test Block 3.3 V supply rail.
- Source: project-local adaptation of the KiCad 9
  `Power_Management:TPS22917DBV` symbol.
- Package: `Package_TO_SOT_SMD:SOT-23-6`.
- Datasheet:
  <https://www.ti.com/lit/ds/symlink/tps22917.pdf>.
- Validation: pin numbers and DBV package checked against the Texas Instruments
  data sheet. QOD is typed passive because the accepted circuit deliberately
  connects it to VOUT to enable output discharge.

### `C_0603` and `R_0603`

- Purpose: project-local passive symbols with the accepted Rev-A prototype
  package already assigned.
- Source: project-local copies of the KiCad 9 `Device:C` and `Device:R`
  symbols.
- Packages:
  `Capacitor_SMD:C_0603_1608Metric` and
  `Resistor_SMD:R_0603_1608Metric`.
- Validation: both standard KiCad 9 footprint files were confirmed present.
  Component values remain instance properties on the schematic.

### `Operating_Mode_2x04`

- Purpose: four-row shunt selector for Supervisor, Standalone External,
  Standalone and Off operating modes.
- Source: project-local copy of the KiCad 9
  `Connector_Generic:Conn_02x04_Odd_Even` symbol.
- Package:
  `Connector_PinHeader_2.54mm:PinHeader_2x04_P2.54mm_Vertical`.
- Validation: odd/even pin numbering and the assigned standard KiCad 9
  footprint were checked against the accepted Power Control Service draft.

### `Target_Interface_2x12_Odd_Even`

- Purpose: logical schematic representation of one 24-contact Target Interface
  connector bank.
- Source: created for this project from the accepted allocation in
  `docs/design/V2Harness/arch/TargetInterfaceContract_V2.md`.
- Pin convention: pins 1 to 24 use the standard odd/even two-row convention.
  Hidden symbol pin names identify generic contacts 01 to 24; the instance
  value and attached net labels distinguish Connector A from Connector B.
- Electrical type: all contacts are passive because the connector itself does
  not determine signal direction.
- Footprint: deliberately unassigned. The exact right-angle connector,
  manufacturer, plating and verified production footprint remain Rev-A
  sourcing decisions.
- Validation: schematic parser and exported netlist checked when first used on
  `draft_workbench.kicad_sch`.

The exploratory libraries under
`KICAD/V2/Exploration/Espruino_Harness_V2/` are review inputs. They must not be
copied wholesale or mechanically regenerated over accepted Rev-A assets.
