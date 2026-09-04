# Agent Notes

This repository designs, documents and exercises ESP32-family Espruino
hardware test harnesses. It is used through Codex in VS Code on both Windows
and Ubuntu.

## Start Here

Read these two repository maps first:

- `README.md`
- `docs/README.md`

Then identify the requested workstream and follow only its focused reading
route below. Do not load every historical handover by default.

At the start of substantial work, state the selected workstream and immediate
objective in the thread, for example:

```text
Workstream: V2 KiCad implementation
Current objective: implement the accepted Target Interface connector banks
```

If a request spans workstreams, identify the primary workstream and the
specific dependency or output crossing the boundary. Do not silently broaden a
focused thread into another workstream.

## Current Workstreams

### 1. V1 bench testing and functional runners

The ESP32-C3 and classic ESP32 V1 harness hardware is complete. Routine V1
hardware development and prototyping have stopped.

Use the V1 harnesses as stable bench platforms for shared REPL functional-test
development, runners, regression evidence, firmware comparisons and practical
evaluations that may inform V2.

Read:

- `docs/handoff/2026-09-04-idf5-classic-validation-status.md` when
  working on the post-merge ESP32 master sanity run or its IDF5 evidence
- `docs/handoff/2026-06-25-esp32-family-tests.md`
- `docs/design/common-harness-design-and-blocks.md`
- `docs/design/harness-modes.md`
- the relevant target wiring document:
  - `docs/targets/esp32-c3-devkitc-02/wiring.md`
  - `docs/targets/esp32-devkitc-v4/wiring.md`

For cross-build comparisons or firmware-anomaly attribution, also read
`docs/handoff/2026-07-20-esp32-firmware-lineage-and-test-interpretation.md`.

Do not infer that ordinary bench or runner work authorises redesign of V1
hardware.

### 2. Firmware investigations

Use proven harness evidence to distinguish hardware, runner and Espruino
firmware behaviour. Firmware source changes belong in the appropriate Espruino
repository, not in this harness repository.

Read:

- `docs/handoff/2026-09-04-idf5-classic-validation-status.md` for the
  upstream IDF5 merge outcome and remaining same-source master sanity run
- `docs/handoff/2026-07-05-espruino-repo-structure.md`
- `docs/handoff/2026-07-20-esp32-firmware-lineage-and-test-interpretation.md`
- the relevant document under `docs/investigations/`
- any investigation-specific handover referenced there
- the relevant target wiring and bring-up documents

Read `docs/handoff/2026-06-16-onewire-idf4-idf5.md` only for OneWire or closely
related ESP32 timing work.

### 3. V2 architecture and Target Interface contract

This active workstream defines the reusable V2 harness, removable target
daughter boards and the fixed interface between them.

Read:

- `docs/design/V2Harness/README.md`
- `docs/design/V2Harness/arch/TestHarnessArchitecture_V2.md`
- `docs/design/V2Harness/arch/HarnessConceptualModel_V2.md`
- `docs/design/V2Harness/arch/HybridHarnessArchitecture_V2.md`
- `docs/design/V2Harness/arch/DaughterBoardMatrix_V2.md` when allocating or
  implementing target daughter boards
- `docs/design/V2Harness/arch/StandardTestBlocks_V2.md`
- `docs/design/V2Harness/arch/TargetRoutingEnvelope_V2.md`
- `docs/handoff/2026-07-17-v2-services-and-routing.md`

Architecture decisions should be recorded in the V2 design documents before
the KiCad workstream treats them as implementation requirements.

### 4. V2 KiCad implementation

This active workstream implements accepted V2 architecture in a fresh Rev-A
project under `KICAD/V2/RevA/`. The earlier exploratory project is preserved
under `KICAD/V2/Exploration/Espruino_Harness_V2/`.

Read:

- `docs/design/V2Harness/README.md`
- `docs/design/V2Harness/implementation/ReusableHarnessRevA_DesignBaseline.md`
- `docs/design/V2Harness/implementation/ReusableHarnessRevA_ConnectivityChecker.md`
- `docs/design/V2Harness/implementation/ReusableHarnessRevA_PCBImplementationAndVerification.md`
- the architecture specification governing the circuit block under review
- `KICAD/V2/Exploration/Espruino_Harness_V2/TARGET_LIBRARY_PROVENANCE.md`
  when modifying target symbols or footprints

The Rev-A project contains the implemented schematic hierarchy, project-local
libraries and the evolving PCB. Circuit blocks are accepted through the design
baseline process: requirements and manufacturer-source review, visual
schematic review, full-hierarchy ERC, deterministic connectivity contracts and
recorded PCB-stage actions. Preserve interactive KiCad edits. Do not
mechanically regenerate curated symbols or footprints over the authoritative
working copies.

#### KiCad command-line validation

