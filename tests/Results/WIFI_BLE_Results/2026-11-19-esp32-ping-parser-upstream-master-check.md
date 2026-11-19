# ESP32 Ping Parser Upstream-Master Check

Date: 2026-11-19

## Conclusion

Gordon's direct `master` correction at Espruino commit `fe558e4b3` passes
clean builds and physical parser checks on ESP32-C3 and classic ESP32. A
malformed address remains rejected, `127.0.0.1` is accepted, and the
Espruino-specific `localhost` input is translated to `127.0.0.1` and accepted.

On classic ESP32, both numeric loopback and `localhost` also completed the
normal five-result callback sequence. Each result reported the expected
cumulative count, sequence number, byte count and zero error/timeout values.

This confirms the one-line upstream correction requested in the review of PR
[#2791](https://github.com/espruino/Espruino/pull/2791). C3 result delivery was
intentionally not exercised; classic ESP32 callback delivery was included to
confirm normal execution on that target.

## Source And Target

| Item | Value |
|---|---|
| Upstream revision | `fe558e4b3c90a3bde513d45ab55fcff0bf33be98` |
| Upstream commit | `ESP32: Fix IP address parsing if IPv6 not enabled (fix #2791, fix #2790)` |
| Validation branch | `validation/esp32-ping-parser-master-2790` |
| Initial board | Seeed Studio XIAO ESP32-C3, `ESP32C3` |
| Callback board | classic ESP32-D0WD-V3, `ESP32` |
| Espruino version | `2v29.524` |
| Runtime Git commit | `fe558e4b3` |
| ESP-IDF | 5.5.3 |
| Build | clean `RELEASE=1` |

Clean builds completed for `ESP32C3` and `ESP32`. Each exact image was flashed
without a whole-device erase.

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

## Classic ESP32 Callback And Input Matrix

The classic target first ran the numeric loopback callback probe. It accepted
`127.0.0.1` and delivered five callbacks:

```text
PING_CALLBACK={"totalCount":1,"totalBytes":64,"totalTime":0,"respTime":0,"seqNo":1,"timeoutCount":0,"bytes":64,"error":0}
PING_CALLBACK={"totalCount":2,"totalBytes":128,"totalTime":0,"respTime":0,"seqNo":2,"timeoutCount":0,"bytes":64,"error":0}
PING_CALLBACK={"totalCount":3,"totalBytes":192,"totalTime":0,"respTime":0,"seqNo":3,"timeoutCount":0,"bytes":64,"error":0}
PING_CALLBACK={"totalCount":4,"totalBytes":256,"totalTime":0,"respTime":0,"seqNo":4,"timeoutCount":0,"bytes":64,"error":0}
PING_CALLBACK={"totalCount":5,"totalBytes":320,"totalTime":0,"respTime":0,"seqNo":5,"timeoutCount":0,"bytes":64,"error":0}
RESULT=CALL_ACCEPTED
CALLBACK_COUNT=5
```

The separate valid/invalid probe confirmed:

```text
INVALID_CALL=rejected Error: "not-an-ip" not a valid IP address
VALID_CALL=accepted
RESULT=PASS
```

Finally,
[`esp32_wifi_ping_localhost_callback.js`](../../../docs/investigations/wifi/repros/esp32_wifi_ping_localhost_callback.js)
confirmed `localhost` parsing and callback delivery together. Its SHA-256 is:

```text
7d721d09229e63fc8bf56c9a59ee89a2e48d298fb8a776a3f4c409086e694a12
```

The wrapper logged the parsed address as `127.0.0.1`, accepted the call and
delivered five valid result objects:

```text
jswrap_wifi_ping("127.0.0.1")
LOCALHOST_CALL=accepted
CALLBACK_COUNT=5
RESULT=PASS five_callbacks
```

A native reboot separated every accepted ping session.

## Scope

These were focused exact-upstream checks requested following Gordon's review.
They confirm parsing on C3 and confirm parsing plus normal callback execution
on classic ESP32. Known C3 and S3 callback-delivery findings remain outside
this parser correction.
