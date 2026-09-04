# Classic ESP32 Current Master versus Corrected IDF5 Regression

- Date: 31 August 2026
- Wireless comparison added: 1 September 2026
- Target: ESP32 DevKitC V4 on the classic `ESP32_V1` harness
- Control port: `/dev/ttyUSB0`
Target MAC: `08:b6:1f:70:14:e8`

## Conclusion

The corrected IDF5 build is broadly comparable with current master across the
tested digital GPIO, ADC, PWM, I2C, SPI, external flash and UART APIs. It fixes
the master DAC full-scale error, releases DAC pins correctly for later GPIO
use, removes a UART cleanup diagnostic and makes OneWire discovery much more
reliable.

It is not ready to call defect-free. Addressed DS18B20 reads still have
intermittent CRC corruption. Paired wireless testing also found IDF5-only
Wi-Fi regressions: empty station scans and WPA2 AP handshake timeouts. BLE GATT
passes equivalently in both directions. The official IDF5 source is also behind
current master’s UART receive correction and should be reconciled before final
acceptance.

## Firmware Provenance

| Field | Current master | Corrected IDF5 |
|---|---|---|
| Board | `ESP32` | `ESP32_IDF5` |
| Version | `2v29.277` | `2v29.75` |
| Source commit | `c5ff787b199148c31ef2776fb6f70673cba01a25` | `354fa95fb` |
| Source base | `official/master` | `official/IDF5` at `25f81a8e1` |
| ESP-IDF | legacy 3.3.6 | 5.5.3 |
| Application SHA-256 | `a95c94a3e28e83f624bf7de171530f39e3875464b9dc3c70974bd984343ab847` | `f54f57163960c24e9fc827e4626a649bd1d372c0d8fcd8824e9579121576cde7` |
| Release build | pass | pass; `0x16a3b0`, 28% partition free |

The IDF5 application was flashed after a final clean build and identified
itself through the test runner as:

```text
RUNNER board=ESP32_IDF5
RUNNER version=2v29.75
RUNNER git_commit=354fa95fb
```

The corrected branch contains these commits above `25f81a8e1`:

```text
7162491eb ESP32 IDF5: restore analogue input
908338d2e ESP32 IDF5: restore PWM and DAC output
1a7c5a6ed ESP32: protect OneWire timing windows
c7cc1732d ESP32: support undefined pin state during cleanup
eac6b7f34 ESP32 IDF5: restore GPIO output after peripheral use
10225384b ESP32: initialise DAC output and preserve full scale
c37367718 ESP32: scope OneWire timing protection to IDF5
8269b422a ESP32: release DAC pins when returning to GPIO
354fa95fb ESP32 IDF5: apply OneWire timing guard in IDF5 build
```

The first scoping follow-up used `ESP_IDF_VERSION_MAJOR` in a source file that
did not include the version definition. The final commit uses the build’s
explicit `ESP32_IDF5` define, so the timing protection is active only for the
IDF5 board and remains inactive for the legacy `ESP32` build.

## Physical Preconditions

Baseline selector state, expressed using the V1 silkscreen:

- `SEL_D33`: centre to `LOOP_A`;
- `SEL_D26`: centre to `LOOP_B`;
- `SEL_D35`: centre to `I2C_INT`;
- `Enable_Uart_Loop2`: open.

The DS2413 and W25xxx flash module were fitted. UART tests temporarily moved
`SEL_D35` to `UART1` and fitted `Enable_Uart_Loop2`; the fixture was returned
to baseline afterward.

## Comparative Results

