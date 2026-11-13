# ESP32 IDF5 Backend Consolidation POC Specification

## 1. POC Purpose and Question

This proof of concept will determine whether the Espruino ESP32-family source can be consolidated automatically around the backend currently selected for ESP-IDF v5.5.3.

The POC will apply a controlled and repeatable transformation to an agreed upstream Espruino baseline. It will remove source branches used only by IDF3 and IDF4 while retaining:

- the source selected for IDF5;
- shared ESP32-family code;
- chip-specific distinctions;
- peripheral and feature controls; and
- existing IDF5 behaviour.

The transformation must produce an auditable source diff and firmware that can be built for the selected IDF5 targets.

The principal question is:

> Can the IDF3 and IDF4 compatibility branches be removed through a controlled automated process, while preserving the effective IDF5 source and producing buildable IDF5 firmware suitable for subsequent testing and stakeholder review?

The POC will provide technical evidence for a later stakeholder decision. It will not decide the final ESP32 source structure, legacy-build retirement policy, or transition plan for Espruino `master`.

## 2. Scope and Explicit Non-goals

### 2.1 In scope

The POC will operate on the ESP32-family integration source in an agreed upstream Espruino baseline.

It will:

- inventory source conditions that select behaviour according to the ESP-IDF version;
- develop or apply a repeatable automated transformation that evaluates those conditions for ESP-IDF v5.5.3;
- retain the source selected for IDF5 and remove alternatives used only by IDF3 or IDF4;
- preserve shared code and all remaining chip, board, capability and feature conditions;
- inspect directly related declarations, compatibility helpers and comments where removing a version branch may leave obsolete material;
- produce a complete, reviewable diff between the unchanged baseline and the transformed source;
- build the selected IDF5 board configurations from the transformed source; and
- record transformation results, build results, uncertainties and material cases requiring human judgement.

The inventory will cover the complete tracked Espruino repository rather than assuming that all relevant ESP32 integration code is under `targets/esp32/`.

Build definitions and other retained legacy infrastructure may be used as reference material, but they are not evidence that IDF3 or IDF4 remains supported by the transformed POC source.

### 2.2 Explicit non-goals

The POC will not:

- define or implement the final ESP32-family source structure for Espruino `master`;
- complete the production retirement of IDF3 or IDF4;
- remove or reorganize legacy board definitions, makefiles, provisioning paths, SDK configuration, CI jobs, release packaging or documentation;
- preserve the ability to build IDF3 or IDF4 firmware from the transformed source;
- modernize retained IDF5 drivers or replace deprecated APIs;
- fix known firmware defects or incorporate changes from unrelated pull requests;
- refactor, rename, reformat or otherwise improve source that is unrelated to the version-branch consolidation;
- qualify every ESP-IDF v5 minor release or establish compatibility with a future ESP-IDF major version;
- modify non-ESP32 platforms or shared functionality except where a strictly necessary consequence is identified and separately reviewed;
- determine the final migration, release or support policy for existing ESP32 users; or
- merge the experimental result into upstream `master`.

Targeted runtime testing may be used to evaluate the transformed firmware, but comprehensive production qualification and the final retirement plan will remain subsequent stakeholder decisions.

## 3. Baseline and Experimental Workspace

### 3.1 Repository roles

The authoritative source baseline for the POC will be the current `master` branch of:

```text
https://github.com/espruino/Espruino
```

Simon’s fork will provide the corresponding fork repository:

```text
https://github.com/SimonGAndrews/Espruino
```

The local firmware repository used for the POC will be:

```text
/home/simon/MaBecker/Espruino_master
```

The remotes in this repository are:

- `upstream` — `espruino/Espruino`
- `origin` — `SimonGAndrews/Espruino`

The local harness repository is:

```text
/home/simon/MaBecker/ESP32_SGATest
```

Its origin is:

```text
https://github.com/SimonGAndrews/ESP32_SGATest.git
```

