# ESP32 IDF5 Consolidation POC Dry-run Plan

**Outcome: PASS.**
The analysis accounts for every tracked occurrence and found no unsupported or ambiguous version-dependent group. No Espruino source was modified.

This is the Section 7.3 review plan. It does not authorize or perform the Section 7.4 transformation. Simon must explicitly accept this plan before application.

## Fixed inputs and safety checks

- Espruino branch: `poc/esp32-idf5-consolidation`
- Espruino baseline and dry-run HEAD: `2f0bc6bc293dede9458ef9d2b23ce76807f6bc94`
- Complete repository scan: 3695 Git-tracked files
- Evaluated value: `ESP_IDF_VERSION_MAJOR=5` from the beginning of every source file
- Transformer version: `0.1.0-analysis-only`
- Transformer SHA-256: `8bdd928c444d1d0db797d06907d9c6aff82e298c166652352471878f03c0e3c8`
- Espruino worktree before run: `clean`
- Espruino worktree after run: `clean`
- Operating mode: analysis only; the tool contains no source-writing application mode

Exact invocation from the harness repository root:

```bash
python3 tools/experiments/esp32_idf5_consolidation/idf5_consolidation_transformer.py --repo ../Espruino_master --expected-branch poc/esp32-idf5-consolidation --expected-commit 2f0bc6bc293dede9458ef9d2b23ce76807f6bc94 --major 5 --output docs/investigations/pre_idf5_retirement/ESP_IDF5_consolidation_POC_Dry_Run_Plan.md
```

## Result summary

Here, a *conditional directive* means a C-preprocessor `#if`, `#elif` or `#ifndef` line that uses `ESP_IDF_VERSION_MAJOR` to control which source is included. A *conditional group* is the complete structure from its opening directive through any `#elif`/`#else` arms to its closing `#endif`.

| Measure | What it counts | Result |
|---|---|---:|
| Tracked occurrences of `ESP_IDF_VERSION_MAJOR` | Every occurrence in every Git-tracked file, including source guards, comments, a fallback definition and makefiles | 116 |
| Occurrences in C/header conditional directives | Uses on `#if`, `#elif` or `#ifndef` lines that participate in version selection | 110 |
| Complete C/header conditional groups containing version selection | Complete `#if` through `#endif` structures to be transformed; an `#elif` belongs to its opening group's structure | 106 |
| C/header files planned to change | Files containing at least one version-dependent conditional group | 15 |
| Groups with an unsupported version expression | Groups containing a version expression outside the forms reviewed in Appendix 1 | 0 |
| Structural or ambiguity diagnostics | Unbalanced preprocessor structures or cases where the IDF5 result cannot be determined confidently | 0 |
| Occurrences in C/header `#endif` comments | Version-macro text used only to label a closing `#endif`, not to select source | 3 |
| Occurrences in the C/header fallback definition | The inactive `#define ESP_IDF_VERSION_MAJOR 3` compatibility fallback | 1 |
| Other occurrences in C/header source | Source occurrences not classified as a condition, closing comment or fallback definition | 0 |
| Occurrences in non-source files | IDF4 and IDF5 makefile definitions, reported by the inventory but deliberately left unchanged | 2 |

The occurrence categories reconcile as 110 conditional directives, three closing comments, one fallback definition and two makefile definitions, giving the complete total of 116. The 110 conditional-directive occurrences form 106 complete groups because four are `#elif` arms within an already counted `#if`/`#endif` structure.

### Appendix 1 accounting clarification

The rescan confirms Appendix 1's total of 116 tracked occurrences and its 110 conditional directives. It refines the remaining source accounting: there are three, not four, references in `#endif` comments, plus the inactive fallback `#define ESP_IDF_VERSION_MAJOR 3` in `targets/esp32/jswrap_esp32.c`. The two makefile definitions complete the total. This is an inventory-label correction only; every occurrence is accounted for and the reviewed guard-form inventory is unchanged.

## Planned transformation totals

Local action describes how each group evaluates on its own. Effective action also accounts for a group being nested in a branch discarded by an enclosing version group.

| Action | Local groups | Effective groups |
|---|---:|---:|
| `remove-group` | 13 | 12 |
| `removed-with-enclosing-branch` | 0 | 5 |
| `simplify-guard` | 2 | 2 |
| `unwrap-selected-branch` | 91 | 87 |
| **Total groups accounted for** | **106** | **106** |

Action meanings:

- `unwrap-selected-branch`: retain the selected branch body and remove the complete version chain.
- `remove-group`: remove the complete group because no branch is selected for IDF5.
- `simplify-guard`: remove only the conclusive version term and preserve the remaining feature guard.
- `removed-with-enclosing-branch`: the group is evaluated and recorded, but its text is already removed with a discarded enclosing branch.

