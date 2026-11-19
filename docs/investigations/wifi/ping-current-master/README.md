# ESP32 `Wifi.ping()` Current-Master Workstream

Date opened: 2026-11-19

## Current Direction

Restart the ESP32 `Wifi.ping()` work from consolidated Espruino `master` and
submit only the smallest correction supported by a fresh physical
reproduction. The old multi-backend implementation is evidence, not a source
branch to rebase.

The firmware branch is:

```text
fix/esp32-wifi-ping-minimal
```

It was created from `upstream/master` at `b70eda11e7d2`. At creation it had no
diff from that base.

## Why This Restart Exists

The previous work was submitted through umbrella issue
[#2779](https://github.com/espruino/Espruino/issues/2779) and PR
[#2781](https://github.com/espruino/Espruino/pull/2781). Both are closed.
Their investigation remains useful, but two later changes alter the submission
shape:

- Espruino `master` now contains only the consolidated IDF5 ESP32 backend, so
  the IDF3/IDF4 compatibility work no longer belongs in a new correction; and
- maintainer review asked for the established ESP32 callback/event mechanisms,
  simple overlap rejection and substantially less static state.

## Working Files

| File | Purpose |
|---|---|
| [`issue-draft.md`](issue-draft.md) | Concise, copy-ready issue text for the first confirmed defect |
| [`pr-draft.md`](pr-draft.md) | Concise review-oriented PR text for the matching correction |
| Existing files under [`../repros/`](../repros/) | Directly runnable baseline and regression probes |
| `tests/Results/WIFI_BLE_Results/` | Dated physical-device evidence once testing begins |

## Scope Gate

Do not assume every finding from #2779 still needs a correction. Re-run each
candidate against the exact current-master build and select the smallest
coherent first issue:

| Candidate | Baseline probe | Disposition rule |
|---|---|---|
| valid IPv4 string rejected | `esp32_wifi_ping_ipv4_parse.js` | Include only if current master still rejects it |
| C3 ping task starvation | successful loopback ping on the C3 | Change priority only if current master still reproduces missing delivery |
| overlapping calls share or replace a callback | `esp32_wifi_ping_overlap.js` | Prefer immediate overlap rejection before changing callback state |
| reset or repeated-session cleanup failure | `esp32_wifi_ping_reset.js` and `esp32_wifi_ping_loopback_soak.js` | Raise separately only if still reproducible after the narrower correction |

The first GitHub issue should not be opened until its current-master
reproduction and expected result are recorded. Independent failures should not
be combined merely because they use `Wifi.ping()`.

## Implementation Constraints

- Start from current consolidated `master`; do not rebase the old PR branch.
- Validate arguments and reject an overlap before replacing a stored callback
  or creating a native session.
- Prefer a small in-progress marker and the existing ESP32 event/callback
  path.
- Do not add a response queue, idle hook or broader lifecycle framework unless
  a focused reproduction proves it necessary and the design is agreed first.
- Treat any demonstrated `jsiQueueEvents()` task-safety problem as a deeper
  Espruino-core concern rather than solving it privately inside ping.
- Keep application retry, timeout and policy decisions outside the wrapper.

## Qualification Shape

For the selected correction:

1. record the unmodified current-master failure on physical hardware;
2. apply and review the minimal source change;
3. repeat the focused reproduction and recovery case;
4. run overlap, reset and repeated-session probes as proportional regression
   coverage;
5. test the available classic ESP32, ESP32-C3 and ESP32-S3 boards when shared
   ESP32 source changes;
6. complete clean builds for `ESP32`, `ESP32C3` and `ESP32S3`; and
7. record firmware commit, board, Espruino version, ESP-IDF version, serial
   port and heap observations in the dated result.

## Status

| Item | State |
|---|---|
| consolidated-master base selected | Complete: `b70eda11e7d2` |
| fresh firmware branch | Complete: `fix/esp32-wifi-ping-minimal` |
| issue draft | Complete; issue number pending |
| PR draft | Complete; issue number pending |
| current-master baseline build and physical probes | Complete: IPv4-string rejection reproduced on ESP32, ESP32-C3 and ESP32-S3 |
| implementation | Complete: `6fdcebda5` restores IPv4-string parsing |
| qualification | Complete for the parser correction on ESP32, ESP32-C3 and ESP32-S3; independent result-delivery failures recorded for follow-up |
| upstream issue and PR | Not opened |

## Historical Evidence

Use the following only as investigation evidence and test input:

- [`../asynchronous-operation_hardening_issueDraft.md`](../asynchronous-operation_hardening_issueDraft.md)
- [`../esp32-idf5-ping-pr-draft-2026-10-14.md`](../esp32-idf5-ping-pr-draft-2026-10-14.md)
- [`../async-operation-hardening-completion-plan-2026-11-05.md`](../async-operation-hardening-completion-plan-2026-11-05.md)
- [`../../../../tests/Results/WIFI_BLE_Results/2026-11-03-esp32-idf5-ping-hardening-candidate.md`](../../../../tests/Results/WIFI_BLE_Results/2026-11-03-esp32-idf5-ping-hardening-candidate.md)

The closed GitHub records remain the public history:

- [issue #2779](https://github.com/espruino/Espruino/issues/2779)
- [PR #2781](https://github.com/espruino/Espruino/pull/2781)
