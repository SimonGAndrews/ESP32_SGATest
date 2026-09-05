# ESP32 Post-IDF5-Merge Same-Source Sanity Comparison

Date: 5 September 2026

## Conclusion

The current `ESP32_IDF5` build is not uniformly better or worse than the
classic `ESP32` build. It has strong parity across the wired peripheral APIs,
materially better UART data delivery in the existing functional suite, and a
substantially better addressed DS18B20 sample. It still has clear Wi-Fi
regressions relative to the classic build, most importantly WPA2 access-point
authentication.

This result supports the IDF5 merge from a general peripheral perspective,
but it does not close the remaining Wi-Fi, OneWire, UART timing, BLE-event or
callback-contract defects. Those are now normal Espruino `master`
investigations rather than blockers to completing the historical branch
reconciliation.

Follow-up status: the UART regression recorded below has since been narrowed
to post-baseline target scheduling and driver-lifecycle changes. A guarded
local correction passes all 18 UART scripts on both `BOARD=ESP32` and
`BOARD=ESP32_IDF5`. The original comparison results below remain unchanged;
the follow-up investigation is recorded in
`docs/investigations/uart/esp32-post-idf5-merge-uart-regression-2026-09-05.md`.

## Objective

Sanity-check the merged ESP32 IDF5 implementation by compiling the classic
ESP32 port and the IDF5 ESP32 port from exactly the same current Espruino
`master` source, then exercising both images through the same V1 harness and
Espruino API tests.

## What Was Compared

Both images came from official-master commit
`e5341719a775dcb7d44a386c0a696d257fb783b9` and reported Espruino
`2v29.377`.

| Field | Classic build | IDF5 build |
|---|---|---|
| Board configuration | `ESP32` | `ESP32_IDF5` |
| Espruino source | `e5341719a` | `e5341719a` |
| ESP-IDF line | legacy IDF | 5.5.3 |
| Target hardware | same classic ESP32 DevKitC V4 | same classic ESP32 DevKitC V4 |
| Application size | 1,523,392 bytes | 1,498,064 bytes |
| Application SHA-256 | `3d780a4d6ba3569e104bfe2fa3726457dc26371661870251a707191db040f409` | `4ceba504dcfe7622f73c2687869b2146ce24832c6db40ca795c7bee5d833d6d7` |

The builds used the normal board-specific release procedure:

```bash
source scripts/provision.sh ESP32
make BOARD=ESP32 RELEASE=1

source scripts/provision.sh ESP32_IDF5
make BOARD=ESP32_IDF5 RELEASE=1
```

The common radio peer was `ESP32C3_IDF4`, Espruino `2v29.274`, commit
`b905c8099`. Each radio runner verified both target identities before testing.

## Overall Comparison

| Espruino API area | Classic `ESP32` | `ESP32_IDF5` | Assessment |
|---|---|---|---|
| `pinMode()`, `digitalRead()`, `digitalWrite()` | pass | pass | parity |
| `setWatch()`, `clearWatch()`, `digitalPulse()`, `shiftOut()` | pass | pass | parity |
| `analogRead()` and PWM `analogWrite()` | pass | pass | parity |
| DAC `analogWrite()` on `D25` and `D26`, followed by GPIO reuse | pass | pass | Gordon's metadata-based DAC selection and release are validated |
| MCP23008 I2C register and interrupt operations | pass | pass | parity |
| secondary MCP23008 on the same I2C bus | pass | pass | parity |
| MCP3008 SPI transfers | pass | pass | parity |
| external W25xxx SPI flash identification/status | pass | pass after an initial transient read | functional parity |
| `OneWire.search()`, two DS18B20s, 100 calls | 65 both, 10 one, 25 none | 78 both, 5 one, 17 none | both defective; IDF5 sample is better |
| addressed DS18B20 conversion/read, 20 runs | 9 pass, 11 fail | 19 pass, 1 fail | substantial sampled IDF5 improvement; not a complete fix |
| addressed DS2413 GPIO operations, 13 runs | 6 complete, 7 with command failure | 10 complete, 3 with command failure | IDF5 sample is better; discovery remains unstable |
| portable UART scripts | 2/18 complete passes | 16/18 complete passes | major IDF5 improvement in this suite |
| Wi-Fi as station | reliable scan, WPA2, DHCP, ping and UDP | association and UDP pass when scan succeeds; scan and ping are intermittent/failing | classic better |
| Wi-Fi as WPA2 AP | C3 associates and exchanges UDP | C3 sees AP but fails `4WAY_HANDSHAKE_TIMEOUT` | IDF5 regression |
| station `Wifi.setIP()` | callback success but requested address not applied | requested address applied and used for UDP, callback says `"Failure"` | IDF5 functionally improved, both violate the API contract |
| BLE plain advertising/service data | shared directional failures | same failures | no IDF5 regression established |
| BLE GATT in both roles | complete pass | complete pass | parity |

