# ESP32-C3 Current-Master Controlled-Peer Qualification

Date: 2026-09-10 Europe/London; runner identifiers use UTC and therefore show
2026-09-09.

## Conclusion

The current-master ESP32-C3 image is qualified for the C3's primary controlled
role as a BLE GATT central in the classic ESP32 BLE-plus-HTTPS test. It is not
qualified as an unrestricted two-role peer.

Three primary runs completed a connected GATT exchange before and after the
classic target's HTTPS transaction, with exact host correlation and no C3
reset. C3 Wi-Fi access-point, station, DHCP and UDP operations also worked.

Two current-master limitations prevent a general peer designation:

1. using `NRF.setServices()` to replace the boot GATT service is intermittent;
   three complete peripheral transactions passed but four attempts crashed in
   service replacement;
2. `Wifi.ping()` on the C3 station produced no callback, although the same
   station exchanged UDP traffic and replied to five ICMP requests from its
   peer.

Filtered `NRF.findDevices()` scans also returned an empty list in both board
directions during this qualification. Connection-oriented
`NRF.requestDevice()` discovery worked in both directions.

These C3 findings do not invalidate the classic ESP32 70 KB heap result. The
classic board still completed the intended simultaneous BLE, Wi-Fi and HTTPS
workload while the C3 used the qualified central role.

## Firmware And Recovery Provenance

| Item | Value |
|---|---|
| Board definition | `ESP32C3_IDF4` |
| Espruino source | official `master` at `d8322cec957a81e7a927b969a271568dad475c46` |
| Espruino version | `2v29.392` |
| ESP-IDF | 4.4.8 |
| Console and flash path | native USB Serial/JTAG, configured `/dev/serial/by-path/...usb-0:1.2:1.0` |
| Chip identity | ESP32-C3 revision 0.3, embedded XMC 4 MB flash |
| Build branch | `validation/c3-peer-d8322cec9` |
| Build command | `source ./scripts/provision.sh ESP32C3_IDF4`, then `make BOARD=ESP32C3_IDF4 RELEASE=0 -j4` |
| Firmware archive SHA-256 | `ef260af5f0ba79615293da2c3248f79fff4116a96678fede9b99c7d380b65647` |

The C3 flash was read in full before replacement. The private 4 MB recovery
image is Git-ignored, mode `600`, and has SHA-256
`0677de23a4bbf5a3b8c8a3ae0365933316893646e29fb9f03a16dba51d397fd0`.
Its source is also retained by branch `archive/pre-idf5-merge-b905c8099`.

The C3 flash was then erased completely and the new bootloader, partition
table and application were written with hash verification. This removed saved
runtime state as a qualification variable.

The paired classic target remained on the proposed 70 KB/ping image:
`ESP32_IDF5`, `2v29.395`, commit `cdcf5e8e7`.

## Results

| UTC run | C3 role and operation | Result |
|---|---|---|
| identity verification | board, version, commit, Wi-Fi and BLE APIs | Pass |
| `20260909T225623Z` | GATT peripheral; service read, two writes and disconnect | Pass |
| `20260909T225708Z` | GATT central; discovery, service read and two writes | Pass |
| `20260909T230043Z`, `231537Z`, `231748Z` | GATT central held through classic Wi-Fi and HTTPS | Pass in all three complete host-correlated runs |
| `20260909T225756Z` | WPA2 AP and UDP responder | AP, join/leave and UDP pass; separate classic second-ping session timed out |
| `20260909T225908Z` | station scan, WPA2 association, DHCP, ping and UDP | scan/association/DHCP/UDP pass; C3 ping callback absent |
| `20260909T230940Z` | direct station association without scan | association/DHCP/UDP pass; C3 ping callback absent |
| `20260909T231055Z` | advertiser with classic filtered scanner | C3 advertising pass; classic scan returned no device |
| `20260909T231130Z` | filtered scanner with classic advertiser | Fail: C3 scan returned no device |

Each of the three complete primary BLE-plus-HTTPS runs produced:

- all 10 classic-target functional checks passed;
- all 7 C3-central functional checks passed;
- the host observed exactly one request for the run-specific HTTPS path;
- the classic received status 200 and the complete 744-byte body;
- the C3 remained connected and performed its second GATT write after HTTPS.

## Intermittent GATT Peripheral Failure

The complete C3-peripheral transaction passed in runs `20260909T225623Z`,
`20260909T230301Z` and `20260909T230437Z`. It failed before readiness in runs
`20260909T230146Z`, `20260909T230335Z`, `20260909T230510Z` and
`20260909T230736Z`.

The failures included RISC-V load/store access faults and an ESP-IDF
`heap_tlsf.c` heap-integrity assertion. Decoding the current image located the
relevant frames at:

- `gatts_char_init()`, `targets/esp32/BLE/esp32_gatts_func.c:518`;
- `gatts_create_structs()`, the `calloc()` beginning at line 669;
- `gatts_set_services()`, lines 693-694.

The source contains an asynchronous lifetime race. `gatts_set_services()`
calls `gatts_reset(true)`, which starts stop/delete/unregister operations, and
then immediately allocates and populates replacement global service arrays.
The later unregister callback frees the arrays referenced by those same global
pointers. Depending on event timing, this can free or modify the replacement
state while it is being created.

Current-master commit `ed46a3a0b` correctly changes active-service deletion to
stop first and delete on `ESP_GATTS_STOP_EVT`. It removes the immediate
`BT_GATT: Active Service Found` misuse, but it does not defer replacement
service construction until all old applications have unregistered.

The runner initially performed a redundant `NRF.sleep()` cleanup after its
hardware reboot. That was removed so the fresh reboot itself supplies the
clean precondition. The fault remained and the decoded frames still pointed
inside `NRF.setServices()`, so the final result is not attributed to that
runner transition.

Source review also found that `gatts_reset()` declares `esp_err_t r` but does
not assign the return from `esp_ble_gatts_stop_service()` before testing `r`.
That should be corrected, although it does not by itself explain the decoded
array-lifetime and heap-corruption failures.

## Wi-Fi Interpretation

The C3 proved working radio and IP data paths in both Wi-Fi roles:

- as an AP, it accepted the classic station, observed join and leave, and
  returned the run-specific UDP acknowledgement;
- as a station, it scanned the peer SSID, associated using WPA2, received a
  DHCP address and exchanged the exact UDP payload;
- while the C3 was a station, the peer successfully received five ICMP echo
  replies from it.

The absent callback from the C3's own `Wifi.ping()` is therefore an Espruino
API-path finding rather than evidence of a failed network link. Skipping
`Wifi.scan()` did not change it.

The classic peer's station-leave event was delayed beyond the runner's summary
in the reverse-role tests even though the C3 reported its own disconnect event.
This is not counted as proof of a C3 disconnect failure.

## Disposition

Keep `d8322cec9` on the bench while the findings are reviewed. It is suitable
for the established C3-central BLE-plus-HTTPS role and for controlled Wi-Fi
AP/UDP duties, but the bench configuration must not describe it as a fully
qualified interchangeable BLE peer.

Before a general C3 peer baseline is declared:

1. serialize old GATT teardown and replacement creation, then repeat at least
   ten C3-peripheral transactions across reboot cycles;
2. isolate the C3 IDF4 `Wifi.ping()` callback failure with a minimal station
   script;
3. isolate the empty `NRF.findDevices()` result from the working
   `NRF.requestDevice()` path;
4. rerun both GATT directions, both advertising/scan directions and both
   Wi-Fi directions on the corrected source.
