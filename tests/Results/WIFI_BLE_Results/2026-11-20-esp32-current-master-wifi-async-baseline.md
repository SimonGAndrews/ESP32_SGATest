# ESP32 Current-Master Wi-Fi Asynchronous Baseline

Date: 2026-11-20

## Conclusion

The consolidated ESP-IDF 5 backend still reproduces the retained ping,
connection and disconnection lifecycle defects on classic ESP32, ESP32-C3 and
ESP32-S3. The run also strengthens two ping findings that were not established
by the earlier current-master checks:

- a single S3 ping can corrupt a JavaScript result and interrupt the
  interpreter with an out-of-memory error; and
- repeated sequential C3 ping sessions exhaust native heap even without
  overlap or JavaScript reset.

The source already merged for IPv4 parsing and ping-task priority remains
effective: valid loopback requests reach the native ping implementation and
the C3 ping task runs. The failures below occur later in operation ownership,
result delivery, native-session cleanup or reset handling.

## Firmware and bench provenance

| Item | Value |
|---|---|
| Espruino repository | official-master checkout selected by the Wi-Fi investigation |
| Current upstream revision | `e58f6ca8142c57970172f0b1f2b7d1d511d4edfa` |
| Flashed revision reported by all boards | `1b820a413f4335bae4fdaa30a940f5b7ca55264e` |
| Source-tree identity | both revisions use tree `5026f77255893a2395f8b4805424766ff07c5293`; `git diff 1b820a413..e58f6ca814` is empty |
| Espruino version | `2v29.525` |
| Backend | consolidated ESP-IDF 5 ESP32 backend |
| Bench mode | `STANDALONE`, USB VBUS, no controlled target power |
| Bench configuration | `tests/WIFI_BLE/esp32_wifi_async_current_master_bench_config.json` |

The identity verifier passed board, version, commit and Wi-Fi/BLE capability
checks for all three positions before testing.

