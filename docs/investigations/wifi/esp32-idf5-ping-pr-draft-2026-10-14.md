# Draft PR: restore ESP32 IPv4 ping parsing and complete IDF5 ping sessions

> Supporting text for the prepared Espruino pull request. The source branch,
> seven-target build matrix and three-target IDF5 runtime confirmation are
> complete; the parser-only Web IDE screenshot remains optional supporting
> evidence.

## Summary

This change restores `Wifi.ping()` on ESP32 IDF5 and makes its asynchronous
session handling work consistently across the classic ESP32, ESP32-C3 and
ESP32-S3 targets:

1. restore IPv4 string parsing so a valid address reaches the ping
   implementation; and
2. complete the ESP-IDF 5 ping-session lifecycle so only one Espruino ping is
   active at a time and its results stay attached to the correct callback;
3. register the JavaScript idle-delivery hook for the whole ESP32 family,
   rather than only the classic `ESP32_IDF5` board macro; and
4. run the ESP-IDF ping task above the Espruino interpreter priority so it is
   not starved on a single-core ESP32-C3 using the native USB console.

The parser regression remains separate from the session-lifecycle change so
the two original defects can be reviewed independently. Family validation
then identified the idle-hook registration and task-priority requirements as
necessary parts of the lifecycle correction.

## Background

Commit `0b4ff45fa` added ESP-IDF 5 ping support using Espressif's current
`ping_sock` session API.

Commit `bad3fc7a5` later disabled IPv6 because IPv6 DNS support was incomplete,
and removed the integer form of `Wifi.ping()` in favour of string addresses.
In the new IPv4-only path, `stringToIP()` stored the parsed address but then
fell through to `return false`. Commit `e73051ad4` corrected the type access
needed for the classic ESP32 build, but did not change that return value.

Valid dotted-decimal IPv4 strings were therefore rejected before an ESP-IDF
ping session could be created. Restoring that path exposed a second, separate
problem in the session lifecycle: two calls could create two native sessions,
but Espruino retained only one global JavaScript callback. The second call
therefore replaced the first call's callback.

## Reproduction 1: valid IPv4 strings are rejected

No Wi-Fi connection or external wiring is required:

```js
echo(false);
try {
  require("Wifi").ping("127.0.0.1", print);
  print("PING_CALL=accepted");
} catch (error) {
  print("PING_CALL=rejected " + error);
}
```

The current-master source, tested as classic `ESP32_IDF5` with only the
independent UART-console prerequisite applied, reported:

```text
PING_CALL=rejected Error: "127.0.0.1" not a valid IP address
```

Test image provenance:

| Item | Value |
|---|---|
| Board | `ESP32_IDF5` |
| Espruino | `2v29.486` |
| Current-master base | `92fe2b5cf` |
| Flashed validation commit | `b404ed671` |
| Difference from current master | Independent UART TX-buffer prerequisite only; ping source unchanged |

## Reproduction 2: overlapping sessions share the last callback

