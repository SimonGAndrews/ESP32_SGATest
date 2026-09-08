# ESP32 IDF5 Modern Ping And 70 KB Native-Heap Validation

Date: 2026-09-08

## Conclusion

The 70 KB native-heap candidate is a sound basis for the restored IDF5
`Wifi.ping()` implementation on the tested classic ESP32. It completed ten
rapid consecutive ping sessions, active Wi-Fi traffic and active BLE
advertising without an allocation failure, assertion or reboot. The final
candidate also passed a complete connected BLE GATT transaction.

The result does not yet justify applying 70 KB globally to every ESP32-family
board. On this non-PSRAM classic ESP32, the larger native reserve leaves 2,771
JsVars at a 14-byte block size. HTTPS remains to be tested on a network with a
routable TLS endpoint before the Bluetooth-plus-HTTPS use case is claimed.

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
that direction on the final image stopped because the C3 peer stalled while
creating its GATT service and never declared itself ready; no classic-target
failure occurred in those attempts.

### Separate Wi-Fi scan result

Three normal-scan attempts returned zero networks on the classic IDF5 target,
including an attempt that delayed peer readiness by 1.5 seconds after the C3
reported its AP started. Direct connection to the same generated SSID then
passed consistently. This confirms the scan issue is independent of ping
session allocation and does not invalidate the post-scan memory evidence.

## Remaining Validation

Before recommending a global 70 KB native-heap default:

1. Run an HTTPS client transaction while BLE is enabled, using a routable and
   controlled TLS endpoint.
2. Decide explicitly whether reducing a non-PSRAM classic ESP32 to 2,771
   JsVars is an acceptable trade for the additional native-heap margin.
3. Compile representative C3 and S3 board definitions if the change is to be
   moved from `ESP32_IDF5.py` into a global default.

The Wi-Fi scan defect and the C3 GATT-peer startup stall should remain separate
investigations rather than being attributed to the heap proposal.
