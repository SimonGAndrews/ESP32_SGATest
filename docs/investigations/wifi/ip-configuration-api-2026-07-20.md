# ESP32 Wi-Fi IP Configuration API Defects

Date: 2026-07-20

Issue IDs: WIFI-001, WIFI-002

Status: confirmed on classic legacy and C3 IDF4; source cause identified; no
firmware patch applied

## Conclusion

The shared ESP32 `Wifi.setIP()` / `Wifi.setAPIP()` worker contains two defects:

1. it reverses the callback result, returning `null` when the ESP-IDF call
   fails and `"Failure"` when it succeeds
2. its station path calls the AP DHCP-server stop API on the station interface
   instead of stopping the station DHCP client

The bench results match both defects exactly. `setAPIP()` succeeds
functionally but reports failure. Post-association `setIP()` fails
functionally but reports success.

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
| classic legacy | legacy ESP32 codebase | `d3d33f4aa` | `libs/network/esp32/jswrap_esp32_network.c` |
| C3 IDF4 | IDF4/upstream codebase | `0af6e1568` | `libs/network/esp32/jswrap_esp32_network.c` |

The source is shared rather than guarded differently for these two observed
paths. That accounts for the cross-build reproduction. It also means the
problem should be checked in classic IDF4, S3 IDF4 and IDF5 before defining the
complete affected-version range.

## Candidate Fix Shape For A Firmware Thread

No patch is authorized or applied by this investigation note. The smallest
candidate shape to evaluate in the appropriate Espruino repo is:

1. stop the station DHCP client with the correct station/client API
2. preserve the AP path's DHCP-server stop, set and restart sequence
3. return `null` only when `err == ESP_OK`
4. return useful failure text or error information when `err != ESP_OK`
5. check and propagate failures from DHCP stop/start rather than discarding
   them

The station DHCP restoration path after disconnect/reconnect also needs to be
understood before accepting a fix. A local one-line substitution alone is not
yet a complete reviewed solution.

## Required Regression Matrix

Run the existing focused roles unchanged across:

| Firmware line | `setAPIP()` | post-association `setIP()` |
|---|---|---|
| classic legacy | baseline captured | baseline captured |
| classic IDF4 | pending | pending |
| C3 IDF4 | baseline captured | baseline captured |
| S3 IDF4 | pending when hardware is available | pending when hardware is available |
| classic/C3/S3 IDF5 | pending WIP comparison | pending WIP comparison |

For every run, retain four independent assertions:

1. callback value
2. local `getIP()` / `getAPIP()` result
3. address observed by the other endpoint
4. run-bound application traffic

## Related Test Assets

- [`../../../tools/repl/run_wifi_target_ap_test.py`](../../../tools/repl/run_wifi_target_ap_test.py)
- [`../../../tests/WIFI_BLE/wifi/wifi_target_ap_service.js`](../../../tests/WIFI_BLE/wifi/wifi_target_ap_service.js)
- [`../../../tests/WIFI_BLE/wifi/wifi_station_static_ip.js`](../../../tests/WIFI_BLE/wifi/wifi_station_static_ip.js)
