# ESP32 Wi-Fi API correctness and asynchronous-operation hardening: ping, connect and disconnect

This umbrella issue tracks a related set of Espruino ESP32 Wi-Fi API problems found while validating the ESP-IDF 5 port. The investigation now covers shared and IDF4 `Wifi.ping()` correctness as well as the IDF5 ping, station connection and station disconnection lifecycles.

The symptoms do not all have the same direct cause. The IPv4 parser and IDF4 ping-target configuration are correctness defects found while establishing a working test baseline. The remaining problems share an asynchronous-lifecycle concern: once an operation has started, Espruino must retain ownership of its native operation and JavaScript callback until both have finished or been cancelled safely.

The reproduced failure modes include:

- a second operation replacing the callback belonging to an earlier operation;
- a callback being invoked more than once;
- native work continuing to deliver results after JavaScript `reset()`; and
- a synchronous native failure being reported only through `jsError()`, without throwing an exception or completing the supplied callback.

This work is supported with the use of the codex AI agent in vscode for source analysis, test automation and documentation. The reported behaviour was reproduced on physical ESP32 boards and the source findings and test results were reviewed before including them here.

This umbrella issue keeps the overall investigation and its shared test evidence together. The fixes are intended to be submitted as separate, more easily reviewed pull requests:

1. IDF5 ping correctness, result delivery and reset handling.
2. Station connection overlap and error reporting.
3. Station disconnection and exactly-once callback handling.

Each reported runtime problem has been exercised on physical hardware using a standalone Espruino JavaScript or REPL program. The programs, observed output and relevant source paths are recorded below.

