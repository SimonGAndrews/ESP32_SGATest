# ESP32 IDF5 Modern Ping And 70 KB Native-Heap Validation

Date: 2026-09-08; HTTPS coexistence validation added 2026-09-09; controlled
40 KB comparison and focused ping qualification added 2026-09-10

## Conclusion

The 70 KB native-heap candidate is a sound basis for the restored IDF5
`Wifi.ping()` implementation on the tested classic ESP32. It completed ten
rapid consecutive ping sessions, active Wi-Fi traffic and active BLE
advertising without an allocation failure, assertion or reboot. The final
candidate also passed a complete connected BLE GATT transaction and a
controlled HTTPS download while a GATT connection remained active.

The result does not yet justify applying 70 KB globally to every ESP32-family
board. On this non-PSRAM classic ESP32, the larger native reserve leaves 2,771
JsVars at a 14-byte block size. The board-specific 70 KB candidate nevertheless
demonstrated the intended Bluetooth-plus-HTTPS use case with 31,456 bytes as
the native-heap low-water mark and no allocation failure.

A subsequent like-for-like comparison completed the same connected BLE GATT
and HTTPS workload three times on each setting. Both settings completed all
three runs, but the 40 KB build's native-heap low-water mark fell as low as
1,900 bytes, while the 70 KB build retained at least 30,736 bytes. The 70 KB
setting therefore provides substantial native allocation margin rather than
merely changing the reported partition between native heap and JsVars.

The final ping implementation then completed two focused lifecycle runs. In
total it completed 39 successful sessions with 195 correct replies, two
unreachable sessions with all 10 timeout callbacks and correct cumulative
counters, immediate restart after both successful and timed-out sessions, BLE
continuity, UDP traffic after ping, and clean shutdown. No material native-heap
loss, allocation failure, assertion or reset was observed.

The existing IDF5 Wi-Fi scan failure remains separate: direct association and
all post-scan functions passed, but `Wifi.scan()` returned an empty list while
the controlled C3 access point was active.

## Firmware Under Test

Source repository: `espruino/Espruino`-derived local checkout

Branch: `test/esp32-idf5-ping-70k`

Base: `d8322cec9`

| Commit | Change |
|---|---|
| `ffa968c28` | Restore `ESP32_IDF5.py` to `JSVAR_MALLOC`, remove `RESIZABLE_JSVARS`, set the maximum to 16,383 variables and reserve 70,000 bytes of native heap. |
| `c56c82412` | Implement IDF5 `Wifi.ping()` with the supported `ping/ping_sock.h` session API. |
| `cdcf5e8e7` | Retain the final ping result until IDF reports session completion, so a new ping can be started from the final JavaScript callback. |
| `20302d7f9` | Count completed ping attempts and timeouts in the wrapper so the IDF5 result retains the legacy `totalCount` and `timeoutCount` behaviour even when IDF cannot transmit an unreachable request. |

The clean release build used:

```text
BOARD=ESP32_IDF5 RELEASE=1
ESP-IDF v5.5.3
ESP_HEAP_SIZE=70000
JSVAR_MALLOC enabled
RESIZABLE_JSVARS absent
```

The resulting board identified itself as:

```text
BOARD=ESP32_IDF5
VERSION=2v29.396
GIT_COMMIT=20302d7f9
```

The firmware binary was `0x16ea00` bytes and left 27% of its application
partition free. A clean build was required after an incremental build was
found to contain stale Espruino version strings; binary inspection and the
runtime identity check both confirmed the final clean image.

The exact final 70 KB firmware archive is retained locally as
`firmware/ESP32_IDF5/2v29.396-20302d7f9-70k/espruino_2v29.396_esp32.tgz`.
Its SHA-256 digest is
`140d07ff200da49597093cb12cb1da7e35b9851670993b5cb39ad766bcd836c9`.

### Build portability

Commit `20302d7f9` also completed clean release builds for each representative
side of the IDF version guard and for all three IDF5 target families:

| Board definition | IDF path | Result | Application image |
|---|---|---|---:|
| `ESP32.py` | legacy ESP-IDF | completed | 1,523,376 bytes |
| `ESP32_IDF4.py` | ESP-IDF 4.4 | completed | `0x15aa40` bytes |
| `ESP32_IDF5.py` | ESP-IDF 5.5.3 | completed | `0x16ea00` bytes |
| `ESP32C3_IDF5.py` | ESP-IDF 5.5.3 | completed | `0x19bed0` bytes |
| `ESP32S3_IDF5.py` | ESP-IDF 5.5.3 | completed | `0x17c5e0` bytes |

