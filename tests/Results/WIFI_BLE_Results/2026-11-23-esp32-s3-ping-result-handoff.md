# ESP32-S3 single-ping result-handoff investigation

Date: 2026-11-23

## Result

One loopback `Wifi.ping()` request on the ESP32-S3 can corrupt its callback
result and stop JavaScript execution. The request does not need to overlap
another ping.

The ESP-IDF result callbacks run in the separate `ping` task. Current Espruino
code creates and mutates `JsVar` objects and calls `jsiQueueEvents()` directly
from that task. A temporary task-context trace confirmed that the `ping` task
can execute first on core 0 and then on core 1 while the interpreter remains in
`espruinoTask` on core 0.

The direct JavaScript work in the native task is therefore the demonstrated
failure boundary. The evidence does not attribute the problem simply to core
1: it is unsafe for a separate FreeRTOS task to manipulate interpreter state,
regardless of the core on which that task happens to run.

## Firmware and target

| Item | Value |
|---|---|
| Espruino source | exact upstream `master` before temporary trace instrumentation |
| Espruino commit | `4addf143c74900044d8b6ba84784d2deb807f2c4` |
| Espruino version | `2v29.535` |
| Board definition | `ESP32S3` |
| ESP-IDF | `v5.5.3` |
| Target | ESP32-S3 revision 0.1, 8 MB PSRAM |
| Target MAC | `68:b6:b3:27:2c:40` |
| Serial path | `/dev/serial/by-id/usb-Espressif_USB_JTAG_serial_debug_unit_68:B6:B3:27:2C:40-if00` |

The retained reproducer is
[`../../../docs/investigations/wifi/repros/esp32_wifi_ping_single_handoff.js`](../../../docs/investigations/wifi/repros/esp32_wifi_ping_single_handoff.js).
It makes one loopback request, validates all eight documented result fields and
expects five callback executions followed by a completion timer.

## Exact-current-master reproduction

The unmodified release build accepted the request and delivered four complete
results. ESP-IDF then reported the fifth result, but Espruino stopped before it
could execute the fifth JavaScript callback or the completion timer:

```text
INFO call=accepted
INFO callback={"index":1,"type":"object","valid":true,"result":{"totalCount":1,"totalBytes":64,"totalTime":0,"respTime":0,"seqNo":1,"timeoutCount":0,"bytes":64,"error":0}}
INFO callback={"index":2,"type":"object","valid":true,"result":{"totalCount":2,"totalBytes":128,"totalTime":0,"respTime":0,"seqNo":2,"timeoutCount":0,"bytes":64,"error":0}}
INFO callback={"index":3,"type":"object","valid":true,"result":{"totalCount":3,"totalBytes":192,"totalTime":0,"respTime":0,"seqNo":3,"timeoutCount":0,"bytes":64,"error":0}}
INFO callback={"index":4,"type":"object","valid":true,"result":{"totalCount":4,"totalBytes":256,"totalTime":0,"respTime":0,"seqNo":4,"timeoutCount":0,"bytes":64,"error":0}}
[/home/simon/MaBecker/Espruino_master/libs/network/esp32/jswrap_esp32_network.c]:espruino_ping_event
OUT OF MEMORYExecution Interrupted
New interpreter error: MEMORY
```

The runner returned failure because `DONE` was not reached.

The clean source was rebuilt and reflashed after the task-context probe. That
binary had SHA-256
`592cc34d2c3ddaf5adfd3f5316910e709b0a4a6fa661e81e2f3fe38025da643e`.
An immediate control run completed all five valid callbacks and returned
`DONE=PASS`. The two failures followed by one pass establish that the defect
is timing-sensitive; the focused script is a reproducer, not a claim that
every invocation must fail.

## Task-context probe

Three temporary `jsDebug()` statements printed the current FreeRTOS task and
core at `jswrap_wifi_ping()`, `emit_espruino_ping_event()` and
`esp5_ping_on_end()`. No control flow or result handling was changed. The
instrumented firmware binary had SHA-256
`0189711cc32933a43127be874dbf2ad31b7ee2ad68b28eae117ca4ba31f27797`.

The rerun showed:

