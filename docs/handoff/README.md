# Handover Index

Handover documents preserve continuity between focused Codex threads. They do
not replace current design specifications, target wiring documents or recorded
test evidence.

## Thread Declaration

Begin substantial work by declaring the thread's workstream and immediate
objective:

```text
Workstream: <one of the four workstreams in AGENTS.md>
Current objective: <concrete outcome for this thread>
```

Examples:

```text
Workstream: V1 bench testing and functional runners
Current objective: add shared SPI functional coverage on both V1 targets

Workstream: Firmware investigations
Current objective: reproduce the ESP32-C3 IDF5 digitalPulse regression

Workstream: V2 architecture and Target Interface contract
Current objective: define the logical resource inventory and safety invariants

Workstream: V2 KiCad implementation
Current objective: implement an accepted Target Interface bank assignment
```

Keep one primary workstream per thread where practical. When work crosses a
boundary, state what is being consumed from or handed to the parallel
workstream. Record accepted cross-workstream decisions in repository
specifications rather than relying on conversation history.

## Current Workstream Handovers

| Workstream | Current handover | Use |
|---|---|---|
| V1 bench testing and functional runners | `2026-06-25-esp32-family-tests.md` | Generic family-test model and preserved target constraints; its July 12 overlay points to the root README and `tests/repl/` for newer progress |
| Firmware repository selection | `2026-07-05-espruino-repo-structure.md` | Select the correct local Espruino checkout and workflow |
| ESP32 firmware lineage and evidence interpretation | `2026-07-20-esp32-firmware-lineage-and-test-interpretation.md` | Cross-build confidence, comparison matrix and anomaly-attribution rules for bench and firmware threads |
| V2 architecture, Services and routing | `2026-07-17-v2-services-and-routing.md` | Accepted conceptual model, Test Blocks, routing envelope and Control Services; next routing-fabric work |

V2 KiCad implementation currently uses the V2 architecture documents and
`../../KICAD_V2/Espruino_Harness_V2/TARGET_LIBRARY_PROVENANCE.md`; it does not
need a separate handover while its state is captured there and in Git history.

## Focused Historical Handovers

- `2026-06-16-onewire-idf4-idf5.md` is required for OneWire and closely
  related ESP32 timing investigations, not for every thread.
- `2026-06-10.md` is an earlier broad continuity record.
- `2026-07-01-espruino-repo-structure.md` is the detailed predecessor to the
  simplified July 5 repository guide.
- `2026-07-01-esp32-harness-progress-discussion-draft.md` is a discussion
  draft, not current authority.
- `2026-07-12-v2-target-interface-contract.md` records the starting context for
  the V2 architecture thread and is superseded by the July 17 V2 handover.

## Authority and Maintenance

When documents differ:

1. Current specifications and target wiring documents are authoritative.
2. Accepted architecture and interface contracts govern V2.
3. Current handovers describe workstream continuity and open work.
4. Older handovers and investigations preserve historical evidence.

Create a new handover when a focused thread cannot be restarted reliably from
the current specifications and existing workstream handover. A good handover
states scope, settled decisions, open questions, authoritative inputs,
parallel-workstream boundaries and the recommended next task.

Use repository-relative links and paths. This repository is used on both
Windows and Ubuntu.
