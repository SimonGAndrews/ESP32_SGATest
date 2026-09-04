# Classic ESP32: Current Master versus Corrected IDF5

- Date: 31 August 2026
For: Gordon Williams

> **Subsequent status, 4 September 2026:** This report records the pre-merge
> comparison supplied to Gordon as input to the IDF5 merge decision. The
> official IDF5 branch, including submitted corrections #2733 through #2738,
> was merged into Espruino master at `5d79af218`. The held OneWire proposal was
> not submitted. A same-source post-merge sanity run remains outstanding; the
> results below have not been rewritten.

## Objective

Compare the user-visible Espruino peripheral behaviour of the current classic
ESP32 master build with the corrected ESP-IDF 5 build, and identify defects
that would affect confidence in moving the classic ESP32 port to IDF5.

## What We Compared

Both firmware builds were compiled as the classic ESP32 port and exercised on
the same ESP32 DevKitC V4 board. The board was plugged into a fixed test fixture
which connects selected pins to each other and to known I2C, SPI and OneWire
devices. This lets an Espruino script drive one API and independently observe
the result through another API or external device.

| | Current ESP32 master | Corrected IDF5 |
|---|---|---|
| Espruino board | `ESP32` | `ESP32_IDF5` |
| Reported version | `2v29.277` | `2v29.75` |
| Source commit | `c5ff787b199148c31ef2776fb6f70673cba01a25` | `354fa95fb` |
| IDF line | legacy ESP-IDF 3.3.6 | ESP-IDF 5.5.3 |
| Build command | `make BOARD=ESP32 RELEASE=1` | `make BOARD=ESP32_IDF5 RELEASE=1` |

The corrected IDF5 source is based on the official `IDF5` branch at
`25f81a8e1`. That base already contains the merged Wi-Fi debug-build and I2C
configuration fixes. The validation branch adds the separately reviewable ADC,
PWM/DAC, GPIO routing, DAC release, OneWire timing and pin-cleanup corrections.

The same corrected source was also built and tested with `BOARD=ESP32`. This
compatibility build passed the main GPIO, ADC, PWM, DAC, I2C, SPI and flash
checks. It therefore provides evidence that the IDF5 source corrections do not
break the existing classic build configuration. Two legacy-source concerns
remain: OneWire retains the current master-style instability, and repeated UART
setup reached an old FreeRTOS queue assertion on iteration 9 of 10.

## Issues on the Current Master Build

1. **OneWire discovery and addressed reads are unreliable.** In 100 calls to
   `OneWire.search()`, all three fitted devices were returned only 50 times;
   29 searches returned no device. Repeated addressed DS18B20 reads also
   produced CRC failures. DS2413 commands worked once its address had been
   obtained, so the device and command path are usable but discovery is not
   dependable.

2. **`analogWrite(D25, 1)` does not produce DAC full scale.** The conversion to
   an 8-bit DAC value multiplies by 256, so the inclusive Espruino value `1`
   wraps to zero. The zero endpoint passed and the full-scale endpoint failed.

3. **The `digitalPulse()` output is correct, but completion can be reported
   late.** The connected input observed the requested `[1,0,1,0]` edge sequence
   and the output ended low. A later JavaScript result callback sometimes did
   not run within the original test window. This is a scheduler/event-delivery
   observation, not evidence that the physical pulse was wrong.

4. **A 200-byte UART receive is not completely delivered to JavaScript within
   the original short observation window.** The first 120 bytes were visible
   at 350 ms. Longer observation showed further data callbacks, so this should
   not be described as proven permanent loss of 80 bytes.

5. **UART cleanup reports an internal pin-state diagnostic.** Calling
   `Serial.unsetup()` prints `jshPinSetState: Unexpected state: 0`, although the
   completed data checks are not corrupted.

6. **Several Wi-Fi API anomalies predate IDF5.** `Wifi.setAPIP()` applies the
   requested AP address but reports `"Failure"`; `Wifi.setIP()` reports success
   but leaves the DHCP address unchanged; and a C3 station cannot ping the
   classic ESP32 AP even though bidirectional UDP succeeds.

7. **The plain BLE advertising/service-data test is not clean.** When master
   scans the C3 advertisement it finds the named peer but reports the service
   data under the wrong UUID/payload. In the reverse role the C3 does not find
   the plain master advertisement. Complete GATT transactions nevertheless
   pass in both directions.

## Issues on the Corrected IDF5 Build

1. **Addressed DS18B20 reads still suffer intermittent CRC corruption.** On the
   final `2v29.75` image, `OneWire.search()` reliably found both DS18B20s and the
   DS2413, and all DS2413 commands passed. However, the focused mixed-device run
   failed one of two DS18B20 CRC checks. In a 20-cycle read soak, 13 of 19
   captured cycles contained at least one bad scratchpad CRC; one additional
   cycle was missed by the host capture. The proposed OneWire critical-section
   change improves discovery but does not fully correct addressed reads on the
   classic ESP32, so that change is not ready for submission as a complete fix.

