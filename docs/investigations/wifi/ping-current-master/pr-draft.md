# ESP32: restore IPv4 string parsing

> Submitted as [PR #2791](https://github.com/espruino/Espruino/pull/2791),
> then closed after Gordon applied the smaller `networkParseIPv4Address()`
> correction directly to `master` at `fe558e4b3`. The text below records the
> submitted proposal rather than the final upstream implementation.

ESP32 `Wifi.ping()` currently rejects every IPv4 string when lwIP IPv6
support is disabled because `stringToIP()` always returns `false`. Use lwIP's
IPv4 parser and return its validation result so valid addresses reach the ping
API while malformed input remains rejected.

Fixes #2790.

### Change

- set the `ip_addr_t` type to `IPADDR_TYPE_V4` in the non-IPv6 path; and
- return `ip4addr_aton()`'s success or failure result from `stringToIP()`.

No ping-session, callback-delivery or reset lifecycle code is changed.

### Validation

- reproduced the unmodified failure on all three physical targets at
  `b70eda11e`;
- passed a callback-free valid/invalid parser probe on all three targets at
  `6fdcebda5`;
- completed clean `RELEASE=1` builds for `ESP32`, `ESP32C3` and `ESP32S3`;
  and
- confirmed each flashed image reported Espruino `2v29.524` and Git commit
  `6fdcebda5`.

Detailed evidence:

- [current-master baseline](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-19-esp32-current-master-ping-baseline.md)
- [corrected parser candidate](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-19-esp32-ping-ipv4-parser-candidate.md)

Callback delivery and ping-session lifecycle findings are being handled
separately.
