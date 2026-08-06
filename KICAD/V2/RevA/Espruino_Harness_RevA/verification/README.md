# Rev-A Schematic Verification

This directory separates regenerated working outputs from reviewed baseline
evidence for the V2 Rev-A Reusable Harness Board.

The governing human-readable baseline is:

```text
docs/design/V2Harness/implementation/ReusableHarnessRevA_DesignBaseline.md
```

## Production exports

Always run production ERC and netlist export from the root schematic:

```text
Espruino_Harness_RevA.kicad_sch
```

Use these exact working-output names:

```text
generated/Espruino_Harness_RevA_FullHierarchy.net
generated/Espruino_Harness_RevA_FullHierarchy_ERC.rpt
```

The `generated/` directory is ignored. Raw KiCad netlists contain timestamps
and checkout-specific paths, so they are unsuitable as deterministic,
cross-platform baselines.

Workbench-only diagnostics use:

```text
generated/draft_workbench_Working.net
generated/draft_workbench_Working_ERC.rpt
```

They are not production evidence.

## Tracked baseline evidence

Reviewed evidence is stored under `baseline/`:

```text
baseline/Espruino_Harness_RevA_FullHierarchy_Connectivity.json
baseline/Espruino_Harness_RevA_FullHierarchy_ERC.rpt
baseline/Espruino_Harness_RevA_BOM.csv
```

The connectivity JSON will be a sorted, path-free representation generated
from the raw netlist. The Git commit recorded in the design baseline identifies
the exact KiCad sources from which the evidence was generated. The design
baseline records the release checklist and final manufacturing decision; a
second manually maintained summary is not required.

`ReusableHarnessRevA_Connectivity.yaml` is the contract-set manifest. It
identifies only block contracts that contain real reviewed intent:

```text
ReusableHarnessRevA_Connectivity.yaml
contracts/
  PC01-operating-mode-and-3v3-rail.yaml
  PC02-target-5v-switch-and-two-range-monitor.yaml
```

The manifest and every referenced file together form the independent
connectivity contract. They are reviewed design input, not generated from the
schematic. Planned blocks remain in the design-baseline register until their
analysis produces a substantive contract. A system contract is added only
when a reviewed rule genuinely crosses block ownership.

## Acceptance rule

An individual sheet ERC or netlist may be used while editing, but only a
full-hierarchy check can provide accepted production evidence. Every exclusion
or intentional difference must be recorded in the design baseline.
