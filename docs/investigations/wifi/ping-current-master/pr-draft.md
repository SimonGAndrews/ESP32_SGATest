# Draft PR: ESP32 restore IPv4 string parsing

Status: implementation and qualification complete; issue number pending.

## Summary

ESP32 `Wifi.ping()` currently rejects every IPv4 string when lwIP IPv6
support is disabled because `stringToIP()` always returns `false`. Use lwIP's
IPv4 parser and return its validation result so valid addresses reach the ping
API while malformed input remains rejected.

Fixes `#TBD`.

## Change

- set the `ip_addr_t` type to `IPADDR_TYPE_V4` in the non-IPv6 path; and
- return `ip4addr_aton()`'s success or failure result from `stringToIP()`.

No ping-session, callback-delivery or reset lifecycle code is changed.

## Observable Behaviour

- before: `Wifi.ping("127.0.0.1")` throws `not a valid IP address`;
- after: the valid loopback address is accepted on ESP32, ESP32-C3 and
  ESP32-S3; and
- malformed input such as `not-an-ip` continues to throw a catchable
  exception.

## Validation

- reproduced the unmodified failure on all three physical targets at
  `b70eda11e`;
- passed a callback-free valid/invalid parser probe on all three targets at
  `6fdcebda5`;
- completed clean `RELEASE=1` builds for `ESP32`, `ESP32C3` and `ESP32S3`;
  and
- confirmed each flashed image reported Espruino `2v29.524` and Git commit
  `6fdcebda5`.

Detailed evidence:

- [current-master baseline](../../../../tests/Results/WIFI_BLE_Results/2026-11-19-esp32-current-master-ping-baseline.md)
- [corrected parser candidate](../../../../tests/Results/WIFI_BLE_Results/2026-11-19-esp32-ping-ipv4-parser-candidate.md)

## Follow-up Findings

Once valid addresses reached ESP-IDF, the broader callback probe exposed
independent result-delivery failures: the C3 accepted the call but delivered no
callbacks within the test interval, while the S3 reached the existing native
callback path and then panicked. Those findings are not altered or claimed as
fixed by this parser-only PR and will be handled separately.

## Historical Context

This is a fresh two-line correction based on consolidated Espruino `master`.
The larger implementation in closed PR
[#2781](https://github.com/espruino/Espruino/pull/2781) is retained as
investigation history and is not the source of this PR.
