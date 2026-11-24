# ESP32 Current-Master Wi-Fi Hardening State and Plan

Date: 2026-11-20

## Recommendation

Manage the remaining work as one integrated Wi-Fi correctness programme, but
submit it upstream as short, independently reviewable issues and pull
requests. Integration should come from one shared behavioural model, one
current-master evidence matrix and deliberate implementation ordering. It
should not come from a large generic asynchronous-operation framework or
another umbrella PR.

The current-master baseline changes the immediate priority. The standalone S3
failure must be understood before implementing ping overlap rejection. The
required overlap behaviour remains simple—a second request must be rejected
without disturbing the first—but its in-progress marker and terminal release
point depend on which context safely owns native completion, result handoff and
the JavaScript callback. C3 native-heap exhaustion then requires reassessment
against that agreed lifecycle before a separate cleanup mechanism is designed.

Physical evidence is recorded in
[`../../../tests/Results/WIFI_BLE_Results/2026-11-20-esp32-current-master-wifi-async-baseline.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-20-esp32-current-master-wifi-async-baseline.md).

## Current position

The backend and initial correctness work have been simplified substantially:

- IDF3 and IDF4 ESP32 backends have been retired; current ESP32 family builds
  share the consolidated ESP-IDF 5 backend.
- the shared `Wifi.setIP()` / `Wifi.setAPIP()` callback-result correction is
  merged; the same change corrected the station DHCP-client call in the
  subsequently retired pre-IDF5 backends
  ([Espruino #2753](https://github.com/espruino/Espruino/issues/2753));
- `Wifi.scan()` can start a stopped station interface without initiating an
  unintended connection
  ([Espruino #2750](https://github.com/espruino/Espruino/issues/2750));
- valid IPv4 strings reach `Wifi.ping()`
  ([Espruino #2790](https://github.com/espruino/Espruino/issues/2790)); and
- the native ping task runs above the interpreter priority, restoring C3 ping
  execution
  ([Espruino #2792](https://github.com/espruino/Espruino/issues/2792)).

The current baseline confirms the following open defects:

| Area | Confirmed current-master behaviour | Significance |
|---|---|---|
| ping overlap | two calls are accepted and share the replacement callback | request ownership is undefined; severe S3 corruption trigger |
| ping task handoff | one S3 ping can deliver malformed values and interrupt JavaScript with out-of-memory | JavaScript state safety; not solved by overlap rejection alone |
| ping native cleanup | C3 exhausts native heap after 24 sequential sessions | ordinary repeated use eventually fails |
| ping reset | old results run or enter the event queue after reset | callbacks outlive their JavaScript runtime |
| connect overlap | a second call can erase the first callback and fail only through console output | the caller cannot determine which request owns the driver |
| connect reset | the old callback was not observed, but native work continues and blocks immediate recovery | reset does not restore a reusable connection API; callback detachment is not yet proved |
| disconnect completion | one request can invoke its callback twice | exactly-once completion is violated |
| disconnect reset | a pre-reset callback can execute afterward | discarded JavaScript state remains reachable |
| diagnostic secrecy | debug output includes the station password | avoidable credential exposure in diagnostic images |

## Shared behavioural model

Ping, connection and disconnection use different ESP-IDF callbacks and events,
so each should keep a small API-specific lifecycle. They should nevertheless
follow the same rules:

- validate a request before changing an active request or its stored callback;
- track accepted work independently of whether an optional callback was
  supplied;
- reject conflicting overlap without changing the accepted request;
- allow only one success, failure or cancellation path to complete a request;
- mark the request complete and detach its callback before scheduling that
  callback;
- keep callbacks supplied to individual calls separate from public
  `Wifi.on(...)` lifecycle events;
- when JavaScript reset clears the current program, prevent old native work
  from invoking discarded callbacks or being mistaken for later work; and
- report native failures through the API contract, not solely through
  `jsError()` output.

These rules do not imply a shared state-machine framework. Simple booleans,
existing callback references and small API-specific completion helpers are
preferred where they are sufficient.

## Maintainer constraints carried forward

The next work must reflect the review of the closed combined ping PR:

- keep each public issue concise and based on one current-master reproduction;
- prefer small changes and existing Espruino callback/event mechanisms;
- reject a conflicting ping rather than supporting overlapping native
  sessions;
- avoid a private Wi-Fi response framework with significant static state; and
- if the established event-queue mechanism is unsafe from an ESP-IDF task,
  address that at the appropriate shared boundary rather than hiding it behind
  a ping-only queue.

The new S3 evidence supplies the focused physical reproduction needed to
revisit the last point. It does not predetermine whether the correction belongs
in the ESP32 Wi-Fi wrapper or a deeper Espruino handoff mechanism.

## Prioritised work

### 0. Preserve the current-master baseline

This phase is complete for the retained asynchronous reproducers. Before each
later correction, rerun the relevant focused probe against the latest upstream
`master`; after each correction, rerun its recovery case and the shared
regression subset on classic ESP32, C3 and S3.

Keep the dated baseline immutable after review. Further experiments should use
new dated records rather than rewriting these observations.

### 1. Resolve ping result handoff on S3

Status 2026-11-23: the focused physical and source investigation is complete.
One exact-current-master loopback request reproduced malformed callback data
and interpreter interruption. A task-context probe confirmed that ESP-IDF's
separate `ping` task directly creates and queues `JsVar` objects, and can move
between S3 cores while doing so.

A subsequent station audit confirmed that `Wifi.connect()`,
`Wifi.disconnect()` and scan requests begin in `espruinoTask`, while their
ESP-IDF events and current JavaScript work run in `sys_evt`. The existing
`EV_CUSTOM` buffer is no longer assumed to be a safe direct solution: its
producer exclusion is a no-op on ESP32 and it already has UART and Bluetooth
task producers. Maintainer agreement is now required between correcting that
shared buffer or adding one bounded ESP32 network queue drained through
`net_esp32_idle()`. No production correction has yet been implemented. See
[`../../../tests/Results/WIFI_BLE_Results/2026-11-24-esp32-s3-ping-isolated-webide-reproduction.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-24-esp32-s3-ping-isolated-webide-reproduction.md),
[`../../../tests/Results/WIFI_BLE_Results/2026-11-23-esp32-s3-ping-result-handoff.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-23-esp32-s3-ping-result-handoff.md),
[`../../../tests/Results/WIFI_BLE_Results/2026-11-23-esp32-network-task-context.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-23-esp32-network-task-context.md),
[`esp32-network-native-event-handoff-2026-11-23.md`](esp32-network-native-event-handoff-2026-11-23.md)
and
[`ping-current-master/s3-result-handoff-issue-draft.md`](ping-current-master/s3-result-handoff-issue-draft.md).

