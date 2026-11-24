# ESP32-S3 isolated `Wifi.ping()` Web IDE reproduction

Date: 2026-11-24

## Result

A controlled series of non-overlapping loopback ping sessions reproduced a
malformed JavaScript callback argument on the ESP32-S3. Two sessions completed
normally. On session three, the fifth native ping result reached Espruino, but
the JavaScript callback received the integer `4995615` instead of a result
object.

This is the primary human-operated physical reproduction for the proposed
upstream issue. It does not depend on overlapping ping requests, overlapping
test timers, an unavailable network or an external peer.

## Target and method

| Item | Value |
|---|---|
| Board | `ESP32S3` |
| Espruino version | `2v29.535` |
| Espruino commit | `4addf143c74900044d8b6ba84784d2deb807f2c4` |
| ESP-IDF | `v5.5.3` |
| Execution | Espruino Web IDE, uploaded to RAM after a clean target reset |
| Target | ESP32-S3 revision 0.1, MAC `68:b6:b3:27:2c:40` |

The retained program is
[`../../../docs/investigations/wifi/repros/esp32_wifi_ping_isolated_series.js`](../../../docs/investigations/wifi/repros/esp32_wifi_ping_isolated_series.js).
The complete normalized Web IDE transcript is retained as
[`2026-11-24-esp32-s3-ping-isolated-webide-trace.txt`](2026-11-24-esp32-s3-ping-isolated-webide-trace.txt).
A second normalized transcript, in which callback processing raised an
internal conversion error, is retained as
[`2026-11-24-esp32-s3-ping-webide-callback-exception-trace.txt`](2026-11-24-esp32-s3-ping-webide-callback-exception-trace.txt).
A later run of the reduced sequential reproducer ended in a separate ESP-IDF
time-lock abort. That trace is retained as
[`2026-11-24-esp32-s3-ping-time-lock-abort-trace.txt`](2026-11-24-esp32-s3-ping-time-lock-abort-trace.txt),
but is not used as evidence of `JsVar` corruption.
A deliberate single-session variable-memory contention probe is retained as
[`2026-11-24-esp32-s3-ping-defrag-contention-trace.txt`](2026-11-24-esp32-s3-ping-defrag-contention-trace.txt).
The exact simplified one-request program later produced a `LoadStoreError`;
that trace is retained as
[`2026-11-24-esp32-s3-single-ping-loadstore-panic-trace.txt`](2026-11-24-esp32-s3-single-ping-loadstore-panic-trace.txt).

It enforces the following isolation:

- a new session is not started until the preceding session has delivered five
  structurally valid callbacks;
- completed sessions are separated by 1.5 seconds;
- a seven-second watchdog detects a missing callback;
- every callback carries its run and callback index; and
- the program stops on the first missing, late, additional or malformed
  callback.

## Observed trace

Runs one and two each delivered five valid result objects and ended with
`status:"complete"`. Run three then produced four further valid objects,
followed by:

```text
[/home/simon/MaBecker/Espruino_master/libs/network/esp32/jswrap_esp32_network.c]:espruino_ping_event
CALLBACK={"run":3,"index":5,"valid":false,"result":4995615}
RUN_END={"run":3,"callbackCount":5,"status":"malformed_callback_result"}
RESULT=REPRODUCED
```

The native diagnostic line shows that ESP-IDF delivered the fifth result to
Espruino. The callback itself executed, but its argument was not the object
created by the ping wrapper. The validator rejected the integer and stopped;
no fourth session was started.

Across the complete transcript, the first fourteen callback arguments are
valid result objects whose visible `seqNo` values advance continuously from
101 to 114. A fifteenth `espruino_ping_event` diagnostic is then followed by
the fifth callback for run three, but that callback receives the malformed
integer and therefore exposes no readable `seqNo`. The `=undefined` and `>`
characters mixed with the early output are normal Web IDE/REPL prompt output
interleaved with asynchronous callbacks; they do not indicate additional ping
requests.

The reporter obtained this capture after approximately five or six executions
of the controlled series. That informal rate is not used as a measured failure
frequency. The isolated failure within the retained series is the evidence.

## Supporting callback-exception trace