The harness repository will continue to hold the POC specification, investigation notes, transformer tooling, audit output and retained evidence. Firmware source transformations and firmware commits will be made only in the Espruino repository. POC tooling and evidence will not be included in the Espruino draft pull request unless separately agreed.

### 3.2 Intended baseline

On 13 November 2026, the following references were verified at the same commit:

- `upstream/master`
- `origin/master`
- local `master`

The verified commit was:

```text
2f0bc6bc293dede9458ef9d2b23ce76807f6bc94
```

Commit subject:

```text
Fix util timer task being adjusted twice when inserting at front of queue
```

This is the intended POC baseline. Immediately before creating the POC branch, the remote and local references must be checked again.

If upstream `master` has advanced, the new relationship between upstream, Simon’s fork and local `master` must be reported. The exact replacement baseline must then be recorded before transformation work begins. The POC must not silently change baseline after source transformation has started.

If a replacement baseline is selected, the Appendix 1 guard inventory must be regenerated. Any new or changed guard form must be reviewed before branch creation and transformation.

### 3.3 Local-work protection and POC branch

At the time of specification drafting, the local checkout is clean but is currently on:

```text
fix/esp32-ping-hardening
```

at commit:

```text
538afc29947372373edd062f41bbe3080990336d
```

The ping branch and its commits are unrelated to the consolidation POC. They must not be incorporated, modified, rebased or otherwise disturbed by this work.

After verifying that the checkout remains clean, a new local branch will be created directly from the recorded `master` baseline:

```text
poc/esp32-idf5-consolidation
```

The branch must not be created from the currently checked-out ping branch. Local `master` must remain an unchanged reference to the selected baseline.

All generated source changes, manual corrections and POC-specific commits will be confined to the POC branch. The branch will not be pushed or used to open a pull request until the stakeholder-review workflow defined later in this specification authorizes that step.

### 3.4 SDK and toolchain provenance

The POC build environment will use the ESP-IDF version selected by the baseline Espruino `scripts/provision.sh` IDF5 path.

The currently installed environment has been identified as:

```text
ESP-IDF version: v5.5.3
ESP-IDF commit:  2c211b236707889e8400c4dc5644dd5c4ee071e0
Toolchains:      Espressif GCC 14.2.0
```

Before POC builds begin, these details must be verified from the selected checkout and actual installed tools. The recorded provenance must include:

- Espruino baseline commit;
- relevant `scripts/provision.sh` revision;
- installed ESP-IDF version and commit;
- Xtensa compiler version;
- RISC-V compiler version; and
- the board definition and build command used for each build.

An existing SDK directory must not be assumed to match the version requested by the provisioning script merely because it is named `esp-idf-5`.

### 3.5 Definition of the unchanged baseline

For this POC, the unchanged baseline means:

- the exact recorded Espruino commit;
- a clean Git worktree with no local source patches;
- the baseline board definitions and build files;
- the recorded ESP-IDF and compiler environment; and
- the same build options for any corresponding baseline-to-transformed comparison.

Baseline and transformed results must not be compared across different Espruino commits, SDK installations, board configurations or build options without identifying and explaining the difference.

## 4. Required Automation Behaviour

### 4.1 Operating model

The POC transformation must be deterministic, source-aware and limited to ESP-IDF version selection.

For the transformation, `ESP_IDF_VERSION_MAJOR` will be treated as defined with the integer value:

```text
5
```

This value must apply from the beginning of every source file. It represents the value supplied by the existing IDF5 build route; it must not be inferred from fallback definitions encountered later in a file.

The transformer must:

- scan all tracked files in the selected Espruino baseline for uses of `ESP_IDF_VERSION_MAJOR`;
- recognise every guard form recorded in Appendix 1;
- process complete preprocessor conditional groups rather than isolated directive lines;
- account for nesting before deciding which text is retained;
- produce the same output when given the same baseline, configuration and tool version; and
- make no source changes until its complete transformation plan has been validated.