```text
jswrap_wifi_ping task=espruinoTask core=0
espruino_ping_event task=ping core=0
INFO callback={"index":1,"type":"object","valid":true,...}
espruino_ping_event task=ping core=1
INFO callback={"index":2,"type":"object","valid":true,...}
espruino_ping_event task=ping core=1
INFO callback={"index":3,"type":"object","valid":false,"result":{"totalBytes":3,"totalBytes":192,"totalTime":0,"respTime":0,"seqNo":3,"timeoutCount":0,"bytes":64,"error":0}}
espruino_ping_event task=ping core=1
```

The third object is malformed: the `totalCount` property is absent and
`totalBytes` occurs twice. JavaScript again stopped before the completion
timer. The temporary statements were then removed; the firmware branch has no
source diff from `4addf143c`.

## Web IDE follow-up

A later manual RAM execution in the Espruino Web IDE reported one affected
attempt in five. The relevant end of that attempt was:

```text
espruino_ping_event
CALLBACK 4 {"totalCount":4,"totalBytes":256,"totalTime":0,"respTime":0,"seqNo":64,"timeoutCount":0,"bytes":64,"error":0}
espruino_ping_event
New interpreter error: LOW_MEMORY,MEMORY_BUSY
COUNT 5
COUNT 4
```

The fifth native result was reported, but no fifth callback belonging to the
affected attempt followed. `JSERR_MEMORY_BUSY` is set by `jsvNewWithFlags()`
when allocation is attempted while `isMemoryBusy` indicates that the
interpreter is already performing memory work such as garbage collection.
This is direct evidence of the native ping task reaching JavaScript allocation
while interpreter memory is busy.

The two `COUNT` lines came from two still-active test timer closures in the RAM
session. They therefore cannot be treated as two counts for one isolated run,
and the reported one-in-five rate is not used as a formal failure frequency.
The missing callback after the fifth native event and the `MEMORY_BUSY` flag
remain valid observations.

## Source finding

ESP-IDF invokes `on_ping_success`, `on_ping_timeout` and `on_ping_end` from its
internal ping task. In Espruino:

1. `esp5_ping_on_success()` and `esp5_ping_on_timeout()` call
   `emit_espruino_ping_event()`;
2. that function reads the native profile and calls `jsvNewObject()` and eight
   `jsvObjectSetIntChild()` operations;
3. it calls `jsiQueueEvents()` and then unlocks the result object; and
4. `jsiQueueEvents()` itself creates more `JsVar` objects and mutates the
   interpreter's global `events` array.

The word “queue” in `jsiQueueEvents()` does not make it a native-to-interpreter
handoff. It is already JavaScript/interpreter work.

## Initial candidate correction boundary

The smallest established handoff appears to be Espruino's bounded IO-event
buffer:

- the native ping callback can copy one complete result as ordinary C data;
- an `EV_CUSTOM` record fits within the current 64-byte event payload;
- `jshPushEvent()` wakes the interpreter through `jshHadEvent()`; and
- the generated custom-event handler runs from `jsiIdle()` and can safely
  create the result object and schedule the JavaScript callback.

This avoids the earlier ping-private five-result queue and avoids adding a
ping idle function that is polled on every interpreter pass.

One point needs maintainer agreement before implementation. `jshPushEvent()`
is intended for native/interrupt input and is already used by ESP32 UART and
Bluetooth receive paths, but its `jshInterruptOff()` / `jshInterruptOn()`
exclusion is currently a no-op on ESP32. Reusing the event buffer is smaller
and follows an established Espruino path, but the intended FreeRTOS
multi-producer guarantee should be confirmed rather than assumed.

A subsequent station-event audit confirmed that `sys_evt` also needs a
native-to-interpreter handoff and that the existing IO buffer already has
UART and Bluetooth task producers. The `EV_CUSTOM` route is therefore not the
current recommendation unless its ESP32 producer synchronisation is corrected
first. See the
[shared network handoff analysis](../../../docs/investigations/wifi/esp32-network-native-event-handoff-2026-11-23.md).

## Operation boundary carried into later work

Native result callbacks must not read, replace or release the stored
JavaScript callback. Results should remain ordered as plain-C records. An
interpreter-side terminal record may release the callback and make the API
reusable only after all earlier result records have been consumed.

`on_ping_end` starts native session deletion, but it is not by itself proof
that queued results have reached JavaScript or that the native ping task has
been reaped. The latter remains the separately recorded C3 native-heap issue.
Reset and later requests will also require a request generation or equivalent
identity so that an old queued result cannot be delivered to a new callback.

No firmware correction was implemented during this investigation.
