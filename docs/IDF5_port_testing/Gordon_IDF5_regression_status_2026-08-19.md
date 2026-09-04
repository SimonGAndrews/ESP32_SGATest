# ESP32 IDF5 Regression Status for Gordon

- Date: 19 August 2026
- Upstream repository: `https://github.com/espruino/Espruino`
- Upstream branch: `IDF5`
IDF5 build tested: `ESP32_IDF5`, Espruino `2v29.58`, commit
`25dc06c17f0d10290f3ce3aa572ba3245dfa2935`

The comparison build was upstream commit
`ec3a8230ef0b19f1e7de28d7d146cf353bef1eed`. Both commit references are from
Gordon's official repository. Names such as `candidate/gordon-...` are only
local labels in our validation checkout and are not used in this report.

## Overall Status

The current IDF5 build boots reliably, stays connected to the Espruino Web
IDE and is stable enough for functional testing on a classic ESP32.

A substantial part of Espruino is working. Digital I/O, I2C, SPI data
transfers, serial communications and BLE GATT have all completed useful
regression tests. The main outstanding problems are `digitalPulse`, analogue
input, PWM behaviour, OneWire and parts of Wi-Fi.

The most important improvement since yesterday is serial full duplex. On the
earlier `ec3a8230` build, simultaneous transmission in both directions lost
data consistently. On `25dc06c17`, the same test passes all 6 checks and
receives the complete 128-byte and 96-byte messages with the correct content.

## What Works

### Startup and console

- The firmware boots and opens normally in the Web IDE.
- Normal console input is stable.
- The earlier reboot on the first typed character was traced to mixed build
  files left from an ESP32-C3 build. It was not reproduced after a clean
  classic ESP32 rebuild and is not considered an IDF5 firmware fault.

### Digital I/O

- Digital output and input work.
- Edge watches and watch removal work.
- `shiftOut()` produces the correct clock and data sequence.

### I2C

- I2C register reads and writes work.
- An I2C device interrupt can be asserted, read and cleared correctly.
- Two devices on the same I2C bus can be addressed independently.

### SPI

- SPI transfers to an external ADC work.
- Low and high input levels are read correctly through the external ADC.
- A second SPI flash device did not return a valid identity, but the working
  ADC on the same SPI bus shows that basic SPI communication is operating.
  The flash device connection still needs checking separately.

### Serial/UART

The serial regression is strong:

- 18 serial test scripts completed.
- 17 scripts passed every check.
- 120 of 122 individual checks passed.
- polling, partial reads, `write`, `print`, `println`, baud-rate changes,
  parity/frame settings, listeners, buffering, piping, flush and repeated
  setup/teardown all worked.
- transfers of 32, 64, 65, 96, 128 and 200 bytes passed in both directions.
- simultaneous full-duplex transfer now passes 6/6 with complete 128-byte and
  96-byte messages.

The two failed checks are both the same API expectation: after
`Serial.unsetup()`, `Serial.isConnected()` now returns `false`, while the
existing test expected the older value `true`. Data transfer is unaffected.
This may simply be a sensible change in reported state, but the intended API
behaviour should be confirmed.

### Bluetooth LE

- BLE GATT works with the IDF5 ESP32 as a central and as a peripheral.
- In both directions it connected, discovered the service and
  characteristics, read a value, completed two ordered writes and
  disconnected cleanly.
- All 9 transaction checks passed in each direction.
- The serial console remained available during the BLE connections.

### Wi-Fi

With the IDF5 ESP32 acting as a station:

- network scanning worked;
- WPA2 association worked;
- DHCP supplied a valid address and gateway;
- a two-way UDP message exchange worked;
- connection and disconnection events were reported;
- cleanup returned Wi-Fi to an inactive state.

## Outstanding Problems

### `digitalPulse`

Ordinary digital writes and watches pass, but the test stops progressing after
calling `digitalPulse()`. It does not reach its result or completion message.

### Analogue input

`analogRead()` returns `NaN` for both low and high input levels. This is a
repeatable failure and prevents normal analogue measurements.

### PWM

