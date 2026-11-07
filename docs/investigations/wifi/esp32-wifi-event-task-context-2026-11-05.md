# ESP32 Wi-Fi event-handler execution context

## Conclusion

The ESP32 Wi-Fi and IP event handlers run outside Espruino's JavaScript
interpreter task on IDF3, IDF4 and IDF5.

The current handler nevertheless creates and unlocks `JsVar` values, appends
to Espruino's JavaScript event queue, publishes `Wifi` events and takes or
clears module-level JavaScript callback references. There is no task-boundary
handoff or common lock protecting those operations from the interpreter task.
`jsiQueueEvents()` is not itself such a handoff: it allocates JavaScript
objects and appends them to the interpreter's `events` array.

PR2 must therefore not add connection-operation ownership on top of the
existing native-handler callback access. Native station events must first be
copied into a bounded plain-C queue and the interpreter awakened. An Espruino
idle handler can then drain the queue and perform all JavaScript allocation,
public event publication, callback completion and callback release in
interpreter context.

This conclusion follows directly from the task creation and handler dispatch
paths. A physical timing probe is not required to establish which task invokes
the handler.

## Source identities

- Espruino connection-hardening parent: `bc5f06466ea002bf1c5be9cf291cdacd53bb9f79`
- provisioned IDF4: tag `v4.4.8`, commit
  `e499576efdb086551abe309a72899302f82077b7`
- provisioned IDF5: tag `v5.5.3`, commit
  `2c211b236707889e8400c4dc5644dd5c4ee071e0`
- legacy IDF3 reference: `v3.3.6`; the archived Espruino IDF3 bundle reports
  `ESP_IDF_VERSION_MAJOR 3`, `MINOR 3`, `PATCH 6`

## Espruino interpreter context

`targets/esp32/main.c` defines `espruinoTask()`. That task initializes the
JavaScript variable and interactive subsystems with `jsvInit()` and `jsiInit()`
and then repeatedly calls `jsiLoop()`.

`app_main()` creates this as the dedicated FreeRTOS task named
`espruinoTask`, pinned to core 0 at priority 5. JavaScript heap and interpreter
work therefore runs in that task.

## ESP-IDF event dispatch contexts

### IDF5

`esp32_wifi_init()` calls `esp_event_loop_create_default()` and registers
`wifi_event_handler()` for the Wi-Fi and station-IP events with
`esp_event_handler_instance_register()`.

In IDF5 `default_event_loop.c`, the default event loop is configured with the
task name `sys_evt` and is created by `esp_event_loop_create()`. The latter
uses `xTaskCreatePinnedToCore()` to create the event-loop task. Its
`esp_event_loop_run_task()` dispatches registered handlers directly from that
task through `handler_execute()`.

Consequently, `wifi_event_handler()` executes in `sys_evt`, not
`espruinoTask`. On the single-core ESP32-C3 both are pinned to core 0, but they
remain separate FreeRTOS tasks and can pre-empt or interleave with each other.

### IDF4

For IDF4, `esp32_wifi_init()` uses the legacy
`esp_event_loop_init(event_handler, NULL)` interface. IDF4's
`event_loop_legacy.c` creates the default event loop and registers
`esp_event_post_to_user()` as its adapter. The default loop is again created
as a dedicated task named `sys_evt`, and that adapter invokes Espruino's
`event_handler()` directly.

The legacy API changes the registration route, not the execution context:
the Espruino handler still runs in the ESP-IDF event task.

### IDF3

The IDF3.3.6 legacy implementation is more direct. Its
`esp_event_loop_init()` creates a FreeRTOS task named `eventTask`. That task
receives each `system_event_t` from the native queue and calls the registered
user callback through `esp_event_post_to_user()`.

The IDF3 Espruino handler therefore also executes outside `espruinoTask`.

The corresponding upstream source is
[`components/esp32/event_loop.c` at IDF v3.3.6](https://github.com/espressif/esp-idf/blob/v3.3.6/components/esp32/event_loop.c).

## Operations currently crossing the task boundary

The shared IDF3/IDF4/IDF5 event-handler body currently performs JavaScript
work directly for:

- terminal station disconnection, including connection and disconnection
  callback completion;
- station association and usable-IP events;
- access-point station join and leave events;
- scan completion and its result array;
- access-point start completion.

Examples include calls to `jsvNewObject()`, `jsvObjectSet*()`,
`jsiQueueEvents()`, `jsiQueueObjectCallbacks()` and `jsvUnLock()`. It also
reads, replaces or clears global callback references that originate in the
interpreter task.

`jsiQueueEvents()` cannot make these calls safe. Its implementation creates a
JavaScript object and array and pushes that object into the global `events`
array. It is a JavaScript event queue, not a FreeRTOS or interrupt-safe native
queue.

## Existing handoff precedent

The IDF5 ping correction on the same Espruino parent demonstrates the required
shape:

1. the native ping task copies scalar response data into a bounded plain-C
   queue while holding `g_pingMux`;
2. it calls `jshHadEvent()` to wake the interpreter;
3. `jswrap_wifi_ping_idle()` drains the queue from Espruino's idle processing;
4. only that idle handler creates `JsVar` results and calls
   `jsiQueueEvents()`.

The Wi-Fi event handoff should follow the same ownership boundary, while using
a Wi-Fi-specific event record and bounds rather than depending on the ping
queue.

## Required consequence for PR2

The connection-hardening implementation must treat the native event handler
as a producer of plain-C lifecycle records only. The interpreter-side consumer
must own:

- changes to JavaScript callback references;
- exactly-once connection completion;
- creation and release of callback arguments;
- publication of the station lifecycle events handled by this correction;
  and
- reset-time detachment from the discarded JavaScript runtime.

The first implementation commit in PR2 should establish this handoff before
adding the connection-operation state machine. Since the same source finding
also applies to scan and access-point paths, the implementation review should
either migrate those paths through the same mechanical handoff or explicitly
retain them as a separately tracked follow-up. A station-only handoff must not
be described as resolving the broader event-handler context problem.

Queue capacity, overflow behaviour, event ordering and reset-time draining
must be specified and tested during Phase 4. They are implementation choices,
not assumptions resolved by this task-context investigation.

The current ESP32 handler has no explicit `dhcp_timeout` publication path.
Whether that public event can be supported from the available native events is
a separate contract question; it does not alter the task-boundary conclusion.