The non-classic builds are compile checks, not runtime claims. The 70 KB
change remains in `ESP32_IDF5.py`; it was not moved into a shared default.

## Bench Configuration

| Role | Board | Firmware | Control path |
|---|---|---|---|
| Target | Classic ESP32 V1 harness | `ESP32_IDF5` `2v29.396`, `20302d7f9` | board USB-UART console |
| Controlled peer | ESP32-C3 | `ESP32C3_IDF4` `2v29.392`, `d8322cec9` | native USB Serial/JTAG console |

Both identities, connection paths and Wi-Fi/BLE capabilities passed the bench
configuration verifier before the final run. The boards operated in standalone
USB-powered mode.

## Results

### Native memory and JavaScript capacity

Immediately after boot, with normal BLE advertising active:

| Measurement | Result |
|---|---:|
| Native free heap | 68,420 bytes |
| Native minimum heap | 68,216 bytes |
| Largest native free block | 65,536 bytes |
| JsVars total | 2,771 |
| JsVars free | 2,713 |
| JsVar block size | 14 bytes |

The `variables: 16383` board setting is a maximum for this dynamically
allocated configuration, not a guarantee that 16,383 JsVars will be created.
The available internal RAM after reserving 70 KB for native IDF work limited
this board to 2,771 JsVars.

### Wi-Fi, modern ping and active BLE coexistence

The classic target associated directly with the unique WPA2 access point on
the C3 peer and obtained `192.168.4.2` by DHCP. It then completed:

- 10 sequential `Wifi.ping()` sessions;
- 5 successful ICMP replies per session, for 50 correct replies from 50
  requests;
- a 250 ms delay from each final JavaScript ping callback to the next session;
- a run-specific UDP request and matching acknowledgement;
- target-side associated, connected and disconnected events;
- peer-observed station join, UDP request and station leave;
- clean Wi-Fi shutdown on both devices without a recovery reboot.

BLE advertising was `true` before Wi-Fi association and remained `true` after
all 50 ping replies. The run completed 59 target checks with no failures.

After this deliberately rapid run:

| Measurement | Result |
|---|---:|
| Native minimum heap during the run | 49,792 bytes |
| Native free heap after cleanup | 62,452 bytes |
| JsVars free after cleanup | 2,606 |

No out-of-memory diagnostic, assertion, abort or reset was observed.

### Ping-session lifecycle correction

Before commit `cdcf5e8e7`, the fifth reply could reach JavaScript before IDF's
`on_ping_end` notification had cleared Espruino's active-session state. A new
`Wifi.ping()` issued 250 ms later therefore failed with `A ping is already in
progress` during the seventh session of the first soak.

IDF calls the success or timeout callback for the final request before it calls
`on_ping_end`. The correction keeps one response queued until that end event,
then clears the native session state before the final JavaScript callback is
executed. The previously failing cadence subsequently passed all ten sessions.

Focused timeout testing then exposed a second compatibility detail. ESP-IDF's
`ESP_PING_PROF_REQUEST` counter includes only requests successfully handed to
the network stack. A request to an unreachable local address can fail during
address resolution, causing IDF to deliver a timeout callback without
incrementing that counter. The legacy Espruino implementation counted every
completed attempt, so the first IDF5 wrapper reported only three total attempts
after five timeout callbacks. Commit `20302d7f9` maintains explicit completed-
attempt and timeout counters in the IDF5 wrapper and preserves the established
JavaScript result semantics.

The corrected image passed these two controlled runs:

| Run | Successful sessions | Successful replies | Unreachable sessions | Timeout callbacks | Functional checks | Heap result |
|---|---:|---:|---:|---:|---:|---|
| `20260910T082644Z` | 27 | 135 | 1 | 5 | 35 completed from 35 | free heap unchanged at 53,892 bytes across the 25-session soak |
| `20260910T082915Z` | 12 | 60 | 1 | 5 | 20 completed from 20 | 53,768 bytes before and 53,772 bytes after the 10-session soak |