Raise a separate concise issue using the smallest single-ping S3 reproduction.
The issue should show an accepted loopback call, malformed callback data and
the interpreter out-of-memory interruption. It should also note that classic
and C3 deliver the same basic five-result request successfully.

Before implementation:

1. trace the ESP-IDF ping callback task and the exact Espruino functions called
   from it;
2. identify whether any `JsVar` creation, mutation, locking or queue mutation
   occurs outside the interpreter context;
3. compare the mechanism with other maintained ESP32 asynchronous APIs; and
4. agree with the maintainer whether the correction belongs in ping or in a
   shared native-event handoff.

Do not revive the earlier private response queue automatically. Reuse an
established bounded handoff if one exists; otherwise propose the smallest
shared mechanism justified by the reproduction.

This investigation must also identify the authoritative ping-operation
boundary:

- which context marks a native session active;
- which context may safely retain or release the JavaScript callback;
- whether native `on_ping_end` is sufficient to make the API reusable, or
  whether queued results must first be handed safely to the interpreter; and
- how reset detaches the JavaScript consumer without allowing remaining native
  results to reach a later request.

Do not implement the overlap marker until this boundary is understood. The S3
correction may introduce or select the operation state that overlap rejection
should use; implementing a separate marker first risks clearing it from the
wrong task or making the API reusable while old results are still pending.

### 2. Reject overlapping ping sessions using the agreed lifecycle

Once the S3 handoff and operation boundary are agreed, reject a second request
before it changes the callback or creates another native session. The required
public behaviour remains the small correction suggested during maintainer
review.

The change should:

- track an accepted session independently of callback presence;
- validate arguments and reject a second request before changing the accepted
  session;
- release the active state on creation failure, start failure and the agreed
  terminal handoff; and
- prove later sequential recovery with and without a callback.

Keep overlap rejection independently reviewable where the agreed handoff makes
that practical. Its issue and PR must state that it prevents overlap; it must
not claim to fix C3 native-resource exhaustion or reset lifetime by itself.

### 3. Resolve C3 native ping-session cleanup

Use the refined sequential soak as the issue reproduction. The defining
result is 24 completed sessions, 120 callbacks and native heap falling from
71,224 to 1,048 bytes before session creation fails. Classic completing 28
sessions with no final heap loss is the control.

Investigate native task/session deletion and when FreeRTOS can reclaim the
completed ping task on a single-core target after the task-priority change.
The correction must not depend on the current hard-coded count of five ping
requests, and it must not impose an interpreter idle hook that runs
continuously when no cleanup is pending.

Rerun the C3 soak after the S3 handoff and overlap changes before finalising a
cleanup design. A corrected handoff may alter session completion timing or
interpreter scheduling and therefore either change the failure or identify a
smaller common lifecycle correction.

