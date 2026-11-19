# ESP32 `Wifi.ping()` IPv4 Parser Candidate

Date: 2026-11-19

## Conclusion

The two-line IPv4 conversion correction at Espruino commit `6fdcebda5` passes
focused physical qualification on classic ESP32, ESP32-C3 and ESP32-S3. Each
target rejects malformed input and accepts the valid loopback address without
requiring credentials or an external network.

Clean release builds completed for all three available board definitions, and
each board was flashed and verified at the exact candidate commit.

The callback-free probe deliberately isolates address parsing. A broader
callback probe exposed separate result-delivery failures on C3 and S3 after
the corrected parser allowed the calls to reach ESP-IDF. They are recorded
below as follow-up findings, not attributed to or fixed by this parser change.

## Source And Runtime Identity

| Item | Value |
|---|---|
| Espruino branch | `fix/esp32-wifi-ping-minimal` |
| Candidate commit | `6fdcebda5` |
| Upstream base | `b70eda11e7d29528cf23e0ed165a197934821184` |
| Espruino version | `2v29.524` |
| ESP-IDF | 5.5.3 |
| Build type | `RELEASE=1` |

| Physical target | Board definition | Runtime commit |
|---|---|---|
| classic ESP32 | `ESP32` | `6fdcebda5` |
| Seeed Studio XIAO ESP32-C3 | `ESP32C3` | `6fdcebda5` |
| ESP32-S3 | `ESP32S3` | `6fdcebda5` |

## Correction

In the `CONFIG_LWIP_IPV6`-disabled path, `stringToIP()` now sets the lwIP
address type to `IPADDR_TYPE_V4` and returns the result of `ip4addr_aton()`.
The previous path stored a parsed value and then always returned `false`.

No ping-session or callback lifecycle code changed.

## Build And Flash Coverage

Exact-commit clean `RELEASE=1` builds and physical flashes completed for:

- `ESP32`;
- `ESP32C3`; and
- `ESP32S3`.

The flashes updated the bootloader, application and partition-table regions;
they did not perform a whole-device erase.

## Focused Parser Validation

The callback-free
[`esp32_wifi_ping_ipv4_validation.js`](../../../docs/investigations/wifi/repros/esp32_wifi_ping_ipv4_validation.js)
first calls `Wifi.ping("not-an-ip")`, then calls
`Wifi.ping("127.0.0.1")`. Its SHA-256 is:

```text
f9712a64e2cdb896f074b36a94b5133f8e9f863b84bdaa2bb15e12abcdd84528
```

All targets produced the required API outcomes:

```text
INVALID_CALL=rejected Error: "not-an-ip" not a valid IP address
VALID_CALL=accepted
RESULT=PASS
DONE=esp32_wifi_ping_ipv4_validation
```

| Target | Invalid string | Valid IPv4 string | Result |
|---|---|---|---|
| classic ESP32 | rejected | accepted | pass |
| ESP32-C3 | rejected | accepted | pass |
| ESP32-S3 | rejected | accepted | pass |

The final C3 parser run followed a native reboot and contained no stale event
diagnostic from an earlier callback-based session.

## Independent Follow-up Findings

The existing callback-based parser reproducer was also run to learn what
happens after the parser accepts the address:

| Target | Accepted | Observed callback behaviour |
|---|---:|---|
| classic ESP32 | yes | five loopback results delivered |
| ESP32-C3 | yes | zero results before the seven-second probe timeout |
| ESP32-S3 | yes | native result handling reached JavaScript state, reported out of memory, then panicked with `LoadStoreError` |

On C3, a later JavaScript reset initially exposed one
`Unknown type of callback in Event Queue` diagnostic. After a native reboot,
the callback-free parser validation passed cleanly. This supports treating
result delivery, callback lifetime and reset handling as a separate issue.

The parser correction neither creates nor changes those callback paths. Their
failure was latent behind the current-master parser rejection and became
observable only after valid addresses could reach the native ping API.

## Disposition

The parser-only change is ready for its concise issue and PR. The independent
callback and scheduling findings require a separate reproduction and design
review before any additional firmware change is added.