The external ADC sees the requested low and high PWM levels, but the requested
midpoint also appears as full scale. This suggests that intermediate
`analogWrite()` output is not behaving as expected. The internal ADC fault is
separate and makes the simpler PWM feedback test unreadable.

### OneWire

OneWire reset reports no device and searches return no DS18B20 or DS2413
devices. The devices have power and the data line has its pull-up and sits
high when idle, so this currently looks like a firmware/timing issue rather
than an unpowered bus.

### Wi-Fi

- When IDF5 is the station, `Wifi.ping()` does not complete successfully even
  though UDP communication over the same connection works.
- When IDF5 provides the WPA2 access point, the ESP32-C3 peer can see the
  network but fails during the WPA2 handshake. The IDF5 access point does not
  report a completed station join.

### BLE advertising service data

Advertising and scanning find the correct named device, address and signal
strength, but the service UUID and payload are decoded incorrectly. The same
failure occurs when the newer IDF4 ESP32-C3 advertises or scans, so this is not
currently identified as an IDF5-only issue. It may be a shared recent core
change or a changed API expectation in the test.

### Duplicate BLE events

BLE peripherals report each connection and disconnection event twice. This
was also observed on older ESP32 firmware lines, so it is not new to this IDF5
candidate.

## Regression Scope Completed

The classic ESP32 testing currently covers:

- boot and Web IDE console operation;
- digital read/write, watches, `digitalPulse` and `shiftOut`;
- analogue input and PWM feedback;
- I2C register access, interrupts and multiple devices;
- SPI transfers and two external SPI devices;
- mixed DS18B20 and DS2413 OneWire discovery;
- a broad two-UART crosslink suite;
- BLE advertising, scanning and complete GATT transactions in both roles;
- Wi-Fi station and access-point roles with WPA2, DHCP, ping, UDP and cleanup.

## Important Gaps Still To Cover

- Repeat the failing classic ESP32 tests on a current standard non-IDF5 build.
  This will separate IDF5-port faults from Gordon's parallel core changes.
- Build, flash and run the shared regression on `ESP32C3_IDF5` hardware.
- Review ESP32-S3 build reproducibility. There is no completed S3 test harness,
  so hardware validation is not currently available.
- Add longer-duration stability tests after the main functional failures are
  understood.
- Test more BLE areas if required: security/bonding, notifications, MTU and
  connection parameters are not covered by the present GATT test.
- Test Wi-Fi against another station or access point to confirm which side of
  the WPA2 handshake is responsible.
- Confirm the intended `Serial.isConnected()` result after `unsetup()`.

## Present Assessment

`25dc06c17` is a clear improvement over yesterday's candidate, particularly
for UART and simultaneous full-duplex operation. curerent issues to investigae are ADC, PWM, `digitalPulse`, OneWire and Wi-Fi failures.

## Appendix: BLE Advertising Service-Data Observation

Using `NRF.setAdvertising()` with service UUID `0xFFF0` and this six-byte
payload:

```javascript
NRF.setAdvertising({
  0xFFF0 : [48,54,51,53,52,48]
}, {
  name : "SGA-BLE-TEST",
  showName : true
});
```

A second ESP32 can scan it with:

```javascript
NRF.findDevices(function(devices) {
  print(devices);
}, {
  timeout : 4000,
  active : true,
  filters : [{name:"SGA-BLE-TEST"}]
});
```

Expected service data:

```text
UUID: fff0
Data: [48,54,51,53,52,48]
```

Observed service data:

```text
UUID: 3630
Data: [51,53,52,48]
```

The first two payload bytes, `48` and `54` (`0x30`, `0x36`), appear to be
interpreted as the little-endian UUID `0x3630`. Only the remaining four bytes
are returned as data.

We reproduced this in both directions:

- `ESP32C3_IDF4` commit `b905c8099` advertising, with `ESP32_IDF5` commit
  `25dc06c17` scanning.
- `ESP32_IDF5` advertising, with `ESP32C3_IDF4` scanning.

Advertising, name filtering, address and RSSI all worked. Only the service
UUID/payload interpretation failed. Because it reproduced with either newer
build as advertiser or scanner, it may be shared core/API behaviour rather
than an IDF5-only problem.
