# ESP32 WiFi API asynchronous-operation hardening: IDF5 ping, connect and disconnect lifecycle

This umbrella issue tracks a related set of Espruino ESP32 Wi-Fi API lifecycle problems found while validating the ESP-IDF 5 port. The work covers the IDF5 `Wifi.ping()` implementation and the shared ESP32 station connect/disconnect paths. The issues overlap somewhat, but using this unbrella will support an integrated test across the wifi API and its underlying wifi event lifecycles.

This work is supported with the use of the codex AI agent in vscode for source analysis, test automation and documentation. 

The individual symptoms are different, but Codex identifies them as sharing one underlying problem: once an asynchronous operation has started, Espruino needs to retain ownership of that operation and its callback until it finishes. At present, a second call can replace a callback, a callback can be invoked twice, or native work can continue delivering results after JavaScript `reset()`.  In addition some issues can trigger a JSError message only without correcting the wifi active state.,

This unbrella issue is used to keep the overall investigation together, while proposing separate and more easily reviewed pull requests for:

1. IDF5 ping correctness, result delivery and reset handling.
2. Station connection overlap and error reporting.
3. Station disconnection and exactly-once callback handling.

Each problem has been reproduced on a physical ESP32-C3 with a standalone Espruino JavaScript program. The programs, observed output and relevant source path for each case are noted below.

