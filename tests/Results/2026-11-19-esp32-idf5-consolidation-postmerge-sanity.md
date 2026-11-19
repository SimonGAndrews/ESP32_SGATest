# ESP32 IDF5 Consolidation Post-Merge Sanity

Date: 2026-11-19

## Conclusion

The canonical `ESP32`, `ESP32C3` and `ESP32S3` builds from merged upstream
master build, flash and run successfully on the three available bench targets.
All three passed focused UART driver-lifecycle and pending-transmit teardown
tests. The classic ESP32 also passed the restored SHA-512 and filesystem API
checks. A connection-oriented BLE GATT exchange passed between the classic
ESP32 and C3.

The two Wi-Fi peer directions established WPA2 networks and completed scan,
association, DHCP, event, run-correlated UDP and cleanup checks. Their
separately asserted `Wifi.ping()` callbacks timed out. This matches the
accepted consolidation POC baseline and is not evidence of a new
consolidation regression: the separately qualified IDF5 ping-hardening commit
`70555065f` is not an ancestor of this master.

CYD and CURIO are excluded because those boards are not available on this
bench and remain with Gordon Williams for validation.

## Source And Build Provenance

| Item | Value |
|---|---|
| Espruino source | upstream `master` |
| Exact revision | `b70eda11e` |
| Runtime version | `2v29.523` |
| ESP-IDF | 5.5.3 |
| Build type | `RELEASE=1` |
| Provisioning | canonical board name through `scripts/provision.sh` |

Each target was provisioned and built cleanly before its flash:

| Board | Firmware size | Smallest app partition free | Build | Flash hashes |
|---|---:|---:|---|---|
| `ESP32` | `0x17e6e0` | `0x75920` (24%) | Pass | Verified |
| `ESP32C3` | `0x19dd10` | `0x562f0` (17%) | Pass | Verified |
| `ESP32S3` | `0x17d9c0` | `0x76640` (24%) | Pass | Verified |

The builds emitted the already familiar ESP-IDF Kconfig migration,
filesystem packed-member and deprecated network-API warnings. There were no
build errors.

## Bench Identity

The test used the dated configuration
[`../WIFI_BLE/esp32_idf5_consolidation_postmerge_bench_config.json`](../WIFI_BLE/esp32_idf5_consolidation_postmerge_bench_config.json).
Preflight and final post-test verification both passed.

| Position | Stable control path | Observed identity |
|---|---|---|
| classic ESP32 V1 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.3:1.0-port0` | `ESP32`, `2v29.523`, `b70eda11e` |
| ESP32-C3 V1 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.2:1.0` | `ESP32C3`, `2v29.523`, `b70eda11e` |
| ESP32-S3 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.1:1.0` | `ESP32S3`, `2v29.523`, `b70eda11e` |

All three exposed the required Wi-Fi and BLE APIs after testing.

## Runtime Results

### Restored classic libraries

The classic ESP32 passed:

- SHA-512 `abc` known-answer test, producing the expected 64-byte digest;
- filesystem module API availability; and
- `E.connectSDCard` API availability.

No physical SD-card transaction was required for this focused post-merge
sanity check.

### UART lifecycle and pending transmit

The established no-wiring family runner repeatedly configured and tore down
`Serial2` 100 times on each target:

| Board | UART pins | Lifecycle iterations | Result |
|---|---|---:|---|
| `ESP32` | TX D4, RX D35 | 100 | Pass |
| `ESP32C3` | TX D3, RX D4 | 100 | Pass |
| `ESP32S3` | TX D4, RX D7 | 100 | Pass |

A second probe queued 192 bytes at 1,200 baud and immediately called
`Serial2.unsetup()` for 25 cycles. This directly exercised the final merged
teardown shape, including master commit `b70eda11e`, which backed out the
duplicate generic clear because the ESP32 USART teardown already performs it.

| Board | Cycles | Longest observed `unsetup()` | Result |
|---|---:|---:|---|
| `ESP32` | 25 | 3.844 ms | Pass |
| `ESP32C3` | 25 | 130.971 ms | Pass |
| `ESP32S3` | 25 | 4.810 ms | Pass |

The C3's longer call completed normally and all 25 subsequent setup/teardown
cycles retained valid driver state.

### Wi-Fi peer exchange

The principal application endpoint proof was the run-correlated UDP
request/reply. Results are reported separately from the known ping callback
limitation.

| Direction | AP/UDP peer | Station target | Scan | WPA2 and DHCP | Events | UDP | Cleanup | `Wifi.ping()` |
|---|---|---|---|---|---|---|---|---|---|
| `c3-peer` | C3 | classic ESP32 | Pass, -10 dBm | Pass | Pass | Pass | Pass | Fail: no callback |
| `s3-peer` | S3 | classic ESP32 | Pass, -67 dBm | Pass | Pass | Pass | Pass | Fail: no callback |

The S3 direction also requested the optional peer-to-target ping; it produced
no result. Both runs nevertheless transferred and acknowledged their exact
run token over UDP, then removed the station and AP state cleanly.

This is consistent with the original consolidation evidence in
[`../../docs/investigations/pre_idf5_retirement/ESP_IDF5_consolidation_POC_Runtime_Test_Evidence.md`](../../docs/investigations/pre_idf5_retirement/ESP_IDF5_consolidation_POC_Runtime_Test_Evidence.md),
where all four directions passed the application endpoint exchange and the
separate ping callbacks timed out. The later qualified ping implementation is
recorded in
[`WIFI_BLE_Results/2026-11-03-esp32-idf5-ping-hardening-candidate.md`](WIFI_BLE_Results/2026-11-03-esp32-idf5-ping-hardening-candidate.md)
but has not been merged into this master.

### BLE GATT exchange

The qualified role assignment used the classic ESP32 as GATT peripheral and
the C3 as central. It passed:

- run-specific advertisement and device selection;
- connection and custom-service discovery;
- discovery of the read, acknowledgement and completion characteristics;
- exact challenge read;
- two run-correlated writes observed by the peripheral;
- disconnection; and
- final BLE cleanup on both targets.

The C3 client reported 9 checks passed and 0 failed. No S3 BLE direction is
implemented by the current two-board GATT runner, so S3 BLE endpoint coverage
is outside this focused run. The classic peripheral again logged duplicate
connect and disconnect notifications, as recorded in the original POC, while
each correlated application write occurred once and the transaction passed.

## Disposition

No new defect attributable to the ESP32 IDF5 backend consolidation was found
on the three available canonical targets. The existing `Wifi.ping()` outcome
remains separately actionable if the already qualified hardening branch is to
be reviewed for upstream inclusion.

The classic ESP32, ESP32-C3 and ESP32-S3 are left flashed with canonical
`2v29.523` firmware from `b70eda11e`.
