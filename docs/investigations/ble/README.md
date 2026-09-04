# ESP32 BLE Investigations

Date opened: 2026-07-20

## Current Conclusion

Initial V1 two-board testing proves BLE advertising, filtered scanning and
custom GATT traffic in both directions. It identifies two shared ESP32-port
API/event anomalies and one resolved test-control integration requirement.
None indicates a V1 harness hardware fault.

## Issue Register

| ID | Issue | Status | Primary record |
|---|---|---|---|
| BLE-001 | `NRF.getAddress()` returns `de:ad:de:ad:de:ad` instead of the active BLE address | Confirmed on classic legacy and C3 IDF4; source cause not investigated | [`central-control-and-api-anomalies-2026-07-20.md`](central-control-and-api-anomalies-2026-07-20.md) |
| BLE-002 | An unforced wired REPL migrates to Bluetooth on connection and may not return after disconnect | Migration is intended; disconnect restoration has a source-ordering defect candidate; forcing `Serial1` prevents it and both directions pass | [`central-control-and-api-anomalies-2026-07-20.md`](central-control-and-api-anomalies-2026-07-20.md) |
| BLE-003 | Peripheral `NRF` `connect` and `disconnect` callbacks are each delivered twice for one link lifecycle | Confirmed on classic legacy and C3 IDF4 peripherals | [`central-control-and-api-anomalies-2026-07-20.md`](central-control-and-api-anomalies-2026-07-20.md) |

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
