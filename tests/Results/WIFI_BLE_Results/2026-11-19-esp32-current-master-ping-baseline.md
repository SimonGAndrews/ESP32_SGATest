# ESP32 Current-Master `Wifi.ping()` Baseline

Date: 2026-11-19

## Conclusion

Unmodified consolidated Espruino `master` rejects the valid IPv4 string
`127.0.0.1` before creating a ping session. The result reproduced identically
on physical classic ESP32, ESP32-C3 and ESP32-S3 targets: the call threw a
catchable exception and the supplied callback was not invoked.

This establishes IPv4-string conversion as the first narrow correction. Ping
session overlap, reset and repeated-session probes cannot exercise their
intended native lifecycle while every valid test address is rejected at the
API boundary.

## Source And Runtime Identity

| Item | Value |
|---|---|
| Espruino source branch | `fix/esp32-wifi-ping-minimal` before its first change |
| Exact baseline commit | `b70eda11e7d29528cf23e0ed165a197934821184` |
| Upstream relation | exact `upstream/master` at the time of testing |
| Espruino version | `2v29.523` |
| ESP-IDF | 5.5.3 |
| Build type | `RELEASE=1` |

| Physical target | Runtime board | Console |
|---|---|---|
| classic ESP32 | `ESP32` | `/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0` |
| Seeed Studio XIAO ESP32-C3 | `ESP32C3` | `/dev/serial/by-id/usb-Espressif_USB_JTAG_serial_debug_unit_9C:9E:6E:F7:41:64-if00` |
| ESP32-S3 | `ESP32S3` | `/dev/serial/by-id/usb-Espressif_USB_JTAG_serial_debug_unit_68:B6:B3:27:2C:40-if00` |

Each running image reported Git commit `b70eda11e`, matching the exact source
baseline. No credentials, access point or network peer were required.

## Build Coverage

Clean release builds completed for the three available board definitions:

```text
make BOARD=ESP32 clean
make BOARD=ESP32 RELEASE=1 -j2

make BOARD=ESP32C3 clean
make BOARD=ESP32C3 RELEASE=1 -j2

make BOARD=ESP32S3 clean
make BOARD=ESP32S3 RELEASE=1 -j2
```

The S3 compile was resumed from its already-clean Ninja tree after the host
terminated the first build process; the resumed build completed normally.

## Reproducer

The test used
[`esp32_wifi_ping_ipv4_parse.js`](../../../docs/investigations/wifi/repros/esp32_wifi_ping_ipv4_parse.js)
with SHA-256:

```text
a026feb75cca45a1a9f6d583d0bd89dd73a94bb8bd5cc2a90f83b935a3992e41
```

It calls `Wifi.ping("127.0.0.1", callback)`, records whether the call is
accepted, and waits for the normal five callbacks only when it is accepted.

## Physical Results

All three targets produced the same API result:

```text
EXCEPTION=Error: "127.0.0.1" not a valid IP address
RESULT=CALL_REJECTED
CALLBACK_COUNT=0
DONE=esp32_wifi_ping_ipv4_parse
```

| Board | Call accepted | Callback count | Result |
|---|---:|---:|---|
| `ESP32` | no | 0 | valid IPv4 string rejected |
| `ESP32C3` | no | 0 | valid IPv4 string rejected |
| `ESP32S3` | no | 0 | valid IPv4 string rejected |

## Source Finding

With `CONFIG_LWIP_IPV6` disabled, `stringToIP()` stored the result of
`networkParseIPv4Address()` but then fell through to `return false`. The caller
therefore reported every IPv4 string as invalid regardless of the parsed
value.

The next step is a narrow conversion correction followed by the same physical
probe on all three boards. Only after valid strings reach the native ping API
can the independent overlap and lifecycle baselines be characterised.