All uses of `ESP_IDF_VERSION_MAJOR` must be inventoried. The automated source transformation applies only to version-dependent conditional groups in C source and header files. Build-supplied definitions and other non-source references must be reported but left unchanged.

The transformation must not use a full C preprocessor to replace source files with expanded output. Such output would expand includes and unrelated macros, remove valid configuration choices and produce an unsuitable source diff.

### 4.2 Selection of conditional branches

For a conditional group controlled solely by `ESP_IDF_VERSION_MAJOR`, the transformer must:

- retain the branch selected when the major version is `5`;
- remove branches that cannot be selected;
- remove the redundant version directives surrounding the retained source; and
- preserve the retained source text without refactoring or reformatting it.

This includes retaining code selected by conditions such as:

```c
#if ESP_IDF_VERSION_MAJOR >= 4
```

because that branch is also selected by IDF5.

The transformer must also recognise cases where the IDF5 implementation appears in an `#else` or `#elif` branch. It must evaluate the complete chain in order and retain only the effective branch.

For example:

```c
#if ESP_IDF_VERSION_MAJOR < 5
  /* legacy implementation */
#else
  /* IDF5 implementation */
#endif
```

must retain the existing IDF5 implementation rather than deleting the complete conditional group.

### 4.3 Mixed version and feature expressions

Where a condition combines an IDF-version expression with an independent target, capability or feature expression, the transformer must evaluate only the version-dependent part.

If the version component is true, the remaining condition must be preserved. For example:

```c
#if ESP_IDF_VERSION_MAJOR >= 5 && CONFIG_LWIP_IPV6
```

must become:

```c
#if CONFIG_LWIP_IPV6
```

If the version component makes the complete expression false, the guarded branch must be discarded and any applicable alternative branch selected. For example:

```c
#if defined(ESPR_USE_USB_SERIAL_JTAG) && ESP_IDF_VERSION_MAJOR < 5
```

is false for the POC target regardless of the USB feature setting.

The transformer must preserve the meaning, ordering and nesting of every unresolved part of a mixed expression.

### 4.4 Conditions that must remain configurable

The transformer must not evaluate or remove conditions that are independent of the IDF version.

These include, but are not limited to:

- `CONFIG_IDF_TARGET_ESP32`;
- `CONFIG_IDF_TARGET_ESP32C3`;
- `CONFIG_IDF_TARGET_ESP32S3`;
- `CONFIG_LWIP_IPV6`;
- `ESPR_USE_USB_SERIAL_JTAG`;
- `BLUETOOTH`;
- `USE_NET`;
- watchdog configuration;
- `QEMU_BUILD`;
- peripheral-count conditions;
- debug and release controls;
- ordinary include guards; and
- other board, target, capability or feature controls.

A non-version condition nested inside a discarded version branch may disappear with that branch. Otherwise, its existing behaviour must remain intact.

### 4.5 Source preservation

The automated pass must preserve the selected IDF5 source as closely as possible.

It must not:

- reindent retained code;
- normalise whitespace or line endings;
- rename identifiers;
- reorder includes, declarations or statements;
- rewrite retained comments;
- change expression formatting unrelated to the required simplification;
- modernise APIs; or
- make functional corrections.

Comments contained entirely within a discarded legacy branch will be removed with that branch. A retained comment that becomes inaccurate after consolidation must be reported for human review rather than silently rewritten by the transformer.

Removal of preprocessor directives may require deletion of newly redundant blank lines, but it must not cause general formatting changes.

### 4.6 Unsupported or ambiguous input

The transformer must stop without modifying tracked source files if it cannot determine the correct IDF5 result for every version-dependent conditional group.

Before modifying the worktree, it must complete a dry-run analysis of every occurrence of `ESP_IDF_VERSION_MAJOR`. If it encounters:

