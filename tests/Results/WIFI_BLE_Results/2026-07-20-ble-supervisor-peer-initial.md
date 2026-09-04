# Initial BLE Supervisor Peer Proof

Date: 20 July 2026

## Conclusion

The two-board bench proves the BLE Supervisor Peer principle for controlled
advertising, filtered discovery and a run-correlated GATT exchange. Both
firmware builds can advertise and scan, and either board can complete the
peripheral side of a custom GATT service. Independent peer evidence proved
that both builds also completed the central-side read and two writes over the
air.

The C3 Supervisor approach passed both GATT roles after the runner explicitly
forced the existing `Serial1` console. Initial runs appeared to lose the
USB-UART REPL because Espruino intentionally moves an unforced console to
Bluetooth when a BLE connection is established and the BLE UART service is
enabled. A likely disconnect-ordering defect can then prevent the preferred
wired console being restored. Forcing the wired console is therefore a test
precondition and a proven workaround; the underlying GATT transaction itself
is sound and the behaviour is not C3-specific.

## Bench And Firmware Preconditions

- both V1 harnesses in `STANDALONE` mode
- both targets powered only through fully connected USB cables
- no external target power
- no `SUP_EVENT_OUT` / `SUP_EVENT_IN` connection
- no Web IDE, REPL or serial monitor attached during runner operation
- bench configuration: `tests/WIFI_BLE/standalone_bench_config.json`

| Position | Board | Build line | Version | Git commit | USB path suffix |
|---|---|---|---|---|---|
| `esp32_c3_v1` | `ESP32C3_IDF4` | `boards/ESP32C3_IDF4.py`, IDF 4.4.8 | `2v29.107` | `0af6e1568` | `usb-0:10.4:1.0-port0` |
| `esp32_v1` | `ESP32` | `boards/ESP32.py`, legacy IDF 3.1 | `2v29.97` | `d3d33f4aa` | `usb-0:10.3:1.0-port0` |

The capability survey found all required functions on both builds:
`NRF.setAdvertising`, `NRF.setServices`, `NRF.requestDevice`,
`NRF.findDevices`, `NRF.getAddress` and `NRF.disconnect`. The surveyed
cleanup and lifecycle functions were also present.

## Advertising And Filtered Discovery

Commands:

```bash
python3 tools/repl/run_ble_peer_test.py
python3 tools/repl/run_ble_peer_test.py --direction esp32-peer
```

| Run | Advertiser | Scanner | Observed address | RSSI | Result |
|---|---|---|---|---:|---|
| `20260720T210831Z` | C3 IDF4 | classic legacy | `dc:da:0c:d1:c1:92 public` | `-41 dBm` | pass |
| `20260720T210911Z` | classic legacy | C3 IDF4 | `08:b6:1f:70:14:ea public` | `-43 dBm` | pass |

Each run required:

1. exactly one advertisement matching the generated `SGA-BLE-*` name
2. a non-placeholder address observed over the air
3. numeric RSSI
4. the exact run payload under service UUID `0xFFF0`
5. inactive, disconnected BLE state on both boards after cleanup

All five target-side assertions and the host correlation passed in each
direction. The numeric UUID key in `NRF.setAdvertising()` is intentional and
matches the documented Espruino 16-bit service-data form.

## Custom GATT Transaction

Commands:

```bash
python3 tools/repl/run_ble_gatt_test.py
python3 tools/repl/run_ble_gatt_test.py --direction esp32-peer
```

The peripheral exposed service `0xFFF0` with:

| Characteristic | Operation | Run-bound value |
|---|---|---|
| `0xFFF1` | central reads | `Q<run suffix>` challenge |
| `0xFFF2` | central writes | `A<run suffix>` acknowledgement |
| `0xFFF3` | central writes after the first write promise resolves | `D<run suffix>` completion token |

The second write is significant: receipt of `D<run suffix>` proves that the
central progressed beyond the first `writeValue()` promise rather than merely
delivering a write before stalling.

| Run | GATT peripheral | GATT central | Wired-console policy | Result |
|---|---|---|---|---|---|
| `20260720T210409Z` | classic legacy | C3 IDF4 | automatic selection | over-air pass; USB transcript unavailable |
| `20260720T210530Z` | C3 IDF4 | classic legacy | automatic selection | over-air pass; USB transcript unavailable |
| `20260720T212002Z` | C3 IDF4 | classic legacy | `Serial1`, forced | full pass |
| `20260720T212034Z` | classic legacy | C3 IDF4 | `Serial1`, forced | full pass |

