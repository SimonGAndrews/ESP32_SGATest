# ESP32 IDF5 Backend Consolidation POC Preflight Evidence

Date: 13 November 2026

## Conclusion

The specification preflight completed successfully. The Espruino POC branch
`poc/esp32-idf5-consolidation` was created from the recorded upstream baseline
with a clean worktree and no contribution from the unrelated ping branch.

The fixed POC baseline is:

```text
2f0bc6bc293dede9458ef9d2b23ce76807f6bc94
```

The next permitted stage is the Section 7.3 transformer dry run. Its plan must
be presented to Simon and explicitly accepted before source transformation is
applied.

## Repository verification

Firmware repository:

```text
/home/simon/MaBecker/Espruino_master
```

The `upstream` and `origin` remote references were fetched with pruning before
branch creation. The following references were then identical:

| Reference | Commit |
|---|---|
| local `master` | `2f0bc6bc293dede9458ef9d2b23ce76807f6bc94` |
| `origin/master` | `2f0bc6bc293dede9458ef9d2b23ce76807f6bc94` |
| `upstream/master` | `2f0bc6bc293dede9458ef9d2b23ce76807f6bc94` |

Local `master` had zero divergence from both remote-tracking references.

The POC branch was created directly from local `master` and verified as:

```text
branch:     poc/esp32-idf5-consolidation
HEAD:       2f0bc6bc293dede9458ef9d2b23ce76807f6bc94
divergence: 0 ahead, 0 behind master
worktree:   clean
```

The unrelated branch `fix/esp32-ping-hardening` remains at:

```text
538afc29947372373edd062f41bbe3080990336d
```

That branch head is not an ancestor of the POC branch head. The POC branch has
not been pushed to Simon's fork.

## SDK and compiler provenance

The baseline `scripts/provision.sh` IDF5 route selects ESP-IDF tag `v5.5.3`.
The installed SDK checkout is clean and was verified as:

```text
path:    /home/simon/MaBecker/Espruino_master/esp-idf-5/esp-idf
tag:     v5.5.3
commit:  2c211b236707889e8400c4dc5644dd5c4ee071e0
```

Sourcing that SDK's `export.sh` selected these compilers:

```text
Xtensa path:    /home/simon/.espressif/tools/xtensa-esp-elf/esp-14.2.0_20251107/xtensa-esp-elf/bin/xtensa-esp32-elf-gcc
Xtensa version: xtensa-esp-elf-gcc (crosstool-NG esp-14.2.0_20251107) 14.2.0

RISC-V path:    /home/simon/.espressif/tools/riscv32-esp-elf/esp-14.2.0_20251107/riscv32-esp-elf/bin/riscv32-esp-elf-gcc
RISC-V version: riscv32-esp-elf-gcc (crosstool-NG esp-14.2.0_20251107) 14.2.0
```

## Appendix status

The final baseline is unchanged from the commit audited in Appendix 1 of the
accepted specification. The guard inventory therefore does not require
regeneration at this stage.