| Espruino API area | Current master | Corrected IDF5 | Assessment |
|---|---|---|---|
| `pinMode()`, `digitalWrite()`, `digitalRead()` | 4/4 | 4/4 | equivalent pass |
| `setWatch()`, `clearWatch()` | 4/4 | 4/4 | equivalent pass |
| `shiftOut()` | 3/3 | 3/3 | equivalent pass |
| `digitalPulse()` | physical `[1,0,1,0]`; later result callback can be delayed | pass | output correct on both; master reporting issue remains |
| `analogRead()` | 4/4 | 4/4 | equivalent pass |
| PWM `analogWrite()` | 5/5 | 5/5 | equivalent pass |
| DAC `analogWrite(D25,0/1)` | 1/2; full scale wraps low | 2/2 | IDF5 correction improves master |
| GPIO after DAC use | not isolated | pass | corrected IDF5 releases DAC and RTC mux |
| MCP23008 I2C registers | 6/6 | 6/6 | equivalent pass |
| MCP23008 interrupt | 5/5 | 5/5 | equivalent pass |
| two I2C addresses | 8/8 | 8/8 | equivalent pass |
| MCP3008 SPI ADC | 11/11 | 11/11 | equivalent pass |
| W25xxx SPI flash | 9/9 | 9/9, JEDEC `EF 40 17` | equivalent pass |
| `OneWire.search()` soak | full 3-device result 50/100 | full result 100/100 | substantial IDF5 improvement |
| addressed DS18B20 read | 12/20 soak cycles failed | 13/19 captured cycles had CRC failure | unresolved on both |
| addressed DS2413 commands | pass when discovered | 6/6 | IDF5 discovery makes use repeatable |
| UART through 128 bytes | pass | pass | equivalent pass |
| UART 200-byte short-window case | 120 bytes visible at 350 ms; further callbacks later | complete in formal window | IDF5 test improvement; master not proven to lose data permanently |
| `Serial.unsetup()` | internal unexpected-state diagnostic | clean | IDF5 correction improves master |
| `Serial.isConnected()` lifecycle | legacy behaviour differs | `false`, `true`, `false` | IDF5 matches initialised-state meaning |
| Wi-Fi station scan/association | scan, WPA2, DHCP, ping and UDP pass | repeated `Wifi.scan()` count 0; direct connection works only when scan is skipped | IDF5 regression |
| Wi-Fi WPA2 AP | association and UDP pass; known directional ping anomaly | AP visible, but C3 gets `4WAY_HANDSHAKE_TIMEOUT` | IDF5 regression |
| `Wifi.setIP()` | reports success but leaves DHCP `.2`; traffic works | reports `"Failure"`, shows requested `.77`; traffic fails | both defective; IDF5 symptom differs |
| BLE plain advertising/service data | shared directional failures | same failures | no IDF5 regression established |
| BLE GATT central and peripheral | pass 9/9 in both roles | pass 9/9 in both roles | equivalent pass |

## Current Master Findings

### OneWire

One hundred `OneWire.search()` calls produced:

- all three devices: 50;
- exactly two: 3;
- one: 18;
- none: 29.

The DS18B20 read soak reported 12 failed cycles out of 20. DS2413 addressed
commands and feedback could pass once the ROM had been found. This separates a
real firmware timing/reliability problem from absent or miswired devices.

### DAC

The existing DAC conversion multiplies the inclusive `0..1` value by 256 and
casts to `uint8_t`. `analogWrite(D25,1)` therefore becomes zero. The corrected
implementation scales to `0..255`.

### Digital pulse and UART callbacks

The connected input observed the requested `digitalPulse()` edge pattern, but
the later test-completion callback could fall outside the original observation
window. Similarly, the 200-byte UART test saw only 120 bytes at 350 ms but
longer observation showed later callbacks. These are event-delivery timing
findings and should not be presented as incorrect pulse edges or proven
permanent UART truncation.

## Corrected IDF5 Findings

### Restored peripheral APIs

The final build passed:

- `analogRead()` at known low and high levels;
- PWM `analogWrite()` at quarter, half and three-quarter requests;
- DAC zero and full-scale output;
- reuse of the DAC pin by `digitalWrite()` and `digitalPulse()`;
- both MCP23008 I2C devices and the interrupt path;
- MCP3008 SPI conversion and shared-bus W25xxx identity/status reads;
- UART transfer, listener, polling, injection, piping and cleanup checks.

The DAC reuse fix disables the DAC channel and calls `rtc_gpio_deinit()` before
normal GPIO configuration. Disabling the DAC alone did not release the RTC mux
and did not restore the connected GPIO test.

### Residual OneWire defect

The final formal mixed-device run found the same three ROMs in all six searches:

```text
2838498700e8136b
28253387008562df
3a27d15e000000f2
```

It passed 20 of 21 checks. Both DS18B20 scratchpads were nine bytes long and
contained plausible temperatures, but one failed CRC:

```text
7b0100007fe13caacb
```

All three DS2413 command confirmations and returned states passed. A subsequent
20-cycle addressed DS18B20 soak reported:

- 13 captured cycles with one or more CRC failures;
- 6 captured cycles with both scratchpads valid;
- 1 host capture miss, whose firmware output appeared after the runner had
  already classified the response.