| Position | Board | Stable serial path |
|---|---|---|
| `esp32_v1` | classic ESP32 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.3:1.0-port0` |
| `esp32_c3_v1` | Seeed Studio XIAO ESP32-C3 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.2:1.0` |
| `esp32_s3` | ESP32-S3 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.1:1.0` |

## Result summary

| Probe | Classic | C3 | S3 |
|---|---|---|---|
| ping overlap with two callbacks | both accepted; callback split `1/9` | both accepted; callback split `1/9` | both accepted; callback split `1/9`, with malformed results and interpreter errors |
| callback-less ping followed by overlap | overlap accepted; second callback received 9 results; recovery 5 | same | same counts; malformed recovery result and out-of-memory interruption |
| single ping delivery | five-result path available | five-result path available | malformed result and out-of-memory interruption reproduced after hardware reset |
| 28-session sequential ping soak | 28 sessions, 140 callbacks, final native-heap delta `0` | failed after 24 sessions/120 callbacks; heap `71224 -> 1048` | no first completed-round marker before timeout |
| ping across JavaScript reset | old delivery/errors after reset; recovery 5 | same | same |
| overlapping station connections | both accepted or validation displaced first callback; no completion callback | same | same |
| station connect across JavaScript reset | old callback was not observed; native attempt survived; recovery hit `ESP_ERR_WIFI_STATE` and did not complete | same | same |
| disconnect while idle | one callback, no public event | same | same |
| disconnect while connecting | two disconnect callbacks, one public event | same | same |
| deliberate connected disconnect | two disconnect callbacks, one public event | same | same |
| disconnect across JavaScript reset | pre-reset callback executed after reset | same | same |

## Ping observations

### Overlapping sessions share the replacement callback

`esp32_wifi_ping_overlap.js` was run on all three targets. Both requests were
accepted. One result reached the first callback and the remaining nine results
from the two five-request native sessions reached the second callback:

```text
FIRST_COUNT=1
SECOND_COUNT=9
```

The callback-less variant produced the same ownership failure. A first ping
without a callback did not prevent a second ping from being accepted. The
second callback received nine results, and a later standalone recovery session
received five results on each target.

### S3 result delivery corrupts JavaScript state

The first S3 overlap run emitted malformed result objects and interpreter
errors. A second run from hardware reset accepted both calls, logged all ten
native ping events, but stopped delivering JavaScript results and never ran
the six-second completion timer.

A smaller single-session probe was then run from another hardware reset. It
accepted one loopback request, but one result arrived as a bare number, another
result object was incomplete, and the interpreter reported an out-of-memory
interruption. This bounds the problem beyond overlap: overlap is a severe
trigger, but preventing overlap alone cannot establish safe S3 result
delivery.

The affected S3 remained USB-enumerated but stopped answering the REPL after
one overlap run. A normal external hardware reset through `esptool --no-stub
run` restored the firmware and the identity verifier passed again. No reflash
was required.

### Sequential C3 sessions exhaust native heap

The loopback soak starts a new ping after each preceding session has delivered
five results. Classic ESP32 completed all 28 sessions and 140 callbacks:

```text
rounds_completed=28
callbacks_total=140
first_free_heap=63344
final_free_heap=63344
final_heap_delta=0
```

The C3 completed 24 sessions and 120 callbacks, then session creation failed:

```text
rounds_completed=24
callbacks_total=120
first_free_heap=71224
final_free_heap=1048
final_heap_delta=-70176
Failed to initialize ping session
```

This is a normal sequential-use failure: it does not require overlap or
JavaScript reset. The S3 did not complete its first instrumented soak round,
consistent with the separately reproduced result-delivery failure, so the run
does not supply a comparable S3 resource measurement.

### Reset does not bound ping callback lifetime

Each target ran three reset timings. The retained runner regards a mode as
recoverable when a later clean ping completes five callbacks; its overall
`DONE=PASS` therefore does not mean that pre-reset delivery was safe.

| Mode | Classic | C3 | S3 |
|---|---|---|---|
| active success | 1 old callback, 4 invalid queued-callback errors | same | same |
| active timeout | 0 old callbacks, 5 invalid queued-callback errors | same | same |
| native completion already queued | 5 old callbacks | 5 old callbacks | 4 old callbacks |
| later recovery | 5 callbacks | 5 callbacks | 5 callbacks |

## Station connection observations

All three targets produced the same three overlap results:

1. With two valid callback-bearing calls, the second returned normally,
   ESP-IDF reported `ESP_ERR_WIFI_STATE` only through console error output,
   and neither callback ran.
2. With invalid options in the second call, the second call threw a type
   error, but validation had already displaced the first call's callback and
   the first callback never ran.
3. With a callback-less first call, the second call was accepted; the native
   configuration failed and the second callback never ran.

Across JavaScript reset, the old callback did not write its retained `Storage`
marker during the observation window. This does not prove that `reset()`
detached the native wrapper's stored callback reference: the recovery call
later changes callback state before its native configuration attempt. The
underlying ESP-IDF connection attempt nevertheless continued. When the runner
attempted a new connection, `esp_wifi_set_config()` returned
`ESP_ERR_WIFI_STATE`; the call produced only console error output and no
completion callback. Reset therefore did not restore a reusable connection
API, and explicit callback-reference cleanup remains a source-review and
qualification requirement.

## Station disconnection observations

An idle station path completed the callback once and emitted no public
`disconnected` event. When disconnect was called during a connection attempt,
all three targets produced:

```text
connectCallbackCount=1
disconnectCallbackCount=2
disconnectedEventCount=1
```

After a successful connection to the configured bench access point, all three
targets again invoked the deliberate-disconnect callback twice and emitted one
public event.

The disconnect-reset probe wrote
`disconnect_callback_survived_reset` on every target, proving that the
callback installed before reset ran afterward. Classic and C3 also reproduced
the two-callback result during the recovery disconnect. The S3 recovery
observed one callback in that individual run, but its separate connected and
connecting probes had already reproduced the duplicate.

## Additional observations

- The diagnostic firmware printed supplied station passwords through the
  `DBG_INFO` connection message. The credentialed runner detected this on all
  three targets and sanitized retained output.
- Disconnect reason `36` was exposed as string reason `"36"` with message
  `"Unknown reason"` when a connection attempt was cancelled.
- Native diagnostic and JavaScript output can interleave at character level.
  Two disconnect-reset `INFO` markers were therefore present in the raw trace
  but not recognized as intact lines by the runner. The callback marker written
  after reset is the stronger observation for that probe.

## Test-evidence refinements made during the run

The retained ping soak incorrectly required `seqNo` to restart at one for each
session. Current firmware increments that value across sessions. The probe now
requires a continuous sequence over the complete soak and prints per-round
progress. The connection-reset runner now prints its recovery output when the
recovery never produces a completion marker. These are test-only changes; no
Espruino firmware was modified.

## Retained inputs

| Input | SHA-256 |
|---|---|
| `esp32_wifi_ping_overlap.js` | `01d591589ff24933e8c9cd4ddeb10798cacb709e764867d31168b051246c996a` |
| `esp32_wifi_ping_no_callback_overlap.js` | `f4d9d3b5d25fefc7bd664510cdf065a8a7c86d4793976524cc45289d1804e232` |
| `esp32_wifi_ping_reset.js` | `a98948f54542d6741f8afd1264e558d97a7fc37b57dcbe78d60db07decdb2f15` |
| `esp32_wifi_ping_loopback_soak.js`, refined during this run | `d75c7b08d791cb6504d8b2efd513733d8f1f286315014f795592bc61e5ea8497` |
| `esp32_wifi_connect_overlap_variants.js` | `e03c009dc5cf7a99ceb75e0531157dffa2e152941c3805f8f656585a9eb432d5` |
| `esp32_wifi_connect_reset.js` | `71888a36ae3ba16d925da5ae72a47e533f051a78c6518e16dfef4f4dd215540e` |
| `esp32_wifi_disconnect_idle_and_cancel.js` | `5f2bbf663edbdd07ca3f65ab9bac6f5a0bf2181d265f3b651a9bbc7407de1187` |
| `esp32_wifi_disconnect_connected.js` | `2a3849d6003a0c53c12821cee4f93be0b0fd5178ffa7c9d7318b47d3b1ae0280` |
| `esp32_wifi_disconnect_reset.js` | `08fa960564c4bca1412293481ba52e8d5de6072fd587543b479da5f783795c34` |

## Interpretation boundary

These runs establish observed current-master behaviour. They do not yet prove
the complete source cause of the S3 corruption or C3 native-heap loss. Source
review shows that ping callbacks create `JsVar` objects and queue JavaScript
work from the ESP-IDF ping task, and that completed sessions are deleted from
the native end callback. Those mechanisms are the next investigation points,
not conclusions to assume without focused source and implementation review.
