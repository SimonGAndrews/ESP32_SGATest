# ESP32 Wi-Fi Asynchronous-Operation Hardening Completion Plan

Date: 2026-11-05

## Purpose

This plan covers completion of the umbrella investigation and its proposed
Espruino changes for:

1. `Wifi.ping()` correctness and lifecycle hardening;
2. `Wifi.connect()` ownership and error reporting; and
3. `Wifi.disconnect()` exactly-once completion.

The three APIs share the principle that accepted asynchronous work must retain
explicit ownership until one terminal outcome. They do not need one generic
implementation framework: each native lifecycle should retain a small,
API-specific state model.

The completed umbrella text is being prepared in
[`asynchronous-operation_hardening_issueDraft.md`](asynchronous-operation_hardening_issueDraft.md).

## Current Baseline

The ping investigation, implementation and qualification are complete. The
issue draft is committed in `ESP32_SGATest` as `749fadb`.

The full ping candidate is retained in the Espruino repository at
`bc5f06466e`. The dependent connection branch is:

```text
fix/esp32-wifi-connect-hardening
```

PR2 is implemented and qualified at `610007d3f`, one commit above the
qualified ping candidate. The branch has not yet been pushed at that revision.

The intended stacked development structure is:

```text
bc5f06466e  Full ping candidate
└── 610007d3f fix/esp32-wifi-connect-hardening  PR2
    └── fix/esp32-wifi-disconnect-hardening PR3
```

The ping branch must remain unchanged. When an earlier PR is merged, its
dependent branch will be rebased onto the resulting upstream `master`,
requalified and submitted with only its own changes visible in the PR diff.

## Phase 1 — Reconfirm the Connection Baseline

The existing connection evidence was collected against an earlier ping
candidate. Before changing firmware, reproduce it on the current connection
branch at `bc5f06466e`.

Run the retained
[`esp32_wifi_connect_overlap_variants.js`](repros/esp32_wifi_connect_overlap_variants.js)
probe on the ESP32-C3 and retain traces for:

- two valid overlapping calls with callbacks;
- an invalid second call while the first call is active;
- a callback-less first call followed by another call;
- the synchronous `ESP_ERR_WIFI_STATE` or `ESP_ERR_WIFI_CONN` path; and
- recovery after cancelling the first attempt.

Run standalone controls for:

- a successful connection to `SHED`;
- an incorrect password;
- an unavailable SSID;
- callback count and final state after the native retry period; and
- deliberate disconnection after a successful connection.

Exit criterion: the qualified ping parent reproduces the connection ownership
and error-reporting defects without relying on older firmware evidence.

## Phase 2 — Define the PR2 Connection Contract

Record the intended behaviour in section 2 of the umbrella draft before
implementation:

1. Validate all JavaScript arguments before changing active operation state.
2. Represent an active connection independently of callback presence.
3. Reject an overlapping `Wifi.connect()` before changing credentials,
   callbacks or native configuration.
4. Preserve the callback belonging to the accepted operation.
5. Complete success only after a usable IP address is obtained.
6. Complete terminal failure exactly once after native retries are exhausted.
7. Convert an immediate native failure into the documented callback result,
   rather than reporting it only through `jsError()`.
8. Clear operation ownership even when no callback was supplied.
9. Detach JavaScript callback ownership safely during `reset()`.
10. Continue publishing `associated`, `connected`, `disconnected` and
    `dhcp_timeout` events independently of per-call completion.

Do not add an application-level connection timeout to Espruino in this PR.
Native lifecycle events do not identify an application attempt generation, so
the XFSM Wi-Fi manager must retain its own timeout and stale-event
reconciliation.

## Phase 3 — Confirm the Native Event Context

Before implementing connection ownership, establish whether the registered
ESP-IDF Wi-Fi event handlers execute outside Espruino's interpreter task.

The current handler creates `JsVar` values, queues callbacks and unlocks
callback references. This resembles the task-boundary concern corrected by
the ping work. The investigation must reach and record one of two conclusions:

- the handler is invoked in a context where these operations are safe, with
  source evidence explaining why; or
- native station events require a retained plain-C handoff into the
  interpreter, either within PR2 or as a separately identified prerequisite.

This execution-context assumption must not remain implicit.

**Disposition (2026-11-05): complete.** Source review proves that IDF3,
IDF4 and IDF5 dispatch the registered Wi-Fi handler from a separate ESP-IDF
event task, not from Espruino's `espruinoTask`. PR2 therefore requires a
bounded plain-C native-to-interpreter handoff before connection ownership is
implemented. The evidence and implementation consequence are recorded in
[ESP32 Wi-Fi event-handler execution context](esp32-wifi-event-task-context-2026-11-05.md).

## Phase 4 — Implement PR2: `Wifi.connect()`