## Files planned to change

Only these C source/header files are in the prospective automated source change. The makefiles are inventory references and remain unchanged.

| File | Version groups | Effective action totals |
|---|---:|---|
| `libs/network/esp32/jswrap_esp32_network.c` | 43 | remove-group: 4, removed-with-enclosing-branch: 1, simplify-guard: 2, unwrap-selected-branch: 36 |
| `targets/esp32/BLE/esp32_gap_func.c` | 1 | unwrap-selected-branch: 1 |
| `targets/esp32/esp32_neopixel.c` | 9 | remove-group: 2, removed-with-enclosing-branch: 3, unwrap-selected-branch: 4 |
| `targets/esp32/jshardware.c` | 13 | unwrap-selected-branch: 13 |
| `targets/esp32/jshardwareAnalog.c` | 5 | unwrap-selected-branch: 5 |
| `targets/esp32/jshardwareI2c.c` | 1 | unwrap-selected-branch: 1 |
| `targets/esp32/jshardwarePWM.c` | 1 | unwrap-selected-branch: 1 |
| `targets/esp32/jshardwarePulse.c` | 8 | remove-group: 1, removed-with-enclosing-branch: 1, unwrap-selected-branch: 6 |
| `targets/esp32/jshardwarePulse.h` | 1 | unwrap-selected-branch: 1 |
| `targets/esp32/jshardwareSpi.c` | 3 | unwrap-selected-branch: 3 |
| `targets/esp32/jshardwareUart.c` | 7 | remove-group: 3, unwrap-selected-branch: 4 |
| `targets/esp32/jshardwareUart.h` | 1 | remove-group: 1 |
| `targets/esp32/jswrap_esp32.c` | 5 | remove-group: 1, unwrap-selected-branch: 4 |
| `targets/esp32/main.c` | 4 | unwrap-selected-branch: 4 |
| `targets/esp32/rtosutil.c` | 4 | unwrap-selected-branch: 4 |
| **Total: 15 files** | **106** | **remove-group: 12, removed-with-enclosing-branch: 5, simplify-guard: 2, unwrap-selected-branch: 87** |

## Complete conditional-group plan

