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
- Accepted part: Vishay `BAT54C-E3-08`.
- Datasheet:
  <https://www.vishay.com/docs/86410/bat54_bat54a_bat54c_bat54s.pdf>.
- Validation: pin 1 `A1`, pin 2 `A2`, pin 3 shared `K`, common-cathode
  topology and SOT-23 package checked against the Vishay data sheet. The
  standard KiCad TO-236/SOT-23 footprint pad order and pin-1 marker agree.

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

### `DMN2024UQ-7`

- Purpose: exact logic-level N-channel MOSFET fitted as `Q1001` to pull down
  the TPS2116 `PR1` input when an external operating mode is selected.
- Source: project-local adaptation of the standard KiCad NMOS graphic.
- Pin convention: pin 1 gate, pin 2 source, pin 3 drain.
- Package: `Package_TO_SOT_SMD:SOT-23`.
- Datasheet:
  [`3168380-DMN2024UQ.pdf`](../../../../docs/design/V2Harness/implementation/DataSheets/3168380-DMN2024UQ.pdf).
- Validation: exact pin mapping and SOT-23 package checked against the Diodes
  Incorporated data sheet. The standard KiCad TO-236/SOT-23 footprint pad
  order and pin-1 marker agree.

### `TPS2116DRL_POWER_MUX`

- Purpose: selects either target-provided or external 3.3 V for the Rev-A
  Routing Logic supply rail.
- Source: project-local copy of the KiCad 9
  `Power_Management:TPS2116DRL` symbol.
- Package: `Package_TO_SOT_SMD:SOT-583-8`.
- Datasheet:
  <https://www.ti.com/lit/ds/symlink/tps2116.pdf>.
- Validation: pins 1–8 and control functions checked against the TI data
  sheet. Hidden duplicate VOUT pin 7 is stacked with pin 2, and both PCB pads
  use `ROUTING_LOGIC_3V3`. The standard KiCad footprint pad dimensions,
  0.50 mm pitch, row spacing and pin-1 marker agree with TI DRL0008A.

### `TPS22917DBV_LOAD_SWITCH`

- Purpose: switches and discharges the Standard Test Block 3.3 V supply rail.
- Source: project-local adaptation of the KiCad 9
  `Power_Management:TPS22917DBV` symbol.
- Package: `Package_TO_SOT_SMD:SOT-23-6`.
- Datasheet:
  <https://www.ti.com/lit/ds/symlink/tps22917.pdf>.
- Validation: pins 1–6, pad order, pin-1 marker and DBV package checked against
  the Texas Instruments data sheet. The standard KiCad IPC-7351 footprint is
  accepted as a compatible alternate to TI DBV0006A. QOD is typed passive
  because the accepted circuit deliberately connects it to VOUT to enable
  output discharge.

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

### Target 5 V switching and measurement symbols and footprints

- `TPS2559Q1_TARGET_POWER_SWITCH`: adjustable current-limited target-power
  switch with soft start, short-circuit response, thermal protection,
  disabled-state reverse-current blocking and active-low fault indication.
  Accepted part: TI `TPS2559QWDRCRQ1`. Package: DRC0010K, 10-pin 3 mm by
  3 mm VSON with exposed PowerPAD. The project-local
  `TPS2559Q1_DRC0010K_VSON10_EP` footprint implements the manufacturer land
  dimensions, pad 11, an 81% segmented paste opening and the intrinsic pin-1
  orientation. Datasheet:
  <https://www.ti.com/lit/ds/symlink/tps2559-q1.pdf>.
- `TXU0101_RANGE_DRIVER`: partial-power-safe 3.3 V-to-5 V range driver.
  Accepted part: TI `TXU0101DBVR`. Package:
  `Package_TO_SOT_SMD:SOT-23-6`. Pins 1–6, pad order, 0.95 mm pitch and
  pin-1 orientation agree with TI DBV0006A. Datasheet:
  <https://www.ti.com/lit/ds/symlink/txu0101.pdf>.
- `INA226_HIGH_RANGE`: normal-range current, voltage and power monitor at
  address `0x40`. Accepted part: TI `INA226AIDGSR`. Package:
  `Package_SO:VSSOP-10_3x3mm_P0.5mm`. Pins 1–10, pad order, 0.50 mm pitch,
  body dimensions and pin-1 orientation agree with TI DGS. Datasheet:
  <https://www.ti.com/lit/ds/symlink/ina226.pdf>.
- `INA228_LOW_RANGE`: lower-offset low-current monitor at address `0x41`.
  Accepted part: TI `INA228AIDGSR`. Package:
  `Package_SO:VSSOP-10_3x3mm_P0.5mm`. Pins 1–10 use the same accepted TI DGS
  package mapping. Datasheet:
  <https://www.ti.com/lit/ds/symlink/ina228.pdf>.
