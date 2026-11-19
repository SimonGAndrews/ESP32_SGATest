# Draft issue: ESP32 `Wifi.ping()` rejects valid IPv4 strings

Status: baseline reproduced and correction qualified; issue number pending.

## Problem

On current consolidated Espruino `master`, the ESP32 `Wifi.ping()` wrapper
rejects a valid dotted-decimal IPv4 string before creating a native ping
session. The same failure is present on classic ESP32, ESP32-C3 and ESP32-S3.

## Reproduction

```js
echo(false);
try {
  require("Wifi").ping("127.0.0.1");
  print("PING_CALL=accepted");
} catch (error) {
  print("PING_CALL=rejected " + error);
}
```

Preconditions:

- boards: `ESP32`, `ESP32C3` and `ESP32S3`
- Espruino: `2v29.523`, commit `b70eda11e`
- ESP-IDF: 5.5.3
- network dependency: none; the loopback address is rejected before a ping
  session starts

## Observed

```text
PING_CALL=rejected Error: "127.0.0.1" not a valid IP address
```

## Expected

`Wifi.ping("127.0.0.1")` should accept the valid IPv4 address and start a ping
session. Invalid address strings should continue to throw a catchable
exception.

## Scope

The correction is limited to IPv4-string conversion in the shared ESP32 Wi-Fi
wrapper. It does not change ping-session ownership, callback delivery or reset
handling, and it does not revive the closed queue-based implementation from PR
#2781. Those behaviours can be assessed independently once valid addresses
reach the native ping API.

## Evidence

- detailed current-master result:
  [`2026-11-19-esp32-current-master-ping-baseline.md`](../../../../tests/Results/WIFI_BLE_Results/2026-11-19-esp32-current-master-ping-baseline.md)
- corrected candidate result:
  [`2026-11-19-esp32-ping-ipv4-parser-candidate.md`](../../../../tests/Results/WIFI_BLE_Results/2026-11-19-esp32-ping-ipv4-parser-candidate.md)
- historical investigation: [#2779](https://github.com/espruino/Espruino/issues/2779)
- superseded implementation review: [#2781](https://github.com/espruino/Espruino/pull/2781)