After applying only the IPv4 parser correction, run:

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
  print("DONE");
}, 4000);
```

The parser-only image accepted both calls. The paired `totalCount` values
`1,1`, `2,2` through `5,5` showed that two five-request native sessions ran,
but every result was delivered to the second callback:

```text
FIRST_CALL=accepted
SECOND_CALL=accepted
FIRST_COUNT=0
SECOND_COUNT=10
DONE
```

Test image provenance:

| Item | Value |
|---|---|
| Board | `ESP32_IDF5` |
| Espruino | `2v29.487` |
| Current-master base | `92fe2b5cf` |
| UART prerequisite | `b404ed671` |
| Parser-only validation commit | `b341732c2` |
| Lifecycle correction present | No |

The same test is retained as the directly runnable
[`repros/esp32_wifi_ping_overlap.js`](repros/esp32_wifi_ping_overlap.js)
script. The parser-only Web IDE screenshot may also be attached to the PR as
supporting evidence, but is not required to reproduce the failure.

> **Parser-only reproduction:** `ESP32_IDF5`, Espruino `2v29.487`, commit
> `b341732c2`. This image contains the current-master source, the independent
> UART prerequisite and the IPv4 parser correction, but not the ping lifecycle
> correction. Two overlapping `Wifi.ping()` calls were accepted. Two
> five-request sessions ran, but all ten results were delivered to the second
> callback: `FIRST_COUNT=0`, `SECOND_COUNT=10`.

The Web IDE's `Prompt not detected` message during this run was caused by
asynchronous ping output arriving while it was looking for the prompt. The
target continued, printed `DONE` and returned to the REPL; no assertion,
reboot or loss of the console occurred.

## Correction 1: restore IPv4 parsing

The non-IPv6 branch now records the IPv4 address type and returns lwIP's parse
result:

```c
IP_SET_TYPE_VAL(*ipAddr, IPADDR_TYPE_V4);
return ip4addr_aton(str, ip_2_ip4(ipAddr));
```

This accepts valid dotted-decimal IPv4 strings and continues to reject
malformed addresses.

## Correction 2: complete the IDF5 ping lifecycle

The IDF5 implementation now:

- retains the active native ping-session handle;
- rejects an overlapping call before creating a second session;
- keeps the first session's callback intact;
- copies native results into a fixed queue instead of allocating or
  manipulating JavaScript values in the ESP-IDF ping task;
- delivers the JavaScript results through Espruino's idle processing;
- resets attempt, timeout, byte, time and sequence counters for each session;
- waits for ESP-IDF's end notification before exposing the final callback, so
  application code can safely start another ping from that callback; and
- releases callback and session state after normal completion or a
  create/start failure.

The intended behaviour for an overlapping call is an immediate JavaScript
exception:

```text
A ping is already in progress
```

The active ping continues normally and delivers its five results to its own
callback.

## Family integration found during validation

The initial lifecycle candidate passed on the dual-core classic ESP32 but did
not deliver callbacks on C3. Two target-independent assumptions were exposed:

- the generated idle hook was guarded by the literal `ESP32_IDF5` board macro,
  so it was absent from the C3 and S3 wrappers; and
- ESP-IDF's default ping-task priority is 2 while the Espruino interpreter
  runs at priority 5. On the single-core C3 with its native USB console active,
  the interpreter may remain runnable and prevent the ping task from running.

The idle hook is now registered under the family-wide `USE_ESP32` condition.
Pre-IDF5 builds receive a no-op implementation, while IDF5 builds use the
queued-result implementation. The IDF5 ping session explicitly requests task
priority 6, one level above the Espruino interpreter. This allows the native
ICMP work to run while JavaScript delivery remains in Espruino's idle path.

## Focused source commits

The proposed firmware branch is `fix/esp32-idf5-ping`, based on upstream
master `5e90a9145`:

| Commit | Purpose |
|---|---|
| `b5a3942e6` | Restore and validate IPv4 string parsing |
| `7f9162edc` | Complete ESP-IDF 5 ping-session handling |
| `9f310b87b` | Deliver ping results across ESP32 targets |

The upstream base includes the independently merged UART TX-buffer correction
from PR `#2768`. The proposed PR diff itself changes only
`libs/network/esp32/jswrap_esp32_network.c` and
`libs/network/esp32/jswrap_esp32_network.h`.

## Validation completed

The full candidate was exercised on classic `ESP32_IDF5`, `ESP32C3_IDF5` and
`ESP32S3_IDF5`, all reporting Espruino 2v29.488 at validation commit
`6d1512f79` and using ESP-IDF 5.5.3. Those images contained the family
idle-hook and task-priority amendments later committed as `9f310b87b`. A
byte-for-byte comparison of the two changed network source files confirms that
the final PR branch contains the same tested implementation. A second
candidate target acted as the controlled access point and UDP peer in each
run.

One controlled lifecycle run completed all 35 functional checks without a
failure. It covered:

