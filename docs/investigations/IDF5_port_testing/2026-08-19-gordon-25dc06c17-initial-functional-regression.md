# Gordon IDF5 `25dc06c17` Initial Functional Regression

## Conclusion

Gordon's `ESP32_IDF5` candidate at `25dc06c17` is stable enough for controlled
V1 functional testing and passes basic GPIO, watches, `shiftOut`, I2C, Grove
I2C, the UART data-path suite and BLE GATT in both radio roles. It still has
material failures in `digitalPulse`, internal ADC, PWM midpoint generation,
OneWire and parts of Wi-Fi operation.

The earlier reboot on first console input was not reproduced after a clean
board-specific rebuild. That reboot was caused by stale ESP32-C3 generated
inputs in a classic ESP32 build directory, not by the candidate source alone.

## Bench And Firmware

Date: 19 August 2026

| Role | Hardware | Board | Version | Commit | Control path |
|---|---|---|---|---|---|
| target | classic ESP32 V1 harness | `ESP32_IDF5` | `2v29.58` | `25dc06c17` | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.3:1.0-port0` |
| radio peer | Olimex ESP32-C3-DevKit-Lipo Rev B | `ESP32C3_IDF4` | `2v29.274` | `b905c8099` | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.4:1.0` |

The radio bench identity and capability verifier passed for both devices.
The retained configuration is
`tests/WIFI_BLE/classic_idf5_25dc06c17_bench_config.json`.

Classic ESP32 baseline selector state reported by the shared tests:

```text
SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
```

## Observations

### Wired V1 Harness Regression

| Test | Result | Important observation |
|---|---:|---|
| GPIO read/write | pass 4/4 | Both physical loopbacks switch correctly. |
| GPIO watches | pass 4/4 | Both-state, rising and falling callbacks work and clear correctly. |
| `shiftOut` | pass 3/3 | Eight clock edges and exact `10100101` data observed. |
| `digitalPulse` | incomplete/fail | Ordinary watched writes pass, but the test does not reach its final result after `digitalPulse`. |
| analogue levels | fail 0/4 | `analogRead(D34)` returns `NaN` at low and high stimulus. |
| PWM feedback | fail 0/5 | All internal ADC observations are `NaN`; this test alone cannot separate PWM from ADC. |
| onboard MCP23008 registers | pass 6/6 | I2C register read/write and physical feedback work. |
| onboard MCP23008 interrupt | pass 5/5 | `D35` interrupt assertion, capture and clear work. |
| external Grove MCP23008 | pass 8/8 | Address `0x21` works and the onboard device remains unchanged. |
| MCP3008 SPI | partial 4/11 | SPI replies and low/high span work; midpoint reads full scale (`1022`), while internal ADC remains `NaN`. |
| W25xxx SPI extension | partial 6/9 | Shared SPI/MCP3008 checks pass, but flash JEDEC data remains `ff ff ff`. |
| mixed DS18B20/DS2413 OneWire | fail 1/7 | `OneWire.reset()` is false and all searches are empty on the powered, pulled-up `D13` bus. |
| UART crosslink pack | 17/18 scripts fully pass | 120/122 assertions pass; the two failures are the old `isConnected()` expectation after `unsetup()`. |

The external MCP3008 result provides evidence separate from the broken
internal ADC: requested low produces `0`, while both requested midpoint and
high produce about `1022`. This is consistent with a PWM midpoint problem as
well as the independent ADC failure.

### BLE

Custom GATT passed in both directions:

- IDF5 central with C3 peripheral: 9/9 client checks, correlated peer writes,
  disconnect and cleanup passed.
- IDF5 peripheral with C3 central: 9/9 client checks, correlated peer writes,
  disconnect and cleanup passed.
- the wired console remained usable throughout both connections.

Both peripheral implementations emitted duplicate `connect` and `disconnect`
callbacks. This repeats the behaviour recorded on earlier ESP32 lines and is
not presently isolated to IDF5.

