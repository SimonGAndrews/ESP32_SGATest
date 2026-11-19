# ESP32 Ping Parser Upstream-Master Check

Date: 2026-11-19

## Conclusion

Gordon's direct `master` correction at Espruino commit `fe558e4b3` passes a
focused ESP32-C3 build and physical parser check. A malformed address remains
rejected, `127.0.0.1` is accepted, and the Espruino-specific `localhost` input
is translated to `127.0.0.1` and accepted.

This confirms the one-line upstream correction requested in the review of PR
[#2791](https://github.com/espruino/Espruino/pull/2791). Ping result delivery
was intentionally not exercised because it remains a separate issue.

## Source And Target

| Item | Value |
|---|---|
| Upstream revision | `fe558e4b3c90a3bde513d45ab55fcff0bf33be98` |
| Upstream commit | `ESP32: Fix IP address parsing if IPv6 not enabled (fix #2791, fix #2790)` |
| Validation branch | `validation/esp32-ping-parser-master-2790` |
| Board | Seeed Studio XIAO ESP32-C3, `ESP32C3` |
| Espruino version | `2v29.524` |
| Runtime Git commit | `fe558e4b3` |
| ESP-IDF | 5.5.3 |
| Build | clean `RELEASE=1` |

The clean build completed and the exact image was flashed without a
whole-device erase.

## Upstream Change

The `CONFIG_LWIP_IPV6`-disabled path keeps the existing Espruino parser and
returns whether it produced a nonzero address:

```c
((ip4_addr_t*)ipAddr)->addr = networkParseIPv4Address(str);
return ((ip4_addr_t*)ipAddr)->addr!=0;
```

This is consistent with other Espruino IPv4 parsing and preserves the special
`localhost` handling identified in review.

## Numeric And Invalid Input

The existing callback-free parser probe produced:

```text
BOARD=ESP32C3
VERSION=2v29.524
GIT_COMMIT=fe558e4b3
INVALID_CALL=rejected Error: "not-an-ip" not a valid IP address
VALID_CALL=accepted
RESULT=PASS
DONE=esp32_wifi_ping_ipv4_validation
```

## `localhost` Input

The callback-free
[`esp32_wifi_ping_localhost_validation.js`](../../../docs/investigations/wifi/repros/esp32_wifi_ping_localhost_validation.js)
has SHA-256:

```text
7c193d3549c180ea841fd81516d52c1e94f372d1352427dfb12035e9ad9dfbf0
```

It produced:

```text
BOARD=ESP32C3
VERSION=2v29.524
GIT_COMMIT=fe558e4b3
jswrap_wifi_ping("127.0.0.1")
LOCALHOST_CALL=accepted
RESULT=PASS
DONE=esp32_wifi_ping_localhost_validation
```

The debug line confirms that `networkParseIPv4Address("localhost")` supplied
the loopback address to the ping wrapper.

## Scope

This was the quick exact-upstream check requested by Gordon and used the C3
prototype target. The earlier candidate qualification already covered clean
builds and parser acceptance on classic ESP32, ESP32-C3 and ESP32-S3. The
upstream change is smaller and remains in the same shared ESP32 source path.