Qualification should include at least 28 sessions, 140 callbacks, timeout and
recovery, and warmed native-heap comparison on all three boards after the S3
handoff is reliable.

### 4. Correct station connection ownership

This is the highest-priority station change and the critical firmware
dependency for the XFSM Wi-Fi manager.

The focused change should:

- finish JavaScript argument validation before changing stored callback state;
- represent an accepted connection even when no callback is supplied;
- reject overlap before changing SSID, ESP-IDF configuration or the accepted
  callback;
- establish ownership before native work can produce a completion event;
- complete and clear ownership on usable IP, terminal connection failure or an
  immediate native error;
- ensure immediate ESP-IDF errors are catchable or callback-visible; and
- remove the password from debug output.

Connection reset must be considered in this design even if submitted as a
later focused change. Clearing the callback alone is insufficient because the
baseline shows that the continuing native attempt rejects the first recovery
request.

Do not change the existing native retry count in this correctness PR. Retry
policy and documentation remain separate compatibility decisions.

### 5. Make station disconnection exactly once

Build this after the connection owner exists, because disconnecting while
connecting must complete the accepted connection and the disconnect request
independently.

Cover connected, connecting and idle paths. Complete from the native event
when one is expected; otherwise complete from the immediate no-event path.
Both paths must claim and clear the same request before scheduling its optional
callback. The public `disconnected` event remains independent.

### 6. Close reset lifetimes deliberately

After explicit operation state exists, qualify reset for ping, connect and
disconnect together, while retaining separate API-specific implementation:

- no callback installed by the discarded JavaScript program may run;
- old native work must not deliver through a callback installed by a new
  request;
- recovery must either wait for safe native completion or cancel the old work;
- no callback reference, session or operation marker may remain permanently;
  and
- hardware reset must not be required for ordinary API recovery.

Reset fixes may be separate PRs when that keeps review scope small. Their
state requirements must be anticipated in the earlier overlap and ownership
changes so the same lifecycle is not redesigned twice.

### 7. Close API contract and documentation gaps

Once the lifecycle is reliable:

- establish whether the ESP32 implementation actually publishes the
  documented `dhcp_timeout` event;
- document native connection retries and the need for an application timeout;
- review disconnect reason representation and missing reason mappings such as
  reason 36;
- document unsupported optional callbacks such as the current ESP32
  `getStatus()` and `getHostname()` callbacks; and
- rebaseline or retire the older directional-ping and legacy post-`setIP()`
  anomalies.

Application credentials remain explicit `Storage` configuration for the XFSM
example. `wifi.save()` and automatic startup remain outside this work because
the FSM must remain the connection-policy owner.

## Upstream issue and PR structure

Do not reopen the large umbrella implementation. Keep this local document as
the integrated programme record and create public work only when its focused
current-master reproduction and expected result are ready.

Recommended public sequence:

1. S3 ping result-handoff issue, root-cause agreement and focused correction;
2. ping overlap rejection using the agreed operation lifecycle;
3. C3 completed-session native cleanup;
4. station connection ownership and visible errors;
5. station disconnection exactly once;
6. API-specific reset corrections; and
7. documentation-only follow-ups.

Where a later change depends on an earlier state marker, start its branch from
the earlier candidate for local integration testing, but submit it only after
the prerequisite has merged and the branch has been rebased onto current
`master`.

## Qualification model

Each focused PR needs its smallest reproduction plus proportional family
regression. The combined candidate and final merged result should cover:

- valid, invalid and callback-less overlap;
- successful ping and connection;
- unavailable network and incorrect password;
- immediate native failure where it can be reproduced naturally;
- connected, connecting and idle disconnect;
- reset at active and queued-completion timings;
- recovery after every terminal path;
- repeated ping and connect/disconnect cycles;
- native and JavaScript heap stability; and
- public Wi-Fi events independently of per-call callback counts.

The three physical targets remain the runtime matrix. Clean builds should also
cover all maintained ESP32-family board definitions affected by shared source.

## Final integration with the XFSM Wi-Fi manager

The firmware wrapper should own request validation, native-operation
ownership, completion and event publication. XFSM should continue to own
application policy: connection timeout, retry timing, credential selection,
provisioning and recovery.

The final integration exercise should cover valid connection, incorrect
password, unavailable AP, AP loss/restoration, application timeout and
deliberate cancellation. Timers must be cancelled on state exit, and the FSM
must still reconcile late public lifecycle events with observed driver state
because native Wi-Fi events do not carry an application attempt generation.

## Immediate next decision

Reduce the single-S3-ping evidence to a short upstream-quality reproduction,
trace its native-task-to-interpreter path and prepare the concise handoff issue.
Agree the ownership and terminal-handoff mechanism before creating the overlap
implementation branch. Then implement overlap rejection as the first behaviour
change built on that agreed lifecycle.
