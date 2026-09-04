# Classic ESP32 IDF5 Corrective Candidate Validation

Date: 31 August 2026

## Current Status

The final clean corrective image restores the tested classic ESP32 digital,
ADC, PWM, DAC, I2C, SPI, flash and UART APIs. It also makes OneWire device
discovery reliable, but does **not** fully fix addressed DS18B20 reads: repeated
reads still contain intermittent CRC corruption.

This record supersedes the earlier assessment that all OneWire checks passed.
That assessment combined a short successful sample with host-runner capture
misses and was not sustained by the final clean-image soak.

## Firmware Provenance

| Item | Value |
|---|---|
| Board | classic ESP32 DevKitC V4 on ESP32 V1 harness |
| Espruino board | `ESP32_IDF5` |
| Reported version | `2v29.75` |
| Candidate commit | `354fa95fb` |
| Base | `official/IDF5` at `25f81a8e1` |
| ESP-IDF | 5.5.3 |
| Control port | `/dev/ttyUSB0` |
| Build options | `BOARD=ESP32_IDF5 RELEASE=1` |
| Application SHA-256 | `f54f57163960c24e9fc827e4626a649bd1d372c0d8fcd8824e9579121576cde7` |
| Application size | `0x16a3b0`; 28% partition free |

The final image was built cleanly, flashed with a verified write hash and then
identified by the common runner as board `ESP32_IDF5`, version `2v29.75`, Git
commit `354fa95fb`.

## Functional Result

| Espruino API area | Result |
|---|---|
| `pinMode()`, `digitalWrite()`, `digitalRead()` | Pass 4/4 |
| `digitalPulse()`, `setWatch()`, `clearWatch()` | Pass |
| `shiftOut()` | Pass 3/3 |
| `analogRead()` | Pass 4/4 |
| PWM through `analogWrite()` | Pass 5/5 |
| DAC through `analogWrite(D25,0/1)` | Pass 2/2 |
| ordinary GPIO use after DAC | Pass, including pulse/watch feedback |
| `I2C1.setup()`, `writeTo()`, `readFrom()` | Pass for both MCP23008 devices and interrupt path |
| `SPI1.setup()`, `SPI1.send()` | Pass for MCP3008 and W25xxx flash |
| `OneWire.reset()`, `search()` | Pass for discovery; all three devices in 100/100 searches |
| addressed DS18B20 `select()`, `write()`, `read()` | Fail; intermittent scratchpad CRC corruption |
| addressed DS2413 commands/status | Pass 6/6 in final formal run |
| UART data paths and cleanup | Pass in focused IDF5 tests |

## Final OneWire Evidence

The final formal mixed-device test found both DS18B20s and the DS2413 in all
six searches and passed every DS2413 command/status check. It passed 20 of 21
assertions because one DS18B20 scratchpad failed CRC.

The following 20-cycle soak then produced:

- 19 captured firmware responses;
- 13 captured cycles with at least one invalid scratchpad CRC;
- 6 captured cycles with both scratchpads valid;
- 1 host capture miss, with the response appearing after classification.

The invalid data was not an absent device or implausible-length response. It
was a nine-byte, plausible-temperature scratchpad whose final CRC did not match.
The OneWire critical-section change is therefore a proven discovery improvement
but only a partial fix.

## Source Correction Status

The candidate contains independently reviewable corrections for:

- ADC path restoration;
- PWM and DAC path restoration;
- DAC enable and inclusive full-scale conversion;
- GPIO matrix output restoration;
- DAC channel disable and RTC mux release before returning the pin to GPIO;
- undefined pin-state cleanup;
- IDF5-only OneWire timing protection.

The Wi-Fi debug-build and I2C configuration changes are already present in the
official base after Gordon merged the first two pull requests.

The OneWire change was initially guarded using `ESP_IDF_VERSION_MAJOR`, but
that macro was not defined in `jswrap_onewire.c`. The final candidate uses
`defined(ESP32_IDF5)`, which makes the intended IDF5 scope explicit and leaves
the legacy `BOARD=ESP32` path unchanged.

## Assessment

The ADC, GPIO, analogue-output and cleanup corrections have clean build and
bench evidence and can be prepared as focused pull requests. The OneWire
change must remain on hold: it should not be described or submitted as a full
fix until addressed DS18B20 CRC reads are reliable.

See
[`2026-08-31-esp32-master-vs-idf5-regression.md`](2026-08-31-esp32-master-vs-idf5-regression.md)
for the paired current-master comparison.
