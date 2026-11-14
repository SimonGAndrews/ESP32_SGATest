# ESP32 IDF5 Consolidation POC Transformer

`idf5_consolidation_transformer.py` is the analysis-only transformer used for
Section 7.3 of the accepted ESP32 IDF5 backend consolidation POC specification.

It scans the complete tracked Espruino checkout, parses complete C/header
preprocessor groups, evaluates only the reviewed `ESP_IDF_VERSION_MAJOR` guard
forms for major version 5, and writes a deterministic Markdown transformation
plan. It deliberately has no application mode and never writes to the Espruino
repository.

`apply_idf5_consolidation.py` is the separately gated Section 7.4 application
tool. It requires the accepted plan and its SHA-256, reruns the analysis, and
refuses to write unless the reproduced plan is byte-for-byte identical. It
then applies the recorded decisions, verifies the resulting file set and
remaining occurrences, and captures the complete source diff and application
audit.

The fixed branch and baseline commit must be supplied with `--expected-branch`
and `--expected-commit`. The tool also refuses to run unless the Espruino
worktree is clean and verifies its Git status again after analysis.

The retained Section 7.3 invocation and output are recorded in:

```text
docs/investigations/pre_idf5_retirement/ESP_IDF5_consolidation_POC_Dry_Run_Plan.md
```

Focused fail-closed and conditional-chain tests can be run from this directory
with:

```bash
python3 -m unittest -v
```
