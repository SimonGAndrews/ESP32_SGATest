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