## Issues on the Classic Build

### OneWire remains unreliable

`OneWire.search()` intermittently returns two, one or no DS18B20 ROMs on an
unchanged bus. Once the two addresses were captured, 11 of 20 conversion/read
runs contained a corrupt scratchpad, an all-`FF` scratchpad or implausible
data. The DS2413 sample also had unstable discovery and 7 of 13 runs lost at
least one addressed command/response.

### UART delivery does not meet the existing functional-test windows

Only 2 of the 18 portable UART scripts completed without an assertion. Short
messages pass in the independent wiring runner, proving both physical paths.
The functional suite commonly saw a leading NUL after setup or
reconfiguration, and transfers longer than 64 bytes exposed only the first 64
bytes at the test checkpoint. This run does not prove that every later byte is
permanently lost; it proves that the classic build does not deliver the data
within the established API-test timing and lifecycle.

### Wi-Fi callback and directional-ping defects remain

- `Wifi.setIP()` reports success but leaves the DHCP address unchanged.
- `Wifi.setAPIP()` applies the requested AP address but calls back with
  `"Failure"`.
- The C3 station's `Wifi.ping()` to a classic ESP32 AP times out even though
  WPA2 association and bidirectional UDP succeed.

### BLE anomalies remain

Plain advertisement service data is not decoded as expected when the classic
board scans the C3, and the C3 does not find the matching plain classic
advertisement in the reverse direction. GATT works. Connect and disconnect
callbacks are each emitted twice during the successful GATT transactions.

## Issues on the IDF5 Build

### OneWire is improved but not fixed

The corrected addressed-read runner recorded one all-`FF` scratchpad in 20
runs. Search remained intermittent, and 3 of 13 DS2413 runs lost an addressed
command/response. These are real remaining defects even though both samples
are materially better than classic.

### Two UART lifecycle cases remain

Sixteen of 18 scripts pass, including one-way 128-byte and 200-byte transfers
in both directions. The remaining deterministic failures are:

- simultaneous full-duplex transfer, where one receive side is incomplete;
- repeated setup/reconfiguration, where alternating-direction traffic can
  acquire a leading NUL.

Delayed diagnostic probes succeed, which is consistent with UART-task wake
latency after setup. The shared ESP32 UART source now contains a 500 ms idle
delay; `Serial.setup()` does not appear to wake that task immediately.

### Wi-Fi is the main regression area

- Station scans can return zero networks on a fresh run even while the
  controlled C3 AP is active. A successful run proves that scan, WPA2, DHCP
  and UDP can work, so this is intermittent rather than total radio failure.
- `Wifi.ping()` from the IDF5 station to the C3 AP times out in the successful
  association case where classic ping succeeds.
- As a WPA2 AP, IDF5 is visible at strong signal but the C3 cannot associate;
  it reports reason 15, `4WAY_HANDSHAKE_TIMEOUT`. This occurs with both default
  and custom AP subnets.