Each run also rejected an invalid address and a simultaneous second ping,
restarted a successful session directly from the preceding final callback,
reported five cumulative timeouts for five attempts to the unreachable
address, restarted immediately from the final timeout callback, retained BLE
advertising, exchanged a run-specific UDP message after the ping sequence, and
cleanly disconnected. The C3 peer independently observed the classic target
join and leave and received the UDP challenge.

### BLE GATT

On the final image, the classic ESP32 operated as the GATT peripheral. The C3
independently discovered and connected to it, found the custom service and
characteristics, read a run-specific challenge, wrote the expected response
and completion values, disconnected, and left both devices inactive. All nine
client checks and all peripheral checks passed.

An earlier image with the same 70 KB board allocation also passed the complete
transaction with the classic ESP32 as the GATT central. Two attempts to repeat
that direction on the final image stopped because the old C3 peer did not
complete the full service-startup role and never declared itself ready; no
classic-target failure occurred in those attempts. Subsequent isolation
testing refined the apparent `NRF.setServices()` stall as described below.

### Concurrent BLE GATT and HTTPS

Run `20260909T221302Z` exercised TLS while maintaining a real connected GATT
session. The controlled network used a dedicated WPA2 2.4 GHz router. The
classic ESP32 obtained `192.168.50.102` by DHCP and the bench host provided a
temporary TLS 1.2 endpoint at `192.168.50.101`.

The radio and application roles were:

| Device | Concurrent roles |
|---|---|
| Classic ESP32 under test | GATT peripheral, Wi-Fi station and HTTPS client |
| C3 controlled peer | GATT central |
| Bench host | runner and run-specific HTTPS server |

The test performed the following Espruino API sequence:

1. the classic target created and advertised a run-specific service with
   `NRF.setServices()` and `NRF.setAdvertising()`;
2. the C3 selected it with `NRF.requestDevice()`, connected, discovered the
   service, read its challenge and wrote a matching acknowledgement;
3. while that GATT connection remained active, the classic target used
   `Wifi.connect()` and `require("http").get()` with an HTTPS URL;
4. the target received HTTP status 200 and the complete 744-byte response;
5. only after the host observed HTTPS completion, the C3 verified that its
   GATT connection was still active and wrote a second run-specific value;
6. the classic target received that post-HTTPS write, then both roles cleaned
   up.

The host independently recorded exactly one request from `192.168.50.102` for
the expected run-specific path. All ten classic-target functional checks, all
seven C3-central checks and all three host correlation checks passed. No
out-of-memory report, assertion, abort, brownout or firmware reset occurred.

| Phase | Native free heap | Native minimum heap | Largest native block | JsVars free |
|---|---:|---:|---:|---:|
| Initial script state | 68,432 | 68,092 | 65,536 | 696 |
| GATT connected | 64,064 | 62,204 | 61,440 | 1,978 |
| Wi-Fi connected | 54,176 | 53,708 | 53,248 | 1,868 |
| Immediately before HTTPS | 54,176 | 53,708 | 53,248 | 1,863 |
| HTTPS response complete, GATT still connected | 53,280 | 31,456 | 31,744 | 1,783 |
| After Wi-Fi and BLE cleanup | 59,704 | 31,456 | 32,768 | 1,867 |

The minimum-heap field retained the lowest value observed during the TLS
transaction, while current free heap recovered after cleanup. This is direct
evidence that the 70 KB configuration supplied enough native memory for Wi-Fi,
TLS and connected BLE to coexist on this image.

After the final ping-counter correction, run `20260910T085339Z` repeated this
workload on the exact `2v29.396` / `20302d7f9` candidate. It passed all 10
classic-target checks, all seven C3-central checks and all three host
correlation checks; received status 200 and the full 744-byte response; and
retained the GATT connection through the post-HTTPS write. Its native-heap
low-water mark was 30,580 bytes, with 52,424 bytes free immediately after the
HTTPS response and 58,664 bytes after cleanup. This confirms that the small
ping-counter change did not invalidate the final-image coexistence result.

The endpoint used a temporary self-signed certificate. The current Espruino
ESP32 TLS implementation configures certificate verification off, so this test
validates the TLS handshake, encrypted transfer, application response and
memory coexistence; it does not claim server-certificate authentication.

### Controlled 40 KB versus 70 KB comparison