- an expression not covered by Appendix 1;
- an unsupported preprocessor construct;
- an unbalanced or structurally ambiguous conditional group;
- a version macro hidden behind an unresolved alias; or
- any case where the selected branch cannot be determined confidently,

it must abort the application phase without modifying tracked source files.

The diagnostic must record:

- file path;
- line number;
- complete conditional expression;
- surrounding conditional-chain context; and
- reason the case was not transformed.

The case must then be reviewed and the specification or transformer deliberately extended. It must not be resolved through an undocumented guess.

### 4.7 Audit output

Before applying changes, the transformer must produce a reviewable plan containing:

- every file to be changed;
- every version-dependent conditional group found;
- the expression evaluated;
- the selected branch;
- whether the group will be removed, retained or simplified;
- any remaining non-version condition; and
- totals by file and transformation type.

After application, the following must be retained as POC evidence:

- the transformer implementation or exact tool and version;
- its invocation and configuration;
- the dry-run inventory;
- transformation diagnostics;
- the complete generated source diff; and
- a check that no unprocessed `ESP_IDF_VERSION_MAJOR` source guards remain, except any explicitly reviewed and recorded exception.

The automation implementation is a POC artifact. Retaining it for review does not imply that it must become part of an eventual upstream Espruino patch.

The transformer implementation, dry-run plans, audit reports and related POC evidence will be retained in the harness repository. The Espruino branch will contain only the transformed firmware source and any separately identified firmware-source corrections.

### 4.8 Separation of automated and manual changes

The initial automated output must be captured and reviewed before any manual source correction is made.

If a manual correction is required to compile or test the transformed source, it must be:

- recorded separately from the automated output;
- justified by an identified limitation or defect in the transformation;
- represented by a separate diff or commit; and
- included in the assessment of how completely the consolidation was automated.

A manually corrected result may still provide useful POC evidence, but it must not be described as the unmodified output of the automated transformation.

## 5. Stakeholder Review and Supporting Evidence

### 5.1 Primary POC evidence

The primary result of the POC will be the complete source diff between the recorded upstream baseline and the transformed IDF5-only source.

After the automated output has been captured and locally reviewed, the POC branch will be pushed to Simon’s Espruino fork and used to open a draft pull request against `espruino/Espruino:master`.

The draft pull request will:

- identify itself as the **ESP32 IDF5 backend consolidation POC**;
- state the exact baseline commit;
- present the complete transformation diff for stakeholder review;
- distinguish automated output from any subsequent manual correction;
- summarise the automation method and its audit results;
- report build and runtime evidence as it becomes available; and
- remain a draft with no intention to merge as the final production change.

Stakeholder review of the source diff is the principal means of determining whether the automated consolidation is technically credible and sufficiently clear for further consideration.

The retained evidence must include a stable diff from the recorded baseline commit to the POC branch head. If upstream `master` advances after branch creation, the divergence must be reported. The POC branch must not be silently rebased or merged merely to change the draft pull-request comparison.

### 5.2 Build and runtime evidence

Supporting evidence will be obtained using the existing IDF5 build routes for:

```text
ESP32_IDF5
ESP32C3_IDF5
ESP32S3_IDF5
```

The transformed source will be built for all three selected configurations. Where corresponding physical hardware is available, each successful image will then be flashed and exercised using the applicable existing tests.

All builds will use the recorded ESP-IDF v5.5.3 environment.

Results will be recorded separately for classic ESP32, ESP32-C3 and ESP32-S3, including tests passed, failed and not run.

This is supporting POC evidence rather than complete production qualification. If an unexpected failure requires comparison with the unchanged baseline, that comparison may be performed to distinguish a transformation regression from existing behaviour. Any required source correction must follow the separation rules in Section 4.8.

## 6. POC Acceptance Criteria

The POC will be complete when it has produced enough evidence for stakeholders to judge whether automated ESP32 IDF5 backend consolidation is practical.

### 6.1 Transformation completeness

