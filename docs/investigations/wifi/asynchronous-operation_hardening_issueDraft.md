# ESP32 Wi-Fi API correctness and asynchronous-operation hardening: ping, connect and disconnect

This umbrella issue tracks a related set of Espruino ESP32 Wi-Fi API problems found while validating the ESP-IDF 5 port. The investigation now covers shared and IDF4 `Wifi.ping()` correctness as well as the IDF5 ping, station connection and station disconnection lifecycles.

The symptoms do not all have the same direct cause. The IPv4 parser and IDF4 ping-target configuration are correctness defects found while establishing a working test baseline. The remaining problems share an asynchronous-lifecycle concern: once an asynchronous request is accepted, Espruino must retain ownership of the underlying ESP-IDF operation and its JavaScript completion callback until the operation completes or is safely torn down, with the callback delivered once or safely detached.

The reproduced failure modes include:

- a second operation replacing the callback belonging to an earlier operation;
- a callback being invoked more than once;
- native work continuing to deliver results after JavaScript `reset()`; and
- a synchronous native failure being reported only through `jsError()`, without throwing an exception or completing the supplied callback.

This work is supported with the use of the codex AI agent in vscode for source analysis, test automation and documentation. The reported behaviour was reproduced on physical ESP32 boards and the source findings and test results were reviewed before including them here.

This umbrella issue keeps the overall investigation and its shared test evidence together. The fixes are intended to be submitted as separate, more easily reviewed pull requests:

1. Shared IPv4 parsing, IDF4 basic ping operation and IDF5 ping lifecycle
   hardening.
2. Station connection overlap and error reporting.
3. Station disconnection and exactly-once callback handling.

Each reported runtime problem has been exercised on physical hardware using a standalone Espruino JavaScript or REPL program. The programs, observed output and relevant source paths are recorded below.