On 2026-09-10, an otherwise identical 40 KB image was built from the validated
70 KB candidate. Its only source change removed the
`DEFINES+=-DESP_HEAP_SIZE=70000` board-file entry, allowing the 40,000-byte
default in `targets/esp32/main.c` to apply. Both images were clean release
builds using ESP-IDF 5.5.3 and were flashed after a full flash erase.

| Build | Firmware identity | BLE-plus-HTTPS runs | JsVars total | Initial native free heap | Native low-water mark | Native free after HTTPS | Largest block after HTTPS | Native free after cleanup |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 40 KB default | `2v29.396`, `cfd696413` | 3 completed from 3 | 4,958-4,976 | 34,488-38,320 | 1,900-3,840 | 23,972-25,508 | 13,312-14,336 | 29,996-31,376 |
| 70 KB candidate | `2v29.395`, `cdcf5e8e7` | 3 completed from 3 | 2,815-2,833 | 66,992-67,256 | 30,736-30,900 | 52,580-52,784 | 30,720-32,768 | 58,668-58,816 |

The controlled run identifiers were `20260910T075350Z`, `075457Z` and
`075540Z` for 40 KB, and `20260910T080517Z`, `080604Z` and `080647Z` for
70 KB. Every run passed all ten classic-target checks, all seven C3-central
checks and the host's exact HTTPS request correlation. Each target received
status 200 and all 744 response bytes, retained its GATT connection throughout
the TLS operation and accepted the post-HTTPS GATT write.

For corresponding boots, the 70 KB build had exactly 2,143 fewer JsVars than
the 40 KB build. At 14 bytes per JsVar this is 30,002 bytes, matching the
30,000-byte increase in the requested native reserve within allocation
rounding. The measured allocation trade therefore agrees with the startup
calculation.

This comparison does not show that the 40 KB image must fail with this small,
local TLS endpoint: it completed all three attempts. It does show that the
same operation can reduce its native heap to less than 2 KB, whereas the 70 KB
image retains more than 30 KB. The additional reserve provides meaningful
margin for variation in TLS handshakes, certificates, network activity and
other concurrent ESP-IDF allocations. The board-specific memory-allocation
comparison is complete for the tested classic ESP32 and workload.

Two preceding attempts with the C3 as the GATT peripheral stopped before Wi-Fi
because that peer never emitted its service-ready marker. A focused test on
the C3's old `b905c8099` firmware showed that `NRF.setServices()` returned but
ESP-IDF reported `BT_GATT: Active Service Found`; a following
`NRF.setAdvertising()` also returned and reported advertising active in the
minimal case. The evidence therefore does not support describing
`NRF.setServices()` itself as unconditionally blocking.

The C3 firmware predates current-master commit `ed46a3a0b`, titled
`ESP32: Fixing BT_GATT: Active Service Found error when calling reset()`.
In the old source, GATT reset requests direct deletion of an active service and
can race the asynchronous recreation started by `NRF.setServices()`. The later
correction stops each service first and deletes it only after ESP-IDF delivers
`ESP_GATTS_STOP_EVT`. Reversing only the GATT roles avoided that old peripheral
service-replacement path and preserved the classic target's simultaneous BLE,
Wi-Fi and HTTPS workload.

Follow-up qualification on 2026-09-10 flashed the C3 with current-master
`ESP32C3_IDF4` `2v29.392`, commit `d8322cec9`. The primary C3-central
BLE-plus-HTTPS direction passed again, but the C3-peripheral service role was
intermittent: three complete transactions passed and four attempts crashed
inside service replacement. Decoded frames and source review show that the
stop/delete/unregister sequence can overlap allocation of the replacement
global service arrays. Commit `ed46a3a0b` corrects stop-before-delete but does
not serialize teardown and recreation. See
`2026-09-10-esp32c3-current-master-peer-qualification.md` for the evidence and
the resulting restricted peer designation.

### Separate Wi-Fi scan result

Three normal-scan attempts returned zero networks on the classic IDF5 target,
including an attempt that delayed peer readiness by 1.5 seconds after the C3
reported its AP started. Direct connection to the same generated SSID then
passed consistently. This confirms the scan issue is independent of ping
session allocation and does not invalidate the post-scan memory evidence.

## Scope Boundary And Separate Issues

Moving the heap setting into a global ESP32-family default is outside the
scope of this candidate. The controlled board-specific memory comparison,
focused classic-ESP32 ping qualification and representative compile checks are
complete.

