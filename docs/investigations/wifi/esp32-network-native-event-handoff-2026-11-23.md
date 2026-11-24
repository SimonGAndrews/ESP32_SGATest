# ESP32 native network-event handoff

## Conclusion

The current problem is broader than `Wifi.ping()`. ESP-IDF's `ping` and
`sys_evt` tasks both access Espruino JavaScript state directly. The source and
physical traces therefore justify one task-safe native-to-interpreter
transport for the ESP32 network backend, while ping, connect, disconnect and
scan retain separate API-specific completion rules.

The existing IO-event buffer should not be selected without further core work.
Its interrupt exclusion is a no-op on ESP32 and its variable-length ring is
already written by UART and Bluetooth task contexts. Reusing it for both ping
and Wi-Fi events would add producers to a queue whose multi-task safety is not
established.

The focused physical record is
[`../../../tests/Results/WIFI_BLE_Results/2026-11-23-esp32-network-task-context.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-23-esp32-network-task-context.md).
The earlier S3 ping record is
[`../../../tests/Results/WIFI_BLE_Results/2026-11-23-esp32-s3-ping-result-handoff.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-23-esp32-s3-ping-result-handoff.md).
The controlled human-operated reproduction is
[`../../../tests/Results/WIFI_BLE_Results/2026-11-24-esp32-s3-ping-isolated-webide-reproduction.md`](../../../tests/Results/WIFI_BLE_Results/2026-11-24-esp32-s3-ping-isolated-webide-reproduction.md).

## Shared boundary, separate lifecycles

The common transport needs to carry only bounded plain-C records and wake the
interpreter. It must not decide API policy. Interpreter-side consumers remain
responsible for:

- building JavaScript result and event objects;
- publishing `Wifi.on(...)` events;
- scheduling, releasing or retaining the callback belonging to a request;
- rejecting stale records after `reset()` or a later request; and
- deciding when each API-specific operation is complete.

Ping results, station association, usable IP, exhausted connection retries,
deliberate disconnection and scan completion are different records and
terminal conditions. A shared queue does not turn them into one generic state
machine.

## Preferred discussion direction

Before implementation, ask the maintainer to choose the ownership boundary:

- correct the general IO-event buffer for ESP32 multi-task producers and use
  `EV_CUSTOM`; or
- keep the correction local to `libs/network/esp32` with one bounded network
  queue drained by the existing `net_esp32_idle()` function.

The local network queue is presently the lower-risk implementation boundary.
It avoids changing a core variable-length ring used by serial, timers and
Bluetooth. It also answers the earlier idle-overhead concern if
`net_esp32_idle()` returns immediately when no record is pending.

This conclusion supersedes the initial suggestion to send ping results through
the existing `EV_CUSTOM` path without first correcting its ESP32 producer
synchronisation.

## Upstream issue shape

The issue can remain concise because this is one source-level concern rather
than another umbrella lifecycle report:

1. show the single-session S3 corruption;
2. show that ping results run in `ping` and station results run in `sys_evt`,
   while requests begin in `espruinoTask`;
3. identify the direct `JsVar` and `jsiQueueEvents()` calls in both native
   paths; and
4. ask which shared handoff boundary the maintainer prefers before a PR is
   prepared.

Connect/disconnect overlap, exactly-once completion, reset identity and native
ping cleanup remain separate behavioural corrections. They should use the
agreed transport rather than being folded into this first issue or PR.
