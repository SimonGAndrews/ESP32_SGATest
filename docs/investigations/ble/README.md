# ESP32 BLE Investigations

Date opened: 2026-07-20

## Current Conclusion

Initial V1 two-board testing proves BLE advertising, filtered scanning and
custom GATT traffic in both directions. It identifies two shared ESP32-port
API/event anomalies and one resolved test-control integration requirement.
None indicates a V1 harness hardware fault.

A later minimal `NRF.setServices()` lifecycle test reproducibly faults on the
current-master C3 IDF4 build. The fault was not reproduced by the equivalent
current-master C3 IDF5 build in three runs totalling 150 service replacements.
A shared-code correction has since completed 100 service replacements on each
of patched C3 IDF4 and IDF5 builds. Both patched builds also passed final-service
discovery, read and writes over the air after 50 timed replacements. This
remains an IDF4-specific failure observation, but the correction is not
version-guarded because the unsafe lifecycle ordering is shared.

The PR #2749 review revision moves the completion wait into `gatts_reset()`.
It passed 50 service replacements and a separate 50-cycle three-service
replacement/update test on classic ESP32 legacy, IDF4 and IDF5 builds and on
ESP32-C3 IDF4 and IDF5 builds.

## Issue Register

| ID | Issue | Status | Primary record |
|---|---|---|---|
| BLE-001 | `NRF.getAddress()` returns `de:ad:de:ad:de:ad` instead of the active BLE address | Confirmed on classic legacy and C3 IDF4; source cause not investigated | [`central-control-and-api-anomalies-2026-07-20.md`](central-control-and-api-anomalies-2026-07-20.md) |
| BLE-002 | An unforced wired REPL migrates to Bluetooth on connection and may not return after disconnect | Migration is intended; disconnect restoration has a source-ordering defect candidate; forcing `Serial1` prevents it and both directions pass | [`central-control-and-api-anomalies-2026-07-20.md`](central-control-and-api-anomalies-2026-07-20.md) |
| BLE-003 | Peripheral `NRF` `connect` and `disconnect` callbacks are each delivered twice for one link lifecycle | Confirmed on classic legacy and C3 IDF4 peripherals | [`central-control-and-api-anomalies-2026-07-20.md`](central-control-and-api-anomalies-2026-07-20.md) |
| BLE-004 | Repeated `NRF.setServices()` lifecycle fault | PR #2749 open; review revision passed repeated replacement and update tests across classic ESP32 legacy/IDF4/IDF5 and C3 IDF4/IDF5 | [`../../../tests/Results/WIFI_BLE_Results/2026-09-11-esp32c3-setservices-lifecycle-isolation.md`](../../../tests/Results/WIFI_BLE_Results/2026-09-11-esp32c3-setservices-lifecycle-isolation.md) |

## Evidence Boundary

Authoritative bench observations, board identities, commands and V2 service
interpretation are in:

- [`../../../tests/Results/WIFI_BLE_Results/2026-07-20-ble-supervisor-peer-initial.md`](../../../tests/Results/WIFI_BLE_Results/2026-07-20-ble-supervisor-peer-initial.md)

Reusable roles and runners are under:

- [`../../../tests/WIFI_BLE/ble/`](../../../tests/WIFI_BLE/ble/)
- [`../../../tools/repl/`](../../../tools/repl/)

Firmware patches belong in the selected Espruino source repository, not this
harness repository.

## Firmware Lines Currently Tested

| Board | Board file / line | Version | Firmware commit | BLE role coverage |
|---|---|---|---|---|
| Classic ESP32 | `boards/ESP32.py`, legacy IDF 3.1 lineage | `2v29.97` | `d3d33f4aa` | advertiser, scanner, GATT peripheral and central |
| ESP32-C3 | `boards/ESP32C3_IDF4.py`, IDF 4.4.8 | `2v29.107` | `0af6e1568` | advertiser, scanner, GATT peripheral and central |

The remaining matching API/event symptoms do not make either line a golden
reference. BLE-001 and BLE-003 still justify checking shared `targets/esp32`
BLE code and later comparing classic `ESP32_IDF4` and WIP IDF 5.5.3 builds.

The newer BLE-004 evidence is deliberately separated from those original
two-board results because it compares current-master and historical images and
has a narrower, lifecycle-specific purpose.