The retained test programs, firmware identities and longer investigation notes are available in the [ESP32_SGATest Wi-Fi investigation](https://github.com/SimonGAndrews/ESP32_SGATest/tree/main/docs/investigations/wifi).

## 1. `Wifi.ping()`

Testing `Wifi.ping()` identified several problems with different but sometimes overlapping causes. They are presented below in the order needed to establish a working baseline and then harden the asynchronous lifecycle.

An initial issue where valid IPv4 strings were rejected before an ESP-IDF ping session could be created is worked first:

### 1.1 Shared IPv4-string parsing failure

`Wifi.ping()` accepts its target as a string. Before selecting the IDF3,
IDF4 or IDF5 native ping implementation, the shared wrapper converts that
string into an lwIP `ip_addr_t`.

The failure is reproduced with:

``` js
echo(false);
try {
  require("Wifi").ping("127.0.0.1", print);
  print("PING_CALL=accepted");
} catch (error) {
  print("PING_CALL=rejected " + error);
}
```

On an affected build this returns:

```JS
PING_CALL=rejected Error: "127.0.0.1" not a valid IP address
```

#### Investigation result

Although this was found while validating the ESP-IDF 5 port, the failure is
in the shared `stringToIP()` helper and occurs before the implementation
branches by ESP-IDF version.

As background, commit `0b4ff45fa` added ESP-IDF 5 ping support using
Espressif's current `ping_sock` session API.

Commit `bad3fc7a5` later disabled IPv6 and removed the integer form of
`Wifi.ping()` in favour of string addresses. In the resulting IPv4-only path,
`stringToIP()` stored the parsed address but then fell through to return
`false`. Commit `e73051ad4` corrected the address-field access needed by the
classic ESP32 build, but did not change that return value.

Consequently, a valid dotted-decimal IPv4 string was rejected before the
IDF3, IDF4 or IDF5 ping backend could be entered.

#### FIX

The correction is limited to the non-IPv6 `stringToIP()` path. It identifies
the destination as IPv4 and returns the result of lwIP's `ip4addr_aton()`
parser:

```c
Diff
#if CONFIG_LWIP_IPV6
 ...
#else
-  ((ip4_addr_t*)ipAddr)->addr = networkParseIPv4Address(str);
+  IP_SET_TYPE_VAL(*ipAddr, IPADDR_TYPE_V4);
+  return ip4addr_aton(str, ip_2_ip4(ipAddr));
#endif
 return false;
}
```

This correction is commit `919bd2cce` and is included in the testing and PR below.

#### Test coverage

The corrected parser accepted `"127.0.0.1"` on physical classic ESP32,
ESP32-C3 and ESP32-S3 targets. Build and Runtime testing included the classic IDF3
build, all three IDF4 builds and all three IDF5 builds.

Successful parsing only establishes that the requested address reaches the
selected native backend. Subsequent testing exposed a separate IDF4 address
configuration problem, described in section 1.2, and native-task scheduling
starvation on the single-core C3, described in section 1.3.

### 1.2 ESP-IDF 4 used the deprecated compatibility API with an incompatible address representation

Correcting the shared parser allowed a valid IPv4 string to reach the selected
native ping implementation. Testing then showed that basic IDF4 ping operation
was still incorrect.

#### What was tested

The loopback call was tested on physical classic ESP32, ESP32-C3 and ESP32-S3
targets using IDF4 images that contained the parser correction but not the
IDF4 native-session correction:

```js
require("Wifi").ping("127.0.0.1", print);
```

The three targets produced different visible symptoms:

| Target | Call accepted | Callbacks delivered | Loopback succeeded |
|---|---|---|---|
| classic `ESP32_IDF4` | yes | yes | no |
| `ESP32C3_IDF4` | yes | no | not observable |
| `ESP32S3_IDF4` | yes | yes | no |

On the dual-core classic ESP32 and ESP32-S3, the five configured requests all timed out with zero received bytes. Each request completion was delivered through Espruino’s pre-IDF5 `pingResults()` cumulative-result adapter. When the native session ended, `PING_RES_FINISH` invoked that adapter once more without incrementing the request count. The observable result was therefore six JavaScript callbacks with cumulative `totalCount` values 1,2,3,4,5,5. The final callback was a terminal cumulative summary, not a sixth ICMP request.

The C3 accepted the call but delivered no callback during the observation
period. This prevented the address result from being observed on that target
and was subsequently identified as the additional scheduling problem
described in section 1.3.

#### Investigation result

Before this correction, every ESP-IDF version below 5 used the older target-setting interface:

```c
esp_ping_set_target(
    PING_TARGET_IP_ADDRESS,
    &ip.u_addr.ip4,
    sizeof(uint32_t));
ping_init();
```

This works for the legacy IDF3 implementation, but ESP-IDF 4
had changed the implementation behind this interface.

In ESP-IDF 4, `ping_init()` is a deprecated compatibility wrapper around the
newer `ping_sock` session API. Espressif’s source comments recommend using the
new API directly.

The IDF4 implementation of `esp_ping_set_target()` handles
`PING_TARGET_IP_ADDRESS` by calling:

```c
ipaddr_aton(opt_val, &ping_option_info->ping_target);
```

`ipaddr_aton()` expects `opt_val` to point to a textual address. Espruino
instead supplied a pointer to the binary IPv4 value inside its parsed
`ip_addr_t`.  The call was accepted because the option is passed as a
`void *`, but the binary value was then interpreted as text. The native
session therefore did not receive the requested loopback address.

#### Fix

The implementation is divided by ESP-IDF generation:

```c
#if ESP_IDF_VERSION_MAJOR < 4
  /* Existing legacy IDF3 implementation. */
#elif ESP_IDF_VERSION_MAJOR == 4
  /* IDF4 typed ping-session implementation. */
#else
  /* IDF5 lifecycle-hardened implementation. */
#endif
```

The IDF3 path remains unchanged.

The IDF4 path now creates the native session directly through the typed
`ping_sock` API:

```c
esp_ping_config_t ping_config = ESP_PING_DEFAULT_CONFIG();

ping_config.target_addr = ip;
ping_config.count = ping_count;
ping_config.timeout_ms = ping_timeout;
ping_config.interval_ms = ping_delay;

esp_ping_handle_t pingHandle = NULL;
esp_err_t err =
   esp_ping_new_session(&ping_config, &cbs, &pingHandle);

if (err == ESP_OK)
  err = esp_ping_start(pingHandle);
```

The IDF4 success and timeout callbacks continue to feed Espruino’s existing
`pingResults()` cumulative-result adapter through `esp_ping_result()`. When
the native session ends, the implementation reports `PING_RES_FINISH` before
deleting the session:

```c
static void esp4PingEnd(esp_ping_handle_t pingHandle, void *args) {
  esp_ping_result(PING_RES_FINISH, 0, 0);
  esp_ping_delete_session(pingHandle);
}
```

This deliberately preserves the existing IDF4 result shape: five per-request
callbacks followed by a duplicated cumulative terminal callback.

The IDF4 native-session correction is commit `b53aa5707` and is included in the PR below.

#### Test coverage

The final IDF4 candidate also included the task-priority correction described
in section 1.3. With both corrections applied, all three physical IDF4 targets
successfully pinged the loopback address:

| Target | Request callbacks | Final bytes | Timeouts | Errors |
|---|---:|---:|---:|---:|
| classic `ESP32_IDF4` | 5 | 320 | 0 | 0 |
| `ESP32C3_IDF4` | 5 | 320 | 0 | 0 |
| `ESP32S3_IDF4` | 5 | 320 | 0 | 0 |

Every target also completed two strictly serialized sessions. Each session
retained the older six-callback result shape, with cumulative `totalCount`
values:

```text
1,2,3,4,5,5
```

The sixth callback is the preserved terminal summary and does not represent a
sixth ICMP request.

This correction restores basic serialized IDF4 ping operation.

Once the IDF4 session was configured through the typed API, the C3 still
required the native-task scheduling correction described next in section 1.3.

### 1.3 The IDF4 and IDF5 ping tasks can be starved on single-core ESP32-C3

After restoring IPv4 string parsing, IDF5 testing on the ESP32-C3 exposed a
separate native-task scheduling problem. Later IDF4 testing produced the same
zero-callback symptom on the C3.

Both the corrected IDF4 implementation and the IDF5 implementation create
typed ESP-IDF ping sessions. Without an explicit setting, those sessions use
ESP-IDF’s default ping-task priority of 2.

#### What was tested

The problem was first observed with the two-call IDF5 loopback test described
in section 1.4:

```js
wifi.ping("127.0.0.1", firstCallback);
wifi.ping("127.0.0.1", secondCallback);
```

At this point in the investigation, the `ESP32C3_IDF5` test image contained the IPv4 parser correction from section 1.1. No other ping changes had been applied. Each native session was configured to make five requests, and the test waited six seconds before reporting the callback counts.

A separate IDF4 comparison used the single-call loopback test from section
1.2:

``` js
require("Wifi").ping("127.0.0.1", print);
```

The exact-parent `ESP32C3_IDF4` image accepted the call but delivered no
callback during a seven-second observation period. On the same source
revision, the dual-core classic ESP32 and ESP32-S3 IDF4 targets delivered
callbacks, although their requests timed out because of the separate address
configuration problem described in section 1.2.

#### Initial IDF5 result

On the ESP32-C3, both IDF5 calls were accepted but neither callback received a
result:

```text
FIRST_CALL=accepted
SECOND_CALL=accepted
FIRST_COUNT=0
SECOND_COUNT=0
```

The equivalent parser-only test produced ping results on the dual-core classic
ESP32.

After raising the native ping-task priority, the C3 produced all ten expected
result events. Their 1/9 distribution between the two callbacks then exposed
the separate callback-ownership problem described in section 1.4.

#### Investigation result

The relevant ESP-IDF ping implementations use `ESP_PING_DEFAULT_CONFIG()`.
This leaves the native ping task at ESP-IDF’s default priority of 2, while the
Espruino interpreter task runs at priority 5.

On the single-core ESP32-C3, the interpreter may remain runnable while the
native USB console is active. A priority-2 ping task can therefore be prevented
from running, leaving an accepted ping operation without any result callbacks.

The IDF5 before-and-after test directly demonstrated that raising the priority
allowed native ping processing to proceed. The IDF4 source uses the same priority-2 default. Its callbacks ran on the dual-core classic ESP32 and ESP32-S3 but not on the single-core C3, supporting the same scheduling explanation.

#### Fix

```c
#if ESP_IDF_VERSION_MAJOR < 4
  /* Existing legacy IDF3 implementation. */
#elif ESP_IDF_VERSION_MAJOR == 4
  esp_ping_config_t ping_config = ESP_PING_DEFAULT_CONFIG();
  ...
  ping_config.task_prio = 6;
#else
  esp_ping_config_t ping_config = ESP_PING_DEFAULT_CONFIG();
  ...
  ping_config.task_prio = 6;
#endif
```

Priority 6 is the lowest FreeRTOS priority above Espruino's priority-5
interpreter task. It allows the native ping task to run when the interpreter
remains continuously ready on a single-core target, without raising the ping
task further than is required to resolve that scheduling relationship.

The setting is applied to the complete IDF4 and IDF5 paths rather than behind
an ESP32-C3-specific guard. The C3 exposes the problem most reliably because
it is single-core, but the scheduling relationship belongs to the shared
version-specific implementations.

The legacy IDF3 path remains unchanged.

The IDF5 priority correction is part of commit `77e30bebb`. The corresponding IDF4 correction is commit `bc5f06466`. Both corrections are included in the testing and proposed PR below.

#### Test coverage

With the completed candidate, the classic ESP32, ESP32-C3 and ESP32-S3 all
successfully completed the five configured loopback requests on both IDF4 and
IDF5 builds. Each target reported 320 cumulative bytes with no timeout or
error.

Subsequent lifecycle testing described in sections 1.4 to 1.6 also exercised the completed ESP32-C3 IDF5 candidate across 28 sessions and 140 callbacks. This provides broader regression coverage but is not an isolated test of the priority correction.

All seven maintained ESP32-family board definitions also built successfully with the IDF4 and IDF5 priority changes.

The priority correction allows the native task to run. It does not by itself
prevent overlapping sessions or establish safe callback ownership; those IDF5
lifecycle issues are addressed next in section 1.4.

### 1.4 IDF5 overlapping sessions share the last callback

Testing then showed that two `Wifi.ping()` calls could create two native
sessions even though Espruino retained only one global JavaScript callback.
The second call replaced the first call’s callback while both native sessions
continued running.

#### What was tested

For the C3 test, the image contained the IPv4 parser correction from section
1.1 and the task-priority change from section 1.3. No other ping changes had
been applied.

The classic ESP32 comparison used an image containing the IPv4 parser
correction from section 1.1. No other ping changes had been applied.

The test starts two loopback ping sessions one after the other and counts which
callback receives each result:

```js
echo(false);

var wifi = require("Wifi");
var firstCount = 0;
var secondCount = 0;

function firstCallback(result) {
  firstCount++;
  print("FIRST_CALLBACK=" + JSON.stringify(result));
}

function secondCallback(result) {
  secondCount++;
  print("SECOND_CALLBACK=" + JSON.stringify(result));
}

try {
  wifi.ping("127.0.0.1", firstCallback);
  print("FIRST_CALL=accepted");
} catch (error) {
  print("FIRST_CALL=rejected " + error);
}

try {
  wifi.ping("127.0.0.1", secondCallback);
  print("SECOND_CALL=accepted");
} catch (error) {
  print("SECOND_CALL=rejected " + error);
}

setTimeout(function () {
  print("FIRST_COUNT=" + firstCount);
  print("SECOND_COUNT=" + secondCount);
}, 6000);
```

#### ESP32-C3 result

After raising the ping-task priority, both five-request sessions ran on the
ESP32-C3 and ten result callback invocations were observed:

```text
FIRST_CALL=accepted
SECOND_CALL=accepted
FIRST_CALLBACK={"totalCount":1,"totalBytes":64,"totalTime":0,"respTime":0,"seqNo":1,"timeoutCount":0,"bytes":64,"error":0}
SECOND_CALLBACK={"totalCount":1,"totalBytes":64,"totalTime":0,"respTime":0,"seqNo":2,"timeoutCount":0,"bytes":64,"error":0}
SECOND_CALLBACK={"totalCount":2,"totalBytes":128,"totalTime":0,"respTime":0,"seqNo":3,"timeoutCount":0,"bytes":64,"error":0}
SECOND_CALLBACK={"totalCount":2,"totalBytes":128,"totalTime":0,"respTime":0,"seqNo":4,"timeoutCount":0,"bytes":64,"error":0}
SECOND_CALLBACK={"totalCount":3,"totalBytes":192,"totalTime":0,"respTime":0,"seqNo":5,"timeoutCount":0,"bytes":64,"error":0}
SECOND_CALLBACK={"totalCount":3,"totalBytes":192,"totalTime":0,"respTime":0,"seqNo":6,"timeoutCount":0,"bytes":64,"error":0}
SECOND_CALLBACK={"totalCount":4,"totalBytes":256,"totalTime":0,"respTime":0,"seqNo":7,"timeoutCount":0,"bytes":64,"error":0}
SECOND_CALLBACK={"totalCount":4,"totalBytes":256,"totalTime":0,"respTime":0,"seqNo":8,"timeoutCount":0,"bytes":64,"error":0}
SECOND_CALLBACK={"totalCount":5,"totalBytes":320,"totalTime":0,"respTime":0,"seqNo":9,"timeoutCount":0,"bytes":64,"error":0}
SECOND_CALLBACK={"totalCount":5,"totalBytes":320,"totalTime":0,"respTime":0,"seqNo":10,"timeoutCount":0,"bytes":64,"error":0}
FIRST_COUNT=1
SECOND_COUNT=9
```

The board was reset immediately before this run, so the global `seqNo` counter started at 1. This counter increments across all ping results and is not a native session identifier.

The result objects contained each cumulative count twice:

```text
totalCount: 1,1,2,2,3,3,4,4,5,5
```

This is consistent with two separate five-request native sessions progressing
concurrently. Both sessions completed their five requests, producing ten
result events in total. One event was delivered to the first callback and nine
were delivered to the second callback. The events delivered to the second
callback therefore included results from both native sessions.

#### Interpretation from source analysis

Source inspection showed three relevant implementation details.

First, the tested implementation retained only one module-level JavaScript ping callback:

```c
static JsVar *g_jsPingCallback;
```

Second, every new call replaced that callback:

```c
if (g_jsPingCallback != NULL) {
  jsvUnLock(g_jsPingCallback);
}
g_jsPingCallback = pingCallback;
jsvLockAgainSafe(g_jsPingCallback);
```

Third, results from every native session were queued using the callback stored in this global variable when the result was handled:

```c
jsiQueueEvents(NULL, g_jsPingCallback, params, 1);
```

The ESP-IDF session handle was local to `jswrap_wifi_ping()`. No retained
handle or busy state prevented another call from creating an overlapping
session.

Together, the source and trace explain the observed 1/9 distribution. One
result was queued while the first callback was installed. The second call then
replaced the global callback, and subsequent results from both sessions were
queued using the replacement callback.

The exact split is scheduling-dependent. A 0/10 result was observed on the classic ESP32, while this C3 run produced 1/9. Both results are consistent with multiple native sessions sharing one mutable callback binding.

#### Fix

IDF5 now retains explicit native-session state independently of whether an
application callback was supplied.

Before processing or replacing `g_jsPingCallback`, `jswrap_wifi_ping()` checks
whether a ping operation is already active:

```c
#if ESP_IDF_VERSION_MAJOR >= 5
  bool pingActive;

  portENTER_CRITICAL(&g_pingMux);
  pingActive = g_pingState != ESP32_PING_IDLE;
  portEXIT_CRITICAL(&g_pingMux);

  if (pingActive) {
    jsExceptionHere(JSET_ERROR, "A ping is already in progress");
    return;
  }
#endif
```

After a native session has been created, its handle and running state are
retained rather than remaining local to `jswrap_wifi_ping()`:

```c
portENTER_CRITICAL(&g_pingMux);
g_pingHandle = pingHandle;
g_pingState = ESP32_PING_RUNNING;
portEXIT_CRITICAL(&g_pingMux);
```

During normal completion, the operation remains owned until ESP-IDF has ended
the native session and the retained responses have been drained. Only then
does `g_pingState` return to `ESP32_PING_IDLE`.

The completion, result-delivery and cancellation details are described in
sections 1.5 and 1.6. Those later changes refine the lifecycle without changing
the overlap-rejection contract.

The initial retained-handle and overlap-rejection correction is commit
`08739ca25`. Later lifecycle commits refine that ownership into the final
`g_pingState` state machine.

The expected result from the two-call reproduction is:

```text
FIRST_CALL=accepted
SECOND_CALL=rejected Error: A ping is already in progress
FIRST_COUNT=5
SECOND_COUNT=0
```

#### Test coverage

The focused two-call loopback test was run on classic ESP32, ESP32-C3 and
ESP32-S3 IDF5 targets. On every target, the first call was accepted and the
overlapping call threw the catchable exception:

```text
Error: A ping is already in progress
```

The first callback received five ordered results, the rejected callback
received none, and each target returned normally to the REPL without an
assertion or reboot.

A separate callback-less test confirmed that ownership does not depend on an
application callback. A callback-less first call owned the native session, an
overlapping call was rejected, and a later recovery call completed with five
results.

The investigation then expanded to result delivery and JavaScript `reset()`. Source inspection identified the task-boundary problem described in section 1.5, while physical reset testing exposed the teardown problem described in section 1.6.

After the remaining lifecycle hardening was completed, the candidate passed the broader lifecycle test on all three IDF5 targets. Each target passed 35 checks, completed 28 sessions and delivered 140 expected callbacks.

This broader qualification provides regression coverage for overlap rejection
but is not an isolated test of the session-ownership correction.

### 1.5 IDF5 native ping results need to be delivered safely into JavaScript

The ESP-IDF ping callbacks run in the native ping task rather than in
Espruino’s JavaScript interpreter task. The application callback itself is
executed later by the interpreter, but in the affected implementation its
arguments and event-queue entry were constructed in the native task.

The native task can pre-empt the interpreter, so it could access the
JavaScript heap and event queue while the interpreter was also using them.
Native ping processing therefore crossed the JavaScript runtime’s ownership
boundary and relied on unsynchronised access to interpreter-owned state.

This is pursued here as part of the lifecycle-hardening design, not as a
proven independent defect.

#### Source finding

In the affected implementation, both a successful response and a timeout
called `emit_espruino_ping_event()` directly from the ESP-IDF callback:

```c
static void esp5_ping_on_success(esp_ping_handle_t hdl, void *args) {
  uint32_t elapsed_time = 0;
  esp_ping_get_profile(
      hdl,
      ESP_PING_PROF_TIMEGAP,
      &elapsed_time,
      sizeof(elapsed_time));
  emit_espruino_ping_event(hdl, elapsed_time);
}

static void esp5_ping_on_timeout(esp_ping_handle_t hdl, void *args) {
  emit_espruino_ping_event(hdl, 0);
}
```

`emit_espruino_ping_event()` created and modified JavaScript variables before
adding the callback to Espruino’s event queue:

```c
JsVar *jsPingResponse = jsvNewObject();

jsvObjectSetIntChild(jsPingResponse, "totalCount", transmitted);
...
jsiQueueEvents(NULL, g_jsPingCallback, params, 1);
jsvUnLock(jsPingResponse);
```

`jsiQueueEvents()` also creates JavaScript objects and modifies Espruino’s
global event array. It queues a callback for later execution, but constructing
and queuing that event still manipulated JavaScript state in the native ping
task.

This was identified by source inspection rather than by a separate crash
reproduction. The physical tests showed that results could be delivered, but
they could not establish that concurrent JavaScript-state access was safe
under every scheduling condition.

#### Fix

The ESP-IDF callbacks now collect only plain C data. They do not allocate
`JsVar` objects or interact directly with the JavaScript event queue.

The implementation:

- maintains the native ping counters in C;
- copies each result into a bounded C response queue;
- protects the queue shared between the ping task and interpreter task;
- wakes the interpreter when native data or completion is available;
- drains the queue from an Espruino idle handler;
- constructs the JavaScript result object in the interpreter context; and
- queues the application callback from that same context.

The response record and queue contain only native C data. The same
`ESP32_PING_REQUEST_COUNT` constant defines both the configured request count
and the queue capacity:

```c
#define ESP32_PING_REQUEST_COUNT 5

typedef struct {
  uint32_t attempts;
  uint32_t timeouts;
  uint32_t totalBytes;
  uint32_t totalTime;
  uint32_t responseTime;
  uint32_t bytes;
} Esp32PingResponse;

static Esp32PingResponse
    g_pingResponseQueue[ESP32_PING_REQUEST_COUNT];
```

The native callbacks copy a response into the protected queue and notify the
interpreter. Any capacity violation is retained for reporting rather than
silently dropping a result:

```c
portENTER_CRITICAL(&g_pingMux);
if (g_pingState == ESP32_PING_RUNNING &&
    g_pingResponseCount < ESP32_PING_REQUEST_COUNT) {
  g_pingResponseQueue[g_pingResponseHead] = response;
  g_pingResponseHead =
      (g_pingResponseHead + 1) % ESP32_PING_REQUEST_COUNT;
  g_pingResponseCount++;
  wakeInterpreter = true;
} else if (g_pingState == ESP32_PING_RUNNING) {
  g_pingResponseOverflow = true;
  wakeInterpreter = true;
}
portEXIT_CRITICAL(&g_pingMux);

if (wakeInterpreter) jshHadEvent();
```

`jswrap_wifi_ping_idle()` drains the retained C records. Only the
interpreter-side `queuePingResponse()` function creates the `JsVar` result and
calls `jsiQueueEvents()`. The idle handler also reports a retained
`g_pingResponseOverflow` condition through `jsError()` from the interpreter
context.

The final response is held until ESP-IDF has issued its `on_ping_end`
notification. This ensures that when the final JavaScript callback is
eventually executed, the native session has ended and application code may
safely start another ping.

The public API remains unchanged. Internally, result delivery now crosses the
task boundary through retained native data:

```text
ESP-IDF ping task → retained C data → Espruino interpreter → JS callback
```

The initial retained C queue and idle delivery were introduced in commit
`08739ca25`. Commit `77e30bebb` registered the idle handler for the complete
ESP32 family, and commit `99cc0a5d4` added authoritative queue sizing,
overflow reporting, interpreter wake-up and completion-order hardening.

Normal result delivery is handled here. Cancellation and callback teardown
across JavaScript `reset()` are addressed separately in section 1.6.

#### ESP32 family integration

The queued-delivery implementation is guarded by a family-wide `USE_ESP32`
condition:

```c
/*JSON{
  "type" : "idle",
  "generate" : "jswrap_wifi_ping_idle",
  "ifdef" : "USE_ESP32"
}*/
```

The first queued-delivery candidate guarded its idle handler with the literal
`ESP32_IDF5` board macro. This registered delivery for the classic IDF5
wrapper but omitted the C3 and S3 wrappers. The guard was therefore changed to
the family-wide `USE_ESP32` condition.

IDF5 builds use the queued-result implementation. Earlier ESP-IDF builds
provide a no-operation version of the idle function so that the shared ESP32
wrappers continue to build.

#### Test coverage

The queued-delivery implementation was tested on classic ESP32, ESP32-C3 and
ESP32-S3 IDF5 targets. All three delivered the five expected result objects
for successful and timeout sessions. They also completed immediate recovery
and successfully started a new ping from the final callback without an
assertion or reboot.

The later broader lifecycle qualification included a further 25-session soak.
This provides regression coverage for queued result delivery but is not an
isolated test of the handoff correction.

Clean builds passed for all seven maintained ESP32-family board definitions.
This confirms that the family-wide idle registration linked to the queued
implementation on IDF5 and to the no-operation compatibility implementation
on earlier IDF versions.

These focused results establish normal native-to-interpreter result delivery.
Reset-specific cancellation and teardown are tested with the lifecycle
correction described in section 1.6.

### 1.6 IDF5 JavaScript `reset()` leaves native ping work bound to the discarded runtime

The normal-completion tests above did not cover what happens when JavaScript
`reset()` is called while a native ping session is still active. Unlike a
chip-level reboot, `reset()` discards and recreates Espruino's JavaScript
runtime without necessarily stopping native ESP-IDF work that has already
started.

Testing on the ESP32-C3 showed that the native ping session continued after
the runtime that owned its callback had been discarded. Its remaining results
were then delivered against callback state belonging to the old runtime,
producing repeated event-queue errors.

The old native session eventually completed and a later ping succeeded, so
the driver was not permanently wedged. However, the reset boundary was not
lifecycle-safe: native operation state, queued results and JavaScript callback
ownership were not torn down together.

#### Test coverage before the fix

The retained [`esp32_wifi_ping_reset.js`](repros/esp32_wifi_ping_reset.js)
probe exercised three reset timings. A chip-level `E.reboot()` was used
between modes so that each started from an independent native state:

- `reset()` during an active loopback-success session;
- `reset()` during an active timeout session; and
- `reset()` after a result had been queued but before the pending JavaScript
  reset had been processed.

The ESP32-C3 baseline produced these results:

| Reset timing | Old callbacks after reset request | Event-queue errors | Recovery callbacks |
| --- | ---: | ---: | ---: |
| Active loopback success | 0 | 5 | 5 |
| Active timeout target | 0 | 5 | 5 |
| Result queued before reset teardown | 1 | 4 | 5 |

The one callback in the third mode was already queued and was executed after
the call to `reset()`, but before Espruino processed its deferred reset and
discarded the runtime. The remaining native results reached invalid callback
state after teardown and produced the four errors. In the other modes, all
five native results arrived after teardown and produced five errors.

All three modes subsequently completed a five-callback recovery ping. This
showed that the native driver eventually recovered, but did not make delivery
against the discarded runtime safe.

#### Source finding

The IDF5 ping implementation retained the native session handle, response
queue and `g_jsPingCallback` independently of the lifetime of the JavaScript
runtime. It had normal-completion handling through `on_ping_end`, but no
Espruino `kill` handler to cancel or detach an active session when the runtime
was destroyed.

Calling `reset()` could therefore leave the native ping task publishing
results into the retained response queue. The interpreter-side idle handler
could then try to queue those results through a callback belonging to the old
runtime.

#### Fix

The IDF5 implementation now represents the native lifecycle explicitly:

```c
typedef enum {
  ESP32_PING_IDLE,
  ESP32_PING_RUNNING,
  ESP32_PING_ENDING,
  ESP32_PING_DRAINING,
  ESP32_PING_CANCELLING
} Esp32PingState;
```

An Espruino `kill` handler now participates in JavaScript runtime teardown. It
clears any retained response data, stops a running ESP-IDF session, changes
the state to `ESP32_PING_CANCELLING` and releases `g_jsPingCallback`:

```c
/*JSON{
  "type" : "kill",
  "generate" : "jswrap_esp32_network_kill",
  "ifdef" : "USE_ESP32"
}*/
void jswrap_esp32_network_kill() {
#if ESP_IDF_VERSION_MAJOR >= 5
  portENTER_CRITICAL(&g_pingMux);
  g_pingResponseHead = 0;
  g_pingResponseTail = 0;
  g_pingResponseCount = 0;
  g_pingResponseOverflow = false;

  if (g_pingState == ESP32_PING_RUNNING) {
    esp_ping_stop(g_pingHandle);
    g_pingState = ESP32_PING_CANCELLING;
  } else if (g_pingState == ESP32_PING_ENDING) {
    g_pingState = ESP32_PING_CANCELLING;
  } else if (g_pingState == ESP32_PING_DRAINING) {
    g_pingHandle = NULL;
    g_pingState = ESP32_PING_IDLE;
  }
  portEXIT_CRITICAL(&g_pingMux);

  jsvUnLock(g_jsPingCallback);
  g_jsPingCallback = NULL;
#endif
}
```

The native response path accepts results only while the state is
`ESP32_PING_RUNNING`. Results arriving after cancellation therefore cannot be
published to the replacement runtime. The native `on_ping_end` callback
remains responsible for deleting the ESP-IDF session exactly once; when it
observes `ESP32_PING_CANCELLING`, it clears the retained handle and returns the
implementation to `ESP32_PING_IDLE` without exposing completion to
JavaScript.

This ownership split is deliberate: the `kill` handler prevents further
JavaScript delivery and requests cancellation, while the native completion
path owns final session deletion. It covers a reset racing with either a
running session or its `on_ping_end` callback without allowing both paths to
delete the same native session.

The cancellation and reset-lifecycle correction was introduced in commit
`db60cfe9b`.

#### Reset qualification after the fix

The three reset modes were repeated on classic ESP32, ESP32-C3 and ESP32-S3
IDF5 targets. Each target produced the same result:

| Reset timing | Old callbacks after reset request | Event-queue errors | Recovery callbacks |
| --- | ---: | ---: | ---: |
| Active loopback success | 0 | 0 | 5 |
| Active timeout target | 0 | 0 | 5 |
| Result queued before reset teardown | 1 | 0 | 5 |

Every recovery ping completed. The one old callback in the queued-result mode
is expected: Espruino services an event already in its queue before processing
the deferred `reset()` and invoking wrapper `kill` handlers. No callback was
delivered against a discarded runtime. The S3 emitted separate GPIO-number
diagnostics during reset, but they did not affect ping cancellation or
recovery.

#### Native task reclamation found during final qualification

The reset correction stopped stale JavaScript delivery, but the subsequent
repeated-session test exposed one more native-lifecycle dependency. An early
candidate completed only 24 of 28 sessions and 120 callbacks before failing
with `ESP_ERR_NO_MEM`. Reported free heap fell from 71,304 bytes to 1,240
bytes.

Source inspection showed that `esp_ping_delete_session()` makes the completed
ping task eligible to exit; it does not synchronously reclaim that task's
stack and control block. FreeRTOS performs the final reclamation in its idle
task. On the single-core C3, continuous Espruino interpreter and USB activity
could prevent the idle task from running often enough between repeated ping
sessions.

After normal session deletion, the ESP32 IDF5 Wifi.ping() revised implementation starts a bounded 1,500 ms native-task cleanup grace period. The same grace period is started from the session create and start failure cleanup paths. While it is active, the Espruino idle handler briefly yields with vTaskDelay(1), allowing any native ping task created by the operation to exit and the FreeRTOS idle task to reclaim its resources. This does not impose a fixed 1,500 ms delay on JavaScript or prevent another ping from starting.

The 1,500 ms bound corresponds to the configured 1,000 ms request timeout plus
one 500 ms request interval. It therefore covers the longest configured
request wait and a further scheduling interval while remaining finite. The
28-session qualification below confirmed that this window was sufficient on
the single-core C3 as well as the dual-core classic ESP32 and ESP32-S3.

This task-reclamation correction was introduced in commit `70555065f`.

The final repeated-session qualification completed all 28 sessions and all
140 expected callbacks on each IDF5 target:

| Target | First free heap | Final free heap | Change |
| --- | ---: | ---: | ---: |
| Classic ESP32 | 63,632 | 63,604 | -28 |
| ESP32-C3 | 71,300 | 71,268 | -32 |
| ESP32-S3 | 108,960 | 108,948 | -12 |

Together, the reset tests and repeated-session qualification cover callback
ownership, cancellation, native session deletion, interpreter recovery and
eventual native-task reclamation. The corrections are limited to the IDF5
implementation; the earlier-IDF compatibility paths are unchanged.

### 1.7 Draft pull-request submission text

Proposed title:

`ESP32: correct and harden Wifi.ping across IDF versions`

Copy-ready pull-request description:

```md
Reproduction steps, source analysis and full qualification evidence are
recorded in #ISSUE_NUMBER.

## Summary

This PR restores valid IPv4 string handling for ESP32 `Wifi.ping()`, corrects
basic ping operation on ESP-IDF 4 and hardens the ESP-IDF 5 asynchronous ping
lifecycle.

The changes are kept behind the existing ESP-IDF-version branches. The shared
IPv4 parser correction applies before backend selection, the native IDF3
backend is otherwise unchanged, IDF4 receives a narrowly scoped session and
scheduling correction, and the larger ownership and lifecycle changes apply
only to IDF5.

## Changes

- Parse dotted-decimal IPv4 strings through `ip4addr_aton()` and return its
  result from the IPv4-only `stringToIP()` path.
- Configure IDF4 ping through the typed `ping_sock` session API rather than
  passing a binary address to the deprecated text-address compatibility
  adapter.
- Run the IDF4 and IDF5 native ping tasks at priority 6, immediately above
  Espruino's priority-5 interpreter, so the task cannot be starved by the
  interpreter on the single-core ESP32-C3.
- Retain one authoritative IDF5 session handle, callback and lifecycle state;
  reject an overlapping call with the catchable exception
  `A ping is already in progress`.
- Transfer IDF5 results from the native ping task to the interpreter through
  a bounded plain-C queue. `JsVar` construction and `jsiQueueEvents()` now run
  only in the interpreter context.
- Hold the final result until ESP-IDF reports `on_ping_end`, allowing a new
  ping to be started safely from the final JavaScript callback.
- Cancel result delivery during JavaScript `reset()` and let the native
  completion path retain sole ownership of session deletion.
- Give the completed ESP-IDF ping task and the FreeRTOS idle task a bounded
  opportunity to reclaim native task resources after asynchronous session
  deletion.

The implementation changes are confined to
`libs/network/esp32/jswrap_esp32_network.c` and its header.

## Compatibility and observable behaviour

The `Wifi.ping()` signature and result-object fields are unchanged.

- The native IDF3 backend is unchanged apart from receiving the corrected
  shared IPv4 parsing result.
- IDF4 deliberately retains its existing result shape: five per-request
  callbacks followed by the duplicated cumulative terminal callback.
- IDF5 continues to deliver five per-request callbacks for a normal session.
- A second IDF5 call made while a session is active is now rejected
  immediately instead of replacing the active callback and starting another
  native session.

Station connection and disconnection lifecycle changes are outside this PR
and will be proposed separately.

## Test coverage

Clean release builds passed for all seven maintained ESP32-family definitions:

- `ESP32`;
- `ESP32_IDF4`;
- `ESP32C3_IDF4`;
- `ESP32S3_IDF4`;
- `ESP32_IDF5`;
- `ESP32C3_IDF5`; and
- `ESP32S3_IDF5`.

Physical runtime testing covered:

- classic IDF3 IPv4 loopback and serialized legacy sessions;
- classic ESP32, ESP32-C3 and ESP32-S3 IDF4 loopback and serialized reuse;
- classic ESP32, ESP32-C3 and ESP32-S3 IDF5 IPv4 parsing, successful and
  timeout result delivery, overlap rejection, callback-less session
  ownership, immediate recovery and starting a new session from the final
  callback;
- JavaScript `reset()` during an active success, active timeout and queued
  completion on all three IDF5 targets, with no callback delivered against a
  discarded runtime; and
- 28 repeated IDF5 sessions and 140 callbacks on each target, with final
  native-heap changes of -28 bytes on classic ESP32, -32 bytes on ESP32-C3 and
  -12 bytes on ESP32-S3.
```
The branch is focused: its diff changes only:
- libs/network/esp32/jswrap_esp32_network.c
- libs/network/esp32/jswrap_esp32_network.h
It passes git diff --check.
It is not quite a submission branch yet:
- The name fix/esp32-idf4-basic-ping no longer reflects the full PR scope.
- It has no upstream tracking branch and has not been pushed to your GitHub fork.
- Current Espruino upstream is two unrelated commits ahead of its base.
- Its commit order places the IDF4 corrections after the IDF5 commits, although the draft presents IDF4 first for explanatory clarity.
I recommend creating the eventual PR branch as fix/esp32-ping-hardening at bc5f06466e. We should then decide whether to submit from the existing base—preserving every commit hash quoted in the issue—or rebase onto current upstream and update those hashes in the draft. Given the two upstream commits are unrelated, preserving the existing hashes is currently reasonable.

## 2. `Wifi.connect()` ownership and error reporting

`Wifi.connect()` starts an asynchronous station connection and optionally
retains a JavaScript callback until the station either obtains a usable IP
address or reaches a terminal connection failure.

Testing on an ESP32-C3 showed that this works as expected when one connection
attempt runs in isolation. A valid connection completed its callback once
after obtaining an IP address. Incorrect credentials and an unavailable
network each emitted a `disconnected` event and completed the callback once
with `4WAY_HANDSHAKE_TIMEOUT` or `NO_AP_FOUND`.

### Reproduction

The overlap failure can be reproduced in the Web IDE with two synthetic,
unavailable SSIDs. No access point or valid credentials are required:

```js
echo(false);

var wifi = require("Wifi");
var firstCallbackCount = 0;
var secondCallbackCount = 0;

print("starting connection 1");

wifi.connect(
  "XFSM-NO-SUCH-AP-1",
  {password:"12345678"},
  function (error) {
    firstCallbackCount++;
    print("connection 1 callback:", error);
  }
);

setTimeout(function () {
  print("starting connection 2");

  try {
    wifi.connect(
      "XFSM-NO-SUCH-AP-2",
      {password:"12345678"},
      function (error) {
        secondCallbackCount++;
        print("connection 2 callback:", error);
      }
    );
    print("connection 2 returned normally");
  } catch (error) {
    print("connection 2 threw:", error);
  }
}, 6000);

setTimeout(function () {
  print("FIRST_CALLBACK_COUNT=" + firstCallbackCount);
  print("SECOND_CALLBACK_COUNT=" + secondCallbackCount);
  print("DETAILS=" + JSON.stringify(wifi.getDetails()));
  print("IP=" + JSON.stringify(wifi.getIP()));
  wifi.disconnect();
}, 30000);
```

The six-second delay allows the first native connection attempt to be active
before the second call. The final observation is made after 30 seconds so the
native retry and terminal-disconnection path has had time to complete.

On an `ESP32C3_IDF5` build at `bc5f06466e`, the relevant output was:

```text
starting connection 1
starting connection 2
E (...) wifi:sta is connecting, cannot set config
ERROR: jswrap_wifi_connect: esp_wifi_set_config: 12294(ESP_ERR_WIFI_STATE)
connection 2 returned normally
FIRST_CALLBACK_COUNT=0
SECOND_CALLBACK_COUNT=0
DETAILS={"status":"NO_AP_FOUND"}
IP={"ip":"0.0.0.0","netmask":"0.0.0.0","gw":"0.0.0.0",...}
```

On the debug-enabled test image, the output also included:

```text
[.../libs/network/esp32/jswrap_esp32_network.c]:jswrap_wifi_connect: SSID 'XFSM-NO-SUCH-AP-1', password '12345678', Callback done
```

which includes a visible password.

### Problem details

The problem occurs when another `Wifi.connect()` call is made while the first
operation is still active. The current implementation does not retain an
explicit connection-operation state. Instead, the single module-level
callback is cleared or replaced by each new call, and a callback-less
connection attempt leaves no callback from which to infer that an operation
is active.

With two valid overlapping calls, the second call returned normally even
though ESP-IDF rejected its configuration change with
`ESP_ERR_WIFI_STATE`. Espruino reported that native error only through
`jsError()`: it did not throw a catchable exception or complete either
callback.

An invalid second call exposed a related ownership problem. It threw the
expected argument-type exception, but the callback belonging to the first
accepted operation had already been cleared and was never called.

A callback-less first call likewise failed to reserve the operation, allowing a
second connection attempt to reach the same native error path.

Once a connection attempt has been accepted, Espruino therefore cannot
reliably preserve its ownership or guarantee one observable terminal result.
An application may see a call return normally while receiving neither a
catchable exception nor a callback, leaving it dependent on an external
timeout to recover.

The connection fix should retain explicit operation state independently of
callback presence, validate a new request before changing existing state,
reject overlapping calls without disturbing the active operation, and route
immediate native failures to an observable JavaScript outcome. Native Wi-Fi
lifecycle events should continue to be published independently of the
per-call completion callback.

In addition, the debug-enabled test build printed the supplied password. The tested image was a debug-enabled release build using both `DEBUG=1` and `RELEASE=1`. A standard release built without `DEBUG=1` compiles this diagnostic out, so this is not a normal production-runtime exposure. Removing the password value is nevertheless a small defensive cleanup.

As a separate observation, the ESP32 backend applies a fixed retry policy. The
published [`Wifi.connect()` documentation](https://www.espruino.com/reference#l_Wifi_connect) mentions connection retries and advises callers to use their own timeout, but does not identify the fixed ESP32 retry count.

Each accepted call sets `g_retryCounter` to 3. When starting disconnected, one JavaScript `Wifi.connect()` call can therefore produce three native connection attempts: the initial attempt and two retries. The public `disconnected` event and connection callback are deferred until the final attempt fails.

This contributed to the observed completion delay. An unavailable network completed after approximately 16 seconds, while an incorrect password completed after approximately 22.5 seconds. In the latter test, a 20-second application timeout expired before Espruino reported the terminal result.

Changing or exposing the retry policy (eg in the connect options) is a separate design decision and is not part of this work. Its precise ESP32 behaviour can be addressed by a future issue and documentation PR.

### Native event execution context

Source review found that this correction also requires an explicit task
boundary. Espruino runs its JavaScript heap and interpreter loop in the
FreeRTOS task named `espruinoTask`. The ESP-IDF Wi-Fi event loop instead
invokes Espruino's registered handler from its own event task: `eventTask` on
IDF3 and `sys_evt` on IDF4 and IDF5.

The current handler creates and unlocks `JsVar` values, publishes `Wifi`
events, calls `jsiQueueEvents()` and takes or clears JavaScript callback
references directly from that native event task. `jsiQueueEvents()` does not
provide a native-to-interpreter handoff; it allocates JavaScript objects and
appends them to the interpreter's event array.

The connection correction must therefore copy native station-event data into
a bounded plain-C queue and wake the interpreter with `jshHadEvent()`. An
interpreter idle handler must drain that queue and perform JavaScript event
publication, callback completion and callback release. This follows the same
task boundary used by the corrected IDF5 ping implementation, while retaining
connection-specific event records and ownership.

The source paths and version-specific dispatch chains are recorded in the
[ESP32 Wi-Fi event-handler execution-context investigation](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/docs/investigations/wifi/esp32-wifi-event-task-context-2026-11-05.md).

### Proposed `Wifi.connect()` contract

The correction should treat a station connection attempt as an owned
asynchronous operation. Ownership begins after the request has been validated
and accepted, before any ESP-IDF operation is started, and ends at one
terminal success, terminal failure or interpreter teardown.

All supplied JavaScript arguments must first be validated into local values.
Validation must not clear or replace an existing callback, change connection
state, alter retry state, write native credentials or otherwise disturb an
active operation. An invalid request continues to throw its existing argument
exception. A valid request made while another connection attempt is active
must throw this catchable exception:

```text
Error: A connection is already in progress
```

This overlap rejection must occur before the new request changes the accepted
operation's callback, credentials or native Wi-Fi configuration.

Operation ownership must be represented independently of callback presence.
A call made without a callback still owns the connection operation, rejects
an overlap, and releases that ownership when its native lifecycle reaches a
terminal outcome. After completion, a later connection request must be
accepted normally.

Once accepted, the stored callback belongs exclusively to that operation. No
later request or unrelated Wi-Fi event may replace it. Terminal completion
must take and clear that ownership once before queuing the callback, so a
second terminal path cannot queue it again.

For an accepted request, the required terminal behaviour is:

| Native or application condition | Required outcome |
|---|---|
| station obtains a usable IP address | complete successfully and queue the supplied callback once with a null error and connection details |
| station reaches a terminal disconnection after the existing retry policy is exhausted | complete with the reported Wi-Fi reason and queue the supplied callback once |
| `esp_wifi_get_mode()`, `esp_wifi_set_mode()`, `esp_wifi_set_config()`, `esp_wifi_start()` or the direct `esp_wifi_connect()` call fails immediately | release the operation and queue the supplied callback once with that native error |
| the deferred `esp_wifi_connect()` call from the station-start event fails | release the operation and queue the supplied callback once with that native error |
| JavaScript `reset()` discards the current runtime | detach and unlock the callback, retire the accepted operation so a late native event cannot complete against either the discarded runtime or a later request, and leave the station lifecycle recoverable by the new runtime |

An immediate native failure may still be written to the diagnostic log, but
`jsError()` must not be its only application-visible outcome. Once an
operation has been accepted, all of its immediate and deferred terminal paths
must use the same exactly-once completion ownership.

The public `associated`, `connected`, `disconnected` and `dhcp_timeout` events
remain independent observations of the native Wi-Fi lifecycle. They must
continue to be emitted when applicable whether or not the accepted
`Wifi.connect()` call supplied a callback. The connection callback must not be
used as the source of those events, and an event must not by itself transfer
or replace per-call callback ownership.

With this contract, the two-call reproduction above should instead have the
following result after the first attempt reaches its terminal
`NO_AP_FOUND` outcome:

```text
starting connection 1
starting connection 2
connection 2 threw: Error: A connection is already in progress
connection 1 callback: NO_AP_FOUND
FIRST_CALLBACK_COUNT=1
SECOND_CALLBACK_COUNT=0
```

This PR should not add an application-level connection timeout or change the
existing retry count. Native Wi-Fi events do not identify an application
attempt generation, so application timeout and stale-event reconciliation
remain the responsibility of the caller, including the planned XFSM Wi-Fi
manager. The separate exactly-once behaviour of `Wifi.disconnect()` remains
part of PR3.

The connection debug output must also stop printing the supplied password.
This is not part of operation ownership, but it was exposed by the same
reproduction and should not remain in a diagnostic build.

### IDF version - scope of change

The connection and disconnection hardening is limited to the IDF5 backend. IDF3 (classic ESP32 build) retains its long-established behaviour to avoid unnecessary compatibility risk, while IDF4 is transitional as IDF5 enters production. IDF3 and IDF4 remain in the build and regression-test coverage, but their connection lifecycles are not changed.

### Implemented correction

The correction is implemented by commit `610007d3f` on top of the completed
ping candidate. It adds an IDF5-only connection state with three values:
idle, waiting for station startup, and connecting. This state exists
independently of the optional JavaScript callback, so a callback-less request
still owns the operation.

`jswrap_wifi_connect()` now validates the SSID, options and callback before it
changes global or native state. A valid overlap then throws
`A connection is already in progress` before changing the accepted callback,
credentials or ESP-IDF configuration. An invalid second request continues to
throw its argument error and likewise leaves the active operation untouched.

A shared connection-completion helper first takes and clears the operation
state and callback, then queues the callback if one was supplied. Usable-IP
success, terminal disconnection, immediate ESP-IDF errors and failure of the
deferred station-start `esp_wifi_connect()` call all use this path. Clearing
ownership before queuing the result prevents another terminal event from
completing the same operation twice.

IDF5 station events no longer touch the JavaScript heap from ESP-IDF's event
task. The handler copies the event identifier and required fixed-size data
into a bounded 16-entry plain-C queue and calls `jshHadEvent()`. The new
`jswrap_wifi_events_idle()` hook drains the queue in Espruino's interpreter
task, where the existing public Wi-Fi events and connection completion are
delivered. Scan and AP events are left on their existing paths because this PR
only moves the station events required by the connection lifecycle.

The existing reset/kill hook now retires the connection state, unlocks its
callback and clears queued station events. This prevents a late native event
from completing against either the discarded JavaScript runtime or a new
request after `reset()`.

The debug connection message still identifies the SSID and whether a callback
was supplied, but no longer prints the password.

### Test coverage

Clean release images from `610007d3f` were flashed to classic ESP32,
ESP32-C3 and ESP32-S3 IDF5 targets. Each runtime reported Espruino `2v29.503`
and the exact embedded revision.

| Test | Classic IDF5 | C3 IDF5 | S3 IDF5 |
|---|---:|---:|---:|
| overlap and callback ownership | 12/12 | 12/12 | 12/12 |
| connection, failure and recovery lifecycle | 33/33 | 33/33 | 33/33 |
| JavaScript reset during an active request | pass | pass | pass |
| ping regression | 28 sessions, 140 callbacks | 28 sessions, 140 callbacks | 28 sessions, 140 callbacks |

The connection lifecycle covered successful connection, reconnect while
already connected, unavailable SSID, incorrect password, recovery after both
failures, and ten further connect/disconnect cycles. Every operation completed
its callback exactly once. The unavailable SSID reported `NO_AP_FOUND`; the
incorrect password reported `4WAY_HANDSHAKE_TIMEOUT`.

The warmed native-heap deltas after the ten-cycle connection soak were -140
bytes on classic, +100 bytes on C3 and -140 bytes on S3. The corresponding
28-session ping regression completed all 140 callbacks on every target, with
final heap deltas of +8, +24 and 0 bytes respectively.

The reset probe confirmed on all three targets that an old callback was not
invoked after `reset()`, while a new unavailable-network request completed
once and recovered normally.

On classic IDF5, the stateful scan regression found the configured AP after a
completed connection and disconnect, without an unsolicited reconnect. A
controlled two-board test also completed AP-only, AP+station and station-only
transitions, retained the station address after stopping the AP, exchanged a
UDP packet, and observed peer join and leave events.

The final classic lifecycle run inspected the captured serial output before
sanitising it and confirmed that neither the valid nor deliberately incorrect
password appeared.

The unchanged connection implementation also completed a basic station
connection on classic ESP32, ESP32-C3 and ESP32-S3 IDF4 builds and on classic
IDF3. All seven maintained ESP32-family definitions completed clean release
builds:

```text
ESP32
ESP32_IDF4
ESP32_IDF5
ESP32C3_IDF4
ESP32C3_IDF5
ESP32S3_IDF4
ESP32S3_IDF5
```

The immediate-error branches for `esp_wifi_get_mode()`,
`esp_wifi_set_mode()`, `esp_wifi_set_config()`, `esp_wifi_start()` and direct
or deferred `esp_wifi_connect()` are compiled and use the same completion
helper. They were reviewed in the exact candidate diff. I did not add a
test-only firmware hook solely to force one of these otherwise timing-dependent
native errors, so direct physical evidence covers terminal native failures
rather than an artificially injected immediate failure.

The detailed qualification record, including physical identities, build
sizes, heap measurements and test hashes, is in
[the PR2 candidate result](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-05-esp32-idf5-wifi-connect-hardening-candidate.md).

### Proposed PR2 submission text

```text
ESP32 IDF5: harden Wifi.connect lifecycle

This fixes the ESP32 IDF5 Wifi.connect ownership and error-reporting problems
described in #ISSUE_NUMBER.

The change validates a request before acquiring ownership, tracks an active
connection independently of callback presence, rejects overlaps without
disturbing the accepted operation, and completes success or failure through
one exactly-once path. It also moves IDF5 station-event handling from the
ESP-IDF event task into Espruino's interpreter task through a bounded native
queue, clears connection ownership on reset, and removes the password from
debug output.

The lifecycle change is guarded to ESP-IDF 5. IDF3 and IDF4 connection
behaviour is unchanged.

Qualification used clean release builds for all seven ESP32 definitions and
physical runtime testing on classic ESP32, ESP32-C3 and ESP32-S3. The focused
IDF5 overlap tests passed 12/12 per target, the connection/recovery tests
passed 33/33 per target, reset recovery passed on all three, and the full ping
regression delivered 140/140 callbacks per target without final heap loss.
IDF4 station smoke tests passed on all three families and classic IDF3 also
passed.
```
<!-- Replace #ISSUE_NUMBER before submitting PR2. -->

## 3. `Wifi.disconnect()` exactly-once completion

`Wifi.disconnect()` requests deliberate station disconnection and optionally
accepts a callback. On ESP32 IDF5, one accepted call made while connected
could execute that callback twice: once directly from the API path and again
when ESP-IDF later reported the station-disconnected event.

The public `disconnected` event was emitted once. The duplicate was therefore
not a duplicated native lifecycle event; it was two Espruino completion paths
acting on one accepted API operation.

### Reproduction

The following Web IDE example connects to an available access point, counts
the callback and the independent public event, and then deliberately
disconnects. Replace the two configuration values with test credentials:

```js
echo(false);

var wifi = require("Wifi");
var disconnectCallbackCount = 0;
var disconnectedEventCount = 0;

wifi.on("disconnected", function (details) {
  disconnectedEventCount++;
  print("DISCONNECTED_EVENT=" + JSON.stringify(details));
});

wifi.connect("SSID", {password:"PASSWORD"}, function (error) {
  print("CONNECT_CALLBACK=" + JSON.stringify(error));
  if (error) return;

  setTimeout(function () {
    wifi.disconnect(function () {
      disconnectCallbackCount++;
      print("DISCONNECT_CALLBACK=" + disconnectCallbackCount);
    });
  }, 500);
});

setTimeout(function () {
  print("DISCONNECT_CALLBACK_COUNT=" + disconnectCallbackCount);
  print("DISCONNECTED_EVENT_COUNT=" + disconnectedEventCount);
}, 10000);
```

On the exact qualified PR2 parent, `610007d3f`, the significant result was:

```text
CONNECT_CALLBACK=null
DISCONNECT_CALLBACK=1
DISCONNECTED_EVENT={...}
DISCONNECT_CALLBACK=2
DISCONNECT_CALLBACK_COUNT=2
DISCONNECTED_EVENT_COUNT=1
```

The retained reproduction uses the same operation with structured output and
also records the final station status and IP address.

### Problem details and source finding

The pre-fix `jswrap_wifi_disconnect()` stored the supplied callback in the
module-level `g_jsDisconnectCallback`, called `esp_wifi_disconnect()`, and
then unconditionally queued the supplied `jsCallback` when it was a
function. It did not clear the retained global reference at this point.

When ESP-IDF subsequently delivered `WIFI_EVENT_STA_DISCONNECTED`, the event
path found that same function in `g_jsDisconnectCallback`, queued it again,
unlocked it and cleared the global. This explains the observed two callback
executions and single public event without relying on event-order inference.

The callback reference was also being used as the only indication that a
disconnect operation might be active. That is insufficient when no callback
is supplied. A second call could replace the retained callback belonging to
the first call, and argument validation occurred only after the old reference
had been cleared. The API had no explicit ownership with which to distinguish
one accepted operation, an overlap, and an unrelated native disconnect.

An idle or unassociated station adds a separate terminal case. ESP-IDF can
return `ESP_OK` from `esp_wifi_disconnect()` without publishing a
station-disconnected event when there is no association to leave. Waiting
unconditionally for an event would therefore leave an accepted operation
incomplete.

Finally, `Wifi.disconnect()` can be called while `Wifi.connect()` owns an
active station attempt. The two API operations need separate ownership, but
the deliberate disconnect must also terminate the accepted connection once
rather than allowing its callback to remain pending or later complete from a
stale native outcome.

### Proposed `Wifi.disconnect()` contract

All supplied arguments must be validated before active state or callback
ownership is changed. Once accepted, a disconnect request owns an explicit
operation independently of whether a callback was supplied.

A valid call made while another disconnect operation is active must throw:

```text
Error: A disconnection is already in progress
```

The rejected call must not replace or complete the first operation's
callback. An invalid overlapping call must likewise throw its existing
argument exception without disturbing the accepted operation.

For an accepted request, the required terminal behaviour is:

| Station condition | Required outcome |
|---|---|
| associated, with a native station-disconnected event expected | retain ownership until that event, then complete the disconnect callback once |
| idle, stopped or otherwise unassociated, with no terminal event expected | complete the disconnect callback once from the API path |
| connection attempt active | complete the connection callback once with `Connection cancelled`, request native disconnection, and complete the separate disconnect operation once |
| JavaScript `reset()` discards the current runtime | detach and unlock the callback and retire ownership so no later native event can complete against the discarded runtime |
| retained native station-event data is missing or the bounded queue overflows | retire the disconnect operation once while reporting the queue error |

Terminal completion must clear operation state and detach the callback before
queuing it. A later terminal path must then see no accepted operation to
complete. The public `disconnected` event remains an independent observation
of the native lifecycle: it must not be suppressed by callback completion,
and its occurrence alone must not create callback ownership.

The connection and disconnection hardening is limited to the IDF5 backend.
IDF3 retains its long-established behaviour to avoid an unnecessary
compatibility change, and IDF4 is transitional as IDF5 enters production.
Both older backends remain covered by builds and focused runtime regression.

### Implemented correction

Commit `14cd9932f`, on top of the qualified connection candidate, implements
the IDF5 disconnect contract. It adds an `IDLE`/`DISCONNECTING` state that is
independent of `g_jsDisconnectCallback`, so a callback-less request owns the
operation in the same way as one with a callback.

`jswrap_wifi_disconnect()` now validates the callback and rejects an overlap
before acquiring or altering ownership. Its shared completion helper changes
the state to idle and takes and clears `g_jsDisconnectCallback` before it
queues the function. Both the immediate no-event path and the native
station-disconnected path use this helper, so only the first terminal path
can complete the accepted request.

The wrapper uses `esp_wifi_sta_get_ap_info()` to establish whether the station
is actually associated. This is more reliable than the cached flag at this
boundary because `esp_wifi_disconnect()` can succeed without emitting an
event for an unassociated station, and `reset()` can discard an already
queued station event before the cache is updated. When neither an association
nor an active connection can produce a terminal event, the request completes
immediately.

If a connection operation is active, the wrapper completes it once with
`Connection cancelled` before requesting disconnection. `Wifi.connect()`
also rejects a new connection while a disconnect operation owns the station
lifecycle. The existing reset/kill hook retires disconnect state and unlocks
its callback. Missing event data and station-event queue overflow use the same
terminal helper so they cannot strand ownership.

The public station-disconnected event continues through the existing
interpreter-side event path independently of the per-call callback. The IDF3
and IDF4 implementations remain behind the unchanged legacy branch.

### Test coverage

The exact stacked candidate at `14cd9932f` was built and tested as Espruino
`2v29.504`. Clean release builds completed for all seven maintained ESP32
definitions:

```text
ESP32
ESP32_IDF4
ESP32_IDF5
ESP32C3_IDF4
ESP32C3_IDF5
ESP32S3_IDF4
ESP32S3_IDF5
```

Physical IDF5 testing on classic ESP32, ESP32-C3 and ESP32-S3 produced:

| Test | Classic IDF5 | C3 IDF5 | S3 IDF5 |
|---|---:|---:|---:|
| disconnect lifecycle | 27/27 | 27/27 | 27/27 |
| connection overlap ownership | 12/12 | 12/12 | 12/12 |
| connection, failure and recovery lifecycle | 33/33 | 33/33 | 33/33 |
| disconnect reset and recovery | pass | pass | pass |
| full ping lifecycle | 35/35 | 35/35 | 35/35 |

The disconnect lifecycle covered idle and connected calls, cancellation of
an active connection, callback-less ownership, valid and invalid overlaps,
public-event counts and reconnection after every terminal path. Every
accepted disconnect callback completed once; rejected overlaps supplied no
callback; and applicable public disconnect events were each emitted once.

Each target also completed 28 ping sessions and all 140 expected callbacks.
The warmed native-heap changes after ten connection/disconnection cycles were
-136 bytes on classic, -148 bytes on C3 and -132 bytes on S3. The ping-soak
changes were -20, -4 and -48 bytes respectively.

Reset testing detached the old disconnect callback and completed a fresh
connection/disconnection sequence once. The C3 also passed ping reset during
active success, active timeout and queued completion, and connection reset
followed by a new terminal request.

Exact-source IDF4 release images on classic, C3 and S3 each completed one
station connection and a five-result loopback ping. The expanded classic
IDF3 regression passed 15/15 checks covering successful connection and DHCP,
an unavailable SSID, native station events, deliberate disconnect,
reconnection and repeated cycles. It recorded rather than changed the legacy
two-callback deliberate-disconnect behaviour. A legacy-aware IDF3 ping test
also completed both sessions with its established six-callback result shape.

The same classic image then completed a broader Wi-Fi API regression covering
scan and connected-scan behavior, cancellation and repeated cycles,
incorrect-password recovery, controlled AP loss and restoration, AP/STA mode
transitions, target-hosted WPA2 AP operation, static station and custom AP
addressing, saved-configuration restoration, DNS, hostname, SNTP and supported
global configuration. All operational roles passed. The run also recorded,
rather than changed, the legacy duplicate disconnect callback and the ESP-IDF
3 abort when modem sleep is disabled while Bluetooth remains enabled.

For the physical access-point test, the C3 connected to `SHED`, observed one
terminal `disconnected` event with reason 201 (`NO_AP_FOUND`) after the AP was
disabled, and reported IP `0.0.0.0`. After `SHED` was restored, one explicit
`Wifi.connect()` completed one callback and recovered IP `192.168.50.104`.

The detailed firmware identities, build sizes, hashes, heap measurements and
excluded bench artifacts are in
[the PR3 candidate result](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-07-esp32-idf5-wifi-disconnect-hardening-candidate.md).

### Proposed PR3 submission text

```text
ESP32 IDF5: harden Wifi.disconnect lifecycle

This fixes the ESP32 IDF5 Wifi.disconnect ownership and duplicate-callback
problem described in #ISSUE_NUMBER.

The previous wrapper queued an accepted disconnect callback directly and
retained the same callback for the later native station-disconnected event,
allowing one call to execute it twice. This change gives each accepted
disconnect explicit ownership independent of callback presence, validates and
rejects overlaps before disturbing active state, and completes through one
exactly-once helper. It distinguishes an associated station, where the native
event completes the request, from an idle or unassociated station, where no
event can occur and completion is immediate.

Disconnecting during an active connection now completes that connection once
with Connection cancelled. Reset retires disconnect ownership and its
callback, while public disconnected events remain independent of per-call
completion.

The lifecycle change is guarded to ESP-IDF 5. IDF3 and IDF4 behaviour is
unchanged.

Qualification used clean release builds for all seven ESP32 definitions and
physical testing on classic ESP32, ESP32-C3 and ESP32-S3. The disconnect
lifecycle passed 27/27 per IDF5 target, the connection regressions passed
12/12 and 33/33 per target, reset recovery passed, and the full ping
regression delivered 140/140 callbacks per target. IDF4 station and ping
smoke tests passed on all three families, and classic IDF3 passed both the
expanded 15/15 station regression and the broader Wi-Fi API matrix. Manual
SHED loss and restoration completed with one disconnect event and one
recovery callback.
```
<!-- Replace #ISSUE_NUMBER before submitting PR3. -->