The POC must demonstrate that:

- the transformation was performed from the recorded clean baseline;
- every `ESP_IDF_VERSION_MAJOR` source guard was identified;
- every recognised guard was evaluated using the rules in Section 4;
- no unsupported or ambiguous guard was silently transformed;
- non-version target and feature conditions were preserved;
- the automated output was captured before any manual correction; and
- any remaining version guard or compatibility material is identified and explained.

### 6.2 Repeatability and auditability

The POC must provide:

- the transformer implementation or exact tool and version;
- the complete invocation and configuration;
- the dry-run transformation plan;
- transformation diagnostics;
- the generated source diff;
- a record of any manual corrections; and
- confirmation that repeating the transformation from the same baseline produces the same result.

### 6.3 Stakeholder review

A draft pull request must present the complete diff against the recorded upstream baseline.

The draft pull request must contain enough context for stakeholders to:

- distinguish the automated transformation from manual changes;
- identify which source was retained or removed;
- review preservation of target and feature controls;
- understand the automation’s known limitations; and
- decide whether the approach is suitable for further development.

Opening the draft pull request does not authorize merging it or adopting its structure as the final production solution.

### 6.4 Build and runtime evidence

The transformed source must build successfully for:

```text
ESP32_IDF5
ESP32C3_IDF5
ESP32S3_IDF5
```

Where the corresponding hardware is available, each resulting firmware image must be flashed, booted and exercised with the applicable existing tests.

The evidence must show:

- build results for each target;
- successful or unsuccessful flashing and startup;
- tests passed, failed and not run; and
- whether any observed failure is new, pre-existing or unresolved.

No regression attributable to the transformation may be concealed or treated as an unrelated baseline defect without supporting evidence.

### 6.5 Outcome classification

The final POC assessment will classify the result as one of the following:

- **Successful:** the automated transformation covers the complete inventory without manual source correction, produces reviewable source, builds all three IDF5 targets and introduces no identified runtime regression.
- **Successful with limitations:** the overall approach is demonstrated, but documented manual corrections, explicitly accepted exceptions or unresolved test limitations remain.
- **Unsuccessful or inconclusive:** the transformation cannot cover the required source safely, does not produce buildable IDF5 firmware, or lacks sufficient evidence for stakeholder assessment.

A successful POC establishes that the consolidation approach is technically credible. It does not decide the final Espruino ESP32 source structure or authorize production retirement of IDF3 or IDF4.

## 7. Execution and Review Sequence

### 7.1 Preflight verification

Before creating the POC branch:

1. confirm that the local Espruino worktree is clean;
2. verify the currently checked-out branch and protect the unrelated ping work;
3. refresh the `upstream` and `origin` remote references;
4. confirm the relationship between `upstream/master`, `origin/master` and local `master`;
5. record the final baseline commit;
6. verify that `poc/esp32-idf5-consolidation` does not already exist; and
7. verify and record the installed ESP-IDF and compiler provenance.

If the intended baseline has changed since Section 3 was written, the new baseline must be reported and recorded before proceeding.

### 7.2 POC branch creation

The local branch:

```text
poc/esp32-idf5-consolidation
```

will be created directly from the recorded `master` baseline.

After creation, its starting commit and relationship to the baseline must be verified. The branch must contain no commit from `fix/esp32-ping-hardening` or any other unrelated development branch.

The recorded baseline will remain fixed for the duration of the POC. A later upstream change will not be silently merged or rebased into the experiment.

### 7.3 Transformer dry run

The transformer will first run in analysis-only mode.

The dry run must:

- rescan the complete tracked repository;
- identify every occurrence of `ESP_IDF_VERSION_MAJOR`;
- classify every conditional group using Appendix 1 and Section 4;
- prepare the complete transformation plan;
- report unsupported or ambiguous cases; and
- leave the worktree unchanged.

The plan must be presented to Simon and explicitly accepted before the application phase begins. If the dry run cannot account for every version-dependent conditional group, the source transformation must not be applied.

