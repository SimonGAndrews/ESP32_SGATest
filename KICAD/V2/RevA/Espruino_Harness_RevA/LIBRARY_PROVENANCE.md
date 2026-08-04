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

### Target 5 V switching and measurement symbols

- `TPS2559Q1_TARGET_POWER_SWITCH` (pending): adjustable current-limited target
  power switch with soft start, short-circuit response, thermal protection,
  disabled-state reverse-current blocking and active-low fault indication.
  Package: 10-pin 3 mm by 3 mm DRC VSON/SON with exposed PowerPAD; the
  project-local footprint and pad mapping remain to be created and checked.
  Datasheet: <https://www.ti.com/lit/ds/symlink/tps2559-q1.pdf>.
- `INA226_HIGH_RANGE`: normal-range current, voltage and power monitor at
  address `0x40`. Package: `Package_SO:VSSOP-10_3x3mm_P0.5mm`. Datasheet:
  <https://www.ti.com/lit/ds/symlink/ina226.pdf>.
- `INA228_LOW_RANGE`: lower-offset low-current monitor at address `0x41`.
  Package: `Package_SO:VSSOP-10_3x3mm_P0.5mm`. Datasheet:
  <https://www.ti.com/lit/ds/symlink/ina228.pdf>.
- `AO3401A_LOW_RANGE_BYPASS`: P-channel MOSFET that normally bypasses the
  1 ohm low-range shunt. Package: `Package_TO_SOT_SMD:SOT-23`. Datasheet:
  <https://www.aosmd.com/res/data_sheets/AO3401A.pdf>.
- `74LVC2G08_POWER_CONTROL`: dual AND gate qualifying the Supervisor target
  switch command and low-range request. Package:
  `Package_SO:VSSOP-8_2.3x2mm_P0.5mm`. Datasheet:
  <https://www.ti.com/lit/ds/symlink/sn74lvc2g08.pdf>.
- `74AHCT1G125_RANGE_DRIVER`: 5 V gate driver for the P-channel bypass.
  Package: `Package_TO_SOT_SMD:SOT-23-5`. Datasheet:
  <https://www.ti.com/lit/ds/symlink/sn74ahct1g125.pdf>.
- Source: the INA226 geometry was adapted from the KiCad 9 standard symbol;
  the remaining symbols were created in the project-local library from the
  cited manufacturers' pin tables.
- Validation: pin numbers, supply pins, monitor address straps and exported
  Rev-A net connectivity were checked when the two-range target-power block
  was added. Exact AISLER availability and the complete-path voltage-drop
  budget remain implementation checks before manufacture.

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
