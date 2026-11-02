# ESP32 Wi-Fi Asynchronous Operation Lifecycle

Date: 2026-11-02

## Decision

The ping, connect and disconnect findings should be handled as one API design
problem but not as one generic implementation framework. They share a common
contract—accepted asynchronous work has explicit ownership and exactly one
terminal outcome—while their native lifecycles differ enough to justify small,
API-specific state models.

The existing three-commit ping correction remains the right base. The new
evidence adds a reset/kill requirement; it does not invalidate the restored
address parsing, IDF5 session handling, cross-family idle delivery or C3 task
priority work.

Authoritative target observations are in
[`../../../tests/Results/WIFI_BLE_Results/2026-11-02-esp32-wifi-async-operation-probes.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-02-esp32-wifi-async-operation-probes.md).

## Shared Contract

For every asynchronous Wi-Fi API:

1. validate all JavaScript arguments before changing current operation state;
2. represent operation activity independently of callback presence;
3. reject incompatible overlap before replacing callbacks or native state;
4. once accepted, produce exactly one terminal completion;
5. convert immediate native failures into a JavaScript-visible terminal result,
   not only `jsError` output;
6. detach JavaScript ownership safely during `reset()` and wrapper shutdown;
7. keep native tasks and event handlers from directly owning or unlocking
   `JsVar` values;
8. preserve public lifecycle events independently of per-call completion.

A rejected overlapping call should throw a catchable `Error`, as the corrected
IDF5 ping implementation already does. It must leave the accepted operation
and its callback untouched. A native failure after a call has been accepted
should complete that accepted call through its documented callback contract.

## API-Specific Models

### Ping

The useful native model is `IDLE -> RUNNING -> DRAINING -> IDLE`:

- `RUNNING` owns the IDF session whether or not JavaScript supplied a callback;
- `DRAINING` retains the final result until `on_ping_end` confirms that a new
  session may start;
- overlap is rejected while either non-idle state owns the session;
- reset/kill stops or detaches the native producer, clears pending response
  delivery and prevents old-runtime callbacks from entering the event queue.

The current response queue and interpreter-idle delivery remain appropriate
for keeping `JsVar` work out of the native ping task. The teardown path must be
designed around ESP-IDF's asynchronous session deletion rather than merely
nulling the JavaScript callback.

Two hardening items should be included while touching this code:

- publish terminal session state only after the native delete handoff is in a
  safe order, so a dual-core target cannot observe a prematurely reusable
  session;
- use the single response-queue-size constant for both queue capacity and ping
  count, and diagnose rather than silently discard an impossible overflow.

### Station connect

The station model needs an explicit `CONNECTING` owner even for callback-less
calls. A second connect while that owner is active should be rejected before
SSID, options, callback or native configuration is changed.

For an accepted call:

- store its completion ownership before starting a native transition that can
  generate events;
- complete success on the usable-IP event, not association alone;
- complete failure on the terminal disconnected path or an immediate native
  error;
- clear ownership through one helper that atomically takes the callback and
  marks the operation inactive.

The existing public `associated`, `connected`, `disconnected` and
`dhcp_timeout` events remain event-stream observations. They must not be used
as a substitute for per-operation ownership.

### Station disconnect

Disconnect needs `IDLE` and `DISCONNECTING` ownership:

- if a native disconnect is accepted and will generate a terminal event,
  complete only from that event;
- if the station is already stopped or no event can occur, complete once from
  the immediate path;
- take and clear the stored completion before queuing it;
- define cancellation of an active connect as a separate outcome for the
  connect operation while still completing the disconnect operation once.

This removes the current dual completion without suppressing the public
`disconnected` event.

## Implementation Sequence

1. Add the ping reset/kill correction and the two small queue/lifecycle
   hardening changes to the current ping branch.
2. Rerun the existing 35-check/28-session, timeout, recovery, heap-soak and
   exact-branch ping matrix plus the new callback-less and reset probes.
3. Correct connect ownership, validation ordering and immediate-error
   completion as a focused change.
4. Correct disconnect exactly-once completion and connect cancellation as a
   focused change.
5. Run the combined probe set on classic ESP32, C3 and S3 IDF5 where the code
   path is shared, retaining older-IDF compile and regression coverage.
6. Use the resulting firmware as the substrate for the XFSM Wi-Fi manager;
   retain FSM timeouts and stale-event reconciliation because physical Wi-Fi
   events still cannot carry an application attempt generation.

Keeping the firmware corrections focused makes upstream review and regression
attribution easier. The umbrella discussion can explain the shared contract,
while separate commits or pull requests can preserve the distinct native
lifecycle proofs.

## Additional Security Observation

`jswrap_wifi_connect()` currently includes the supplied password in a
`DBG_INFO` message. That is unrelated to callback ownership but was visible in
the target transcript. Remove the password from that diagnostic in any branch
that touches the function; do not preserve it merely for debugging parity.
