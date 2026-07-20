# ESP32 Wi-Fi Investigations

Date opened: 2026-07-20

## Current Conclusion

The V1 two-board Wi-Fi tests have identified two confirmed shared ESP32-port
IP-configuration defects and two open follow-up anomalies. None currently
indicates a V1 harness hardware fault or a failure of the proposed V2
Supervisor Peer mechanism.

The strongest confirmed finding is that callback status must not be treated as
proof of network state:

- `Wifi.setAPIP()` applies the requested AP address but reports `"Failure"`
- `Wifi.setIP()` reports success (`null`) but leaves the DHCP station address
  unchanged

Both behaviours reproduced on the classic legacy and C3 IDF4 builds. The
matching firmware sources share the defective worker logic.

## Issue Register

| ID | Issue | Status | Primary record |
|---|---|---|---|
| WIFI-001 | `setIP` / `setAPIP` callback result is inverted | Confirmed; source cause identified; unpatched | [`ip-configuration-api-2026-07-20.md`](ip-configuration-api-2026-07-20.md) |
| WIFI-002 | `Wifi.setIP()` does not stop the station DHCP client and does not apply the requested address after association | Confirmed; source cause identified; unpatched | [`ip-configuration-api-2026-07-20.md`](ip-configuration-api-2026-07-20.md) |
| WIFI-003 | C3-station-to-classic-AP `Wifi.ping()` receives no replies while bidirectional UDP works | Open; endpoint attribution incomplete | [`directional-ping-asymmetry-2026-07-20.md`](directional-ping-asymmetry-2026-07-20.md) |
| WIFI-004 | Classic legacy build reset during two post-`setIP()` continuation sequences | Open; trigger not isolated | [`classic-post-setip-reset-2026-07-20.md`](classic-post-setip-reset-2026-07-20.md) |

## Evidence Boundary

This directory interprets firmware issues. Authoritative run observations,
board identities and bench preconditions remain under:

- [`../../../tests/Results/WIFI_BLE_Results/`](../../../tests/Results/WIFI_BLE_Results/)

The reusable bench runners and target roles remain under:

- [`../../../tools/repl/`](../../../tools/repl/)
- [`../../../tests/WIFI_BLE/`](../../../tests/WIFI_BLE/)

Do not copy an observation from this investigation into a V2 hardware
requirement without the architecture workstream accepting the consequence.
The presently supported V2 conclusion is methodological: preserve callback,
local state, peer-observed state and application traffic as separate results.

## Firmware Lines Currently Tested

| Board | Board file / line | Version | Firmware commit | Role coverage |
|---|---|---|---|---|
| Classic ESP32 | `boards/ESP32.py`, legacy IDF 3.1 lineage | `2v29.97` | `d3d33f4aa` | AP and station |
| ESP32-C3 | `boards/ESP32C3_IDF4.py`, IDF 4.4.8 | `2v29.107` | `0af6e1568` | AP and station |

The classic legacy build is a mature comparator, not a golden reference. The
next useful firmware comparison for WIFI-001 and WIFI-002 is classic
`ESP32_IDF4` using the same scripts and assertions. IDF5 builds should follow
as WIP migration evidence.

## Investigation Rules

1. Keep functional effect separate from the documented callback contract.
2. Preserve both local `Wifi` state and independent peer observations.
3. Keep ICMP results separate from application-layer reachability.
4. Record resets and raw boot causes even when the functional test already
   failed.
5. Use focused on-target roles: the classic interpreter reached an
   out-of-memory condition when the general station script was enlarged.
6. Put any firmware patch in the selected Espruino repository, not here.
7. Rerun the unmodified regression evidence before and after a candidate fix.

Firmware-lineage and repository-selection context is preserved in:

- [`../../handoff/2026-07-20-esp32-firmware-lineage-and-test-interpretation.md`](../../handoff/2026-07-20-esp32-firmware-lineage-and-test-interpretation.md)
- [`../../handoff/2026-07-05-espruino-repo-structure.md`](../../handoff/2026-07-05-espruino-repo-structure.md)