This establishes that the critical-section patch fixes discovery but not the
full addressed-read defect on this classic ESP32/IDF5 combination.

### UART lineage

The official IDF5 base does not contain current-master commit `a3f085979`,
which fixes data loss when more than 64 bytes appears in one packet. A legacy
`BOARD=ESP32` build from the corrected IDF5 source eventually delivered all
200 bytes as four callbacks, while a short observation could see only the
first callbacks. Final acceptance should repeat UART after the official IDF5
branch is reconciled with current master.

### Wi-Fi regressions

Paired two-board testing used the same `ESP32C3_IDF4` peer at `b905c8099` for
both firmware lines. Each runner verified identities, rebooted both chips and
required independent target and peer evidence.

As a station, IDF5 returned zero networks from `Wifi.scan()` in two unchanged
primary runs and again against a custom-subnet C3 AP. Current master found the
generated SSID and passed all twelve station checks. A separate IDF5 role that
calls `Wifi.connect()` without scanning associated successfully, proving that
the station radio is not completely non-functional.

As an AP, IDF5 was visible to the C3 at strong signal, but three association
attempts ended with `4WAY_HANDSHAKE_TIMEOUT`. This reproduced on default and
custom AP subnets, so it is not solely a `Wifi.setAPIP()` consequence. Current
master completed association and run-bound UDP in the matching AP cases.

IDF5 `Wifi.setIP()` reported `"Failure"` and displayed the requested
`192.168.4.77`, but neither ping nor UDP then worked. Master retained its known
different defect: it reported success without changing the DHCP address, and
traffic continued over `.2`.

Detailed run IDs and API observations are recorded in
[`WIFI_BLE_Results/2026-09-01-esp32-master-vs-idf5-peer-regression.md`](WIFI_BLE_Results/2026-09-01-esp32-master-vs-idf5-peer-regression.md).

### BLE parity

Both builds passed a full custom GATT transaction as central and peripheral:
named device selection, connection, service and characteristic discovery, an
exact read, two ordered writes, disconnect and cleanup. Each central role
passed 9/9 checks with matching peer evidence.

The simpler advertising/service-data test failed identically on both lines:
the classic scanner misreported the C3 service data, and the C3 did not find
the plain classic advertisement in the reverse role. These failures are shared
behaviour or a test-format issue and are not evidence of an IDF5 regression.

## Legacy Build Compatibility Check

The corrected IDF5 source was also compiled using the existing classic build
procedure:

```bash
source scripts/provision.sh ESP32
make BOARD=ESP32 RELEASE=1
```

That image passed the focused GPIO, ADC, PWM, DAC, I2C, SPI, flash and UART
cleanup checks. OneWire retained the expected legacy/master instability because
the new critical section is now explicitly limited to `ESP32_IDF5`.

Repeated UART `setup()`/`unsetup()` reached an IDF3 FreeRTOS queue assertion on
iteration 9. Because this source base is behind current master’s UART changes,
it is retained as a compatibility/source-lineage concern rather than attributed
to the ADC, GPIO or analogue corrections.

## Pull-Request Status

- Wi-Fi debug-build correction: merged upstream.
- I2C configuration initialisation: merged upstream.
- ADC restoration: validated; pull request raised.
- GPIO matrix restoration: validated; pull request raised.
- PWM/DAC restoration: validated, now including DAC teardown and RTC mux
  release; pull request raised.
- undefined pin-state cleanup: validated; pull request raised.
- OneWire timing protection: **hold**. Discovery improves, but addressed
  DS18B20 CRC corruption remains.
- Wi-Fi scan and WPA2 AP authentication: **open IDF5 blockers**; source
  investigation required before an additional pull request.
- BLE GATT: equivalent pass; plain advertising failure is shared and remains a
  separate test/source investigation.

## Acceptance Position

The corrected IDF5 build has higher wired-peripheral confidence than the
uncorrected branch, and the proven correction pull requests are now raised.
It is not yet a replacement for current master because OneWire addressed reads
remain unreliable and fundamental Wi-Fi station-scan/AP-authentication paths
regress. Keep OneWire out of the ready queue, investigate both Wi-Fi failures,
and reconcile the IDF5 source with the newer UART master change before the
final replacement decision. BLE GATT is accepted as equivalent in this scope.
