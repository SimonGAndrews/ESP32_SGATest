# Espruino Harness V2 Rev A

This is the fresh KiCad 9 project for the V2 Rev-A engineering-validation
harness.

The schematic deliberately uses three pages:

1. `Espruino_Harness_RevA.kicad_sch` — the main A2 system page containing
   power, Rack Control, target control, routing control, routing fabric and the
   Target Interface.
2. `standard_test_blocks.kicad_sch` — one A2 page containing all accepted
   Standard Test Blocks as clearly labelled circuit sections.
3. `prototype_daughter_board.kicad_sch` — one A3 page containing the flexible
   wire-wrap daughter-board implementation.

The main page is the visual integration view. Keep important supply, control,
routing and Target Interface relationships visible there. Diagnostic links,
isolation components and test points remain beside the circuits that own them.

## Draft workbench

`draft_workbench.kicad_sch` is an A3 standalone schematic for candidate
circuits and alternative implementations. It uses the project-local libraries
but is deliberately not referenced by the production hierarchy.

The workbench is therefore absent from production hierarchy exports, ERC,
netlists and BOMs. Validate it independently while drafting. When a circuit is
accepted:

1. copy it into its production-sheet location
2. check and, where necessary, re-annotate its references
3. inspect copied labels, power symbols and no-connect markers
4. run ERC and export the netlist from the production root schematic
5. compare the resulting connections with the governing specification

Do not treat the presence of a circuit on the workbench as design acceptance.

Use the project-local libraries described in `LIBRARY_PROVENANCE.md`. Bring
assets across from the exploratory project only after individual review.
