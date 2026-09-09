# ESP32 IDF5 Modern Ping And 70 KB Native-Heap Validation

Date: 2026-09-08; HTTPS coexistence validation added 2026-09-09

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
VERSION=2v29.395
GIT_COMMIT=cdcf5e8e7
```

The firmware binary was `0x16e9e0` bytes and left 27% of its application
partition free. A clean build was required after an incremental build was
found to contain stale Espruino version strings; binary inspection and the
runtime identity check both confirmed the final clean image.

## Bench Configuration

| Role | Board | Firmware | Control path |
|---|---|---|---|
| Target | Classic ESP32 V1 harness | `ESP32_IDF5` `2v29.395`, `cdcf5e8e7` | board USB-UART console |
| Controlled peer | ESP32-C3 | `ESP32C3_IDF4` `2v29.274`, `b905c8099` | native USB Serial/JTAG console |

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

The endpoint used a temporary self-signed certificate. The current Espruino
ESP32 TLS implementation configures certificate verification off, so this test
validates the TLS handshake, encrypted transfer, application response and
memory coexistence; it does not claim server-certificate authentication.

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

## Remaining Board-Specific Validation

Moving the heap setting into a global ESP32-family default is outside the
scope of this candidate. Remaining useful validation is:

1. repeat the same BLE-plus-HTTPS workload on an otherwise identical 40 KB
   `ESP32_IDF5` build to quantify whether 70 KB is required and how much native
   margin it adds;
2. measure the corresponding increase in usable JsVars on that 40 KB build so
   the native-memory benefit and JavaScript-capacity cost are explicit;
3. complete focused ping edge cases and a longer repeated-session soak;
4. compile representative ESP32 IDF4/legacy and C3/S3 IDF5 configurations
   because the guarded ping implementation shares source with those targets.

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