The two forced-console confirmation runs each returned nine passing central
checks, a matching peer transcript, disconnected final state on both boards
and `RUNNER_RESULT=PASS`. They prove service and characteristic discovery,
challenge validation, both ordered writes, disconnection and wired cleanup in
each board direction.

The shared ESP32 source explains the baseline observation. In
`targets/esp32/BLE/esp32_gatts_func.c`, the GATT connection handler calls
`jsiSetConsoleDevice(EV_BLUETOOTH, false)` when the BLE UART service is active
and the console is not forced. `E.setConsole()` documents that an unforced
console may move when USB or Bluetooth connection state changes. A BLE link
can invoke the local GATT-server handler even when that board initiated the
link as central.

`jsiGetPreferredConsoleDevice()` in `src/jsinteractive.c` gives Bluetooth
precedence while `jsble_has_peripheral_connection()` is true. The ESP32
disconnect handler asks for that preferred device before setting
`m_peripheral_conn_handle` invalid, so its first restoration decision can
select Bluetooth again. This ordering is the leading explanation for the
console remaining unavailable after the link ended; it requires a focused
firmware regression test before proposing a source change.

The peripheral also delivered each `NRF` `connect` and `disconnect` callback
twice on both firmware lines. This did not prevent the exchange but remains an
API event-semantics anomaly.

## API Coverage

| API | Functional coverage |
|---|---|
| `NRF.setAdvertising()` | unique name plus `0xFFF0` service data |
| `NRF.findDevices()` | active filtered scan and collated device observations |
| `NRF.getAddress()` | queried on both builds; returned the placeholder `de:ad:de:ad:de:ad` |
| `NRF.setServices()` | readable and writable custom characteristics |
| `NRF.requestDevice()` | active scan with exact generated-name filter |
| `device.gatt.connect()` | central connection in both board directions |
| `getPrimaryService()` | discovery of custom service `0xFFF0` |
| `getCharacteristic()` | discovery of read and write characteristics |
| `readValue()` | exact run challenge returned to the central |
| `writeValue()` | two ordered, exact writes independently observed by the peripheral |
| `gatt.disconnect()` | remote disconnect observed by the peripheral |
| `NRF.getSecurityStatus()` | advertising, connection and final cleanup checks on both boards |
| `NRF.sleep()` / `NRF.wake()` | per-run radio isolation and cleanup |
| `E.getConsole()` / `E.setConsole()` | retained `Serial1` as the test-control channel during BLE connections |

Security, bonding, passkeys, notifications, indications, MTU changes,
connection-parameter control, transmit power and malformed/negative GATT
cases remain untested.

## V2 Supervisor Consequences

The architecture's host-coordinated wireless peer pattern is practical in
both BLE roles. Run-specific names and payloads avoid relying on the defective
local address API, while independent peer evidence remains valuable even
though the wired-console observation now has a known prevention.

The following requirements or runner behaviours are supported by this test:

1. preserve independent host, target and Supervisor observations
2. query and explicitly force the configured wired console before enabling a
   BLE connection, then restore the normal policy during cleanup
3. give the Supervisor a persistent USB identity and an independent hardware
   reset/recovery path
4. treat control-channel liveness as a separate assertion from successful BLE
   traffic
5. retain peer-side run tokens, connection events, characteristic values and
   timestamps
6. allow the C3 Supervisor firmware to be replaced or upgraded independently
   of the target firmware

The C3 IDF4 build is now proven as advertiser, scanner, GATT peripheral and
GATT central for this initial transaction. This does not remove the need for
independent recovery: host-driven USB-UART DTR/RTS reset through `esptool`
recovered both baseline runs without reflashing and should be reported as an
available V2 host recovery mechanism alongside direct Supervisor reset and
power control.

No event wiring was required for these BLE API tests. The planned event
handshake remains useful only for correlating a wireless event with a physical
target action, sleep/wake transition or independent timestamp.

## Recovery And Scope Boundary

The two baseline runs were recovered through their USB-UART auto-reset
circuits using a read-only `esptool` MAC query followed by hard reset. Firmware
was not reflashed and persistent Espruino configuration was not changed.
Subsequent identity verification and all forced-console GATT runs passed.

These results evaluate the V2 service mechanism and current firmware
practicality. They do not prove V2 rack power control, event handshake wiring,
multi-position selection, RF performance limits or Bluetooth Classic.