- `AO3401A_LOW_RANGE_BYPASS`: P-channel MOSFET that normally bypasses the
  1 ohm low-range shunt. Accepted part: AOS `AO3401A`. Package:
  `Package_TO_SOT_SMD:SOT-23`. Pin 1 gate, pin 2 source and pin 3 drain agree
  with the standard KiCad TO-236/SOT-23 pad order and pin-1 marker. Datasheet:
  <https://www.aosmd.com/res/data_sheets/AO3401A.pdf>.
- `74LVC2G08_POWER_CONTROL`: dual AND gate qualifying the Supervisor target
  switch command and low-range request. Accepted part: TI `SN74LVC2G08DCUR`.
  Package: `Package_SO:VSSOP-8_2.3x2mm_P0.5mm`. Pins 1–8, pad order,
  0.50 mm pitch, body dimensions and pin-1 orientation agree with TI DCU.
  Datasheet: <https://www.ti.com/lit/ds/symlink/sn74lvc2g08.pdf>.
- `R_Shunt_Yageo_PE2512_CurrentSense`: two-terminal manufacturer-derived land
  pattern for `PE2512FKF7W0R05L`. Pads are 1.65 mm by 3.68 mm with the
  documented 4.06 mm inner gap. Separate Kelvin traces shall leave directly
  from the inner pad edges. Datasheet:
  <https://yageogroup.com/content/Resource%20Library/Datasheet/PYU-PE_521_ROHS_L.pdf>.
- `R_Shunt_Bourns_CHP2512_CurrentSense`: two-terminal manufacturer-derived
  land pattern for `CHP2512-FX-1R00ELF`. Pads are 2.45 mm by 3.70 mm with a
  7.60 mm overall land span. Separate Kelvin traces and the specified
  full-load copper area remain PCB-layout requirements. Datasheet:
  <https://www.bourns.com/docs/product-datasheets/chp.pdf>.
- Source: the INA226 geometry was adapted from the KiCad 9 standard symbol;
  the remaining symbols were created in the project-local library from the
  cited manufacturers' pin tables. Standard KiCad IPC/JEDEC footprints are
  used where listed; the PowerPAD and shunt footprints are project-local.
- Validation: manufacturer pin tables and package drawings, local symbol pin
  numbers, footprint pad numbers, the root netlist and current PCB pad nets
  agree. The PC02 engineering package review is complete. AISLER assignments,
  PCB placement/rotation, Kelvin routing, power/thermal copper and final
  assembly rendering remain release controls.

### `Operating_Mode_2x04`

- Purpose: four-row shunt selector for Supervisor, Standalone External,
  Standalone and Off operating modes.
- Source: project-local copy of the KiCad 9
  `Connector_Generic:Conn_02x04_Odd_Even` symbol.
- Package:
  `Connector_PinHeader_2.54mm:PinHeader_2x04_P2.54mm_Vertical`.
- Validation: odd/even pin numbering and the assigned standard KiCad 9
  footprint were checked against the accepted Power Control Service draft.

### Adafruit microSD Card BFF 5683

- Purpose: fixed, flat, underside-mounted microSD storage extension for Test
  Block 4. The module is hand-fitted after PCB assembly and is excluded from
  AISLER placement; the removable item is the microSD card, not the module.
- Accepted product: Adafruit `5683`; UK supplier reference `ADA5683`.
- Symbol: project-local `Adafruit_MicroSD_BFF_5683`. Its six electrical pins
  are SCK, MISO, MOSI, 3V3, GND and CS_TX. CS_TX represents the module's
  factory-closed TX-to-CS solder-jumper selection. The RX, A0 and A1
  alternatives remain open, and +5V is not connected.
- Footprint: project-local `Adafruit_MicroSD_BFF_5683_Underside`. The
  17.78 mm by 20.701 mm outline, two seven-position 2.54 mm castellated rows,
  row coordinates and signal identities were derived from Adafruit's
  published revision-B Eagle board file. Six lands are numbered electrical
  pads and the other eight are unnumbered mechanical solder lands. The
  2.5 mm by 1.8 mm host-land dimensions are a project implementation choice,
  not a manufacturer land-pattern recommendation.
- Assembly treatment: the footprint deliberately has copper and mask openings
  but no paste apertures. All 14 lands are intended for distributed manual
  soldering after AISLER assembly. Place the footprint on the PCB back with
  its `CARD ACCESS` edge at the harness-card top edge.
- Sources: Adafruit technical guide
  <https://learn.adafruit.com/adafruit-microsd-card-bff> and official design
  repository <https://github.com/adafruit/Adafruit-microSD-Card-BFF-PCB>.
  The published Adafruit design files identify the source as CC BY-SA 2.5.
- Validation still required: compare a physical ADA5683 module against a
  1:1 footprint print before PCB release, then verify underside orientation,
  card insertion/removal clearance, soldering access and neighbouring top-edge
  connector clearance in the assembled PCB model.

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
