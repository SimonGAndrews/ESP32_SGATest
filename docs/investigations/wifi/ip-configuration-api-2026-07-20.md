# ESP32 Wi-Fi IP Configuration API Defects

Date: 2026-07-20

Issue IDs: WIFI-001, WIFI-002

Status: confirmed on current-master classic IDF5 and legacy/IDF4 comparison
builds; upstream [Espruino issue #2753](https://github.com/espruino/Espruino/issues/2753)
open; focused correction validated and submitted as
[PR #2754](https://github.com/espruino/Espruino/pull/2754)

## Conclusion

The shared ESP32 `Wifi.setIP()` / `Wifi.setAPIP()` worker contains two defects:

1. it reverses the callback result, returning `null` when the ESP-IDF call
   fails and `"Failure"` when it succeeds
2. its station path calls the AP DHCP-server stop API on the station interface
   instead of stopping the station DHCP client

The bench results match both defects exactly. `setAPIP()` succeeds
functionally but reports failure. Post-association `setIP()` fails
functionally but reports success on the legacy/IDF4 paths. On IDF5,
post-association `setIP()` changes the address but still reports failure due to
the shared inverted callback expression.

## Current-Master Confirmation

The focused REPL reproducers were rerun on 17 September 2026. The primary
current-master target was classic `ESP32_IDF5`, built from Espruino commit
`1c96229d0` with ESP-IDF 5.5.3. Existing classic legacy and C3 IDF4 firmware
were used as behavioural comparisons.

| Build | `Wifi.setAPIP()` result | Post-association `Wifi.setIP()` result |
|---|---|---|
| Classic `ESP32_IDF5`, current master `1c96229d0` | requested `192.168.47.1` applied; callback `"Failure"` | DHCP address `.102` changed to requested `.240`; callback `"Failure"` |
| Classic legacy `ESP32`, `dc274713a` | requested address applied; callback `"Failure"` | DHCP address `.104` unchanged; callback `null` |
| ESP32-C3 IDF4, `b905c8099` | requested address applied; callback `"Failure"` | DHCP address `.103` unchanged; callback `null` |

The current IDF5 path correctly calls `esp_netif_dhcpc_stop()` before setting
the station address, so WIFI-002 does not describe that path. WIFI-001 remains
shared: the successful IDF5 operation is still reported as failure.

## Documented Contract

The Espruino API defines both callbacks as `callback(err)`, with `err==null`
on success and a string on failure:

- <https://www.espruino.com/Reference#l_Wifi_setIP>
- <https://www.espruino.com/Reference#l_Wifi_setAPIP>

The settings objects contain `ip`, `gw` and `netmask` strings.

## WIFI-001: Inverted Callback Result

The exact source revisions matching both flashed firmware commits contain:

```c
params[0] = err ? jsvNewWithFlags(JSV_NULL) :
                  jsvNewFromString("Failure");
```

This expression is the inverse of the documented contract:

| ESP-IDF result | Current callback | Required callback |
|---|---|---|
| `err == 0` | `"Failure"` | `null` |
| `err != 0` | `null` | failure string |

### `setAPIP()` evidence

Both builds applied `192.168.47.1/24`, restarted the AP DHCP server, leased
`.2` to the other station and completed UDP traffic. Both callbacks returned
`"Failure"`.

| AP build | Functional result | Callback result |
|---|---|---|
| C3 IDF4 `0af6e1568` | custom AP address, DHCP and UDP passed | `"Failure"` |
| classic legacy `d3d33f4aa` | custom AP address, DHCP and UDP passed | `"Failure"` |

Primary evidence:

- [`../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-target-ap-custom-ip.md`](../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-target-ap-custom-ip.md)

### `setIP()` evidence

Both stations associated normally and received `192.168.4.2` by DHCP. Each
then requested `192.168.4.77`; each callback returned `null`, while local and
peer evidence showed that `.2` remained active.

| Station build | Functional result | Callback result |
|---|---|---|
| C3 IDF4 `0af6e1568` | static address not applied | `null` |
| classic legacy `d3d33f4aa` | static address not applied | `null` |

Primary evidence:

- [`../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-station-static-ip.md`](../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-station-static-ip.md)

## WIFI-002: Station DHCP Client Is Not Stopped

Both exact source revisions also contain this station path:

```c
tcpip_adapter_dhcps_stop(TCPIP_ADAPTER_IF_STA);
err = tcpip_adapter_set_ip_info(TCPIP_ADAPTER_IF_STA, &info);
```

Espressif's TCP/IP Adapter documentation states:

- the DHCP client or server must be stopped before setting new IP information
- `tcpip_adapter_set_ip_info()` returns
  `ESP_ERR_TCPIP_ADAPTER_DHCP_NOT_STOPPED` otherwise
- `tcpip_adapter_dhcps_stop()` is the DHCP-server operation and only supports
  the AP interface
- `tcpip_adapter_dhcpc_stop()` is the DHCP-client operation for station and
  Ethernet interfaces

Reference:

- <https://docs.espressif.com/projects/esp-idf/en/v3.3/api-reference/network/tcpip_adapter.html>

The current worker ignores the result from `dhcps_stop(STA)`. The station DHCP
client therefore remains active, so the following static-address call is
expected to fail. WIFI-001 then converts that nonzero result to `null`, which
explains the observed false success.

## Source Scope

The matching code was inspected at:

| Firmware | Selected local repo role | Commit | Source |
|---|---|---|---|
| classic IDF5 | current upstream master | `1c96229d0` | `libs/network/esp32/jswrap_esp32_network.c` |
| classic legacy | legacy ESP32 codebase | `d3d33f4aa` | `libs/network/esp32/jswrap_esp32_network.c` |
| C3 IDF4 | IDF4/upstream codebase | `0af6e1568` | `libs/network/esp32/jswrap_esp32_network.c` |

The callback expression is shared across the observed paths, accounting for
the cross-build reproduction. The station DHCP calls differ by ESP-IDF family:
current IDF5 uses `esp_netif_dhcpc_stop()`, while the older path uses the wrong
DHCP-server call. Candidate validation subsequently covered classic ESP32 and
ESP32-C3 builds on both sides of this API split.

## Submitted Correction

PR #2754 applies the smallest correction matching the two confirmed causes:

1. replace `tcpip_adapter_dhcps_stop(TCPIP_ADAPTER_IF_STA)` with
   `tcpip_adapter_dhcpc_stop(TCPIP_ADAPTER_IF_STA)` on the pre-IDF5 station
   path
2. return `null` only when the address-setting call succeeds, and `"Failure"`
   when it returns an error

The patch does not redesign the wider Wi-Fi lifecycle or alter the AP DHCP
server sequence.

## Candidate Validation

The candidate was built from current master `1c96229d0`. Each runtime test
checked both the address reported by `Wifi.getIP()` or `Wifi.getAPIP()` and the
callback result. A full chip reboot preceded each station test so it genuinely
started with DHCP enabled.

| Firmware line | `setAPIP()` | post-association `setIP()` |
|---|---|---|
| classic `ESP32` | requested address applied; callback success | DHCP address changed to requested static address; callback success |
| classic `ESP32_IDF4`, ESP-IDF 4.4.8 | requested address applied; callback success | DHCP address changed to requested static address; callback success |
| classic `ESP32_IDF5`, ESP-IDF 5.5.3 | requested address applied; callback success | DHCP address changed to requested static address; callback success |
| `ESP32C3_IDF4`, ESP-IDF 4.4.8 | requested address applied; callback success | DHCP address changed to requested static address; callback success |
| `ESP32C3_IDF5`, ESP-IDF 5.5.3 | requested address applied; callback success | DHCP address changed to requested static address; callback success |

The focused reproducers retain these independent assertions:

1. callback value
2. local `getIP()` / `getAPIP()` result

The earlier two-board functional evidence also retains peer-observed address
and application-traffic results. Those broader checks were not needed to
distinguish the two source corrections in the focused PR validation.

## Related Test Assets

- [`repros/esp32_wifi_setapip.js`](repros/esp32_wifi_setapip.js)
- [`repros/esp32_wifi_setip_after_dhcp.js`](repros/esp32_wifi_setip_after_dhcp.js)
- [`../../../tools/repl/run_wifi_target_ap_test.py`](../../../tools/repl/run_wifi_target_ap_test.py)
- [`../../../tests/WIFI_BLE/wifi/wifi_target_ap_service.js`](../../../tests/WIFI_BLE/wifi/wifi_target_ap_service.js)
- [`../../../tests/WIFI_BLE/wifi/wifi_station_static_ip.js`](../../../tests/WIFI_BLE/wifi/wifi_station_static_ip.js)