### `libs/network/esp32/jswrap_esp32_network.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 26-49 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #elif `ESP_IDF_VERSION_MAJOR>=4` => true; #else | #if at line 26 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 2 | 62-65 | #if `ESP_IDF_VERSION_MAJOR>=5` => true | #if at line 62 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 4 | 97-103 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 97 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 5 | 164-167 | #if `ESP_IDF_VERSION_MAJOR>=4` => true | #if at line 164 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 6 | 242-302 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 242 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 7 | 296-298 | #if `ESP_IDF_VERSION_MAJOR>=4` => true | #if at line 296 | `unwrap-selected-branch` | `removed-with-enclosing-branch` | none |
| 9 | 321-326 | #if `ESP_IDF_VERSION_MAJOR >= 4` => true | #if at line 321 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 11 | 459-464 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 459 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 12 | 465-469 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 465 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 13 | 470-474 | #if `ESP_IDF_VERSION_MAJOR>=5` => true | #if at line 470 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 14 | 475-481 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 475 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 15 | 513-519 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 513 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 16 | 534-537 | #if `ESP_IDF_VERSION_MAJOR>=5 && CONFIG_LWIP_IPV6` => CONFIG_LWIP_IPV6 remains | #if at line 534 | `simplify-guard` | `simplify-guard` | `CONFIG_LWIP_IPV6` |
| 17 | 539-543 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 539 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 18 | 553-557 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 553 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 19 | 560-566 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 560 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 20 | 569-582 | #if `ESP_IDF_VERSION_MAJOR>=5 && CONFIG_LWIP_IPV6` => CONFIG_LWIP_IPV6 remains | #if at line 569 | `simplify-guard` | `simplify-guard` | `CONFIG_LWIP_IPV6` |
| 21 | 596-601 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 596 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 22 | 607-613 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 607 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 23 | 621-627 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 621 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 24 | 635-639 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 635 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 25 | 646-650 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 646 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 26 | 655-659 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 655 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 27 | 664-668 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 664 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 28 | 669-671 | #if `ESP_IDF_VERSION_MAJOR<5` => false | none | `remove-group` | `remove-group` | none |
| 29 | 679-687 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 679 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 30 | 692-700 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 692 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 31 | 770-772 | #if `!(ESP_IDF_VERSION_MAJOR>=4)` => false | none | `remove-group` | `remove-group` | none |
| 33 | 927-930 | #if `!(ESP_IDF_VERSION_MAJOR>=4)` => false | none | `remove-group` | `remove-group` | none |
| 35 | 1218-1229 | #if `ESP_IDF_VERSION_MAJOR>=4` => true; #else | #if at line 1218 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 36 | 1326-1329 | #if `!(ESP_IDF_VERSION_MAJOR>=4)` => false | none | `remove-group` | `remove-group` | none |
| 37 | 1462-1469 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 1462 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 39 | 1553-1558 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 1553 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 40 | 1591-1601 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 1591 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 41 | 1642-1658 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 1642 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 42 | 1667-1680 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 1667 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 43 | 1691-1763 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 1691 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 44 | 1807-1834 | #if `ESP_IDF_VERSION_MAJOR < 5` => false; #else | #else at line 1815 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 45 | 1856-1862 | #if `ESP_IDF_VERSION_MAJOR < 4` => false; #elif `ESP_IDF_VERSION_MAJOR >= 4` => true | #elif at line 1858 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 46 | 1910-1920 | #if `ESP_IDF_VERSION_MAJOR >= 4` => true | #if at line 1910 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 47 | 1948-1954 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 1948 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 48 | 2011-2018 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 2011 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 49 | 2022-2033 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 2022 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/BLE/esp32_gap_func.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 31-33 | #if `ESP_IDF_VERSION_MAJOR==5` => true | #if at line 31 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/esp32_neopixel.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 24-41 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 24 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 2 | 37-40 | #if `ESP_IDF_VERSION_MAJOR >= 4` => true; #else | #if at line 37 | `unwrap-selected-branch` | `removed-with-enclosing-branch` | none |
| 3 | 66-85 | #if `ESP_IDF_VERSION_MAJOR < 5` => false | none | `remove-group` | `remove-group` | none |
| 4 | 89-201 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true | #if at line 89 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 5 | 203-293 | #if `ESP_IDF_VERSION_MAJOR < 5` => false | none | `remove-group` | `remove-group` | none |
| 6 | 205-249 | #if `ESP_IDF_VERSION_MAJOR == 4` => false; #else | #else at line 230 | `unwrap-selected-branch` | `removed-with-enclosing-branch` | none |
| 8 | 296-337 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #elif `ESP_IDF_VERSION_MAJOR >= 4` => true; #else | #if at line 296 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 9 | 318-320 | #if `ESP_IDF_VERSION_MAJOR < 5` => false | none | `remove-group` | `removed-with-enclosing-branch` | none |
| 10 | 347-381 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #elif `ESP_IDF_VERSION_MAJOR >= 4` => true; #else | #if at line 347 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/jshardware.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 35-37 | #if `ESP_IDF_VERSION_MAJOR>=5` => true | #if at line 35 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 4 | 55-59 | #if `ESP_IDF_VERSION_MAJOR>=4` => true | #if at line 55 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 6 | 74-80 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 74 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 7 | 85-89 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 85 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 19 | 290-302 | #if `ESP_IDF_VERSION_MAJOR>=4` => true; #else | #if at line 290 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 20 | 395-399 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 395 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 21 | 401-405 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 401 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 24 | 538-547 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 538 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 32 | 788-804 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 788 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 33 | 842-846 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 842 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 34 | 849-853 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 849 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 35 | 869-873 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 869 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 36 | 913-918 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 913 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/jshardwareAnalog.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 3 | 69-81 | #if `ESP_IDF_VERSION_MAJOR>=4` => true; #else | #if at line 69 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 5 | 110-114 | #if `ESP_IDF_VERSION_MAJOR>=4` => true; #else | #if at line 110 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 6 | 116-120 | #if `ESP_IDF_VERSION_MAJOR>=4` => true; #else | #if at line 116 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 7 | 150-159 | #if `ESP_IDF_VERSION_MAJOR>=4` => true; #else | #if at line 150 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 10 | 172-179 | #if `ESP_IDF_VERSION_MAJOR>=4` => true; #else | #if at line 172 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/jshardwareI2c.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 5 | 121-123 | #if `ESP_IDF_VERSION_MAJOR >= 4` => true | #if at line 121 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/jshardwarePWM.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 67-71 | #if `ESP_IDF_VERSION_MAJOR>=4` => true; #else | #if at line 67 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/jshardwarePulse.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 22-28 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 22 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 2 | 34-38 | #if `ESP_IDF_VERSION_MAJOR < 5` => false; #else | #else at line 36 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 3 | 61-73 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 61 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 4 | 85-87 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true | #if at line 85 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 5 | 99-142 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 99 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 6 | 147-163 | #if `ESP_IDF_VERSION_MAJOR < 5` => false | none | `remove-group` | `remove-group` | none |
| 7 | 177-224 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 177 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 8 | 216-220 | #if `ESP_IDF_VERSION_MAJOR >= 4` => true; #else | #if at line 216 | `unwrap-selected-branch` | `removed-with-enclosing-branch` | none |