**Disposition (2026-11-05): complete.** Commit `610007d3f` implements the
IDF5-only connection lifecycle, bounded station-event handoff, exactly-once
completion, overlap rejection, reset cleanup and password-log removal.

Use a small connection-specific lifecycle. A likely model is:

```text
IDLE
  ├── WAITING_FOR_STA_START
  └── CONNECTING
          ├── GOT_IP ──────────────> IDLE, success
          ├── terminal disconnect ─> IDLE, failure
          └── immediate error ─────> IDLE, failure
```

The implementation should include:

- explicit connection state independent of `g_jsGotIpCallback`;
- full validation into local values before changing global state;
- catchable overlap rejection, such as
  `A connection is already in progress`;
- one helper that takes and clears connection ownership before queuing a
  terminal completion;
- immediate-error handling for `esp_wifi_get_mode()`, `esp_wifi_set_mode()`,
  `esp_wifi_set_config()`, `esp_wifi_start()` and `esp_wifi_connect()`;
- handling of `esp_wifi_connect()` failure from the deferred station-start
  event path;
- success completion from the IP-ready event;
- failure completion from the terminal disconnected path;
- callback and state cleanup through the existing reset/kill hook;
- removal of the password from connection debug output; and
- comments explaining ownership, delayed station startup, terminal
  completion and callback lifetime.

Cancellation by `Wifi.disconnect()` must be designed at this point but
completed as part of PR3.

## Phase 5 — Qualify PR2

**Disposition (2026-11-05): complete.** Revision `610007d3f` passed focused
IDF5 connection, overlap, reset, scan, AP/station, ping and heap qualification
on classic ESP32, ESP32-C3 and ESP32-S3. The unchanged connection path passed
runtime smoke checks on all three IDF4 targets. Classic IDF3 completed a
focused successful-station smoke test; its expanded legacy connection and
disconnection regression is deliberately deferred until PR3 so the stacked
PR2+PR3 candidate can qualify both guarded changes together. All seven
maintained ESP32 definitions completed clean release builds. The evidence is
recorded in
[`2026-11-05-esp32-idf5-wifi-connect-hardening-candidate.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-05-esp32-idf5-wifi-connect-hardening-candidate.md).

Focused connection tests must cover:

- successful connection and exactly one callback;
- incorrect password and exactly one terminal failure;
- unavailable SSID and terminal failure behaviour;
- valid overlap rejected without changing the first operation;
- invalid overlap leaving the first operation untouched;
- callback-less connection retaining operation ownership;
- immediate native failure being visible to JavaScript;
- recovery after success, failure and overlap rejection;
- reconnection while already connected;
- stopped and already-started station paths;
- JavaScript `reset()` during a connection attempt;
- absence of passwords from debug output;
- scan and AP/station transition regressions; and
- the complete ping regression set because the same wrapper and kill handler
  are modified.

Qualification must include:

- physical IDF5 testing on classic ESP32, ESP32-C3 and ESP32-S3;
- IDF4 runtime checks on classic ESP32, ESP32-C3 and ESP32-S3;
- a focused classic IDF3 successful-station smoke test, followed by the
  expanded legacy regression specified under PR3;
- clean release builds for all seven maintained ESP32 definitions; and
- a repeated connection/recovery soak with native heap measurements.

Section 2 of the umbrella issue must then contain:

- problem statement and minimal reproduction;
- observed target output;
- source finding;
- intended contract;
- implemented correction and commit identifiers;
- physical and build qualification; and
- copy-ready PR2 submission text referring back to the umbrella issue.

## Phase 6 — Implement PR3: `Wifi.disconnect()`

**Disposition (2026-11-07): complete.** Commit `14cd9932f` implements the
IDF5-only disconnect lifecycle on the qualified PR2 head. The parent
reproduction delivered one callback twice; the corrected lifecycle passed
27/27 checks on Classic, C3 and S3, including idle, connected, connecting,
callback-less, overlap, event-count, reset and recovery cases. Section 3 of
the umbrella issue now records the reproduction, source cause, contract,
implementation, qualification and copy-ready PR3 submission text.

After PR2 is qualified, create:

```text
fix/esp32-wifi-disconnect-hardening
```

from the qualified PR2 head. First rerun the existing disconnect probe on that
exact parent to confirm that the double-completion defect remains independently
reproducible.

Expand the baseline to cover:

- disconnect while connected;
- disconnect while connecting;
- disconnect while already idle or stopped;
- callback-less disconnect;
- two overlapping disconnect calls;
- reconnect after each case;
- JavaScript `reset()` during disconnect; and
- public `disconnected` event counts independently of callback counts.

Use a disconnect-specific lifecycle:

```text
IDLE
  └── DISCONNECTING
          ├── native disconnected event ─> IDLE, completion
          └── no event can occur ─────────> IDLE, immediate completion
```

The implementation must:

- validate arguments before changing active state;
- retain ownership independently of callback presence;
- prevent the API path and event path from queuing the same callback;
- take and clear the retained callback before queuing it;
- complete immediately only when no terminal event can occur;
- define cancellation of an active connect as one connection outcome;
- complete the disconnect operation exactly once;
- preserve the public `disconnected` event;
- define or reject overlapping disconnect requests; and
- clear callback and operation ownership safely during reset.

PR3 qualification must repeat the seven-build and cross-family runtime matrix,
the complete PR2 regression set and the ping regression set.

Run the expanded classic IDF3 station regression on the stacked PR2+PR3 head,
so one legacy-backend run checks that both IDF5 guards preserve the established
connection and disconnection paths. Cover successful connection and DHCP,
incorrect credentials or an unavailable SSID, native `associated`, `connected`
and `disconnected` events, deliberate disconnect and its callback count,
reconnection after disconnect, repeated connection cycles, and reset/cleanup
sanity. Assert the existing IDF3 contract rather than the new IDF5 ownership
semantics. Record this explicitly as combined PR2+PR3 integration regression
evidence. If it exposes a regression, rerun the relevant case on the PR2 head
and its parent to attribute the change before proceeding.

Section 3 of the umbrella issue must mirror section 2 and finish with
copy-ready PR3 submission text.

## Phase 7 — Integrated Qualification

**Disposition (2026-11-07): complete.** The stacked head passed all seven
clean release builds; the complete disconnect, connection and ping matrices
on all three IDF5 families; ping, connect and disconnect reset boundaries on
C3; guarded IDF4 runtime checks on all three families; and the expanded
Classic IDF3 regression. Manual `SHED` loss produced one `NO_AP_FOUND`
disconnect event and explicit recovery after restoration completed once. The
evidence is recorded in
[`2026-11-07-esp32-idf5-wifi-disconnect-hardening-candidate.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-07-esp32-idf5-wifi-disconnect-hardening-candidate.md).