The retained test programs, firmware identities and longer investigation notes are available in the [ESP32_SGATest Wi-Fi investigation](https://github.com/SimonGAndrews/ESP32_SGATest/tree/main/docs/investigations/wifi).

## Shared design principle and proposed PR sequence

The three PRs share one principle but do not introduce a generic asynchronous-operation framework.

Consider:

- Each accepted JavaScript *request* creates an Espruino-managed asynchronous *operation* around the corresponding ESP-IDF work: a ping session, station connection attempt or station disconnection request. ESP-IDF reports progress and completion through different native callbacks, Wi-Fi/IP events and immediate return codes, so each operation needs a small API-specific lifecycle.

- When a request supplies a JavaScript callback, the wrapper stores it as a locked `JsVar` reference alongside the operation state. This keeps the function available while ESP-IDF work continues; interpreter-side result handling uses the reference, and completion or reset handling clears and unlocks it.

- A *terminal condition* is a success, failure, cancellation
  or JavaScript `reset()` that ends an accepted operation. The code handling
  that condition is its *completion path*: it should release the operation state and
  any stored callback, which is either scheduled once or safely detached.

For the asynchronous parts of the operations, the common approach implemented is:

- validate each request before creating an operation or changing a stored
  JavaScript callback;
- track each accepted operation even when the optional callback is omitted;
- reject a conflicting request without changing the active operation or its
  stored callback;
- keep the operation active until it reaches an API-specific terminal condition
  (for example, usable IP assignment, exhausted connection retries, an
  immediate ESP-IDF error or JavaScript `reset()`);
- when more than one terminal condition can be observed, allow only one
  completion path to finish the operation and release its stored callback;
- prevent ESP-IDF callbacks and event handlers from accessing `JsVar` objects directly; instead, they place plain-C records in a bounded queue that Espruino’s interpreter task drains;
- on JavaScript `reset()`, release stored callbacks and prevent later native results from reaching discarded JavaScript state or completing a later operation;
- keep public `Wifi.on(...)` lifecycle notifications independent of callbacks
  supplied for individual requests.

The shared IPv4 parser and IDF4 ping corrections are correctness prerequisites
rather than instances of this lifecycle contract.

| Proposed PR | Scope | Qualified implementation | Comment-review head | Dependency |
|---|---|---|---|---|
| PR1 | shared IPv4 parsing, IDF4 basic ping and IDF5 ping lifecycle | `bc5f06466e` | `538afc299` | submit first against upstream `master` |
| PR2 | IDF5 station-event handoff and `Wifi.connect()` lifecycle | `610007d3f` | `0b51e3087` | rebase after PR1 merges |
| PR3 | IDF5 `Wifi.disconnect()` lifecycle | `14cd9932f` | `7fa78ff5f` | rebase after PR2 merges |

The implementation revisions in the table are the exact firmware revisions
used for qualification testing. Each later review head adds comments only and leaves
its qualified implementation commit unchanged.

## 1. `Wifi.ping()`

Testing `Wifi.ping()` identified several problems with different but sometimes
overlapping causes. They are presented in the order needed to establish a
working baseline and then harden the asynchronous lifecycle:

- shared IPv4 strings were rejected before backend selection;
- IDF4 passed the parsed address to an incompatible compatibility API;
- IDF4 and IDF5 native ping tasks could be starved on the single-core C3;
- overlapping IDF5 requests shared one mutable callback;
- IDF5 results crossed into JavaScript from the native ping task;
- JavaScript `reset()` did not cancel delivery to the discarded runtime; and
- completed native ping tasks could be starved of cleanup time.

Each subsection retains the focused evidence for one problem. Section 1.8
then summarises the combined PR1 qualification.

### 1.1 Shared IPv4-string parsing failure

`Wifi.ping()` accepts its target as a string. Before selecting the IDF3,
IDF4 or IDF5 native ping implementation, the shared wrapper converts that
string into an lwIP `ip_addr_t`.

#### Reproduction

The failure is reproduced with:

```js
echo(false);
try {
  require("Wifi").ping("127.0.0.1", print);
  print("PING_CALL=accepted");
} catch (error) {
  print("PING_CALL=rejected " + error);
}
```

On an affected build this returns:

```text
PING_CALL=rejected Error: "127.0.0.1" not a valid IP address
```

#### Source finding

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

#### Implemented correction

The correction is limited to the non-IPv6 `stringToIP()` path. It identifies
the destination as IPv4 and returns the result of lwIP's `ip4addr_aton()`
parser:

```c
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

This correction is commit `919bd2cce` and is included in the testing and PR
below.

#### Test coverage

A parser probe confirmed that the corrected wrapper accepted `"127.0.0.1"` on
physical classic ESP32, ESP32-C3 and ESP32-S3 targets. Build and runtime
testing included the classic IDF3 build, all three IDF4 builds and all three
IDF5 builds.

Successful parsing only establishes that the requested address reaches the
selected native backend. Subsequent testing exposed a separate IDF4 address
configuration problem, described in section 1.2, and native-task scheduling
starvation on the single-core C3, described in section 1.3.

### 1.2 ESP-IDF 4 used the deprecated compatibility API with an incompatible address representation

Correcting the shared parser allowed a valid IPv4 string to reach the selected
native ping implementation. Testing then showed that basic IDF4 ping operation
was still incorrect.

#### Reproduction and baseline result

A loopback test was run on physical classic ESP32, ESP32-C3 and ESP32-S3
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

On the dual-core classic ESP32 and ESP32-S3, the five configured requests all
timed out with zero received bytes. Each request completion was delivered
through Espruino's pre-IDF5 `pingResults()` cumulative-result adapter. When the
native session ended, `PING_RES_FINISH` invoked that adapter once more without
incrementing the request count. The observable result was therefore six
JavaScript callbacks with cumulative `totalCount` values `1,2,3,4,5,5`. The
final callback repeated the cumulative result when the native session ended;
it did not represent a sixth ICMP request.

The C3 accepted the call but delivered no callback during the observation
period. This prevented the address result from being observed on that target
and was subsequently identified as the additional scheduling problem
described in section 1.3.

#### Source finding

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

#### Implemented correction

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
callbacks followed by a final callback that repeats the cumulative result.

The IDF4 native-session correction is commit `b53aa5707` and is included in
the PR below.

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
retained the older six-callback result shape described above, with cumulative
`totalCount` values `1,2,3,4,5,5`. The final callback repeated the cumulative
result and did not represent a sixth ICMP request.

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

#### Reproduction

An IDF5 two-call loopback test, shown in full in section 1.4, first exposed the
problem:

```js
wifi.ping("127.0.0.1", firstCallback);
wifi.ping("127.0.0.1", secondCallback);
```

At this point in the investigation, the `ESP32C3_IDF5` test image contained
the IPv4 parser correction from section 1.1. No other ping changes had been
applied. Each native session was configured to make five requests, and the
test waited six seconds before reporting the callback counts.

A separate IDF4 comparison used the single-call loopback test from section
1.2:

```js
require("Wifi").ping("127.0.0.1", print);
```

The exact-parent `ESP32C3_IDF4` image accepted the call but delivered no
callback during a seven-second observation period. On the same source
revision, the dual-core classic ESP32 and ESP32-S3 IDF4 targets delivered
callbacks, although their requests timed out because of the separate address
configuration problem described in section 1.2.

#### Baseline result

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
the separate callback-replacement problem described in section 1.4.

#### Source finding

The relevant ESP-IDF ping implementations use `ESP_PING_DEFAULT_CONFIG()`.
This leaves the native ping task at ESP-IDF’s default priority of 2, while the
Espruino interpreter task runs at priority 5.

On the single-core ESP32-C3, the interpreter may remain runnable while the
native USB console is active. A priority-2 ping task can therefore be prevented
from running, leaving an accepted ping operation without any result callbacks.

The IDF5 before-and-after test directly demonstrated that raising the priority
allowed native ping processing to proceed. The IDF4 source uses the same
priority-2 default. Its callbacks ran on the dual-core classic ESP32 and
ESP32-S3 but not on the single-core C3, supporting the same scheduling
explanation.

#### Implemented correction

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

The IDF5 priority correction is part of commit `77e30bebb`. The corresponding
IDF4 correction is commit `bc5f06466e`. Both corrections are included in the
testing and proposed PR below.

#### Test coverage

With the completed candidate, the classic ESP32, ESP32-C3 and ESP32-S3 all
successfully completed the five configured loopback requests on both IDF4 and
IDF5 builds. Each target reported 320 cumulative bytes with no timeout or
error.

A broader lifecycle qualification also exercised this scheduling path, but it
is not an isolated test of the priority correction. The complete runtime and
build results are summarised in section 1.8.

The priority correction allows the native task to run. It does not by itself
prevent overlapping sessions or establish safe callback handling; those IDF5
lifecycle issues are addressed next in section 1.4.

### 1.4 IDF5 overlapping sessions share the last callback

Testing then showed that two `Wifi.ping()` calls could create two native
sessions even though Espruino retained only one global JavaScript callback.
The second call replaced the first call’s callback while both native sessions
continued running.

#### Reproduction

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

#### Baseline result

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

The board was reset immediately before this run, so the global `seqNo` counter
started at 1. This counter increments across all ping results and is not a
native session identifier.

The result objects contained each cumulative count twice:

```text
totalCount: 1,1,2,2,3,3,4,4,5,5
```

This is consistent with two separate five-request native sessions progressing
concurrently. Both sessions completed their five requests, producing ten
result events in total. One event was delivered to the first callback and nine
were delivered to the second callback. The events delivered to the second
callback therefore included results from both native sessions.

#### Source finding

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

Third, results from every native session were queued using the callback stored
in this global variable when the result was handled:

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

The exact split is scheduling-dependent. A 0/10 result was observed on the
classic ESP32, while this C3 run produced 1/9. Both results are consistent
with multiple native sessions sharing one mutable callback binding.

#### Implemented correction

IDF5 now tracks the ping operation independently of whether an application
callback was supplied.

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

During normal completion, the operation remains active until ESP-IDF has ended
the native session and the retained responses have been drained. Only then
does `g_pingState` return to `ESP32_PING_IDLE`.

The result-delivery, cancellation and native-resource cleanup details are
described in sections 1.5 to 1.7. Those later changes refine the lifecycle
without changing the overlap-rejection contract.

The initial retained-handle and overlap-rejection correction is commit
`08739ca25`. Later lifecycle commits refine that operation state into the
final `g_pingState` state machine.

The expected result from the two-call reproduction is:

```text
FIRST_CALL=accepted
SECOND_CALL=rejected Error: A ping is already in progress
FIRST_COUNT=5
SECOND_COUNT=0
```

#### Test coverage

A focused two-call loopback test was run on classic ESP32, ESP32-C3 and
ESP32-S3 IDF5 targets. On every target, the first call was accepted and the
overlapping call threw the catchable exception:

```text
Error: A ping is already in progress
```

The first callback received five ordered results, the rejected callback
received none, and each target returned normally to the REPL without an
assertion or reboot.

A separate test confirmed that operation tracking does not depend on an
application callback. A first request without a callback created an active
operation, an overlapping request was rejected, and a later recovery request
completed with five results.

The investigation then expanded to result delivery and JavaScript `reset()`.
Source inspection identified the task-boundary problem described in section
1.5, while physical reset testing exposed the teardown problem described in
section 1.6.

A broader final qualification provides regression coverage for overlap
rejection but is not an isolated test of this correction. Its complete results
are summarised in section 1.8.

### 1.5 IDF5 native ping results need to be delivered safely into JavaScript

The ESP-IDF ping callbacks run in the native ping task rather than in
Espruino’s JavaScript interpreter task. The application callback itself is
executed later by the interpreter, but in the affected implementation its
arguments and event-queue entry were constructed in the native task.

The native task can pre-empt the interpreter, so both tasks could access the
JavaScript heap and event queue concurrently. Native ping processing therefore
manipulated interpreter-owned state from outside the interpreter task without
a safe handoff.

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

#### Implemented correction

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

A queued-delivery test was run on classic ESP32, ESP32-C3 and ESP32-S3 IDF5
targets. All three delivered the five expected result objects for successful
and timeout sessions. They also completed immediate recovery and successfully
started a new ping from the final callback without an assertion or reboot.

A separate 28-session repeated-ping test provides broader regression coverage
for queued result delivery but is not an isolated test of the handoff
correction. Its result and the complete seven-definition build coverage are
summarised in section 1.8.

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
the JavaScript runtime containing its stored callback had been discarded. Its
remaining results then tried to use the stored callback from that discarded
runtime, producing repeated event-queue errors.

The old native session eventually completed and a later ping succeeded, so
the driver was not permanently wedged. However, the reset boundary was not
lifecycle-safe: the operation state, queued results and stored JavaScript
callback were not cleared together.

#### Reproduction and baseline result

A retained [`esp32_wifi_ping_reset.js`](repros/esp32_wifi_ping_reset.js)
probe exercised three reset timings. A chip-level `E.reboot()` was used
between modes so that each started from an independent native state:

- `reset()` during an active loopback-success session;
- `reset()` during an active timeout session; and
- `reset()` after a result had been queued but before the pending JavaScript
  reset had been processed.

The ESP32-C3 baseline produced these results:

| Reset timing | Callbacks from the pre-reset operation after reset request | Event-queue errors | Recovery callbacks |
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
runtime. It handled normal completion through `on_ping_end`, but did not use
Espruino's wrapper cleanup mechanism to cancel the active session and detach
its callback when the runtime was destroyed.

Calling `reset()` could therefore leave the native ping task publishing
results into the retained response queue. The interpreter-side idle handler
could then try to queue those results through the callback stored by the
discarded runtime.

#### Implemented correction

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

The existing network cleanup hook, which Espruino invokes during JavaScript
runtime teardown, now participates in ping cancellation. It clears retained
response data, stops a running ESP-IDF session, changes the state to
`ESP32_PING_CANCELLING` and releases `g_jsPingCallback`:

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

The two cleanup responsibilities remain separate. The network cleanup hook
prevents further JavaScript delivery and requests cancellation. The native
`on_ping_end` completion path remains the only path that deletes the ESP-IDF
session. This prevents `reset()` and native completion from both attempting to
delete the same session when they occur at nearly the same time.

The cancellation and reset-lifecycle correction was introduced in commit
`db60cfe9b`.

#### Test coverage

The three reset modes were repeated on classic ESP32, ESP32-C3 and ESP32-S3
IDF5 targets. Each target produced the same result:

| Reset timing | Callbacks from the pre-reset operation after reset request | Event-queue errors | Recovery callbacks |
| --- | ---: | ---: | ---: |
| Active loopback success | 0 | 0 | 5 |
| Active timeout target | 0 | 0 | 5 |
| Result queued before reset teardown | 1 | 0 | 5 |

Every recovery ping completed. The one callback from the pre-reset operation
in the queued-result mode is expected: Espruino services an event already in
its queue before processing the deferred `reset()` and invoking wrapper
cleanup hooks. No callback was delivered against a discarded runtime. The S3
emitted separate GPIO-number diagnostics during reset, but they did not affect
ping cancellation or recovery.

### 1.7 IDF5 completed ping tasks can exhaust native memory before cleanup

The reset correction stopped stale JavaScript delivery, but a subsequent
repeated-session test exposed a separate native-resource problem.

#### Reproduction and baseline result

A repeated-session probe attempted 28 consecutive loopback sessions. An early
candidate completed 24 sessions and 120 callbacks before
`esp_ping_new_session()` failed with `ESP_ERR_NO_MEM`. Reported free heap fell
from 71,304 bytes to 1,240 bytes.

#### Source finding

`esp_ping_delete_session()` makes the completed ping task eligible to exit;
it does not synchronously release that task's stack and control block. The
native ping task exits later, and the FreeRTOS idle task then reclaims those
resources. On the single-core C3, continuous Espruino interpreter and USB
activity could prevent the idle task from running often enough between
repeated ping sessions.

#### Implemented correction

After `esp_ping_delete_session()`, the IDF5 implementation starts a bounded
1,500 ms native-task cleanup grace period. The same period starts when session
creation or startup fails after native resources may have been allocated.
While it is active, the Espruino idle handler briefly yields with
`vTaskDelay(1)`. This gives the native ping task time to exit and the FreeRTOS
idle task an opportunity to release its resources.

The grace period does not block JavaScript for 1,500 ms or prevent another
ping from starting. The 1,500 ms bound is the configured 1,000 ms request
timeout plus one 500 ms request interval. It covers the longest configured
request wait and a further scheduling interval while remaining finite.

This correction was introduced in commit `70555065f`.

#### Test coverage

The corrected repeated-session probe completed on the single-core C3 and the
dual-core classic ESP32 and ESP32-S3. The session, callback and heap results
are included in the combined qualification below.

### 1.8 Combined ping qualification

The final PR1 candidate was executable revision `bc5f06466e`. Focused test
programs, firmware identities and complete results are published in the
[IDF4 basic-ping qualification](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-03-esp32-idf4-basic-ping-correction.md)
and the
[IDF5 ping-hardening qualification](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-03-esp32-idf5-ping-hardening-candidate.md).

Physical runtime testing covered:

- the classic IDF3 backend accepting the corrected IPv4 string and completing
  two serialized sessions with its established result shape;
- classic ESP32, ESP32-C3 and ESP32-S3 IDF4 targets completing successful
  loopback requests and two serialized sessions;
- classic ESP32, ESP32-C3 and ESP32-S3 IDF5 targets completing IPv4 parsing,
  successful and timeout result delivery, overlap rejection, operation
  tracking without a callback, recovery and a new session started from the
  final callback; and
- all three IDF5 targets completing the three JavaScript `reset()` modes and
  the repeated-session test.

The repeated-session test configured five requests per session. All three
IDF5 targets therefore completed 28 sessions and delivered all 140 expected
result callbacks:

| Target | Sessions | Callbacks | First free heap | Final free heap | Change |
| --- | ---: | ---: | ---: | ---: | ---: |
| Classic ESP32 | 28 | 140 | 63,632 | 63,604 | -28 |
| ESP32-C3 | 28 | 140 | 71,300 | 71,268 | -32 |
| ESP32-S3 | 28 | 140 | 108,960 | 108,948 | -12 |

Clean release builds completed for all seven maintained ESP32-family
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

The shared parser and IDF4 corrections restore basic operation on the older
backends. Overlap rejection, interpreter-side result delivery, reset cleanup
and native-task cleanup remain limited to IDF5.

### 1.9 Proposed PR1 submission text

Proposed title:

`ESP32: correct and harden Wifi.ping across IDF versions`

Copy-ready pull-request description:

```md
Reproduction steps, source analysis and full qualification evidence are
recorded in #2779.

## Summary

This PR restores valid IPv4 string handling for ESP32 `Wifi.ping()`, corrects
basic ping operation on ESP-IDF 4 and hardens the ESP-IDF 5 asynchronous ping
lifecycle.

The changes are kept behind the existing ESP-IDF-version branches. The shared
IPv4 parser correction applies before backend selection, the native IDF3
backend is otherwise unchanged, IDF4 receives a narrowly scoped session and
scheduling correction, and the larger operation-state and lifecycle changes
apply only to IDF5.

## Changes

- Parse dotted-decimal IPv4 strings through `ip4addr_aton()` and return its
  result from the IPv4-only `stringToIP()` path.
- Configure IDF4 ping through the typed `ping_sock` session API rather than
  passing a binary address to the deprecated text-address compatibility
  adapter.
- Run the IDF4 and IDF5 native ping tasks at priority 6, immediately above
  Espruino's priority-5 interpreter, so the task cannot be starved by the
  interpreter on the single-core ESP32-C3.
- Track one IDF5 ping operation with a retained session handle, state and
  optional callback; reject an overlapping request with the catchable exception
  `A ping is already in progress`.
- Transfer IDF5 results from the native ping task to the interpreter through
  a bounded plain-C queue. `JsVar` construction and `jsiQueueEvents()` now run
  only in the interpreter context.
- Hold the final result until ESP-IDF reports `on_ping_end`, allowing a new
  ping to be started safely from the final JavaScript callback.
- Cancel result delivery during JavaScript `reset()` while leaving the native
  completion path as the only path that deletes the ESP-IDF session.
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
  callbacks followed by a final callback that repeats the cumulative result.
- IDF5 continues to deliver five per-request callbacks for a normal session.
- A second IDF5 request made while a session is active is now rejected
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
  timeout result delivery, overlap rejection, operation tracking without a
  callback, immediate recovery and starting a new session from the final
  callback;
- JavaScript `reset()` during an active success, active timeout and queued
  completion on all three IDF5 targets, with no callback delivered against a
  discarded runtime; and
- 28 repeated IDF5 sessions and 140 callbacks on each target, with final
  native-heap changes of -28 bytes on classic ESP32, -32 bytes on ESP32-C3 and
  -12 bytes on ESP32-S3.
```
## 2. `Wifi.connect()` ownership and error reporting

JavaScript uses `Wifi.connect()` to request a station connection. Once the
request is accepted, the wrapper creates a connection operation around the
ESP-IDF work. When the optional JavaScript callback is supplied, the wrapper
retains it until the station either obtains a usable IP address or the existing
retries end in connection failure.

Testing on an ESP32-C3 showed that this works as expected when one connection
operation runs in isolation. A valid request produced one callback after
obtaining an IP address. Incorrect credentials and an unavailable network each
emitted a `disconnected` event and produced one callback with
`4WAY_HANDSHAKE_TIMEOUT` or `NO_AP_FOUND`.

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

The six-second delay allows the first connection operation to remain active
when the second request is made. The final observation is made after 30
seconds so the native retry and final-disconnection path has time to
complete.

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

The problem occurs when another `Wifi.connect()` request is made while the
first operation is still active. The pre-fix implementation did not retain an
explicit connection-operation state. Instead, it used the single module-level
callback as both the completion function and the only indication that an
operation was active. Each new request could clear or replace that callback
before the request had been fully validated.

Consider the three overlap cases:

- With two valid requests, `esp_wifi_set_config()` rejected the attempt to
  configure the station for the second SSID with `ESP_ERR_WIFI_STATE`. The
  second call returned normally, the error was reported only through
  `jsError()`, and neither JavaScript callback ran.
- With an invalid second request, the expected argument-type exception was
  thrown, but the callback belonging to the first operation had already been
  cleared and was never called.
- With no optional callback on the first request, the wrapper did not record
  an active operation, allowing the second request to reach the same
  `ESP_ERR_WIFI_STATE` path.

Once a connection request had been accepted, Espruino could not reliably
retain the resulting operation or guarantee one observable completion result.
An application could see the call return normally while receiving neither a
catchable exception nor a callback, leaving it dependent on an external
timeout to recover.

The correction therefore needs explicit operation state independent of the
optional callback. It must validate a new request before changing existing
state, reject overlaps without disturbing the active operation, and report
immediate ESP-IDF failures through an observable JavaScript outcome. Native
Wi-Fi lifecycle events must remain independent of the callback supplied for
an individual request.

In addition, the debug-enabled test build printed the supplied password. The
tested image was a debug-enabled release build using both `DEBUG=1` and
`RELEASE=1`. A standard release built without `DEBUG=1` compiles this
diagnostic out, so this is not a normal production-runtime exposure. Removing
the password value is nevertheless a small defensive cleanup.

As a separate observation, the ESP32 backend applies a fixed retry policy. The
published [`Wifi.connect()` documentation](https://www.espruino.com/reference#l_Wifi_connect)
mentions connection retries and advises callers to use their own timeout, but
does not identify the fixed ESP32 retry count.

Each accepted request sets `g_retryCounter` to 3. When starting disconnected,
one `Wifi.connect()` operation can therefore produce three native connection
attempts: the initial attempt and two retries. The public `disconnected` event
and connection callback are deferred until the final attempt fails.

This contributed to the observed completion delay. An unavailable network
completed after approximately 16 seconds, while an incorrect password
completed after approximately 22.5 seconds. In the latter test, a 20-second
application timeout expired before Espruino reported the completion result.

Changing or exposing the retry policy (eg in the connect options) is a
separate design decision and is not part of this work. Its precise ESP32
behaviour can be addressed by a future issue and documentation PR.

### Native event execution context

Source review found that this correction also requires an explicit task
boundary. Consider: Espruino runs its JavaScript heap and interpreter loop in
the FreeRTOS task `espruinoTask`. The ESP-IDF Wi-Fi event loop invokes
Espruino's registered handler from a different task: `eventTask` on IDF3 and
`sys_evt` on IDF4 and IDF5.

The pre-fix handler created and unlocked `JsVar` values, published `Wifi`
events, called `jsiQueueEvents()` and changed stored JavaScript callbacks
directly from the ESP-IDF event task. `jsiQueueEvents()` does not cross the
task boundary safely; it creates JavaScript objects and appends them to the
interpreter's event array.

The correction must instead copy station-event data into a bounded plain-C queue and wake the interpreter with jshHadEvent(). The PR adds jswrap_wifi_events_idle() through Espruino’s existing interpreter-idle mechanism. When the interpreter runs this handler, it drains the queue and performs the JavaScript work: publishing events, completing operations and releasing stored callbacks.

The source paths and version-specific dispatch chains are recorded in the
[ESP32 Wi-Fi event-handler execution-context investigation](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/docs/investigations/wifi/esp32-wifi-event-task-context-2026-11-05.md).

### Implemented `Wifi.connect()` correction

Commit `610007d3f`, on top of the completed ping candidate, applies the shared
rules above to the IDF5 connection lifecycle. It adds connection state for
idle, waiting for station startup and connecting. This state is independent
of the optional callback, so a request without one still creates an active
operation.

The operation begins only after the request has been validated, before any
ESP-IDF work starts. It ends when:

- the station obtains a usable IP address;
- the existing retries end in disconnection;
- an ESP-IDF setup or connection call fails; or
- JavaScript `reset()` clears the operation.

`jswrap_wifi_connect()` now validates the SSID, options and callback before it
changes global or native state. An invalid request continues to throw its
existing argument exception. A valid request made while another connection
operation is active throws:

```text
Error: A connection is already in progress
```

The rejected request does not alter the active callback, credentials or native
Wi-Fi configuration.

The first terminal condition closes the operation. A shared completion helper
marks it inactive and removes its stored callback before scheduling that
callback. Usable-IP success supplies a null error and connection details;
connection failure supplies the reported Wi-Fi reason; and an immediate or
deferred ESP-IDF failure supplies that native error. The failure may also be
written to the diagnostic log, but `jsError()` is not its only
application-visible result.

The station-event handoff described above uses a bounded 16-entry plain-C
queue and `jswrap_wifi_events_idle()`. The existing reset/kill hook clears the
operation, unlocks its callback and clears queued station events, preventing a
later event from invoking an old callback or completing a subsequent request.
Public `associated`, `connected` and `disconnected` events remain independent
observations of the native Wi-Fi lifecycle.

The corrected behaviour for the two-call reproduction is:

```text
starting connection 1
starting connection 2
connection 2 threw: Error: A connection is already in progress
connection 1 callback: NO_AP_FOUND
FIRST_CALLBACK_COUNT=1
SECOND_CALLBACK_COUNT=0
```

This PR does not change the existing retry count, add an application connection
timeout or implement the documented `dhcp_timeout` event. Application timeout
and stale-event handling remain the caller's responsibility, and the separate
exactly-once behaviour of `Wifi.disconnect()` remains part of PR3. The debug
connection message still identifies the SSID and whether a callback was
supplied, but no longer prints the password.

### IDF version - scope of change

The connection and disconnection hardening is limited to the IDF5 backend.
IDF3, used by the classic ESP32 build, retains its long-established behaviour
to avoid unnecessary compatibility risk. IDF4 is considered transitional as
IDF5 enters production. Both older backends remain in the build and
regression-test coverage, but their connection lifecycles are not changed.

### Test coverage

Clean release images from `610007d3f` were flashed to classic ESP32,
ESP32-C3 and ESP32-S3 IDF5 targets. Each runtime reported Espruino `2v29.503`
and the exact embedded revision.

Focused test programs, check definitions, firmware identities and complete
results are published in the
[PR2 candidate qualification](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-05-esp32-idf5-wifi-connect-hardening-candidate.md).
A result such as `12/12` means that all twelve scripted checks passed on that
target.

| Test | Classic IDF5 | C3 IDF5 | S3 IDF5 |
|---|---:|---:|---:|
| overlap and callback ownership | 12/12 | 12/12 | 12/12 |
| connection, failure and recovery lifecycle | 33/33 | 33/33 | 33/33 |
| JavaScript reset during an active request | pass | pass | pass |
| ping regression | 28 sessions, 140 callbacks | 28 sessions, 140 callbacks | 28 sessions, 140 callbacks |

A connection-lifecycle test covered successful connection, reconnect while
already connected, unavailable SSID, incorrect password, recovery after both
failures, and ten further connect/disconnect cycles. Every callback supplied
for an accepted request was invoked exactly once. The unavailable SSID
reported `NO_AP_FOUND`; the incorrect password reported
`4WAY_HANDSHAKE_TIMEOUT`.

The first completed cycle was used as the comparison point to exclude expected
one-time Wi-Fi allocations. After ten connect/disconnect cycles, free native
heap differed by -140 bytes on classic, +100 bytes on C3 and -140 bytes on S3.
These small changes showed no material continuing heap loss. A corresponding
28-session ping regression completed all 140 callbacks on every target, with
final heap differences of +8, +24 and 0 bytes respectively.

A reset probe confirmed on all three targets that an old callback was not
invoked after `reset()`, while a new unavailable-network request completed
once and recovered normally.

A stateful scan regression on classic IDF5 found the configured AP after a
completed connection and disconnect, without an unsolicited reconnect. A
controlled two-board test also completed AP-only, AP+station and station-only
transitions, retained the station address after stopping the AP, exchanged a
UDP packet, and observed peer join and leave events.

A final classic lifecycle run inspected the captured serial output before
sanitising it and confirmed that neither the valid nor deliberately incorrect
password appeared.

A basic station-connection test also completed successfully on the unchanged
connection paths in the classic ESP32, ESP32-C3 and ESP32-S3 IDF4 builds, and
in classic IDF3. All seven maintained ESP32-family definitions completed clean
release builds:

```text
ESP32
ESP32_IDF4
ESP32_IDF5
ESP32C3_IDF4
ESP32C3_IDF5
ESP32S3_IDF4
ESP32S3_IDF5
```

The candidate also handles immediate errors returned by
`esp_wifi_get_mode()`, `esp_wifi_set_mode()`, `esp_wifi_set_config()`,
`esp_wifi_start()` and either call path to `esp_wifi_connect()`. Each
error-handling code path completes the accepted request through the same
completion helper. These paths compiled and were inspected in the candidate
diff, but were not forced on hardware because that would have required
test-only fault injection. Physical testing instead exercised connection
failures reported naturally after the native retries.

### Proposed PR2 submission text

```text
ESP32 IDF5: harden Wifi.connect lifecycle

This fixes the ESP32 IDF5 Wifi.connect ownership and error-reporting problems
described in #2779.

The change validates a request before creating its connection operation,
tracks the operation independently of the optional callback, rejects overlaps
without disturbing the active operation, and allows only one completion path
to finish it. It also moves IDF5 station-event handling from the ESP-IDF event
task into Espruino's interpreter task through a bounded plain-C queue, clears
the connection operation on reset, and removes the password from debug output.

The lifecycle change is guarded to ESP-IDF 5. IDF3 and IDF4 connection
behaviour is unchanged.

Qualification used clean release builds for all seven ESP32 definitions and
physical runtime testing on classic ESP32, ESP32-C3 and ESP32-S3. Focused IDF5
overlap tests passed 12/12 per target, connection/recovery tests passed 33/33
per target, reset recovery passed on all three, and a full ping regression
delivered 140/140 callbacks per target without final heap loss.
IDF4 station smoke tests passed on all three families and classic IDF3 also
passed.
```
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

A [retained reproduction](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/docs/investigations/wifi/repros/esp32_wifi_disconnect_connected.js)
uses the same operation with structured output and also records the final
station status and IP address.

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
had been cleared. The API had no explicit operation state with which to
distinguish one accepted operation, an overlap, and an unrelated native
disconnect.

An idle or unassociated station adds a separate completion case. ESP-IDF can
return `ESP_OK` from `esp_wifi_disconnect()` without publishing a
station-disconnected event when there is no association to leave. Waiting
unconditionally for an event would therefore leave an accepted operation
incomplete.

Finally, `Wifi.disconnect()` can be called while `Wifi.connect()` owns an
active station attempt. The two API operations need separate operation state, but the deliberate disconnect must also terminate the active connection operation once, rather than allowing its callback to remain pending or later complete from a stale native outcome.

### Implemented `Wifi.disconnect()` correction

Commit `14cd9932f`, on top of the qualified connection candidate, applies the
shared rules above to the IDF5 disconnection lifecycle. It adds disconnect
state for idle and disconnecting. This state is independent of the optional
callback, so a request without one still creates an active operation.

`jswrap_wifi_disconnect()` now validates the optional callback before it
changes the operation state or stored callback. An invalid request continues
to throw its existing argument exception. A valid request made while another
disconnect operation is active throws:

```text
Error: A disconnection is already in progress
```

The rejected request does not alter the active operation or its callback.
`Wifi.connect()` also rejects a new connection while a disconnect operation
is active.

The disconnect operation begins after the request has been validated. It ends
when:

- ESP-IDF reports the station-disconnected event expected for an associated
  station or a started station with an active connection attempt;
- the API path finds that the station is idle, stopped or otherwise
  unassociated, so no station-disconnected event can occur;
- `esp_wifi_disconnect()` reports an immediate error;
- required station-event data is missing or the bounded station-event queue
  overflows; or
- JavaScript `reset()` clears the operation.

The wrapper uses esp_wifi_sta_get_ap_info() rather than relying on the stored g_isStaConnected flag. That flag may be stale because reset() can discard a queued station event before the interpreter processes it and updates the flag. The wrapper then uses the actual association state, together with any active connection attempt, to determine whether a native station-disconnected event is expected. When an event is expected, the disconnect operation remains active until that event completes it. When no event is expected, the wrapper completes the operation and its optional callback directly, even if esp_wifi_disconnect() returns ESP_OK.

If a connection operation is active, the wrapper completes it once with
`Connection cancelled` before requesting disconnection. The disconnect
request remains a separate operation; if it has a callback, that callback is
scheduled once when the disconnect operation completes.

A shared helper completes an accepted disconnect operation. It first marks the operation inactive and removes its stored callback, then schedules the optional callback for JavaScript execution. If a later event or error reaches the helper, it finds no active operation and cannot schedule the callback again.
Both the station-disconnected event handler and the API path used when no native event is expected call this helper. Error handling for missing station-event data or a full event queue also calls it, ensuring that these errors do not leave the operation active. During JavaScript reset(), the existing network cleanup hook instead clears the operation and unlocks its callback without scheduling it against the discarded JavaScript state.

The public `disconnected` event remains an independent observation of the
native Wi-Fi lifecycle. Completing the optional per-call callback neither
suppresses nor duplicates that event.

The corrected behaviour for the reproduction is:

```text
CONNECT_CALLBACK=null
DISCONNECT_CALLBACK=1
DISCONNECTED_EVENT={...}
DISCONNECT_CALLBACK_COUNT=1
DISCONNECTED_EVENT_COUNT=1
```

### IDF version - scope of change

The connection and disconnection hardening is limited to the IDF5 backend.
IDF3, used by the classic ESP32 build, retains its long-established behaviour
to avoid unnecessary compatibility risk. IDF4 is considered transitional as
IDF5 enters production. Both older backends remain in the build and
regression-test coverage, but their disconnection lifecycles are not changed.

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

Focused test programs, check definitions, firmware identities and complete
results are published in the
[PR3 candidate qualification](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-07-esp32-idf5-wifi-disconnect-hardening-candidate.md).
A result such as `27/27` means that all twenty-seven scripted checks passed on
that target.

Physical IDF5 testing on classic ESP32, ESP32-C3 and ESP32-S3 produced:

| Test | Classic IDF5 | C3 IDF5 | S3 IDF5 |
|---|---:|---:|---:|
| disconnect lifecycle | 27/27 | 27/27 | 27/27 |
| connection overlap ownership | 12/12 | 12/12 | 12/12 |
| connection, failure and recovery lifecycle | 33/33 | 33/33 | 33/33 |
| disconnect reset and recovery | pass | pass | pass |
| full ping lifecycle | 35/35 | 35/35 | 35/35 |

A disconnect-lifecycle test covered idle and connected calls, cancellation of
an active connection, operation tracking without a callback, valid and invalid
overlaps, public-event counts and reconnection after every completion path.
Every accepted disconnect callback completed once; rejected overlaps supplied
no callback; and applicable public disconnect events were each emitted once.

A connection-cycle test used a post-initialisation heap reading taken
immediately before ten repeated connection/disconnection cycles as its
comparison point. At the end, free native heap differed by -136 bytes on
classic, -148 bytes on C3 and -132 bytes on S3. These small changes showed no
material continuing heap loss.

A corresponding ping regression completed 28 sessions and all 140 expected
callbacks on every target. Its final heap differences were -20 bytes on
classic, -4 bytes on C3 and -48 bytes on S3.

A disconnect-reset probe detached the old disconnect callback and completed a
fresh connection/disconnection sequence once. The C3 also passed ping reset
during active success, active timeout and queued completion, and connection
reset followed by a new request that completed normally.

An IDF4 smoke-test set used exact-source release images on classic, C3 and S3.
Each completed one station connection and a five-result loopback ping. An
expanded classic IDF3 regression passed 15/15 checks covering successful
connection and DHCP, an unavailable SSID, native station events, deliberate
disconnect, reconnection and repeated cycles. It recorded rather than changed
the legacy two-callback deliberate-disconnect behaviour. A legacy-aware IDF3
ping test also completed both sessions with its established six-callback
result shape.

A broader Wi-Fi API regression on the same classic image covered
scan and connected-scan behavior, cancellation and repeated cycles,
incorrect-password recovery, controlled AP loss and restoration, AP/STA mode
transitions, target-hosted WPA2 AP operation, static station and custom AP
addressing, saved-configuration restoration, DNS, hostname, SNTP and
supported global configuration. All operational roles passed. The run also
recorded, rather than changed, the legacy duplicate disconnect callback and
the ESP-IDF 3 abort when modem sleep is disabled while Bluetooth remains
enabled.

A physical access-point loss and restoration test connected the C3 to an
available access point. After the access point was disabled, the C3 observed
one `disconnected` event with reason 201 (`NO_AP_FOUND`) and reported IP
`0.0.0.0`. After the access point was restored, one explicit
`Wifi.connect()` completed its callback once and obtained a valid station IP
address.

### Proposed PR3 submission text

```text
ESP32 IDF5: harden Wifi.disconnect lifecycle

This fixes the ESP32 IDF5 Wifi.disconnect ownership and duplicate-callback
problem described in #2779.

The previous wrapper queued an accepted disconnect callback directly and
retained the same callback for the later native station-disconnected event,
allowing one call to execute it twice. This change creates explicit operation
state for each accepted disconnect request, including one without a callback.
It rejects a conflicting request without changing the active operation and
routes all completion paths through one helper. An associated station waits
for the native event; an idle or unassociated station, where no event can
occur, completes immediately.

Disconnecting during an active connection now completes that connection once
with Connection cancelled. Reset clears the disconnect operation and releases
its callback, while public disconnected events remain independent of per-call
completion.

The lifecycle change is guarded to ESP-IDF 5. IDF3 and IDF4 behaviour is
unchanged.

Qualification used clean release builds for all seven ESP32 definitions and
physical testing on classic ESP32, ESP32-C3 and ESP32-S3. A focused
disconnect-lifecycle test passed 27/27 per IDF5 target, the connection
regressions passed 12/12 and 33/33 per target, reset recovery passed, and the
full ping regression delivered 140/140 callbacks per target. IDF4 station and
ping smoke tests passed on all three families, and classic IDF3 passed both
the expanded 15/15 station regression and the broader Wi-Fi API matrix.
Manual SHED loss and restoration completed with one disconnect event and one
recovery callback.
```
## 4. Combined qualification

The final stacked qualification used executable revision `14cd9932f`. The
later comment-review revisions listed in the opening dependency table change
comments only; they do not alter executable code or invalidate the recorded
runtime results.

The test programs, check definitions, firmware identities, build results and
complete physical results are published in the
[final stacked candidate qualification](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-07-esp32-idf5-wifi-disconnect-hardening-candidate.md).
In the runtime matrix below, a result such as `27/27` means that all
twenty-seven scripted checks passed. The repeated-ping row reports completed
sessions followed by the total callbacks received.

All seven maintained ESP32-family definitions completed clean release builds
from the final stacked implementation:

| Board definition | ESP-IDF line | Clean build | Physical runtime scope |
|---|---|---:|---|
| `ESP32` | IDF3 | pass | broad station, AP, scan, addressing, persistence, recovery and ping regression |
| `ESP32_IDF4` | IDF4 | pass | basic station and five-result ping smoke tests |
| `ESP32_IDF5` | IDF5 | pass | full ping, connection and disconnection test sets |
| `ESP32C3_IDF4` | IDF4 | pass | basic station and five-result ping smoke tests |
| `ESP32C3_IDF5` | IDF5 | pass | full test sets, reset boundaries and physical AP-loss recovery |
| `ESP32S3_IDF4` | IDF4 | pass | basic station and five-result ping smoke tests |
| `ESP32S3_IDF5` | IDF5 | pass | full ping, connection and disconnection test sets |

The final IDF5 runtime matrix was:

| Test | Classic IDF5 | C3 IDF5 | S3 IDF5 |
|---|---:|---:|---:|
| disconnect lifecycle | 27/27 | 27/27 | 27/27 |
| connection overlap and callback handling | 12/12 | 12/12 | 12/12 |
| connection, failure and recovery lifecycle | 33/33 | 33/33 | 33/33 |
| disconnect reset and recovery | pass | pass | pass |
| full ping lifecycle | 35/35 | 35/35 | 35/35 |
| repeated ping sessions and callbacks | 28 / 140 | 28 / 140 | 28 / 140 |

A three-mode ping-reset probe called `reset()` during a successful session,
during a timeout session and after a result had been queued. It passed on all
three IDF5 targets on the PR1 candidate. A connection-reset probe then passed
on all three targets on the PR2 candidate.

The final stacked C3 candidate repeated the three ping-reset modes and then
completed fresh connection and disconnection operations. A physical
access-point loss and restoration test also completed with one public
`disconnected` event and one callback from the explicit recovery request.

## 5. Compatibility boundaries and application responsibilities

### Backend and API boundaries

- The IPv4 parser is shared by all ESP32 backend versions. IDF3 therefore
  receives the parser correction, but its ping implementation is otherwise
  unchanged.
- IDF4 receives only the correction needed for basic ping operation and task
  scheduling. It retains the established five per-request callbacks followed
  by a final callback that repeats the cumulative result.
- Ping overlap rejection, result delivery into the interpreter, reset
  cancellation and cleanup of completed native ping tasks are IDF5-only
  lifecycle changes.
- Connection and disconnection operation-state changes are also IDF5-only.
  IDF3 and IDF4 retain their existing connection behaviour, including the
  observed IDF3 duplicate callback from a connected
  `Wifi.disconnect(callback)` request.
- PR2 transfers the IDF5 station events used by the connection lifecycle from
  the ESP-IDF event task into Espruino's interpreter task. Scan and
  access-point event paths retain their existing event-handler implementation
  and are not claimed as hardened by this work.
- The shared API documents `dhcp_timeout`, but the current ESP32 wrapper has no
  explicit publication path for that event. This work does not add one.
- The station-event and ping-result queues have fixed capacities. If either
  queue fills, the wrapper reports the overflow through `jsError()`. A
  station-event queue overflow also completes any active connection or
  disconnection operation so that the operation is not left active and its
  optional callback cannot remain pending indefinitely.

### Application responsibilities

The corrected wrappers track their ESP-IDF operations and optional callbacks,
but they do not define an application's connection policy. The application
remains responsible for:

- choosing an application-level connection timeout;
- deciding retry delay, backoff, credential replacement and provisioning
  policy after a reported failure;
- calling `Wifi.disconnect()` when its own timeout expires before the current
  connection operation completes;
- cancelling application timers after a completion callback or relevant state
  change;
- ignoring callbacks or timer events belonging to an earlier application
  attempt, for example by recording an application-maintained attempt number;
  and
- checking the current driver state with `getStatus()`, `getDetails()` and
  `getIP()` when a public lifecycle event is unexpected.

An application-maintained attempt number can associate its own callback
closures and timers with a particular connection request. Public
`Wifi.on(...)` events do not carry that number; they report changes in the
underlying driver lifecycle. The application should therefore treat them as
observations of driver state, not as proof that an event belongs to one
particular connection request.

## 6. Proposed submission sequence

The umbrella issue has been raised as
[espruino/Espruino#2779](https://github.com/espruino/Espruino/issues/2779).
PR1 can reference that issue and be reviewed independently. PR2 should be
rebased and proportionately requalified after PR1 merges; PR3 should follow
the same process after PR2 merges. Rebased commit identifiers should replace
the draft identifiers before each dependent PR is submitted.

This sequence keeps the parser and ping correction, connection ownership and
disconnection ownership separately reviewable while preserving their common
design principle.