### 7.4 Automated transformation

Once the dry-run plan has been accepted, the transformer will apply the planned changes to the POC branch.

Immediately after application:

- the worktree diff must be captured;
- changed files must be compared with the dry-run plan;
- the repository must be searched for remaining version guards;
- unrelated files and formatting changes must be checked for;
- the generated audit output must be retained; and
- the automated result must be reviewed before any manual source edit.

The first source commit on the POC branch must contain only the automated transformation output. Its commit message must identify the baseline and state that the commit is the unmodified generated consolidation result.

### 7.5 Manual corrections

If the automated result requires a source correction, the reason must first be diagnosed.

Where practical, a general transformation defect should be corrected in the transformer and the transformation repeated from the clean baseline. Each attempted transformation must remain traceable in the POC evidence.

If a manual source correction is still required, it must be made after the automated-output commit and placed in a separate commit. The correction must identify:

- the affected source location;
- why automation did not produce the required result;
- whether the limitation is general or case-specific; and
- how the correction affects the final POC assessment.

Unrelated firmware defects must not be corrected.

### 7.6 Draft pull request

After the generated diff has been captured and locally reviewed, the POC branch will be pushed to Simon’s Espruino fork.

A draft pull request will then be opened against:

```text
espruino/Espruino:master
```

The draft pull request will be the primary stakeholder-review surface. It must clearly state that it is an experimental POC and not the proposed final retirement change.

The initial draft will include:

- the recorded baseline;
- the purpose and limitations of the POC;
- the complete automated source diff;
- the transformation and audit summary;
- any separate manual corrections;
- available build and test results;
- an explanation that existing IDF3 and IDF4 CI jobs may fail because the POC intentionally transforms only the source backend while leaving legacy build infrastructure unchanged; and
- outstanding questions or limitations.

The pull request must remain in draft state and must not be merged or marked ready for review as a production change during this POC.

### 7.7 Build and hardware evidence

The transformed source will be built for:

```text
ESP32_IDF5
ESP32C3_IDF5
ESP32S3_IDF5
```

Successful images will be flashed to the corresponding available hardware and exercised using the applicable existing tests.

Results will be added to the retained POC evidence and summarised in the draft pull request. Unexpected failures may be compared with the unchanged baseline where necessary to determine whether they were introduced by the transformation.

### 7.8 Final POC assessment

After source review, builds and available hardware testing, the POC will be assessed against Section 6.

The final record must include:

- the exact branch head and baseline;
- the draft pull-request URL;
- the automated transformation result;
- any manual corrections;
- build and runtime results;
- stakeholder observations received so far;
- unresolved technical questions; and
- the final outcome classification.

Completion of this sequence ends the POC. Any production restructuring, legacy retirement or further firmware correction requires a separate stakeholder decision and scope.

## Appendix 1 - Audit of current Espruino `master`

This section contains a read-only inventory against the local `master` reference at `2f0bc6bc293dede9458ef9d2b23ce76807f6bc94`. It classifies version expressions, compound and nested cases, fallback definitions, build-supplied macros, and nearby target/feature guards that the automation must preserve.

The result confirms this exercise cannot safely be implemented as “retain `>=5`, delete everything else.”

### Guard inventory

The complete repository contains 116 occurrences of `ESP_IDF_VERSION_MAJOR`:

- 110 conditional directives across 15 C source/header files;
- four references in `#endif` comments; and
- two build definitions in the IDF4 and IDF5 target makefiles.

No source guards use:

- `ESP_IDF_VERSION_MINOR`;
- `ESP_IDF_VERSION_PATCH`;
- `ESP_IDF_VERSION_VAL`;
- `ESP32_IDF4`; or
- `ESP32_IDF5`.

The build system supplies `ESP_IDF_VERSION_MAJOR=5` for IDF5 and `=4` for IDF4. The legacy IDF3 route generally leaves it undefined.

