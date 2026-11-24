# ESP32 native network callbacks access Espruino’s JavaScript variable memory outside the interpreter task

Espruino’s ESP32 network wrapper registers native C callback handlers with ESP-IDF for ping results and Wi-Fi events. ESP-IDF invokes those handlers from background FreeRTOS tasks, outside `espruinoTask`.

The current wrapper implements these handlers by creating and manipulating Espruino `JsVar` objects—including result objects, callback arguments and interpreter-event entries.

The issue is that, at the same time, `espruinoTask` may be using the same variable memory to run JavaScript or perform garbage collection. This unsynchronised access can corrupt callback arguments, prevent callbacks from being delivered, or produce interpreter errors such as MEMORY_BUSY and Variable type cannot be converted to string.

The handlers could instead copy the event values into an ordinary C record and let `espruinoTask` create the JavaScript object and schedule the
callback.

The problem is now physically observable on an ESP32-S3. Within a single non-overlapping loopback `Wifi.ping()` session, callback data can become malformed or callback processing can end with an interpreter memory error. No overlapping ping request is required.

Tested with an `ESP32S3` debug-enabled release build from exact Espruino `master`
`4addf143c` (`2v29.535`, ESP-IDF 5.5.3).

## Reproduction

Upload the following program to RAM after resetting the target. It makes one
loopback ping request; there is no second request with which it can overlap.

```javascript
echo(false);
var count = 0;

require("Wifi").ping("127.0.0.1", function (result) {
  print("CALLBACK " + (++count) + " " + JSON.stringify(result));
});

setTimeout(function () {
  print("COUNT " + count);
}, 7000);
```

A correct run prints five complete result objects and `COUNT 5`. The failure
is timing-sensitive, so the same program can also complete normally. In a
retained run of this exact program, callback one was valid. The second native
result was followed by an out-of-memory error while the callback executed
`JSON.stringify()`. After the third native result, the S3 raised an unhandled
`LoadStoreError` and restarted. The abridged relevant output was:

```text
CALLBACK 1 {"totalCount":1,...,"seqNo":41,...}
espruino_ping_event
OUT OF MEMORY    at :1:48
print('CALLBACK '+ ++count+' '+JSON.stringify(a))
                                              ^
espruino_ping_event
Guru Meditation Error: Core  0 panic'ed (LoadStoreError).
```

The panic's ELF hash exactly matches the tested build. The symbolised
backtrace runs through `jsvStringIteratorGetChar()`, `jsvAppendStringVar()`,
`jsvAsString()` and `jswrap_json_stringify()` while `espruinoTask` is executing
the JavaScript callback.

To exclude request overlap as an explanation, a controlled follow-up started
each ping session only after the previous session had delivered five valid
callbacks, followed by a further 1.5-second delay. Runs one and two completed.
Run three delivered four valid objects, then its fifth native result produced:

```text
espruino_ping_event
CALLBACK={"run":3,"index":5,"valid":false,"result":4995615}
RUN_END={"run":3,"callbackCount":5,"status":"malformed_callback_result"}
RESULT=REPRODUCED
```

Further controlled runs reproduced a callback string-conversion error and
`LOW_MEMORY,MEMORY_BUSY` during a one-request variable-memory contention probe;
the retained traces and complete test programs are linked below.

## Source and task-context finding

For IDF5 ping, ESP-IDF creates a FreeRTOS task named `ping`. After each result,
that task invokes the success or timeout callback registered by Espruino.
Those callbacks call `emit_espruino_ping_event()` before returning to ESP-IDF.

`emit_espruino_ping_event()` reads the native result values, creates a
`JsVar` response object, adds its result properties and passes that object,
together with the stored JavaScript callback, to `jsiQueueEvents()`. All of
this work is therefore performed by the `ping` task.

`jsiQueueEvents()` immediately creates a `JsVar` event object and argument array and
appends them to the interpreter's global `events` array. It defers execution
of the JavaScript function, but the JavaScript variable-memory operations have
already occurred in the calling task.

The source review shows that this task-boundary problem is not limited to
`Wifi.ping()`. Calls such as `Wifi.connect()`, `Wifi.disconnect()`,
`Wifi.scan()` and the access-point lifecycle APIs begin when user JavaScript
invokes their wrappers in `espruinoTask`. Their later ESP-IDF Wi-Fi and IP
events are delivered through the registered `wifi_event_handler()` in the
separate `sys_evt` task.

Temporary instrumentation confirmed this execution path:

```text
jswrap_wifi_connect task=espruinoTask core=0
wifi_event_handler task=sys_evt core=0
Event: STA_CONNECTED (4)
wifi_event_handler task=sys_evt core=0
Event: OTHER (0)                  // station obtained an IP address
jswrap_wifi_disconnect task=espruinoTask core=0
wifi_event_handler task=sys_evt core=0
Event: STA_DISCONNECTED (5)
```

While executing in `sys_evt`, branches of `wifi_event_handler()` and their
helpers create `JsVar` detail objects, publish `Wifi.on(...)` events, queue
completion callbacks and release stored callback references. Scan and
access-point event paths perform similar JavaScript variable-memory work.

The source therefore identifies the same unsafe task boundary in the wider ESP32 Wi-Fi implementation. Observable corruption has so far been physically reproduced only for ping; the station trace establishes its execution context rather than claiming an equivalent station failure.

## Direction requested

Given the issue, it seems a fix needs to establish where native handling
ends and work owned by the JavaScript interpreter begins. Before preparing that
correction, I would appreciate direction on three points:

1. Should the ESP32 network wrapper enforce a boundary where handlers called
   from native FreeRTOS tasks may perform the necessary native C work and
   capture the resulting native data, but `espruinoTask` performs all `JsVar`, event and
   JavaScript-callback work?

2. One possible handoff is the existing EV_CUSTOM path through Espruino’s fixed-size circular IO-event buffer. On ESP32, however, the buffer relies on jshInterruptOff() / jshInterruptOn(), which are currently no-ops, and the buffer already has producers in UART and Bluetooth task contexts.

    Should we verify and, if necessary, make the ESP32 IO-event buffer safe for concurrent writes from multiple FreeRTOS tasks before using its EV_CUSTOM path for network events?

    Or would it be preferable to keep the change local to the ESP32 network backend with a small bounded queue, with jshHadEvent() waking the interpreter and net_esp32_idle() draining the queue? Is there another existing handoff mechanism that would be more appropriate?

3. Should the first correction move only ping results into `espruinoTask`, as
   the smallest physically demonstrated change, with the other Wi-Fi and IP
   event paths following separately? Or should ping and those other event paths
   move together because they require the same transport boundary?

The current preference is a bounded queue local to the ESP32 network backend,
introduced first for ping and then reused by focused station changes but I would prefer to confirm the intended architecture before preparing the
PR.

What ever handoff is chosen will need defined behaviour when its bounded storage is full or JavaScript is reset while native results remain pending. In particular, a result belonging to the discarded JavaScript runtime must not later be delivered to a callback registered by a new runtime.

Detailed evidence:

- [isolated Web IDE reproduction](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-24-esp32-s3-ping-isolated-webide-reproduction.md)
- [S3 ping result-handoff investigation](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-23-esp32-s3-ping-result-handoff.md)
- [station task-context probe](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-23-esp32-network-task-context.md)