The Classic IDF3 guard was subsequently expanded into a broad Wi-Fi API
regression covering station and AP operation, scan, failure and outage
recovery, cancellation, addressing, persistence, DNS, hostname, SNTP, ping and
supported configuration. Its operational roles passed; unchanged legacy
contract differences are recorded in
[`2026-11-07-esp32-classic-idf3-wifi-api-regression.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-07-esp32-classic-idf3-wifi-api-regression.md).

Use the qualified PR3 head, which will contain all three fixes, for final
umbrella qualification:

- complete ping matrix;
- complete connection matrix;
- complete disconnection matrix;
- reset during ping, connect and disconnect;
- callback-less ownership where supported;
- overlap rejection;
- immediate native failure reporting;
- exactly-once terminal callbacks;
- preservation of public Wi-Fi events;
- manual `SHED` access-point disable and restoration;
- repeated connect, disconnect and recovery cycles;
- heap and recovery checks; and
- clean builds for all seven maintained ESP32 definitions.

The final result record must identify:

- the exact Espruino revision and branch;
- each target board and ESP-IDF version;
- build type and firmware identity;
- retained test-program hashes;
- callback, event, session and heap totals; and
- any excluded harness or bench artifacts.

## Phase 8 — Complete the Umbrella Issue

The final issue draft must contain:

- an opening scope that reflects shared parsing, IDF4 ping operation and IDF5
  lifecycle hardening rather than describing PR1 as IDF5-only;
- completed ping investigation and PR1 text;
- completed connection investigation and PR2 text;
- completed disconnection investigation and PR3 text;
- the shared asynchronous-operation contract;
- a PR dependency and firmware-commit table;
- the combined build and runtime qualification matrix;
- known limitations and application responsibilities; and
- a statement that the PRs share a design principle but retain API-specific
  state handling.

The known application responsibilities must include:

- connection timeouts;
- stale native-event reconciliation;
- policy for retrying after native-driver failure; and
- handling the absence of application attempt identifiers in native events.

The completed issue should remain directly suitable for copying into the
GitHub issue template. Each PR description should refer to the resulting issue
number rather than depending on the external evidence repository for its main
explanation.

## Commit and Submission Discipline

1. Retain the completed ping branch and its documented commits unchanged.
2. Commit baseline evidence before changing firmware.
3. Keep PR2 and PR3 implementation commits focused and separately reviewable.
4. Record each qualified firmware commit in the corresponding issue section.
5. Do not submit a dependent PR against upstream `master` while its parent PR
   remains unmerged.
6. After rebasing onto a newly merged parent, update changed commit identifiers
   in the issue draft and rerun proportionate qualification.
7. Commit evidence and documentation separately from firmware changes.

## Immediate Next Action

Reconcile the combined qualification table and remaining Phase 8 umbrella
material, then prepare the evidence/documentation changes as a separate
structured commit.