Use the installed KiCad CLI to validate the complete Rev-A hierarchy after
interactive schematic changes. On Windows, invoke
`C:\Program Files\KiCad\9.0\bin\kicad-cli.exe` with approved access to the
normal KiCad user profile. Restricted sandbox execution can deny access to
KiCad's configuration directories and cause `kicad-cli.exe` application-error
pop-ups; request approval for this exact executable instead of redirecting the
user configuration. Close KiCad first, or ensure every edited sheet is saved.

The verified Windows PowerShell ERC command is:

```powershell
& 'C:\Program Files\KiCad\9.0\bin\kicad-cli.exe' sch erc `
  --severity-all --exit-code-violations `
  --output 'KICAD\V2\RevA\Espruino_Harness_RevA\ERC.rpt' `
  'KICAD\V2\RevA\Espruino_Harness_RevA\Espruino_Harness_RevA.kicad_sch'
```

Run it from the repository root. Keep repository paths relative and use an
explicit output path. Do not overwrite accepted review evidence unless the
validation step intentionally refreshes that evidence.

## Workstream Relationship

```text
Completed V1 hardware ──► bench tests and runner development
          │                         │
          └──── practical evidence ─┼──► V2 architecture
                                    │          │
Firmware investigations ◄───────────┘          ▼
                                      V2 KiCad implementation
```

The workstreams proceed in parallel. Further evaluations may be added where
useful, but V1 hardware development does not reopen by default.

## Context Authority

Use this order when documents differ:

1. Current design specifications and target wiring documents define intended
   hardware behaviour.
2. Accepted target-interface and architecture documents define V2 contracts.
3. Current workstream handovers describe continuity, settled decisions and
   open work.
4. Investigation documents preserve evidence and reasoning.
5. Older handovers are historical context unless a current document points to
   them explicitly.

`docs/handoff/README.md` identifies the current handovers and their scope.

## Documentation Structure

Use the Pyramid Principle for architecture, specification and decision
documents: state the conclusion or recommended approach first, then its main
consequences, supporting reasons and detailed evidence. Avoid leading with a
rejected option when the reader needs the accepted direction to interpret the
discussion. Investigation and evidence records may remain chronological where
that structure is useful.

## Cross-Platform Repository Rules

- Treat repository-relative paths as canonical.
- Do not embed checkout-specific Windows or Ubuntu paths in project
  configuration or canonical documentation links.
- Preserve exact filename case; Ubuntu filesystems are case-sensitive.
- Do not create names that differ only by case.
- Use `${KIPRJMOD}` for KiCad project-local library paths.
- State when a command is PowerShell-, Bash-, Windows- or Linux-specific.
- Avoid line-ending-only changes. Line-ending policy changes require a separate
  reviewed normalization step.
- Keep local upstream source checkouts under `KICAD/V2/upstream/`; they are
  ignored reference inputs, not production libraries.

## Generic Test and Evidence Rules

- Use Espruino `Dxx` pin names in tests, matching GPIO numbers.
- Treat selector and jumper state as part of every test precondition.
- Keep hardware proof separate from firmware proof: continuity and static REPL
  checks come before firmware conclusions.
- Do not run multiple REPL tools concurrently against the same serial port.
- Preserve board name, Espruino version, serial port, firmware build
  provenance, board file, ESP-IDF version, harness mode and selector state in
  test evidence. Use the selected Espruino repo's `scripts/provision.sh` as a
  primary build-provenance reference.
- Treat every firmware line as a test subject. The mature classic ESP32 legacy
  build is a useful comparator, not an infallible oracle; corroborate anomaly
  attribution across relevant target and IDF builds.
- Prefer a common logical runner with target-specific pin and mode maps over
  copied whole scripts.

## Important ESP32-C3 V1 Rules

- `D18` / `D19` are native USB Serial/JTAG and fixed to the harness native-USB
  connector.
- `D20` / `D21` are UART0 and reserved by default for board USB-UART
  REPL/flashing, but are deliberately available through `J10` /
  `SEL_UART0_UART1`.
- `J10` is a 2x3 UART connector/selector: two signal-shunt columns plus GND for
  external UART access.
- UART0/UART1 crosslink testing uses native USB Serial/JTAG as the control path.
- `J_Auto` remains a provision until its external reset/boot hardware is wired.

## Important Classic ESP32 V1 Rules

- UART0 `D1` / `D3` is reserved for board USB-UART
  REPL/flashing/control.
- UART testing uses the UART1/UART2 crosslink:
  `D4 -> JP_UART_LOOP2 -> D36` and `D14 -> SEL_D35 -> D35`.
- `D35` is shared between MCP23008 interrupt and UART1 RX via `SEL_D35`.
- `D33` and `D26` can be loopback inputs or DS2413 feedback via selectors.
- `D0` is reserved for BOOT/download control.
- `D2`, `D5`, `D12` and `D15` are strapping pins; avoid fixed harness loads.
- `D6`-`D11` are module SPI-flash signals; do not use.
- `D34`-`D39` are input-only and lack internal pull-up/down.