### Expressions found

| Guard form | Directives | IDF5 interpretation |
|---|---:|---|
| `ESP_IDF_VERSION_MAJOR >= 5` | 65 | True |
| `ESP_IDF_VERSION_MAJOR >= 4` | 25 | True, but four are `#elif` arms |
| `ESP_IDF_VERSION_MAJOR < 5` | 10 | False |
| `!(ESP_IDF_VERSION_MAJOR >= 4)` | 3 | False |
| `ESP_IDF_VERSION_MAJOR == 5` | 1 | True |
| `ESP_IDF_VERSION_MAJOR == 4` | 1 | False |
| `ESP_IDF_VERSION_MAJOR < 4` | 1 | False |
| `ESP_IDF_VERSION_MAJOR >= 5 && CONFIG_LWIP_IPV6` | 2 | Reduce to `CONFIG_LWIP_IPV6` |
| `defined(ESPR_USE_USB_SERIAL_JTAG) && ESP_IDF_VERSION_MAJOR < 5` | 1 | False; remove the guarded body |
| `#ifndef ESP_IDF_VERSION_MAJOR` | 1 | False in an IDF5 build |

Spacing and inline-comment variations also occur.

### Structural variations

The source contains:

- `#if` without an alternative;
- `#if`/`#else`;
- `#if`/`#elif`/`#else`;
- version conditions nested inside other version conditions;
- version conditions nested inside target and feature guards;
- target conditions nested inside version-selected branches;
- version checks around includes, declarations, types, data, function fragments and complete implementations.

Two especially important cases are:

- IDF5 sometimes selects code guarded by `>=4`, because that implementation is shared by IDF4 and IDF5.
- IDF5-selected code sometimes appears in an `#else` or `#elif` arm rather than beneath an explicit `>=5` condition.

For example, the network include chain is:

```c
#if ESP_IDF_VERSION_MAJOR >= 5
  /* IDF5 */
#elif ESP_IDF_VERSION_MAJOR >= 4
  /* IDF4 */
#else
  /* IDF3 */
#endif
```

Elsewhere the pattern is effectively:

```c
#if ESP_IDF_VERSION_MAJOR < 5
  /* legacy */
#else
  /* IDF5 */
#endif
```

### Nested conditions that must survive

The review found target and feature controls including:

- `CONFIG_IDF_TARGET_ESP32`;
- `CONFIG_IDF_TARGET_ESP32C3`;
- `CONFIG_IDF_TARGET_ESP32S3`;
- `CONFIG_LWIP_IPV6`;
- `ESPR_USE_USB_SERIAL_JTAG`;
- `BLUETOOTH`;
- `USE_NET`;
- watchdog configuration;
- `QEMU_BUILD`; and
- peripheral-count controls.

These are not SDK-version choices and must remain effective after the version layer is removed.

### Compatibility fallback

`targets/esp32/jswrap_esp32.c` contains:

```c
#ifndef ESP_IDF_VERSION_MAJOR
#define ESP_IDF_VERSION_MAJOR 3
#endif
```

It appears after earlier version-dependent includes. For the IDF5 route, the makefile supplies `ESP_IDF_VERSION_MAJOR=5` from the start of preprocessing, so this fallback is inactive. The POC transformer must likewise evaluate the entire file with the external value `5`; it must not infer the value sequentially from this late fallback.

### Consequence for Section 4

The automation must understand complete preprocessor conditional chains. A line-oriented search-and-replace is insufficient.

It should:

1. evaluate `ESP_IDF_VERSION_MAJOR` as the integer `5`;
2. choose the effective arm of each complete conditional chain;
3. preserve unresolved target and feature expressions;
4. simplify mixed expressions only where the version component is conclusive;
5. preserve nesting correctly; and
6. stop or report any version expression outside the reviewed forms.

This inventory provides the baseline evidence for the requirements in Section 4.