2. **Wi-Fi station scanning and AP authentication are regressed.** IDF5
   `Wifi.scan()` returned zero networks in three controlled runs while the C3
   AP was active. Direct `Wifi.connect()` can associate when the scan is
   skipped, which narrows this to the scan path. In the reverse role, the C3
   found the IDF5 WPA2 AP at strong signal but every association attempt ended
   in `4WAY_HANDSHAKE_TIMEOUT`. Current master passed association and UDP in
   both roles on the same bench.

3. **`Wifi.setIP()` changes the displayed address but leaves it unusable.**
   IDF5 obtained DHCP, changed from `192.168.4.2` to the requested
   `192.168.4.77`, and reported `"Failure"` through the callback. Neither ping
   nor the run-bound UDP exchange then worked. Master has a different existing
   defect: it reports success but leaves the DHCP address in use, with traffic
   still functional.

4. **UART event delivery can still be delayed in source based on the official
   IDF5 branch.** That branch predates current-master commit `a3f085979`, which
   fixes loss when more than 64 bytes arrive in one packet. In the compatibility
   build, all 200 bytes eventually arrived as four callbacks, but short tests
   could see only the early callbacks. The official IDF5 branch should be
   brought forward or reconciled with that master change before final UART
   acceptance.

No IDF5-only failure was found in the tested `pinMode()`, digital I/O, watch,
`shiftOut()`, ADC, PWM, DAC, I2C, SPI, external flash, ordinary UART or BLE
GATT paths after applying the corrective changes.

## Issues with IDF5 Not Present in Master

The confirmed IDF5-only functional regressions are empty `Wifi.scan()` results
and WPA2 AP authentication failure. Current master passes the corresponding
station and AP exchanges. IDF5 also differs in `Wifi.setIP()` behaviour: the
requested address is displayed but cannot carry the test traffic.

The official IDF5 source also lags the newer master UART receive change. The
observed OneWire CRC fault is not IDF5-only: current master is also unreliable
and is worse at device discovery. The exact failure distribution differs, so
the IDF5 OneWire result is still an open defect rather than a pass. BLE GATT
passes equivalently on both lines, and the plain advertising failures reproduce
on both lines.

The corrected IDF5 build also contains tested improvements over current
master:

- `analogWrite(D25, 1)` reaches the DAC high endpoint;
- a DAC pin can be returned to ordinary `digitalWrite()`/`digitalPulse()` use;
- `Serial.unsetup()` no longer emits the undefined pin-state diagnostic;
- `OneWire.search()` found the complete three-device bus on every repeated
  search, compared with 50/100 complete searches on master;
- the original short-window 200-byte UART test completed on IDF5, although
  longer tests show the master result should be described as delayed delivery
  rather than confirmed truncation.

## Conclusion

The corrected IDF5 build is comparable with current master in the wired
classic-ESP32 API scope. It passes the digital, analogue, I2C, SPI, flash and
UART functional checks and fixes several defects seen on master. BLE GATT also
passes fully in both central/peripheral directions. Building the same corrected
source as `BOARD=ESP32` provides useful compatibility confidence.

The overall IDF5 build is not yet ready to replace current master. The release
blockers found by this work are intermittent CRC corruption during addressed
DS18B20 reads and the two fundamental Wi-Fi failures: empty station scans and
WPA2 AP authentication timeouts. The OneWire timing patch should remain on
hold, and the Wi-Fi regressions require source investigation. The official
IDF5 branch should also be reconciled with the newer master UART receive fix
before final acceptance.

## Appendix One — Summary of Tests Executed

### Digital APIs

| Espruino APIs | Behaviour checked | Master | Corrected IDF5 |
|---|---|---:|---:|
| `pinMode()`, `digitalWrite()`, `digitalRead()` | Drive and read two connected output/input pairs low and high | Pass 4/4 | Pass 4/4 |
| `digitalPulse()`, `setWatch()` | Generate timed pulses and verify the connected input edge sequence and final level | Physical pulse passes; completion callback can be late | Pass |
| `setWatch()`, `clearWatch()` | Rising, falling and both-edge callbacks, then removal | Pass 4/4 | Pass 4/4 |
| `shiftOut()` | Send `0xa5` and observe its eight data/clock transitions | Pass 3/3 | Pass 3/3 |

### Analogue APIs

| Espruino APIs | Behaviour checked | Master | Corrected IDF5 |
|---|---|---:|---:|
| `analogRead()` | Read known low and high levels on `D34` | Pass 4/4 | Pass 4/4 |
| `analogWrite()`, `analogRead()` | Request 0.25, 0.5 and 0.75 PWM and confirm ordered analogue feedback | Pass 5/5 | Pass 5/5 |
| `analogWrite(D25, value)` | Check the classic ESP32 DAC at zero and full scale | Fail 1/2 | Pass 2/2 |
| `digitalWrite()`, `digitalPulse()` after DAC use | Return the DAC pin to normal GPIO operation | Not isolated | Pass |

### I2C APIs