Advertising and filtered discovery found the correct named peer, real address
and RSSI in both directions, but the service-data assertion failed in both
directions. A requested `0xFFF0` six-byte payload was observed under a UUID
derived from its first two bytes (`0x3630` in these runs), with only the last
four bytes retained. Because the same result occurred with the newer IDF4 C3
as scanner and with either firmware as advertiser, this is a shared newer-core
or test/API-encoding issue rather than an IDF5-only result.

### Wi-Fi

With the C3 as access point and IDF5 as station, IDF5 successfully:

- scanned the generated WPA2 network
- associated and obtained `192.168.4.2` by DHCP
- reported the correct gateway
- exchanged the exact run-correlated UDP challenge and response
- reported association, connection and disconnection events
- returned to inactive state during cleanup

`Wifi.ping("192.168.4.1")` did not call back successfully before the runner
timeout, so the direction was a partial failure despite the working UDP path.

With IDF5 as access point and the C3 as station, the C3 saw the WPA2 network
but failed with `4WAY_HANDSHAKE_TIMEOUT`. The IDF5 access point recorded no
station join and no UDP traffic. Runtime cleanup passed on both devices.

### UART

The full 18-script UART crosslink pack ran with:

```text
SEL_D35=UART JP_UART_LOOP2=closed SEL_D33=1-2 SEL_D26=1-2
```

Seventeen scripts passed every assertion. Coverage included polling and
partial reads, write/print shapes, baud and frame reconfiguration, simultaneous
full duplex, flush, listener lifecycle and ordering, injection, piping,
mismatched-baud recovery, repeated setup/unsetup, and burst transfers in both
directions.

The pack produced 120 passing checks and two failures. Both failures came from
`uart_is_connected.js`: after `Serial.unsetup()`, this build returns `false` in
both directions while the retained test expects the older value `true`.
Setup returns `true` as expected. This is an API expectation/semantics change,
not a data-transfer failure.

The most important commit-to-commit result is that
`uart_full_duplex_crosslink.js` now passes all six checks. The earlier
`ec3a8230` candidate deterministically lost data during simultaneous traffic;
`25dc06c17` receives the complete 128- and 96-byte payloads with exact hashes.
Clean-start 128- and 200-byte bursts also pass with exact length and hash in
both directions. This verifies that Gordon's intervening serial changes fixed
the observed full-duplex regression.

## Verified Conclusions

1. The clean `25dc06c17` build no longer crashes on console input and is a
   usable test candidate.
2. GPIO pin generation and ordinary digital I/O are correct in this build.
3. I2C and BLE GATT provide substantial working-subsystem evidence; the port
   is not failing globally.
4. ADC, `digitalPulse` and OneWire failures reproduce after Gordon's latest
   changes and need firmware investigation or comparator runs.
5. The external ADC distinguishes a likely PWM midpoint problem from the
   internal ADC `NaN` problem.
6. IDF5 Wi-Fi station data traffic works, but ping does not; IDF5 WPA2 access
   point operation did not authenticate the established C3 peer.
7. The BLE service-data failure follows the newer firmware pair rather than
   one IDF5 radio role, so it must not be reported as an IDF5-only defect.
8. UART data transfer is now strong across the retained suite, including the
   full-duplex case that failed on `ec3a8230`; only the post-`unsetup()`
   `isConnected()` expectation needs review.

## Open Work And Attribution Questions

- Repeat the failing API tests on the current standard classic ESP32 build to
  distinguish IDF5-port defects from Gordon's parallel core changes.
- Compare advertising service-data encoding with the July passing commits to
  identify the core/API change.
- Determine whether the IDF5 WPA2 AP handshake failure is repeatable with a
  second station implementation.
- Keep the W25xxx all-`0xFF` result separate from general SPI status until its
  chip-select and device path are independently verified.