### `targets/esp32/jshardwarePulse.h`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 2 | 28-30 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true | #if at line 28 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/jshardwareSpi.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 37-43 | #if `ESP_IDF_VERSION_MAJOR >= 4` => true; #else | #if at line 37 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 3 | 94-98 | #if `ESP_IDF_VERSION_MAJOR >= 4` => true; #else | #if at line 94 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 5 | 250-258 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 250 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/jshardwareUart.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 3 | 41-54 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 41 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 7 | 154-161 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 154 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 8 | 167-171 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 167 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 9 | 174-176 | #if `ESP_IDF_VERSION_MAJOR<5` => false | none | `remove-group` | `remove-group` | none |
| 10 | 179-181 | #if `ESP_IDF_VERSION_MAJOR<5` => false | none | `remove-group` | `remove-group` | none |
| 13 | 217-221 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 217 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 16 | 251-259 | #if `ESP_IDF_VERSION_MAJOR < 5` => false | none | `remove-group` | `remove-group` | none |

### `targets/esp32/jshardwareUart.h`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 24-28 | #if `defined(ESPR_USE_USB_SERIAL_JTAG) && ESP_IDF_VERSION_MAJOR < 5` => false | none | `remove-group` | `remove-group` | none |

### `targets/esp32/jswrap_esp32.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 27-32 | #if `ESP_IDF_VERSION_MAJOR >= 4` => true; #else | #if at line 27 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 2 | 33-37 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 33 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 5 | 52-54 | #ifndef `ESP_IDF_VERSION_MAJOR` => false | none | `remove-group` | `remove-group` | none |
| 8 | 104-117 | #if `ESP_IDF_VERSION_MAJOR >= 4` => true; #else | #if at line 104 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 15 | 435-442 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 435 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/main.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 7-12 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 7 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 5 | 43-48 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 43 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 7 | 55-59 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 55 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 14 | 161-165 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 161 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

### `targets/esp32/rtosutil.c`

| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |
|---:|---:|---|---|---|---|---|
| 1 | 11-14 | #if `ESP_IDF_VERSION_MAJOR>=4` => true | #if at line 11 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 2 | 25-29 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 25 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 4 | 38-50 | #if `ESP_IDF_VERSION_MAJOR>=5` => true; #else | #if at line 38 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |
| 7 | 177-183 | #if `ESP_IDF_VERSION_MAJOR >= 5` => true; #else | #if at line 177 | `unwrap-selected-branch` | `unwrap-selected-branch` | none |

## Non-conditional occurrence accounting

These occurrences are outside the 110 conditional directives. They are reported explicitly so the tracked-repository scan closes over all 116 occurrences.

| File and line | Category | Planned treatment | Source text |
|---|---|---|---|
| `make/targets/ESP32_IDF4.make:38` | non-source reference | Report only; leave unchanged | `@echo "target_compile_options($$""{COMPONENT_TARGET} PUBLIC -DESP_IDF_VERSION_MAJOR=4)" >> $(CMAKEFILE)` |
| `make/targets/ESP32_IDF5.make:70` | non-source reference | Report only; leave unchanged | `@echo "target_compile_options(\$${COMPONENT_LIB} PUBLIC -DESP_IDF_VERSION_MAJOR=5)" >> $(CMAKEFILE)` |
| `targets/esp32/esp32_neopixel.c:201` | source #endif comment | Removed with its version-group closing directive | `#endif  // ESP_IDF_VERSION_MAJOR >= 5` |
| `targets/esp32/esp32_neopixel.c:249` | source #endif comment | Removed with its version-group closing directive | `#endif // ESP_IDF_VERSION_MAJOR == 4` |
| `targets/esp32/esp32_neopixel.c:293` | source #endif comment | Removed with its version-group closing directive | `#endif  // ESP_IDF_VERSION_MAJOR < 5` |
| `targets/esp32/jswrap_esp32.c:53` | source fallback definition | Removed with false group opened at line 52 | `#define ESP_IDF_VERSION_MAJOR 3` |

## Diagnostics

None. All structures were balanced and every version expression matched an accepted form.

## Approval boundary

This dry run leaves the Espruino branch at the fixed baseline with a clean worktree. The proposed application will be limited to the 15 listed C/header files and will use the exact group decisions above. No application, source diff, commit, push or pull request is authorized by this report.

Section 7.4 may begin only after Simon explicitly accepts this dry-run plan.