| Espruino APIs | Behaviour checked | Master | Corrected IDF5 |
|---|---|---:|---:|
| `I2C1.setup()`, `writeTo()`, `readFrom()` | Read and write MCP23008 registers | Pass 6/6 | Pass 6/6 |
| I2C access plus `setWatch()`/`digitalRead()` | Assert, identify and clear an MCP23008 interrupt | Pass 5/5 | Pass 5/5 |
| `writeTo()`/`readFrom()` with two addresses | Communicate independently with devices at `0x20` and `0x21` | Pass 8/8 | Pass 8/8 |

### SPI APIs

| Espruino APIs | Behaviour checked | Master | Corrected IDF5 |
|---|---|---:|---:|
| `SPI1.setup()`, `SPI1.send()` | Read an MCP3008 external ADC at low, midpoint and high inputs | Pass 11/11 | Pass 11/11 |
| `SPI1.send()` with a separate chip select | Read a W25xxx flash identity and status on the shared SPI bus | Pass 9/9 | Pass 9/9; JEDEC `EF 40 17` |

### OneWire APIs

| Espruino APIs | Behaviour checked | Master | Corrected IDF5 |
|---|---|---:|---:|
| `new OneWire(D13)`, `reset()`, `search()` | Repeatedly discover two DS18B20s and one DS2413 | Complete set 50/100 | Complete set 100/100; final image 6/6 in formal run |
| `skip()`, `select()`, `write()`, `read()` | Start conversion and read both DS18B20 scratchpads with CRC validation | Unstable; 12/20 soak cycles failed | Unstable; 13/19 captured cycles had a CRC failure |
| DS2413 `select()`, `write()`, `read()` | Command release and both-low states and verify returned status | Pass when addressed | Pass 6/6 |

### Serial APIs

| Espruino APIs | Behaviour checked | Master | Corrected IDF5 |
|---|---|---:|---:|
| `Serial2.setup()`, `Serial3.setup()`, `write()`, `on("data")`, `read()`, `available()` | Transfer 32, 64, 65, 96, 128 and 200-byte patterns in both directions | Pass through 128; 200-byte callbacks delayed | Pass through 200 in the formal window |
| `write()`, `print()`, `println()` | Strings, arrays, typed arrays, numbers and line endings | Pass | Pass |
| `flush()` and event-listener methods | Complete queued output; attach, remove and reattach listeners | Pass | Pass |
| `inject()`, `pipe()` | Inject synthetic receive data and pipe a physical serial stream | Pass | Pass |
| repeated `setup()`/`unsetup()` | Alternate speed, frame shape and direction | Pass in master run | Data-path pass; lineage/compatibility concern noted above |
| simultaneous send/receive | Exchange independent 96- and 128-byte patterns and verify hashes | Pass with longer observation | Pass with longer observation |
| `isConnected()` | Before setup, after setup and after `unsetup()` | Legacy result differs | Correctly `false`, `true`, `false` |

### Wi-Fi and BLE APIs

| Espruino APIs | Behaviour checked | Master | Corrected IDF5 |
|---|---|---:|---:|
| `Wifi.scan()`, `connect()`, `getIP()`, `ping()` | Discover and join a controlled WPA2 peer, obtain DHCP, ping and exchange UDP | Pass 12/12 | Fail; scan returned zero networks in repeated runs |
| `Wifi.startAP()`, AP details/IP and peer events | Host a WPA2 AP and exchange run-bound UDP with the C3 station | Association and UDP pass; known directional ping failure | Fail; AP visible but WPA2 four-way handshake times out |
| wrong password and unavailable SSID | Reject incorrect credentials and bound an absent-network attempt | Pass | Wrong-password precondition fails because scan is empty |
| `Wifi.setAPIP()` | Apply a custom AP subnet and report callback result separately | Address works; callback incorrectly reports `"Failure"` | Address is reported, but clients cannot authenticate |
| `Wifi.setIP()` | Apply `192.168.4.77` after DHCP and prove traffic independently | Reports success but retains DHCP `.2`; traffic works | Reports `"Failure"`, shows `.77`, but ping/UDP fail |
| `NRF.setAdvertising()`, `NRF.findDevices()` | Advertise and discover a generated name plus service data in both directions | Shared plain-advertising failures | Same failures; no IDF5 regression established |
| `NRF.setServices()`, `requestDevice()` and GATT APIs | Connect in both directions, discover service/characteristics, read once and write twice | Pass both roles, 9/9 each | Pass both roles, 9/9 each |
| Wi-Fi/BLE cleanup | Remove active address/AP, disconnect BLE and stop advertising | Pass | Pass |

### Build Checks

| Build | Result |
|---|---|
| Current source, `BOARD=ESP32 RELEASE=1` | Built and full master comparison executed |
| Corrected source, `BOARD=ESP32 RELEASE=1` | Built; main wired compatibility checks pass |
| Corrected source, `BOARD=ESP32_IDF5 RELEASE=1` | Built; 28% application partition free; final image tested |