The retained test programs, firmware identities and longer investigation notes are available in the [ESP32_SGATest Wi-Fi investigation](https://github.com/SimonGAndrews/ESP32_SGATest/tree/main/docs/investigations/wifi).

## 1. `Wifi.ping()`

Ping testing exposed an initial issue where valid IPv4 strings were rejected before an ESP-IDF ping session could be created. 


### 1.1 Valid IPv4 strings were rejected before an ESP-IDF ping session could be created.

The issue is reproduced with:

``` c
echo(false);
try {
  require("Wifi").ping("127.0.0.1", print);
  print("PING_CALL=accepted");
} catch (error) {
  print("PING_CALL=rejected " + error);
}
```

which results in:

```JS
PING_CALL=rejected Error: "127.0.0.1" not a valid IP address
```

#### Investigation result

As background, Commit 0b4ff45fa added ESP-IDF 5 ping support using Espressif's current ping_sock session API.

Commit bad3fc7a5 later disabled IPv6 (It seems because IPv6 DNS support was incomplete) and removed the integer form of Wifi.ping() in favour of string addresses. In the new IPv4-only path, stringToIP() stored the parsed address but then fell through to return false. Commit e73051ad4 corrected the type access needed for the classic ESP32 build, but did not change that return value.

Valid dotted-decimal IPv4 strings were therefore rejected before an ESP-IDF ping session could be created.

#### FIX 

The fix is small and limited to the non-IPv6 `stringToIP()` path. Instead of storing the parsed value and then unconditionally returning `false`, it marks the address as IPv4 and returns the result from lwIP's `ip4addr_aton()` parser.  In jswrap_esp32_network.c , function stringToIP() , the required change is:

``` c
Diff
#if CONFIG_LWIP_IPV6
 ...
#else
-  ((ip4_addr_t*)ipAddr)->addr = networkParseIPv4Address(str);
+  IP_SET_TYPE_VAL(*ipAddr, IPADDR_TYPE_V4);
+  return ip4addr_aton(str, ip_2_ip4(ipAddr));
##endif
 return false;
}
```

This fix is included in the testing and PR below.

### 1.2 The ping task can be starved on single-core ESP32-C3

After restoring the IPv4 strings path further testing on the c3 exposed a problem with the ESP-IDF’s default ping-task priority of 2.  

#### What was tested

This c3 issue was realised when testing using the loopback ping script that follows in section 1.3 .  The test makes two loopback ping calls one after the other, supplying a different callback to each call:

```js
wifi.ping("127.0.0.1", firstCallback);
wifi.ping("127.0.0.1", secondCallback);
```

Espruino’s ESP32 implementation configures every native ping session to send five requests. The test allows six seconds for both sessions to finish before printing the number of results delivered to each JavaScript callback.

#### Initial result
On the ESP32-C3, using an image containing only the IPv4 parser correction, both calls were accepted but neither callback received a result:

``` text
FIRST_CALL=accepted
SECOND_CALL=accepted
FIRST_COUNT=0
SECOND_COUNT=0
```

The same parser-only test produced ping results on the dual-core classic ESP32.

#### Investigation result

The ESP-IDF 5 implementation creates the session configuration using `ESP_PING_DEFAULT_CONFIG()` in function jswrap_wifi_ping(). The problematic code gives the native ping task a default priority of 2, while the Espruino interpreter task runs at priority 5.

On the single-core ESP32-C3 used for this test, with the native USB console active, the lower-priority ping task did not produce any results during the observation period.

An additional change was made, raising the ping task priority to 6 above the interpreter priority:

``` c
#if ESP_IDF_VERSION_MAJOR < 5
   ...
#else
  esp_ping_config_t ping_config = ESP_PING_DEFAULT_CONFIG();
  // Assign the target container cleanly to the session configuration
  ping_config.target_addr = ip;
  ping_config.count = ping_count;
  ping_config.timeout_ms = ping_timeout;
  ping_config.interval_ms = ping_delay;
+ ping_config.task_prio = 6;
```

With this change the test script returned results and allowed the testing described in 1.3 below to proceed on the c3.

In the change, the setting is applied in the shared ESP-IDF 5 path rather than behind an ESP32-C3-specific guard. The C3 exposes the problem most reliably because it is single-core, but the scheduling requirement is assumed to required to the shared implementation (and was tested against the original and S3 variants).

This fix is included in the testing and PR below.

### 1.3 Overlapping sessions share the last callback

A further problem identified in the Ping session lifecycle investigations was that two ping calls could create two native sessions, but Espruino retained only one global JavaScript callback. The second call replaced the first call's callback.

#### What was tested

For the C3 test, an image containing the IPv4 parser correction and the task-priority change described in section 1.2, was used but without any ping-session ownership correction.

The classic ESP32 comparison used an image containing only the IPv4 parser correction.

The test starts two loopback ping sessions one after the other and counts which callback receives each result:

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

After raising the ping-task priority, the two five-request sessions both ran on the ESP32-C3 and ten callback invocations were subsequently observed:

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

The board was reset immediately before this run, so the global seqNo counter starts at 1. This counter increments across all ping results and is not a native session identifier.

The result objects contained each cumulative count twice:

``` text
totalCount: 1,1,2,2,3,3,4,4,5,5
```

This is consistent with two separate five-request native sessions progressing concurrently. One result was delivered to the callback supplied by the first call, while the other nine were delivered to the callback supplied by the second call.

Or in other words: Both native sessions completed their five requests, producing ten result events in total. One event was delivered to the first callback and nine were delivered to the second callback. The nine events received by the second callback included results from both native sessions.

#### Interpretation from source analysis

Source inspection shows three relevant implementation details.

First, Espruino retains only one module-level JavaScript ping callback:

```c
static JsVar *g_jsPingCallback;
```

Second, every new call replaces that callback:

``` c
if (g_jsPingCallback != NULL) {
  jsvUnLock(g_jsPingCallback);
}
g_jsPingCallback = pingCallback;
jsvLockAgainSafe(g_jsPingCallback);
```

Third, results from every native session are queued using the callback that is stored in this global variable at the time the result is handled:

``` c
jsiQueueEvents(NULL, g_jsPingCallback, params, 1);
```

The ESP-IDF session handle is local to jswrap_wifi_ping(). No retained handle or busy state prevents another call from creating an overlapping session.

Taken together with the trace, this provides a likely explanation for the 1/9 distribution: one result was queued while the first callback was installed, after which the second call replaced the global callback and subsequent results were queued using it.

The exact split is scheduling-dependent. A 0/10 result was observed on the classic ESP32, while this C3 run produced 1/9. Both results are consistent with multiple native sessions sharing one mutable callback binding.

#### Suggested change

Retain explicit ownership of the active native ping session independently of whether a JavaScript callback was supplied.

While a session is active, reject another `Wifi.ping()` call before it can modify the callback or create another native session. Release the active-session state only after native completion has been processed safely.

The expected result from this reproduction is:

```text
FIRST_CALL=accepted
SECOND_CALL=rejected Error: A ping is already in progress
FIRST_COUNT=5
SECOND_COUNT=0
```

#### Test coverage

The session-ownership correction was tested on the classic ESP32, ESP32-C3 and ESP32-S3 IDF5 targets. The two-call loopback test passed on all three physical targets.

On each target, the overlapping call threw the catchable exception:

```text
Error: A ping is already in progress
```

The first session retained its callback and delivered five ordered results. The second callback was not invoked, and each board returned normally to the REPL without an assertion or reboot.

The same implementation was also exercised with a wider controlled ping lifecycle test on all three IDF5 targets. Each target passed 35/35 checks, completing 28 sessions and delivering 140 expected callbacks. This included:

- a normal five-result loopback session;
- rejection of an overlapping call;
- a five-result timeout session;
- immediate recovery after the timeout;
- starting another session from the final callback; and
- a further 25-session soak.

No progressive heap loss was observed during the soak tests.

A separate callback-less test confirmed that session ownership does not depend on a JavaScript callback being supplied. A callback-less first call owned the native session, an overlapping call was rejected, and a later recovery call completed with five results.

Clean builds also completed for all seven maintained ESP32-family board definitions: ESP32, ESP32_IDF4, ESP32_IDF5, ESP32C3_IDF4, ESP32C3_IDF5, ESP32S3_IDF4 and ESP32S3_IDF5.

These results validate normal session ownership and overlap rejection. Subsequent testing across JavaScript reset() exposed a separate native-session teardown problem, described later in this issue.

### 1.4 Native ping results need to be delivered safely into JavaScript

The ESP-IDF ping callbacks run in the native ping task rather than in Espruino’s JavaScript interpreter task. The application callback itself is executed later by the interpreter, but its arguments and event-queue entry are currently constructed in the native task.

The native task can pre-empt the interpreter, so it may access the JavaScript heap and event queue while the interpreter is also using them.

Native ping processing therefore crosses the JavaScript runtime’s ownership boundary and relies on unsynchronised access to interpreter-owned state.

This is persued here as part of the lifecycle-hardening design, not as a proven independent defect.

#### Source finding

In current master, both a successful response and a timeout call `emit_espruino_ping_event()` directly from the ESP-IDF callback:

``` c
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

`emit_espruino_ping_event()` creates and modifies JavaScript variables before adding the callback to Espruino’s event queue:

``` c
JsVar *jsPingResponse = jsvNewObject();

jsvObjectSetIntChild(jsPingResponse, "totalCount", transmitted);
...
jsiQueueEvents(NULL, g_jsPingCallback, params, 1);
jsvUnLock(jsPingResponse);
```

`jsiQueueEvents()` also creates JavaScript objects and modifies Espruino’s global event array. It queues a callback for later execution, but the act of constructing and queuing that event still manipulates JavaScript state in the native ping task.

This was identified by source inspection rather than by a separate crash reproduction. The physical tests show that results can be delivered, but they cannot establish that concurrent JavaScript-state access is safe under every scheduling condition.

#### Suggested change

The ESP-IDF callbacks should collect only plain C data. They should not allocate `JsVar` objects or interact directly with the JavaScript event queue.

The proposed implementation:

- maintains the native ping counters in C;
- copies each result into a bounded C response queue;
- protects the queue shared between the ping task and interpreter task;
- drains that queue from an Espruino idle handler;
- constructs the JavaScript result object from the interpreter context; and
- queues the application callback from that same context.

The candidate uses a bounded C response queue large enough to retain a complete ping operation if the native task runs ahead of the interpreter. Its capacity must be derived from the same authoritative configuration as the request count. Any queue-overflow condition must also be detected rather than silently dropping results.

The final result is held until ESP-IDF has issued its `on_ping_end` notification. This ensures that when the final JavaScript callback is eventually executed, the native session has ended and application code may safely start another ping.

The public API remains unchanged, but this is a more substantial internal change than the parser and priority corrections because it affects task coordination, callback lifetime and reset handling.

The change is nevertheless well-contained: it does not redesign the wider Espruino networking layer or alter the JavaScript API. Its complexity comes from correctly crossing three boundaries:

```text
ESP-IDF ping task → retained C data → Espruino interpreter → JS callback
```

This bounded C queue and idle handler are the currently tested mechanism for normal result delivery, but they are not the only acceptable design. The requirement is a safe handoff that avoids cross-task access to JavaScript state.

The current candidate does not yet handle JavaScript `reset()` safely. Native-session cancellation and callback teardown still need to be added, as described in the next section.

#### ESP32 family integration

The queued-delivery implementation is guarded by a family-wide `USE_ESP32` condition:

``` js
/*JSON{
  "type" : "idle",
  "generate" : "jswrap_wifi_ping_idle",
  "ifdef" : "USE_ESP32"
}*/
```

The first queued-delivery candidate guarded its idle handler with the literal `ESP32_IDF5` board macro. This registered delivery for the classic IDF5 wrapper but omitted the C3 and S3 wrappers. The guard was therefore changed to the family-wide `USE_ESP32` condition.

IDF5 builds use the queued-result implementation. Earlier ESP-IDF builds provide a no-operation version of the idle function so that the shared ESP32 wrappers continue to build.

#### Test coverage

The queued-delivery implementation was included in the classic ESP32, ESP32-C3 and ESP32-S3 IDF5 candidate images used for the lifecycle testing described above.

All three targets delivered the five expected result objects for successful and timeout sessions. They also completed immediate recovery, starting a new ping from the final callback, and the 25-session soak without an assertion, reboot or progressive heap loss.

Clean builds passed for all seven maintained ESP32-family board definitions, confirming that the family-wide idle registration linked to the queued implementation on IDF5 and to the compatibility implementation on earlier IDF versions.

These results cover normal completion and result delivery. They do not cover JavaScript `reset()` while a native session is active; that exposed a separate lifecycle problem described in the next section.

### 1.5 JavaScript `reset()` leaves native ping work bound to the discarded runtime

The normal-completion tests above did not cover what happens when JavaScript `reset()` is called while a native ping session is still active. Unlike a chip-level reboot, `reset()` discards and recreates Espruino’s JavaScript runtime without necessarily stopping native ESP-IDF work that has already started.

Testing on the ESP32-C3 showed that the native ping session continued after the runtime that owned its callback had been discarded. Its remaining results were then delivered against callback state belonging to the old runtime, producing repeated event-queue errors.

The old native session eventually completed and a later ping succeeded, so the driver was not permanently wedged. However, the reset boundary is not lifecycle-safe: native operation state, queued results and JavaScript callback ownership are not being torn down together.

This was found while testing the current ping lifecycle candidate. It must be corrected before that candidate can be proposed as the complete ping fix.