The Wi-Fi scan defect and the old-C3 GATT service-replacement symptom should
remain separate investigations rather than being attributed to the heap
proposal.

## Appendix A: Memory Measurement Method

### Measurement sequence

The fresh-boot figures were collected from the classic ESP32 through its
wired Espruino REPL as follows:

1. issue `ESP32.reboot()`;
2. allow approximately two seconds for startup;
3. resynchronise the serial REPL;
4. verify `process.env.BOARD`, `process.version` and
   `process.env.GIT_COMMIT`;
5. evaluate `process.memory()` and `ESP32.getState()`.

A directly reproducible Espruino form of the measurement is:

```javascript
var memory = process.memory();
var state = ESP32.getState();

print(JSON.stringify({
  nativeFreeHeap : state.freeHeap,
  nativeMinimumHeap : state.minHeap,
  largestNativeBlock : memory.tx.largest_block,
  jsVarsTotal : memory.total,
  jsVarsFree : memory.free,
  jsVarBlockSize : memory.blocksize
}));
```

`process.memory()` performs a JavaScript garbage-collection pass by default.
Its JsVar results therefore describe memory after collection and give a
reasonably clean view of the available JavaScript storage. The post-soak
figures were collected in the same way after the runner had completed its
Wi-Fi cleanup, without rebooting the target. The reported minimum heap then
represented the lowest value since the runner's initial reboot, including
startup, association, ping sessions, UDP exchange and cleanup.

### Espruino and ESP-IDF sources

| Reported value | Espruino field | Native source |
|---|---|---|
| Native free heap | `ESP32.getState().freeHeap` | `esp_get_free_heap_size()` |
| Native minimum heap | `ESP32.getState().minHeap` | `heap_caps_get_minimum_free_size(MALLOC_CAP_8BIT)` |
| Largest native free block | `process.memory().tx.largest_block` | `heap_caps_get_largest_free_block(MALLOC_CAP_8BIT)` |
| JsVars total | `process.memory().total` | `jsvGetMemoryTotal()` |
| JsVars used | `process.memory().usage` | `jsvGetMemoryUsage()` less reclaimable command-history blocks |
| JsVars free | `process.memory().free` | total JsVars minus the adjusted usage value |
| JsVar block size | `process.memory().blocksize` | `sizeof(JsVar)` |

In this ESP32 implementation, `process.memory()` places `free_heap` and
`largest_block` inside its `tx` object. They remain native heap measurements;
they do not describe the amount of UART transmit-buffer memory.

The meanings of the native readings are:

- `freeHeap` is the total native ESP-IDF heap available at the instant of the
  call;
- `minHeap` is a retained low-water mark and does not increase when temporary
  allocations are released;
- `largest_block` is the largest single contiguous native allocation possible
  at that instant and therefore adds information about fragmentation. Total
  free heap can appear adequate while no individual block is large enough for
  a TLS or ping allocation;
- `process.memory().free` includes command-history JsVars because Espruino can
  reclaim that history when JavaScript memory becomes scarce.

### Relationship to the 70 KB setting

The board setting does not allocate a dedicated 70,000-byte buffer. During
startup, the ESP32 port calculates its initial JsVar count using:

```c
heapVars = (esp_get_free_heap_size() - ESP_HEAP_SIZE) / sizeof(JsVar);
```

It then allocates that JsVar block from native memory. With
`ESP_HEAP_SIZE=70000`, the intention is to leave approximately 70 KB available
for ESP-IDF networking, Bluetooth, TLS and other native work. Later startup
allocations account for the measured fresh-boot value of 68,420 bytes rather
than exactly 70,000 bytes.

### Confidence boundary

The source wrappers are direct: they perform no unit conversion or derived
heap calculation. The observed behaviour was also internally consistent:
current free heap largely recovered after the soak, while the retained
minimum remained at its lower value.

`process.memory().tx.free_heap` and `ESP32.getState().freeHeap` both expose
`esp_get_free_heap_size()`. Agreement between them confirms consistent
JavaScript exposure but is not an independent measurement of the IDF heap.
No direct C diagnostic, known-sized native test allocation, JTAG inspection or
IDF heap trace was used. The values should therefore be described as reported
by the ESP-IDF heap APIs. The successful functional operations and absence of
allocation failures, assertions and resets remain the primary validation
evidence.
