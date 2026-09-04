# Classic ESP32 Current Master versus IDF5 Wi-Fi and BLE Peer Regression

Date: 1 September 2026

## Conclusion

The corrected classic ESP32 IDF5 build has a clear Wi-Fi regression relative
to current classic master. As a station, `Wifi.scan()` repeatedly returned an
empty list while the controlled C3 access point was active. As a WPA2 access
point, IDF5 was visible to the C3 but every association attempt ended in a
four-way-handshake timeout. Current master completed association, DHCP, UDP,
events and cleanup in both radio roles on the same bench.

BLE GATT is not regressed. Both builds passed the complete custom GATT
transaction as central and peripheral. The simpler advertising/service-data
test failed in the same two ways on both builds, so that result is shared
behaviour or a current test-format assumption rather than an IDF5-only defect.

## Firmware and Bench Provenance

| Role | Board | Version | Commit | Control path |
|---|---|---|---|---|
| current-master comparator | `ESP32` | `2v29.277` | `c5ff787b1` | classic V1 board USB-UART |
| corrected IDF5 target | `ESP32_IDF5` | `2v29.75` | `354fa95fb` | classic V1 board USB-UART |
| common radio peer | `ESP32C3_IDF4` | `2v29.274` | `b905c8099` | native USB Serial/JTAG |

Both firmware lines used the same classic ESP32 board, C3 peer, USB positions,
test scripts and over-air roles. Each runner verified both identities before
starting, performed hardware reboots, and required independent target, peer
and host evidence. No other REPL tool owned either port.

Bench configurations:

- `tests/WIFI_BLE/idf5_validation_bench_config.json`;
- `tests/WIFI_BLE/master_validation_bench_config.json`.

## Wi-Fi Comparison

| Scenario | Current master | Corrected IDF5 | Interpretation |
|---|---|---|---|
| classic board as station; C3 controlled AP | Pass 12/12; scan, WPA2 association, DHCP, ping, UDP, events and cleanup | Fail twice; `Wifi.scan()` returned zero networks | IDF5 station scan regression |
| classic board as WPA2 AP; C3 station | Association, DHCP and UDP pass; known C3-to-classic `Wifi.ping()` timeout remains | C3 sees AP at strong signal but fails with `4WAY_HANDSHAKE_TIMEOUT` | IDF5 AP authentication regression |
| wrong-password negative case | Pass; controlled AP visible and rejection observed | Fail precondition; controlled AP absent from empty scan | Consequence of IDF5 scan regression |
| unavailable-SSID negative case | Pass | Nominal pass, but scan returned no networks at all | Not useful positive evidence for IDF5 scanning |
| C3 custom-subnet AP; classic station | Station completes scan, association, DHCP, ping and UDP | Fails because IDF5 scan returns zero networks | IDF5 station scan regression repeats |
| classic custom-subnet AP; C3 station | Association and UDP pass; shared `setAPIP()` callback and directional ping anomalies remain | WPA2 handshake timeout; no station join or UDP | IDF5 AP regression repeats |
| classic station calls `Wifi.setIP()` | Callback reports success but address remains DHCP `.2`; ping and UDP continue | Address changes to requested `.77`, callback reports `"Failure"`, then ping and UDP fail | Different IDF5 static-IP defect; requested address is visible but unusable |
| classic default-subnet AP; C3 static station | AP association and UDP pass; C3 retains DHCP address and directional ping fails | WPA2 handshake timeout before static-IP phase | IDF5 AP regression repeats without `Wifi.setAPIP()` |
| cleanup | Pass | Pass | no retained active AP or IP on either line |

### IDF5 station scan

The primary positive station case ran twice unchanged:

| Run ID | Peer state | IDF5 observation |
|---|---|---|
| `20260901T063629Z` | C3 reports WPA2 AP ready at `192.168.4.1` | `Wifi.scan()` count `0` |
| `20260901T063718Z` | C3 reports WPA2 AP ready at `192.168.4.1` | `Wifi.scan()` count `0` |

The custom-subnet case `20260901T064317Z` repeated the empty scan. Current
master run `20260901T064913Z` found ten networks including the exact generated
peer SSID, then passed all twelve station assertions.

The IDF5 static-address role does not call `Wifi.scan()` before connecting. In
run `20260901T064531Z`, direct `Wifi.connect()` succeeded and the C3 recorded
join and leave events. This proves that IDF5 station association is possible
and narrows the primary failure to scan/reporting rather than total station
radio failure.

### IDF5 access point

The C3 saw each IDF5 WPA2 AP with strong signal and the expected SSID, but the
connection failed with reason 15, `4WAY_HANDSHAKE_TIMEOUT`:

- peer-positive run `20260901T063803Z`;
- custom-subnet AP run `20260901T064413Z`;
- default-subnet AP run `20260901T064641Z`.

The last case deliberately skipped `Wifi.setAPIP()`, so the authentication
failure is not caused only by custom AP address configuration. Current master
completed association and UDP in the corresponding runs
`20260901T065000Z`, `20260901T065536Z` and `20260901T065727Z`.

### Shared and earlier Wi-Fi findings

Current master retains the previously recorded issues:

- `Wifi.setAPIP()` applies the requested address but its callback returns
  `"Failure"`;
- `Wifi.setIP()` reports success but leaves the DHCP address unchanged;
- C3-to-classic-AP `Wifi.ping()` times out while UDP works in both directions.

IDF5 changes the `Wifi.setIP()` symptom: it reports `"Failure"` and displays
the requested address, but the address cannot ping or exchange the UDP
challenge. This is not an improvement because the configured station is not
functional.

## BLE Comparison

| Scenario | Current master | Corrected IDF5 | Interpretation |
|---|---|---|---|
| C3 advertises; classic scans by name | Finds one peer but service-data UUID/payload check fails | Same failure | shared, not IDF5 regression |
| classic advertises; C3 scans by name | C3 finds no matching plain advertisement | Same failure | shared, not IDF5 regression |
| classic GATT central; C3 peripheral | Pass, 9/9 central checks and peer correlation | Pass, 9/9 and peer correlation | equivalent pass |
| classic GATT peripheral; C3 central | Pass, 9/9 central checks and peer correlation | Pass, 9/9 and peer correlation | equivalent pass |
| disconnect and radio cleanup | Pass | Pass | equivalent pass |

The successful GATT transaction covered:

- `NRF.setServices()` and named advertising;
- `NRF.requestDevice()`;
- `device.gatt.connect()`;
- primary-service and characteristic discovery;
- exact run-bound `readValue()`;
- two ordered `writeValue()` operations;
- disconnect and inactive final state.

The peripheral delivered duplicate `connect` and `disconnect` callbacks on
both firmware lines, preserving the earlier shared BLE event anomaly.

Plain advertising runs:

- IDF5: `20260901T063926Z`, `20260901T064007Z`;
- master: `20260901T065230Z`, `20260901T065303Z`.

GATT runs:

- IDF5: `20260901T064049Z`, `20260901T064125Z`;
- master: `20260901T065338Z`, `20260901T065408Z`.

## Acceptance Effect

Wi-Fi joins OneWire addressed-read reliability as a current IDF5 acceptance
blocker. The primary next source investigation should treat the empty station
scan and AP four-way-handshake timeout as separate defects because direct
station association works when scan is skipped.

BLE GATT has strong parity evidence and does not block the IDF5 port. The
plain advertising/service-data test remains open shared work, but should not
be attributed to the IDF5 migration without a corrected test or independent
advertisement decoder.
