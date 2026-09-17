# Historical ESP32 IDF5 WPA2 Allocation Comparison

Date: 17 September 2026

## Conclusion

The historical classic `ESP32_IDF5` WPA2 access-point failure was caused by
the board's `variables: 0` plus `RESIZABLE_JSVARS` allocation configuration.
An A/B comparison used the exact historical source, ESP-IDF version, peer
firmware, hardware, credentials workflow and test runner. The original image
failed all three WPA2 association attempts at the four-way handshake; changing
only the JsVar allocation configuration made all three attempts pass.

This establishes the cause at board-configuration level. The evidence points
to insufficient or fragmented native ESP-IDF heap during WPA2 authentication,
but does not identify the individual internal ESP-IDF allocation that failed.

## Controlled Change

Both target images were release builds from historical Espruino commit
`e5341719a775dcb7d44a386c0a696d257fb783b9`, using ESP-IDF 5.5.3. The only
source change in image B was:

```diff
- 'variables'                : 0,
+ 'variables'                : 16383,
-#     'DEFINES+=-DJSVAR_MALLOC',
-     'DEFINES+=-DRESIZABLE_JSVARS=1',
+     'DEFINES+=-DJSVAR_MALLOC',
```

The effective comparison is `variables: 0` and `RESIZABLE_JSVARS` versus
`variables: 16383` and `JSVAR_MALLOC`. The default `ESP_HEAP_SIZE` remained
40,000 bytes in both builds.

## Firmware and Peer Provenance

| Item | Original allocation (A) | Fixed 40 KB allocation (B) |
|---|---|---|
| Board | `ESP32_IDF5` | `ESP32_IDF5` |
| Espruino source | `e5341719a` | `e5341719a` plus allocation-only test commit `7b4a9c79f` |
| Version | `2v29.377` | `2v29.378` |
| Application SHA-256 | `638ac8e34024fc064694bd45c63505d75db27953f5bd2ef67fbe7fc729c817d7` | `44e5e2b66183e733feed56e44a272a21ab0712d94d9e34e6a4ab603f5f82e64a` |
| Allocation | `variables: 0`, `RESIZABLE_JSVARS` | `variables: 16383`, `JSVAR_MALLOC` |
| Native heap reserve | default 40,000 bytes | default 40,000 bytes |

The station was the archived historical `ESP32C3_IDF4` peer image, version
`2v29.274`, commit `b905c8099`, full-flash SHA-256
`0677de23a4bbf5a3b8c8a3ae0365933316893646e29fb9f03a16dba51d397fd0`.
Its hardware MAC was verified as `a0:76:4e:7b:63:90`.

## WPA2 Results

The focused test starts the classic target as a WPA2 access point, connects
the historical C3 peer directly, requires DHCP configuration, exchanges an
exact run-specific UDP message in both directions, then disconnects and
checks cleanup.

| Target image | Run IDs | Result |
|---|---|---|
| A: original resizable allocation | `20260917T110344Z`, `20260917T110514Z`, `20260917T110641Z` | 0 of 3 complete cycles; every association ended with reason 15, `4WAY_HANDSHAKE_TIMEOUT` |
| B: fixed allocation, 40 KB reserve | `20260917T111654Z`, `20260917T111754Z`, `20260917T111852Z` | 3 of 3 complete cycles; association, AP join event, DHCP, bidirectional UDP and cleanup all passed |

The failing image successfully started the AP and reported the expected WPA2
configuration. It received no station-joined event and exchanged no UDP data.
No assertion or reset occurred. The corrected image recorded the expected C3
MAC joining, assigned `192.168.4.2`, exchanged the exact run-bound UDP payload
and completed cleanly in every cycle.

## Memory Evidence

The same read-only snapshot was taken after a runner reset and before enabling
Wi-Fi:

| Measurement | Original allocation (A) | Fixed allocation (B) |
|---|---:|---:|
| Native free heap | 13,352 bytes | 37,320 bytes |
| Native minimum heap | 12,980 bytes | 21,736 bytes |
| Largest native free block | 12,800 bytes | 26,624 bytes |
| JsVars total | 4,096 | 4,941 |
| JsVars free | 3,999 | 4,809 |
| JsVar block size | 23 bytes | 14 bytes |

The snapshot script is
`docs/investigations/wifi/repros/esp32_memory_snapshot.js`.

With `RESIZABLE_JSVARS`, `jsvInit()` starts with one 4,096-variable block and
the 32-bit JsVar references increase each variable to 23 bytes. That initial
block occupies approximately 94 KB. With `JSVAR_MALLOC`, the target uses
14-byte JsVars and `targets/esp32/main.c` sizes the initial allocation while
retaining the configured native-heap reserve; this build created 4,941 JsVars,
approximately 69 KB. The measured native free-heap increase of about 24 KB is
consistent with that allocation difference.

## Interpretation Boundary

The A/B result is sufficient to attribute the historical failure to the old
board allocation configuration. It does not prove which WPA2 or ESP-IDF
allocation failed internally because the original image emitted no allocator
diagnostic. Naming a particular WPA2 buffer, task or object would therefore go
beyond the evidence.

The fixed allocation with the default 40 KB reserve is sufficient for this
focused WPA2 workload. Increasing the reserve to 70 KB is a separate change
justified by combined Wi-Fi, BLE, HTTPS and ping native-memory headroom, not by
a requirement demonstrated in this WPA2 test.
