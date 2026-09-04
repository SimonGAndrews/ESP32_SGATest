# ESP32 BLE Central Control And API Anomalies

Date: 2026-07-20

Issue IDs: BLE-001, BLE-002, BLE-003

Status: BLE-002 mechanism identified and workaround proven; restoration-order
source fix remains untested; BLE-001 and BLE-003 remain open

## Conclusion

Both tested ESP32 Espruino lines complete the run-bound custom GATT transaction
in either role when the runner forces the existing `Serial1` console. The
earlier loss of USB-UART output was Espruino's intentional automatic console
migration followed by an apparent failure to restore the preferred wired
console, not a stalled GATT implementation.

The shared ESP32 GATT connection handler moves an unforced console to
`EV_BLUETOOTH` while the BLE UART service is enabled. Calling
`E.setConsole(E.getConsole(), {force:true})` before the connection retains the
wired console. Both board directions then return their complete transcript,
disconnect and clean up successfully.

`jsiGetPreferredConsoleDevice()` makes Bluetooth the final preference whenever
`jsble_has_peripheral_connection()` is true. In the ESP32 disconnect handler,
the preferred-device lookup occurs before `m_peripheral_conn_handle` is set to
`BLE_GATT_HANDLE_INVALID`. The lookup can therefore still prefer Bluetooth
while trying to leave Bluetooth. This ordering is the leading source-level
explanation for the console remaining inaccessible after disconnection, but a
focused before/after firmware test is still required before calling a patch
proven.

Two lower-severity shared anomalies were also observed: `NRF.getAddress()`
returns the placeholder `de:ad:de:ad:de:ad`, and peripheral connect/disconnect
event callbacks occur twice for one connection.

## Reproduction Matrix

| GATT central | GATT peripheral | Console policy | Full exchange | Peripheral event count |
|---|---|---|---|---|
| C3 IDF4 | classic legacy | automatic | over-air pass; wired output unavailable | two connect, two disconnect |
| classic legacy | C3 IDF4 | automatic | over-air pass; wired output unavailable | two connect, two disconnect |
| classic legacy | C3 IDF4 | `Serial1`, forced | full host/central/peer pass | two connect, two disconnect |
| C3 IDF4 | classic legacy | `Serial1`, forced | full host/central/peer pass | two connect, two disconnect |

The custom service uses `0xFFF0`. The central reads a challenge from `0xFFF1`,
writes an acknowledgement to `0xFFF2`, waits for that promise to resolve, then
writes a completion token to `0xFFF3`. Receipt of both writes and the remote
disconnect on the peripheral rules out a stalled first write promise. The
forced-console runs additionally returned all nine central assertions over
USB-UART.

## Source Explanation

The relevant shared code is
`targets/esp32/BLE/esp32_gatts_func.c`. Its connection handler contains this
policy:

```c
if (!jsiIsConsoleDeviceForced() && (bleStatus & BLE_NUS_INITED)) {
  jsiClearInputLine(false);
  jsiSetConsoleDevice(EV_BLUETOOTH, false);
}
```

On disconnection it attempts to restore `jsiGetPreferredConsoleDevice()`.
The public `E.setConsole()` contract likewise states that a console not marked
`force:true` may move as USB or Bluetooth connection state changes.

The relevant order is currently:

```c
jsiSetConsoleDevice(jsiGetPreferredConsoleDevice(), 0);
/* ... */
m_peripheral_conn_handle = BLE_GATT_HANDLE_INVALID;
```

Moving the handle invalidation before the preferred-console lookup is an
obvious candidate correction, but has not been implemented or regression
tested in this workstream.

The runner now records `E.getConsole()`, forces that same device for both
endpoints before enabling the connection, and restores `force:false` after
the radio is stopped.

## Address Evidence

| Board | `NRF.getAddress()` | Address reported by peer scan |
|---|---|---|
| C3 IDF4 | `de:ad:de:ad:de:ad` | `dc:da:0c:d1:c1:92 public` |
| classic legacy | `de:ad:de:ad:de:ad` | `08:b6:1f:70:14:ea public` |

Tests shall therefore correlate the generated advertised name and run payload,
using the scanner's observed address only as secondary evidence.

## Recovery

Before the console-migration cause was identified, a read-only `esptool` MAC
query using `--no-stub --after hard_reset` exercised each USB-UART auto-reset
circuit and restored the wired REPL. No flash write occurred. This is useful
V2 recovery evidence even though forcing the console prevents the condition
in normal BLE runners.

## Next Isolation Steps

1. build a focused unforced-console regression and test the disconnect-handler
   ordering candidate in the appropriate Espruino repository
2. isolate why one BLE connection produces two peripheral `connect` and two
   `disconnect` callbacks
3. trace the ESP32 implementation of `NRF.getAddress()` and its placeholder
   result
4. compare the remaining anomalies on classic `ESP32_IDF4`, then the
   C3/classic IDF 5.5.3 WIP builds
5. test the alternative policy of disabling the BLE UART service where a test
   does not require it

## V2 Test-Strategy Consequence

The BLE runner shall explicitly force its configured wired console before a
connection and restore automatic console selection afterward. Radio success
and wired-control liveness remain independent assertions. The C3 Supervisor is
now proven for the initial central and peripheral GATT roles, while independent
USB-UART reset and V2 reset/power recovery remain worthwhile safeguards.
