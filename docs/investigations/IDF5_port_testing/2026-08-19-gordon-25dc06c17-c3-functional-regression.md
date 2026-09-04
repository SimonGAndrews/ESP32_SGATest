# Gordon IDF5 `25dc06c17` ESP32-C3 Functional Regression

## Conclusion

The `ESP32C3_IDF5` build at `25dc06c17` is stable enough for controlled V1
testing. Digital I/O, watches, I2C, SPI transfers, DS18B20 OneWire, BLE GATT
and useful Wi-Fi data exchange work. Repeatable failures remain in
`digitalPulse`, `shiftOut`, internal ADC, PWM midpoint generation and Wi-Fi
ping.

Compared with classic ESP32 IDF5 at the same commit, C3 OneWire works and the
C3 WPA2 access point accepts the IDF4 peer. The ADC, PWM midpoint,
`digitalPulse`, BLE service-data and Wi-Fi ping failures are common to both
targets.

## Bench And Firmware

Date: 19 August 2026

| Role | Hardware | Board | Version | Commit | Control |
|---|---|---|---|---|---|
| target | ESP32-C3-DevKitC-02 V1 harness | `ESP32C3_IDF5` | `2v29.58` | `25dc06c17` | board USB-UART |
| radio peer | Olimex ESP32-C3-DevKit-Lipo Rev B | `ESP32C3_IDF4` | `2v29.274` | `b905c8099` | native USB Serial/JTAG |

The target serial number was `dcda0cd1-c190`; the peer serial number was
`a0764e79-90a0`. Both identities and both Wi-Fi/BLE capability checks passed
before radio testing.

The target was built with the official IDF5 source plus one local board
configuration change: `ESPR_USE_USB_SERIAL_JTAG` and `USB` were removed from
`boards/ESP32C3_IDF5.py` so the Espressif DevKit's board USB-UART connection
could provide the `Serial1` console. The firmware-source commit remains
`25dc06c17`, but this console configuration must be stated with the result.

## Wired Functional Results

| Test | Result | Observation |
|---|---:|---|
| GPIO read/write | pass 4/4 | Both physical loopbacks switch correctly. |
| GPIO watches | pass 4/4 | Both-state, rising and falling callbacks work. |
| `digitalPulse` | incomplete | Ordinary watched writes pass; execution stops after the pulse call. |
| `shiftOut` | incomplete | Stops after the test header, including an isolated run after power-cycle. |
| analogue levels | fail 0/4 | `analogRead(D0)` returns `NaN` at low and high levels. |
| PWM feedback through internal ADC | fail 0/5 | All readings are `NaN`. |
| onboard I2C registers/feedback | pass 6/6 | Register operations and feedback work. |
| onboard I2C interrupt | pass 5/5 | Assertion, capture and clear work. |
| external Grove I2C device | pass 8/8 | External device restores correctly and onboard state is unchanged. |
| MCP3008 SPI/PWM comparison | partial 4/11 | SPI works; external ADC reads low `3`, high `1021`, midpoint `1021`; internal ADC is `NaN`. |
| W25xxx SPI extension | partial 4/9 | Flash returns all `0xFF`; MCP3008 low was unusually `219` in this combined run. |
| two-DS18B20 OneWire, first run | pass 14/15 | Both sensors and valid temperatures; one of six searches was empty. |
| two-DS18B20 OneWire, repeat | pass 15/15 | Both sensors found in all six searches with valid CRC and temperatures. |

The shared SPI-flash test originally skipped C3 despite the accepted wiring
specification. Its target map was extended to use SPI1 on `D3/D5/D6`, ADC chip
select `D7`, flash chip select `D10` and PWM `D8`. The resulting all-`0xFF`
flash response matches the classic harness result and remains a peripheral or
connection investigation, not a proven general SPI failure.

## Bluetooth LE

Advertising and filtered discovery were run in both directions. Each scanner
found exactly the intended name, real device address and numeric RSSI. Both
runs failed only the service-data assertion: the first two payload bytes were
reported as the UUID and only the remaining four bytes were returned. This
repeats the classic/newer-build result and is not C3-IDF5-specific.

GATT passed in both directions:

- C3 IDF5 as peripheral and IDF4 as central: 9/9 client transaction checks,
  correlated writes, disconnect and cleanup passed.
- IDF4 as peripheral and C3 IDF5 as central: 9/9 client transaction checks,
  correlated writes, disconnect and cleanup passed on retry.

The first attempt with the IDF4 peripheral stopped before its ready marker.
It cleaned up successfully and did not reproduce on retry, so it is retained
as a transient observation. Both peripherals emitted duplicate connection and
disconnection events, matching earlier ESP32-family behaviour.

## Wi-Fi

With IDF4 as access point and C3 IDF5 as station, C3 IDF5 successfully scanned,
authenticated, obtained DHCP configuration, exchanged the run-correlated UDP
message, reported connection lifecycle events and cleaned up. Eleven of
twelve station checks passed. `Wifi.ping()` timed out.

With C3 IDF5 as access point and IDF4 as station, the IDF4 peer successfully
authenticated, obtained DHCP configuration and exchanged UDP data. Eleven of
twelve station checks passed; ping again timed out. The IDF5 access point
observed the station join and UDP challenge but did not report the station
leave before the runner summary, and its peer-to-station ping did not succeed.
Runtime cleanup passed on both boards.

This differs from classic ESP32 IDF5 at the same commit, where the IDF4 C3
station failed the WPA2 handshake against the classic IDF5 access point.

## Cross-Target Findings At `25dc06c17`

| Area | Classic ESP32 IDF5 | ESP32-C3 IDF5 |
|---|---|---|
| ordinary GPIO and watches | pass | pass |
| `digitalPulse` | incomplete | incomplete |
| `shiftOut` | pass | incomplete after cold start |
| internal ADC | `NaN` | `NaN` |
| PWM midpoint through external ADC | full scale | full scale |
| I2C | pass | pass |
| general SPI transfer | pass | pass |
| external SPI flash | all `0xFF` | all `0xFF` |
| OneWire | no bus/device detected | functional; one miss in twelve searches |
| BLE service data | wrong UUID/payload split | same |
| BLE GATT | pass both roles | pass both roles |
| Wi-Fi station data | pass except ping | pass except ping |
| WPA2 access point | peer authentication failed | peer authenticated and exchanged UDP |

## Remaining Gaps

- Run the C3 UART0/UART1 crosslink pack using native USB Serial/JTAG as the
  independent control console. The present UART-console build cannot test
  UART0 without taking over its own runner connection.
- Repeat the same C3 harness tests on current master `b905c8099`.
- Repeat classic OneWire after a cold start and with the same DS18B20-only
  device population used on C3.
- Compare both classic and C3 failures with their master builds before
  assigning them specifically to IDF5.
- Independently verify the external SPI-flash device and chip-select paths.