- rejection of a malformed address;
- successful ping and five result callbacks;
- rejection of an overlapping call;
- five callbacks for an unreachable address;
- immediate successful recovery after the timeout session;
- starting a new session from the final callback;
- 25 additional successful sessions;
- reset of sequence numbers to 1 through 5 for every session;
- continued BLE advertising during the ping sequence; and
- a successful UDP exchange after the ping sequence.

Each target completed 28 sessions and 140 callbacks: 27 successful sessions
with 135 successful callbacks, plus one deliberately unreachable session with
five timeout callbacks. Each target passed all 35 functional checks without an
assertion, reboot or recovery reset.

| Target | Controlled run | Checks | Soak heap result | Result |
|---|---|---:|---|---|
| Classic `ESP32_IDF5` | `20261014T105349Z` | 35/35 | 54,376 to 54,348 bytes | Pass |
| `ESP32C3_IDF5` | `20261014T103127Z` | 35/35 | no material loss | Pass |
| `ESP32S3_IDF5` | `20261014T104357Z` | 35/35 | 100,804 to 100,816 bytes | Pass |

The classic and S3 figures are the first and last native-free-heap samples
from their 25-session soak. The small variation is expected allocator noise;
neither result shows progressive session leakage.

The standalone loopback test also accepted `127.0.0.1` and delivered all five
callbacks on classic, C3 and S3 without requiring association with an access
point.

The no-wiring family UART lifecycle control also completed 100
`Serial2.setup()`/`Serial2.unsetup()` cycles on the same final-source classic,
C3 and S3 images. This confirms that the separately required UART prerequisite
remained functional while the ping candidate was tested; this focused check
did not transfer UART payloads.

The exact final branch at `9f310b87b` completed clean release builds for every
maintained ESP32 board definition in the agreed matrix:

| Board definition | IDF line | Build result |
|---|---|---|
| `ESP32` | legacy | Pass |
| `ESP32_IDF4` | 4.4.8 | Pass |
| `ESP32_IDF5` | 5.5.3 | Pass |
| `ESP32C3_IDF4` | 4.4.8 | Pass |
| `ESP32C3_IDF5` | 5.5.3 | Pass |
| `ESP32S3_IDF4` | 4.4.8 | Pass |
| `ESP32S3_IDF5` | 5.5.3 | Pass |

This specifically verifies that the family-wide idle registration links to
the queued implementation on IDF5 and to the no-op compatibility
implementation on the legacy and IDF4 builds.

The automated two-call loopback reproducer was then run on freshly built and
flashed images from the exact final branch:

| Target | Espruino | Commit | Result |
|---|---|---|---|
| Classic `ESP32_IDF5` | `2v29.490` | `9f310b87b` | Pass |
| `ESP32C3_IDF5` | `2v29.490` | `9f310b87b` | Pass |
| `ESP32S3_IDF5` | `2v29.490` | `9f310b87b` | Pass |

It produced the intended single-session result:

```text
FIRST_CALL=accepted
SECOND_CALL=rejected Error: A ping is already in progress
FIRST_COUNT=5
SECOND_COUNT=0
DONE=PASS
```

All five results carried consecutive `totalCount` and `seqNo` values from 1
through 5. No second callback was invoked, and the target returned normally to
the REPL without an assertion or reboot.

## Submission readiness

- [x] Rerun the two-call REPL test on the full candidate and record
  `FIRST_CALL=accepted`, rejection of the second call, `FIRST_COUNT=5` and
  `SECOND_COUNT=0`.
- [x] Build the candidate for all seven maintained ESP32-family board
  definitions in the agreed matrix.
- [x] Add classic, C3 and S3 IDF5 runtime comparison results.
- [x] Assemble the three tested corrections on a clean branch based on current
  upstream master.
- [x] Confirm the exact final branch on classic, C3 and S3 IDF5 hardware.
- [x] Retain directly runnable parser and overlapping-session reproducers.