A later controlled series completed its first three runs normally. On run
four, three valid callbacks with `seqNo` values 131 to 133 were followed by a
fourth native `espruino_ping_event`. The JavaScript handler then failed at the
`JSON.stringify()` call used to print the callback record:

```text
Uncaught InternalError: Variable type cannot be converted to string
   at :1:440
...:a,index:b,valid:!!j,result:g})),!j){e('malformed_callback_r...
                                ^
```

The next native event produced callback index five with `seqNo` 135. This
shows that the failed handler had already incremented `callbackCount` to four,
but could not serialize its result record. The missing printed callback would
have occupied the position between the visible sequence numbers 133 and 135;
the trace does not expose its sequence value directly.

This original harness version did not catch exceptions raised inside the
asynchronous callback. Callback five therefore allowed the run to finish and
the complete series eventually printed `RESULT=NOT_REPRODUCED_IN_SERIES`.
That final label is a harness false negative and is not evidence of a clean
series. The retained reproducer now catches callback-processing exceptions and
reports them as `RESULT=REPRODUCED`.

## Separate time-lock abort

While validating the reduced sequential reproducer, the S3 aborted on core 0
and restarted during its third ping session. The reported ELF hash
`b450275725d2815a` exactly matches the retained `2v29.535` S3 ELF built from
`4addf143c`.

The symbolised backtrace is:

```text
espruinoTask
  jsiLoop()
    jsiIdle()
      jshGetSystemTime()
        gettimeofday()
          get_adjusted_boot_time()
            _lock_acquire()
              lock_acquire_generic()
                abort()
```

`jshGetSystemTime()` calls `gettimeofday()` while inside
`portENTER_CRITICAL_ISR()`. ESP-IDF's ping task also calls `gettimeofday()`
when timing each request. If that background task holds the newlib time lock,
the interpreter task cannot block for the same lock while in the critical
section and ESP-IDF calls `abort()`.

This is a separate concurrency problem exposed by the ping workload. Moving
ping-result construction into `espruinoTask` would not remove the ping task's
own `gettimeofday()` calls, so this abort is not attributed to the `JsVar`
handoff fault without further work.

## Direct variable-memory contention probe

A subsequent probe made one loopback `Wifi.ping()` request, then kept
`espruinoTask` inside repeated `E.defrag()` calls. This deliberately exercised
the source-level conflict: the interpreter was collecting and reorganising
`JsVar` memory while the native ping task constructed results in that same
memory. No second ping request was made.

The native task reported all five ping events. The interpreter reported
`LOW_MEMORY,MEMORY_BUSY`; callback one was valid; processing callback two
raised `InternalError: Variable type cannot be converted to string`; callbacks
three and four were valid; and the fifth native event was followed by
`OUT OF MEMORY` and repeated interpreter interruption without a visible fifth
callback.

This is direct physical support for the task-boundary diagnosis. The
2,000-pass defragmentation workload was deliberately excessive and is retained
as a mechanism probe, not yet proposed as the concise upstream reproducer.

## Simplified single-request panic

The simplified reproduction shown in the issue draft subsequently failed
without any deliberate memory contention. It made one loopback ping request.
Callback one was valid; callback two reached `JSON.stringify()` but reported
`OUT OF MEMORY`; and after the third native ping event the S3 raised an
unhandled core-0 `LoadStoreError` and restarted.

The panic reported ELF hash `b450275725d2815a`, exactly matching the retained
`2v29.535` ELF from `4addf143c`. Its symbolised backtrace begins:

```text
jsvStringIteratorGetChar()
  jsvAppendStringVar()
    jsvNewWritableStringFromStringVar()
      jsvAsString()
        jswrap_json_stringify()
          JavaScript callback execution
            jsiExecuteEvents()
              jsiIdle()
                espruinoTask()
```

Unlike the separately recorded time-lock abort, this panic occurs while the
interpreter is converting the callback value to JSON. It is therefore retained
as direct evidence for the result-handoff issue.

## Interpretation boundary

This trace proves that a single accepted ping session can deliver a malformed
JavaScript callback argument. Together with the source call chain and task
trace, it supports the finding that the ESP-IDF ping task performs JavaScript
object and event-queue operations outside `espruinoTask`.

The trace does not by itself select the correction mechanism, and it does not
prove that a station API has already produced the same form of corruption.