- `Wifi.setIP()` now applies the requested `.77` address and UDP works from
  that address, but the callback incorrectly reports `"Failure"` and ping
  still times out.

### BLE behaviour matches classic

GATT passes in both central/peripheral role combinations. The plain
advertising and duplicate-event anomalies are shared with classic and are not
IDF5-specific regressions.

## Issues Present on IDF5 but Not on Classic

The confirmed IDF5-specific regressions in this comparison are:

1. WPA2 AP authentication: classic accepts the C3; IDF5 ends in
   `4WAY_HANDSHAKE_TIMEOUT`.
2. Station-scan reliability: classic consistently found the controlled AP in
   the valid radio cases; IDF5 also produced zero-network scans.
3. Station-to-peer ping: classic successfully pinged the C3 AP; IDF5 timed
   out despite successful DHCP and UDP.

IDF5's `Wifi.setIP()` callback failure is also absent on classic, but it
replaces a different classic defect: classic reports success without applying
the address. It should therefore be treated as differing defective behaviour,
not as loss of an otherwise-correct classic implementation.

## Test-Evidence Corrections

Three test-harness assumptions were corrected and are now persistent source
changes rather than manual interpretation:

- the formal `digitalPulse()` test observes completion at the proven 320 ms
  point and removes expired watch/timer identifiers from cleanup tracking;
- the Grove MCP23008 wiring check accepts the current `IODIR` register value
  rather than assuming a previous test left it at reset default;
- the DS18B20 addressed-read soak keeps REPL echo disabled, preventing an
  echoed command from being mistaken for its one-second-later result.

The authoritative OneWire figures above come from reruns after the third
correction. Four classic mixed-family attempts made before the DS2413 was
fitted and one C3 static-IP attempt with a corrupted REPL upload were excluded
from firmware results.

## Appendix 1: Summary of Tests Executed

| Espruino API or behaviour | Functional operation exercised |
|---|---|
| Digital GPIO | configure input/output modes, write and read low/high levels through two physical loopbacks |
| GPIO events | watch rising, falling and both edges; clear watches and prove callbacks stop |
| `digitalPulse()` | generate `[high, low, high, low]` pulse transitions and observe them through the connected input |
| `shiftOut()` | transmit a known eight-bit pattern with clock and data feedback |
| `analogRead()` | measure harness-driven low and high ADC levels |
| PWM `analogWrite()` | request multiple duty cycles and measure the filtered result |
| DAC `analogWrite()` | drive low and full scale from both `D25` and `D26`, measure the opposite ADC input and return both pins to GPIO use |
| I2C | read/write MCP23008 registers, observe its interrupt output, and address a second MCP23008 on the same bus |
| SPI | exchange MCP3008 commands and validate channel measurements |
| external SPI flash | read JEDEC identity `EF 40 17` and status register over the shared SPI bus |
| `OneWire.search()` | repeated discovery of two DS18B20 devices, then mixed discovery with a DS2413 |
| addressed DS18B20 | start conversion, select each ROM, read nine-byte scratchpads, validate Maxim CRC and plausible temperature |
| addressed DS2413 | release and pull low PIOA/PIOB, validate command confirmation/status and observe feedback on `D33`/`D26` |
| UART/Serial | setup/unsetup, connection state, listeners, buffering, injection, reads, writes, print forms, flush, option changes, repeated setup, full duplex and 32/64/65/96/128/200-byte transfers |
| Wi-Fi station | scan, WPA2 association, DHCP, ping, UDP exchange, events, invalid password, absent SSID, static address and cleanup |
| Wi-Fi AP | WPA2 AP creation, default/custom subnet, station join/leave, DHCP, ping, UDP and cleanup |
| BLE advertising | named advertising, filtered discovery, service-data correlation, RSSI/address and cleanup in both directions |
| BLE GATT | connect, discover service/characteristics, read challenge, perform two writes, disconnect and clean up in both directions |
