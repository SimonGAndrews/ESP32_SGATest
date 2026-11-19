# ESP32 `Wifi.ping()` rejects valid IPv4 strings

Submitted as [Espruino issue #2790](https://github.com/espruino/Espruino/issues/2790).

### Problem

On current Espruino `master`, the ESP32 `Wifi.ping()` implementation rejects
valid dotted-decimal IPv4 strings before starting a ping session.

This reproduces on classic ESP32, ESP32-C3 and ESP32-S3.

### Reproduction

```js
echo(false);

try {
  require("Wifi").ping("127.0.0.1");
  print("PING_CALL=accepted");
} catch (error) {
  print("PING_CALL=rejected " + error);
}
```

Tested with Espruino `2v29.523`, commit `b70eda11e`, using ESP-IDF 5.5.3.

No Wi-Fi connection or external network is required because the loopback
address is rejected before a ping session starts.

### Observed

```text
PING_CALL=rejected Error: "127.0.0.1" not a valid IP address
```

### Expected

The valid IPv4 address should be accepted and the ping session started.
Malformed addresses should continue to throw a catchable exception.

### Cause

When `CONFIG_LWIP_IPV6` is disabled, `stringToIP()` stores the parsed IPv4
value but then falls through to `return false`.

The proposed correction sets the address type to `IPADDR_TYPE_V4` and returns
the result of lwIP's `ip4addr_aton()`.

The change is limited to IPv4-string conversion; ping callback delivery and
session lifecycle are outside this issue.
