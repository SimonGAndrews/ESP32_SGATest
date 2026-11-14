# ESP32 IDF5 Backend Consolidation POC: Runtime Test Evidence

## Stage 1 result

Stage 1 bench preparation completed on 13 November 2026. The three USB serial
positions resolved to unique devices and were independently confirmed by chip
type and factory MAC address. The classic ESP32 and ESP32-C3 V1 harnesses both
passed their baseline GPIO loopback checks using the firmware already fitted.

Those GPIO results establish the initial physical wiring gate only. The
classic ESP32 and ESP32-C3 were not yet running the consolidation POC firmware
and their current firmware may be discarded. The ESP32-S3 was already running
the POC image.

## Confirmed physical preparation

The operator confirmed:

- the classic ESP32 harness is set as specified by Section 4.1 of the runtime
  test plan;
- the ESP32-C3 harness is set as specified by Section 5.1;
- both V1 harnesses have been inspected for loose links, unexpected external
  connections and removable peripherals;
- the C3 native USB Serial/JTAG connector and its selectable VBUS or external
  power arrangement are available for the later UART test; and
- external power links are open for the present baseline modes.

The starting selector states are therefore:

| Harness | Recorded starting mode |
|---|---|
| Classic ESP32 V1 | `SEL_D33=1-2`, `SEL_D26=1-2`, `SEL_D35=I2C_INT`, `JP_UART_LOOP2=open`, external power links open |
| ESP32-C3 V1 | `SEL_D1=a2-b2`, `SEL_D2=a2-b2`, `SEL_D3=a2-b2`, `SEL_D4=a2-b2`; `SEL_D0`, `SEL_D08`, `SEL_D10` and both `J10` signal positions open; external power links open |

## USB path and hardware identity verification

The following stable paths resolved to three different devices:

| Position | Stable path | Resolved device |
|---|---|---|
| ESP32-S3 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.1:1.0-port0` | `/dev/ttyUSB0` |
| ESP32-C3 V1 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.2:1.0-port0` | `/dev/ttyUSB1` |
| Classic ESP32 V1 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.3:1.0-port0` | `/dev/ttyUSB2` |

`esptool.py v4.7.0` was used to read the chip identity and factory MAC without
reading or writing application flash:

| Position | Detected hardware | Revision | Factory MAC | Result |
|---|---|---|---|---|
| ESP32-S3 | ESP32-S3 QFN56, Wi-Fi, BLE, 8 MB embedded PSRAM | v0.1 | `68:b6:b3:27:2c:40` | Pass |
| ESP32-C3 V1 | ESP32-C3 QFN32, Wi-Fi and BLE | v0.4 | `dc:da:0c:d1:c1:90` | Pass |
| Classic ESP32 V1 | ESP32-D0WD-V3, Wi-Fi and Bluetooth | v3.1 | `08:b6:1f:70:14:e8` | Pass |

The installed system esptool package did not contain its S3 and classic ESP32
flasher-stub JSON files. Those two probes were repeated with `--no-stub`; both
then completed normally and hard-reset their target back to its application.
This packaging limitation did not prevent ROM identity verification and did
not alter flash.

## Pre-flash wiring gate

The existing firmware was used only to establish that the confirmed baseline
selector states provide the expected physical loopbacks.

### Classic ESP32 V1

Command:

```bash
python3 tools/wiring_tests/esp32_v1/gpio_block1.py \
  --port /dev/serial/by-path/pci-0000:00:14.0-usb-0:2.3:1.0-port0
```

Results:

- `D32 -> D33` low and high: pass;
- `D25 -> D26` low and high: pass;
- `D32 -> D33` edge watch: pass, observed `[1,0,1]`; and
- `D25 -> D26` pulse/watch: pass, observed `[1,0,1,0]`.

The runner reported `All Block 1 GPIO checks passed`. Its older metadata query
printed an unevaluated expression on the installed firmware, so identity was
collected separately with the current common runner.

### ESP32-C3 V1

Command:

```bash
python3 tools/wiring_tests/esp32_c3/gpio_block1.py \
  --port /dev/serial/by-path/pci-0000:00:14.0-usb-0:2.2:1.0-port0
```

Results:

- `D1 -> D2` low and high: pass;
- `D3 -> D4` low and high: pass;
- `D1 -> D2` edge watch: pass, observed `[1,0,1]`; and
- `D3 -> D4` pulse/watch: pass, observed two rising edges.

The runner reported `All Block 1 GPIO checks passed`.

## Existing firmware identity and capability survey

The common REPL runner was used to identify the existing firmware and perform
a non-endpoint BLE API survey. All six required BLE functions were present on
each board. This is a preparation check, not POC radio endpoint evidence.

| Target | Board | Version | Embedded commit | Required BLE APIs |
|---|---|---|---|---|
| Classic ESP32 V1 | `ESP32_IDF5` | `2v29.536` | `0cab2c675` | 6 of 6 pass |
| ESP32-C3 V1 | `ESP32C3_IDF5` | `2v29.385` | `363ba92c9` | 6 of 6 pass |
| ESP32-S3 | `ESP32S3_IDF5` | `2v29.504` | `953f89309` | 6 of 6 pass |

The survey command shape was:

```bash
python3 tools/repl/run_test.py \
  tests/WIFI_BLE/ble/ble_capability_survey.js \
  --port <stable-by-path-device> --timeout 10
```

## Stage 1 disposition

All seven Stage 1 preparation points are satisfied:

1. stable USB paths are present and unique;
2. chip types and factory MAC addresses are independently verified;
3. physical harness inspection is operator-confirmed;
4. starting selector and jumper states are recorded;
5. the C3 native-USB and power arrangement is operator-confirmed available;
6. external power links are operator-confirmed open; and
7. both V1 baseline GPIO wiring gates pass.

Stage 2 may proceed. It must flash the POC firmware to the classic ESP32 and
ESP32-C3 V1 boards and then verify all three firmware identities before the
run-specific bench configuration is created.

## Stage 2 result

Stage 2 completed on 13 November 2026. The existing, unmodified POC packages
were rechecked against the hashes recorded by the build stage. The classic
ESP32 and ESP32-C3 V1 boards were then flashed and independently compared with
the packaged bootloader, partition table and application images. The ESP32-S3
already contained the required POC image and was not unnecessarily rewritten.

The Espruino checkout was clean on:

```text
poc/esp32-idf5-consolidation
953f89309ed0d155d31769017a0f32d51a586f83
```

### Image verification before writing

| Package | Package SHA-256 | Application SHA-256 |
|---|---|---|
| `espruino_2v29.504_esp32.tgz` | `9a5a5d2bc222cdae9560e9e99bb2ad689e1385261f367071f17f4d20ed57ecf4` | `219f79ff70cf4c74b3855dc2f895a670d43b5d4e04d7d7bf71b94367ba7f6e56` |
| `espruino_2v29.504_esp32c3.tgz` | `acadbc1e4a70382efbf07affe95f3eca2890675f37b6792152429f92502b60c1` | `f602d2a06aec4ba5e4354beb1be94d58c0b9fd42778df4a4c86f3835e331698a` |
| `espruino_2v29.504_esp32s3.tgz` | `76660a9f8b40fe6ec7da3e5a42af966ff6001629601848a6f8851fe3193b492d` | `6121611069ccf41e9eb119f55fc9207c0665d91ce00239f36e60690b738464d0` |

All hashes matched the earlier build evidence.

### Flash operations

The ESP-IDF v5.5.3 environment selected by `scripts/provision.sh` supplied
`esptool.py v4.12.0`. The write operations used the already identified stable
USB paths and did not erase unrelated flash regions.

| Target | Written regions | Independent comparison | Result |
|---|---|---|---|
| Classic ESP32 V1 | bootloader `0x1000`, partition table `0x8000`, application `0x10000` | all three `verify_flash` digests matched | Pass |
| ESP32-C3 V1 | bootloader `0x0`, partition table `0x8000`, application `0x10000` | all three `verify_flash` digests matched | Pass |
| ESP32-S3 | none; existing POC image retained | REPL identity verified below | Pass |

The classic probe again identified factory MAC `08:b6:1f:70:14:e8`; the C3
probe identified factory MAC `dc:da:0c:d1:c1:90`. Each flashed board was hard
reset after verification.

### Run-specific bench configuration

The following configuration was created and validated as JSON:

```text
tests/WIFI_BLE/esp32_idf5_consolidation_poc_bench_config.json
```

It fixes the three stable USB paths and requires the POC board, version, commit,
Wi-Fi and BLE identities. The verifier resolved the paths to three different
devices and returned `DONE=PASS`.

| Position | Resolved device | Observed board | Version | Commit | Wi-Fi | BLE |
|---|---|---|---|---|---|---|
| Classic ESP32 V1 | `/dev/ttyUSB2` | `ESP32_IDF5` | `2v29.504` | `953f89309` | function | function |
| ESP32-C3 V1 | `/dev/ttyUSB1` | `ESP32C3_IDF5` | `2v29.504` | `953f89309` | function | function |
| ESP32-S3 | `/dev/ttyUSB0` | `ESP32S3_IDF5` | `2v29.504` | `953f89309` | function | function |

The verification command was:

```bash
python3 tools/repl/verify_bench_config.py \
  tests/WIFI_BLE/esp32_idf5_consolidation_poc_bench_config.json
```

Stage 2 is complete. All three boards are now verified POC test subjects and
the run-specific configuration is ready for the no-wiring Stage 3 tests.

## Stage 3 result

Stage 3 completed on 13 November 2026 without changing any harness selector or
jumper. All three verified POC targets completed the 100-cycle no-wiring UART
driver lifecycle, and the ESP32-S3 passed the planned BLE capability survey.

### No-wiring UART driver lifecycle

Each target ran:

```text
docs/investigations/uart/repros/esp32_uart_driver_lifecycle_family.js
```

through `tools/repl/run_test.py` with its stable by-path serial device and a
40-second runner timeout.

| Target | Script pin map | Observed progress | Failure evidence | Result |
|---|---|---|---|---|
| Classic ESP32 V1 | `Serial2`, TX `D4`, RX `D35` | iterations 10 through 100 reported; completion marker received | no setup, unsetup, timeout, assertion or reboot failure | Pass |
| ESP32-C3 V1 | `Serial2`, TX `D3`, RX `D4` | iterations 10 through 100 reported; completion marker received | no setup, unsetup, timeout, assertion or reboot failure | Pass |
| ESP32-S3 | `Serial2`, TX `D4`, RX `D7` | iterations 10 through 100 reported; completion marker received | no setup, unsetup, timeout, assertion or reboot failure | Pass |

All three runs reported the expected board, `2v29.504` and embedded commit
`953f89309` before executing the test.

The common runner output retained the ten `INFO iteration=` progress lines and
the `DONE=esp32_uart_driver_lifecycle_family` marker, but did not retain the
script's separate final `PASS iterations=100` line. The result above is based
on the reported iteration 100, the subsequent completion marker and the
absence of every scripted failure form; it does not claim that the missing
line was observed.

### ESP32-S3 BLE capability survey

Command:

```bash
python3 -u tools/repl/run_test.py \
  tests/WIFI_BLE/ble/ble_capability_survey.js \
  --port /dev/serial/by-path/pci-0000:00:14.0-usb-0:2.1:1.0-port0 \
  --timeout 10 --show-raw
```

The S3 reported BLE address `68:b6:b3:27:2c:42`. All six required APIs were
functions:

- `NRF.setAdvertising()`;
- `NRF.setServices()`;
- `NRF.requestDevice()`;
- `NRF.findDevices()`;
- `NRF.getAddress()`; and
- `NRF.disconnect()`.

The survey reported `checks_failed=0` and `DONE=PASS`. The optional APIs
`updateServices`, `setScan`, `setScanResponse`, `getSecurityStatus`, `restart`,
`sleep` and `wake` were also present as functions.

This survey establishes S3 BLE API availability only. It is not two-board BLE
endpoint evidence; the current endpoint runners do not implement an S3 role.

Stage 3 is complete. The classic ESP32 remains in the Section 4.1 baseline
mode and is ready for the Stage 4 harness sequence. The C3 remains in the
Section 5.1 baseline GPIO mode for its later Stage 5 sequence.

## Stage 4 result

### Section 4.1 baseline hardware mode

The Section 4.1 classic ESP32 baseline phase completed on 13 November 2026
with the operator-confirmed selector state:

```text
SEL_D33=1-2
SEL_D26=1-2
SEL_D35=I2C_INT
JP_UART_LOOP2=open
external power links=open
```

All shared tests identified the target as `ESP32_IDF5`, version `2v29.504`,
embedded commit `953f89309`.

#### Target-specific wiring tools

| Tool | Result | Evidence summary |
|---|---|---|
| `esp32_v1/gpio_block1.py` | Pass | both loopbacks followed low/high levels; edge and pulse watches passed |
| `esp32_v1/analog_block2.py` | Pass | ADC endpoints and 25%, 50%, 75% PWM levels passed all 7 checks |
| `esp32_v1/i2c_spi_block34.py` | Pass | MCP23008 registers, feedback and interrupt plus MCP3008 low/high passed all 10 checks |
| `esp32_v1/onewire_block5.py` | Precondition mismatch with one reliability failure | fitted bus contains two DS18B20s and one DS2413 rather than the runner's expected two DS18B20s; one of six searches returned only one DS18B20 |
| `esp32_v1/grove_i2c_block8.py` | Pass | external MCP23008 at `0x21` passed all 9 checks and left onboard `0x20` unchanged |
| `esp32_v1/spi_extension_block4.py` | Pass | MCP3008 low/high plus W25xxx JEDEC `EF 40 17` and status passed all 8 checks |

The target-specific runners contain an older metadata query that prints an
unevaluated expression with this firmware. Their hardware results remain
valid; board, version and commit were verified immediately around them by the
current shared runner.

#### Shared functional tests

| Block | Script | Checks | Result |
|---|---|---:|---|
| GPIO | `gpio_readwrite_basic.js` | 4/4 | Pass |
| GPIO | `gpio_watch_edges.js` | 4/4 | Pass |
| GPIO | `gpio_pulse.js` | 3/3 | Pass |
| Analog | `analog_read_levels.js` | 4/4 | Pass |
| Analog | `analog_pwm_feedback.js` | 5/5 | Pass |
| Analog | `analog_dac_logic_feedback.js` | 4/4 | Pass |
| I2C | `i2c_mcp23008_registers.js` | 6/6 | Pass |
| I2C | `i2c_mcp23008_interrupt.js` | 5/5 | Pass |
| SPI | `spi_mcp3008_basic.js` | 6/11 | Known baseline behaviour reproduced |
| OneWire | `onewire_mixed_ds18b20_ds2413.js` | 20/21 | One incomplete search; all device operations passed |
| Grove I2C extension | `i2c_grove_mcp23008_secondary.js` | 8/8 | Pass |
| SPI flash extension | `spi_extension_flash_basic.js` | 9/9 | Pass |

`gpio_shiftout.js` was not run because its software-watch observer is not a
valid independent measurement of the current fast synchronous implementation.
The two-device-only OneWire shared script was not run because the fitted
DS2413 makes its stated precondition false; the mixed-family script was used
instead.

#### Observed baseline behaviours

The MCP3008 test reproduced the previously documented GPIO-matrix reclaim
behaviour. Low stimulus and the PWM midpoint worked, but the final
`digitalWrite(D27,1)` after PWM left both the local ADC and MCP3008 reading
zero. Six of eleven checks passed; the five failures were the final-high and
dependent monotonic/span checks. The separate wiring test and SPI extension
test both proved valid MCP3008 low/high operation when the stimulus did not use
that PWM-to-digital transition.

The mixed-family OneWire test found the expected two DS18B20 ROMs and one
DS2413 ROM. Both addressed DS18B20 scratchpads had valid CRCs and plausible
temperatures, and all six DS2413 confirmation/status checks passed. Five of six
searches returned the complete three-device set; one returned a single
DS18B20. The target-specific test independently observed the same five-of-six
search pattern. This is consistent with the existing multi-device OneWire
reliability investigation and is not, without comparison evidence, attributed
to the consolidation.

Section 4.1 is complete. Section 4.2 requires both DS2413 feedback selectors to
move from pins 1-2 to pins 2-3 before the physical PIO feedback runner is used.

### Section 4.2 DS2413 extension mode

Section 4.2 completed on 14 November 2026 after the operator moved
`SEL_D33` and `SEL_D26` from pins 1-2 to pins 2-3. `SEL_D35` remained in the
I2C interrupt position and `JP_UART_LOOP2` remained open.

The physical feedback command was:

```bash
python3 -u tools/wiring_tests/esp32_v1/onewire_gpio_block6.py \
  --port /dev/serial/by-path/pci-0000:00:14.0-usb-0:2.3:1.0-port0
```

The runner identified `ESP32_IDF5` version `2v29.504`. All five searches found
the complete two-DS18B20 plus one-DS2413 bus, including DS2413 ROM
`3a27d15e000000f2`.

| DS2413 state | Protocol confirmation/status | `D33` | `D26` | Result |
|---|---|---:|---:|---|
| Both released | `AA` / `0F` | 1 | 1 | Pass |
| PIOA low | `AA` / `3C` | 0 | 1 | Pass |
| PIOB low | `AA` / `C3` | 1 | 0 | Pass |
| Both low | `AA` / `F0` | 0 | 0 | Pass |
| Both released again | `AA` / `0F` | 1 | 1 | Pass |

All 23 runner checks passed. This proves both the DS2413 command/status path
and the independent physical feedback routing through the two selectors. The
mixed-family API test was not repeated because it had already exercised both
DS18B20s and all DS2413 command states in Section 4.1; Section 4.2 added the
previously unobserved physical PIO feedback.

Section 4.2 is complete. Before Section 4.3, `SEL_D33` and `SEL_D26` must be
returned to pins 1-2, `SEL_D35` moved to the UART position, and
`JP_UART_LOOP2` closed.

### Section 4.3 UART1/UART2 crosslink mode

Section 4.3 completed on 14 November 2026 after the operator set:

```text
SEL_D33=1-2
SEL_D26=1-2
SEL_D35=UART
JP_UART_LOOP2=closed
external power links=open
```

UART0 on `D1`/`D3` remained the board USB-UART REPL and flashing path. The
test cross-connected `Serial2` TX `D4` to `Serial3` RX `D36`, and `Serial3` TX
`D14` to `Serial2` RX `D35`.

The target-specific `esp32_v1/uart_block7.py` wiring runner passed all five
checks: setup, transfer in each direction and continued buffered reception in
each direction.

All 18 applicable shared scripts under `tests/repl/uart_block7/` then passed:

| Coverage group | Scripts | Checks | Result |
|---|---:|---:|---|
| Polling, write shapes, reconfiguration, full duplex and flush | 5 | 40/40 | Pass |
| Connection state, listener lifecycle/ordering, injection and pipe | 5 | 22/22 | Pass |
| Mismatched-baud recovery, repeated setup lifecycle and 32/64/65/96-byte bursts | 4 | 44/44 | Pass |
| Clean-start 128- and 200-byte bursts in both directions | 4 | 16/16 | Pass |
| **Shared UART total** | **18** | **122/122** | **Pass** |

Every shared run identified `ESP32_IDF5`, version `2v29.504`, embedded commit
`953f89309`. Coverage included:

- `setup()`, reconfiguration, `unsetup()` and `isConnected()`;
- `write()`, `print()`, `println()` and `flush()`;
- `available()`, whole and partial `read()`;
- listener attachment, ordering, removal, reattachment and late buffered data;
- `inject()` and open-stream `pipe()`;
- deliberate baud mismatch followed by same-session recovery;
- simultaneous bidirectional transfers;
- ten alternating 115200/57600-baud setup/transfer/teardown iterations; and
- exact 32-, 64-, 65-, 96-, 128- and 200-byte transfers in both directions.

The 200-byte cases each arrived through four callbacks with a maximum 64-byte
chunk and retained their exact length, content head/tail and content hash. No
UART failure, assertion or reboot was observed.

The Stage 4 functional sequence is complete. The harness must now be restored
by reopening `JP_UART_LOOP2` and moving `SEL_D35` back to the I2C interrupt
position; `SEL_D33` and `SEL_D26` should remain at pins 1-2.

### Stage 4 restoration and disposition

The operator restored the classic harness on 14 November 2026:

```text
SEL_D33=1-2
SEL_D26=1-2
SEL_D35=I2C_INT
JP_UART_LOOP2=open
external power links=open
```

Two focused checks verified the restored functional paths:

- `esp32_v1/gpio_block1.py` passed both low/high loopbacks, the D32/D33 edge
  watch and the D25/D26 pulse watch; and
- `i2c_mcp23008_interrupt.js` passed all 5 interrupt idle, assertion, source,
  capture and clear checks through `D35`.

Stage 4 is complete. The classic ESP32 V1 harness is left in its Section 4.1
baseline hardware mode.

## Stage 5 result

### Section 5.1 C3 baseline GPIO mode

Section 5.1 completed on 14 November 2026 with the unchanged baseline state:

```text
SEL_D1=a2-b2
SEL_D2=a2-b2
SEL_D3=a2-b2
SEL_D4=a2-b2
SEL_D0=open
SEL_D08=open
SEL_D10=open
J10 signal shunts=open
external power links=open
```

The target-specific `esp32_c3/gpio_block1.py` runner identified
`ESP32C3_IDF5` version `2v29.504` and passed both low/high loopbacks, the
D1/D2 edge watch and the D3/D4 pulse watch.

The shared scripts then passed:

| Script | Checks | Result |
|---|---:|---|
| `gpio_readwrite_basic.js` | 4/4 | Pass |
| `gpio_watch_edges.js` | 4/4 | Pass |
| `gpio_pulse.js` | 3/3 | Pass |
| **Shared GPIO total** | **11/11** | **Pass** |

Every shared run reported `ESP32C3_IDF5`, version `2v29.504`, embedded commit
`953f89309`. Section 5.1 is complete.

Section 5.2 requires `SEL_D0=a2-b2` for analog feedback. `SEL_D08` must remain
open while the C3 boots and may be closed only after a clean boot.

### Section 5.2 C3 analog/PWM mode

Section 5.2 completed on 14 November 2026 after the operator set
`SEL_D0=a2-b2`, booted with `SEL_D08` open, and closed `SEL_D08` only after the
clean boot. D1-D4 remained in their baseline `a2-b2` positions; `SEL_D10`, both
`J10` signal positions and external power links remained open.

The target-specific `esp32_c3/analog_block2.py` runner identified
`ESP32C3_IDF5` version `2v29.504` and passed all 7 checks. It measured:

| Stimulus | ADC reading |
|---|---:|
| Low | 0.004150 |
| 25% PWM | 0.276367 |
| 50% PWM | 0.557129 |
| 75% PWM | 0.839111 |
| High | 0.999756 |

The shared tests passed:

| Script | Checks | Result |
|---|---:|---|
| `analog_read_levels.js` | 4/4 | Pass |
| `analog_pwm_feedback.js` | 5/5 | Pass |
| **Shared analog total** | **9/9** | **Pass** |

Both shared runs reported `ESP32C3_IDF5`, version `2v29.504`, embedded commit
`953f89309`. Section 5.2 is complete.

### Section 5.3 C3 combined I2C/SPI mode

Section 5.3 base coverage completed on 14 November 2026. The operator powered
down, opened `SEL_D08`, and selected these labelled functions:

```text
SEL_D1=I2C_A_SDA / I2C_SDA (a1-b1)
SEL_D2=I2C_A_FB / I2C_FB (a1-b1)
SEL_D3=SPI_MISO (a1-b1)
SEL_D4=I2C_A_SCL / I2C_SCL (a1-b1)
SEL_D10=I2C_INT (a1-b1)
SEL_D0=ADC_IN / ANALOG_FB (a2-b2)
J10 signal shunts=open
external power links=open
```

The board was powered through its normal USB-UART connection and `SEL_D08`
was closed to connect `PWM_OUT` to `ANALOG_FB` only after a clean boot.

The target-specific `esp32_c3/i2c_spi_block34.py` runner identified
`ESP32C3_IDF5` version `2v29.504` and passed all 15 checks. It proved MCP23008
register access, interrupt assertion and clearing, `I2C_FB` low/high operation,
MCP3008 low/high conversion, monotonic low/mid/high response, and agreement
between the target ADC and SPI ADC paths.

The shared results were:

| Script | Checks | Result |
|---|---:|---|
| `i2c_mcp23008_registers.js` | 6/6 | Pass |
| `i2c_mcp23008_interrupt.js` | 5/5 | Pass |
| `spi_mcp3008_basic.js` | 6/11 | Known firmware behaviour reproduced |
| **Shared combined-mode total** | **17/22** | **5 known-behaviour checks failed** |

The SPI script produced valid low and midpoint values on both ADC paths, but
its final high stimulus remained low after changing `D8` from PWM use back to
digital output. That caused the target-high, target-monotonic, SPI-high,
SPI-monotonic and SPI-span checks to fail. This is the same PWM-to-digital
GPIO-matrix reclaim behaviour already observed in the classic ESP32 run. It is
classified as known firmware behaviour rather than a bus or harness failure:
the immediately preceding target-specific runner proved low, high and midpoint
operation over the same C3 MCP3008 SPI and analog-feedback wiring.

#### Section 5.3 external SPI-flash extension

The operator powered down, opened `SEL_D08`, moved `SEL_D10` from the labelled
`I2C_INT` function to `SPI_CS_FLASH` (`a2-b2`), connected the removable flash
module, rebooted normally, and closed `SEL_D08` only after the clean boot. The
other Section 5.3 function selections remained unchanged.

The first `spi_extension_flash_basic.js` run received zero for every flash
identity and status byte. It reported 4/9 checks passed, but the syntactic
shape checks among those four do not constitute device proof; the expected
manufacturer, type and capacity checks failed. The result was preserved and
the test was repeated once without changing hardware or firmware, as required
by the failure-triage procedure.

The unchanged repeat identified the removable W25xxx device correctly:

| Measurement | Result |
|---|---|
| JEDEC response | `FF EF 40 17` |
| Manufacturer/type/capacity | `EF 40 17` |
| Status-register response | `FF 00` |
| Flash-specific semantic checks | 6/6 pass |
| Complete shared script | 7/9 pass |

The complete repeat retained two non-flash failures: its MCP3008 low reading
was 224 rather than below 50, so the measured low-to-high span was 798 rather
than above 900. The high endpoint was 1022. A focused, independent
`esp32_c3/analog_block2.py` run then passed all 7 analog checks without a
selector change, measuring `0.004150` low, `0.999756` high and monotonic 25%,
50% and 75% PWM levels.

The extension therefore proves the removable flash module and
`SPI_CS_FLASH` route, while retaining the initial transient no-response and
the repeat's two analog-stimulus failures as visible runner observations. No
transformation regression is inferred from either observation: the same POC
firmware independently passed the shared SPI bus, flash identity and focused
analog paths in this mode.

### Section 5.4 C3 OneWire mode

Section 5.4 completed on 14 November 2026 after the operator powered down,
opened `SEL_D08`, removed the flash extension, and selected these functions:

```text
SEL_D0=ONEWIRE_DQ (a1-b1)
SEL_D10=I2C_INT (a1-b1)
SEL_D08=open
J10 signal shunts=open
external power links=open
```

The compatible `I2C_SDA`, `I2C_FB`, `SPI_MISO` and `I2C_SCL` selections were
left in place. The board then booted through its normal USB-UART connection;
`SEL_D08` remained open throughout the OneWire tests.

The target-specific `esp32_c3/onewire_block5.py` runner found both expected
DS18B20 ROMs, validated both scratchpad CRCs and measured plausible
temperatures of 20.5000 C and 21.9375 C. It passed 11/12 checks. Five of six
searches returned both devices; one search returned only ROM
`2808c68700aa7672`.

The shared `onewire_ds18b20_basic.js` test then passed all 15 checks. All six
of its searches returned both ROMs, and both addressed scratchpad and
temperature paths passed.

The planned 50-scan reliability soak produced:

| Search result | Count | Proportion |
|---|---:|---:|
| Both devices | 39/50 | 78% |
| One device | 7/50 | 14% |
| No device | 4/50 | 8% |
| More than two devices | 0/50 | 0% |

ROM `2808c68700aa7672` appeared in 46/50 scans and ROM
`28b3e08700b65ea9` appeared in 39/50. The soak therefore correctly returned
failure rather than concealing the incomplete searches.

This failure shape is consistent with the earlier C3 behaviour before the
separate localized OneWire quiet-timing fix: that historical unfixed run found
both devices in 30/50 scans, while the timing-fix branch later achieved
50/50. The fix commit `a35440754` is not an ancestor of the POC's fixed
upstream baseline `2f0bc6bc2`. The consolidation did not change
`src/jswrap_onewire.c`, and inspection found no added or removed ESP32 delay,
interrupt or critical-section operation in the transformed backend diff.

The result is therefore classified as baseline-consistent firmware behaviour,
not evidence of a consolidation regression. An exact same-IDF build of the
untransformed baseline would still be required if conclusive causal comparison
is requested during Stage 9.

### Section 5.5 C3 safe single-UART mode

Section 5.5 completed on 14 November 2026 using the deliberately limited
single-UART loopback. The normal board Micro-USB connection was removed. The
native USB/JTAG cable was used for signalling and REPL control on `D18`/`D19`,
while the harness was powered from regulated external 5 V through
`JP12 / EXTERNAL 5V`. `JP1 / Native USB VBUS` remained open so the two power
sources could not be joined.

The UART function selections were:

```text
SEL_D3=GPIO_LOOP_B_OUT (a2-b2)
SEL_D4=GPIO_LOOP_B_IN (a2-b2)
SEL_D0=open
SEL_D08=open
J10 / SEL_UART0_UART1 signal shunts=open
```

The native control device enumerated as `/dev/ttyACM0`. Its udev identity was
`Espressif USB JTAG/serial debug unit` with serial/MAC
`DC:DA:0C:D1:C1:90`, matching the C3 hardware identity established in Stage 1.
The runner then reported `ESP32C3_IDF5`, version `2v29.504`, embedded commit
`953f89309`.

`c3_uart_single_loop_lifecycle.js` passed all 102 checks:

| Coverage | Result |
|---|---:|
| Polling receive over `Serial2`, `D3` TX to `D4` RX | 1/1 pass |
| Event-driven receive | 1/1 pass |
| Repeated setup/write/read/unsetup at alternating 115200 and 57600 baud | 100/100 pass |
| **Total** | **102/102 pass** |

No data mismatch, setup failure, timeout, assertion or reboot was observed.
The full UART0/UART1 crosslink was intentionally not fitted or run because the
DevKitC-02 CP2102N TX path remains electrically active on `D20`; the safe
single-loop test provides the planned C3 UART lifecycle evidence without
creating output contention.

### Stage 5 restoration and disposition

The operator powered down the external supply, disconnected native USB,
opened both power-feed links, and restored the C3 baseline functions:

```text
SEL_D1=GPIO_LOOP_A_OUT (a2-b2)
SEL_D2=GPIO_LOOP_A_IN (a2-b2)
SEL_D3=GPIO_LOOP_B_OUT (a2-b2)
SEL_D4=GPIO_LOOP_B_IN (a2-b2)
SEL_D0=open
SEL_D08=open
SEL_D10=open
J10 / SEL_UART0_UART1 signal shunts=open
JP1 / Native USB VBUS=open
JP12 / EXTERNAL 5V=open
```

The normal board Micro-USB connection restored the stable C3 path to
`/dev/ttyUSB1`. The final `esp32_c3/gpio_block1.py` gate identified
`ESP32C3_IDF5` version `2v29.504` and passed both loopbacks at low and high,
the loop-A edge sequence, and the loop-B pulse watch.

Stage 5 is complete. The C3 is left in its documented baseline GPIO mode and
is ready for the no-selector-change Wi-Fi and BLE endpoint stages.

## Stage 6 result

Stage 6 completed on 14 November 2026 without changing any harness selector.
Before the runs, the bench verifier reconfirmed all three targets as version
`2v29.504`, embedded commit `953f89309`, with the expected stable serial paths
and Wi-Fi APIs. All seven tests used generated SSIDs and credentials; no local
router credentials were required or recorded.

### Core peer-to-peer role matrix

All four planned role directions established a WPA2 network and completed the
run-correlated UDP request/reply. The application endpoint result is therefore
4/4 pass even though each complete runner returned failure because its
separately asserted `Wifi.ping()` callback timed out.

| Direction | AP/UDP peer | Station target | RSSI | Scan | WPA2 + DHCP | Events | UDP | Cleanup | Target -> peer ping | Peer -> target ping |
|---|---|---|---:|---|---|---|---|---|---|---|
| `c3-peer` | C3 | Classic | -7 dBm | Pass | Pass | Pass | Pass | Pass | Fail: timeout | Not asserted |
| `esp32-peer` | Classic | C3 | -10 dBm | Pass | Pass | Pass | Pass | Pass | Fail: timeout | Fail: no reply |
| `esp32-peer-s3` | Classic | S3 | -57 dBm | Pass | Pass | Pass | Pass | Pass | Fail: timeout | Fail: no reply |
| `s3-peer` | S3 | Classic | -63 dBm | Pass | Pass | Pass | Pass | Pass | Fail: timeout | Fail: no reply |
| **Core directions passing** |  |  |  | **4/4** | **4/4** | **4/4** | **4/4** | **4/4** | **0/4** | **0/3 attempted** |

In every direction the station received `192.168.4.2/24` with gateway
`192.168.4.1`; it emitted `associated`, `connected` and `disconnected`, and
the peer independently observed station join, the matching challenge payload
and station leave. Final station and AP addresses were `0.0.0.0`, and neither
side required a runtime reset during cleanup.

### Target-hosted AP extension

Both recommended target-hosted AP directions used the custom
`192.168.47.1/24` subnet:

| Target AP | Station | Target service checks | Station checks | `setAPIP()` | WPA2/custom subnet | UDP service | Cleanup | Station ping |
|---|---|---:|---:|---|---|---|---|---|
| C3 | Classic | 7/7 pass | 11/12 | Pass | Pass | Pass | Pass | Fail: timeout |
| Classic | C3 | 7/7 pass | 11/12 | Pass | Pass | Pass | Pass | Fail: timeout |
| **Directions proving target AP service** |  | **2/2** |  | **2/2** | **2/2** | **2/2** | **2/2** | **0/2** |

Each target applied the custom AP address, started its WPA2 AP, reported the
expected details, observed station join and leave, received the correlated UDP
challenge and returned the acknowledgement. The `setAPIP()` callbacks both
reported `error:null`; the runner's later summary field was `null`, so the
callback observation and summary representation are retained separately.

### Station-transition lifecycle extension

With the C3 as controlled peer and classic ESP32 as station target,
`wifi_station_transition_lifecycle.js` passed all 15 checks. It proved:

- connection and UDP transfer from idle;
- scan while connected without losing the assigned address, followed by UDP;
- reconnect while already connected, followed by UDP;
- explicit disconnect and address removal;
- scan while disconnected without unintended association; and
- reconnect after that scan, followed by a fourth correlated UDP exchange.

The target recorded three `associated`, three `connected` and two
`disconnected` events. Peer and target cleanup passed without a runtime reset.

### Stage 6 disposition

The scan, WPA2, DHCP, event, AP, custom-address, UDP and cleanup evidence is
successful across every planned target and role. The repeated ICMP callback
timeouts remain real failed API subchecks and are not hidden by the endpoint
result. They are also consistent with the fixed POC baseline's documented
ping limitations: the later IDF5 ping-hardening work is not part of that
baseline. No general Wi-Fi transport or consolidation regression is indicated
because every direction transferred a run-bound application payload and
acknowledgement successfully. An exact untransformed-baseline comparison may
still be selected in Stage 9 if stakeholder review requires causal attribution
of the ping behaviour.

## Stage 7 result

Stage 7 completed on 14 November 2026 without changing any harness selector.
Classic ESP32 and C3 were tested in both BLE roles using generated names and
run-correlated challenge, acknowledgement and completion values. Every run
reported version `2v29.504` and embedded commit `953f89309` for both boards.

### Filtered advertising and scan

Both advertisers configured the generated name, service UUID `fff0` and
run-specific service data successfully. Neither filtered scanner returned a
device:

| Direction | Advertiser | Scanner | Advertiser setup | Filtered result | Host correlation | Cleanup |
|---|---|---|---|---|---|---|
| `c3-peer` | C3 | Classic | Pass | Empty | Fail | Pass |
| `esp32-peer` | Classic | C3 | Pass | Empty | Fail | Pass |
| **Directions** |  |  | **2/2 pass** | **0/2 found** | **0/2** | **2/2 pass** |

Both advertisers remained disconnected as expected. After each run, neither
board was advertising or connected. These are genuine failed
`NRF.findDevices()` filtered-discovery subtests, not successful scans with a
mis-correlated result.

The symmetrical empty result reproduces the current-master qualification
history described in the runtime plan. It is retained as baseline-consistent
firmware behaviour rather than labelled a new consolidation regression. The
successful GATT discovery below also proves that both radios and both
advertising directions work over air; an exact untransformed-baseline build
would still be needed for conclusive source attribution of the filtered-scan
failure.

### GATT client/peripheral exchange

The primary GATT endpoint proof passed completely in both directions:

| Direction | Peripheral | Central | Central checks | Peripheral checks | Host correlation | Cleanup |
|---|---|---|---|---:|---:|---|---|
| `c3-peer` | C3 | Classic | 9/9 pass | 4/4 pass | Pass | Pass |
| `esp32-peer` | Classic | C3 | 9/9 pass | 4/4 pass | Pass | Pass |
| **Directions** |  |  | **18/18** | **8/8** | **2/2** | **2/2** |

In each direction the central selected the intended public BLE address at
approximately -19 dBm, connected, discovered the primary service and all
three characteristics, read the exact run-bound challenge, wrote the exact
acknowledgement and completion values, and deliberately disconnected. The
peripheral independently observed both writes and the disconnect. Final
security state on both boards was neither advertising nor connected, and no
runtime reset was required for cleanup.

The core runs used `serviceReplacements=0`, as specified; the separate
50-replacement stress option was not introduced into the acceptance path.
Both peripheral roles emitted duplicate `connect` and duplicate `disconnect`
callbacks, with disconnect reason 19. This reproduces the documented shared
ESP32-family BLE event anomaly. It did not duplicate either application write
or prevent host-correlated completion, but remains a visible observation.

### Stage 7 disposition

Stage 7 provides successful bidirectional BLE GATT endpoint evidence for the
classic ESP32 and C3 POC builds. Filtered `NRF.findDevices()` discovery remains
failed in both directions, while `NRF.requestDevice()` plus service and
characteristic exchange succeeds in both. The two API results are kept
separate rather than allowing the GATT success to conceal the scan failure or
the scan failure to invalidate the proven GATT endpoint.

## Stage 8 result

Stage 8 completed on 14 November 2026 with the planned `classic-target`
combined coexistence direction. Credentials were loaded from the ignored
`tests/WIFI_BLE/local_wifi_credentials.json` file and were not printed or
copied into this evidence.

The classic ESP32 simultaneously acted as:

- BLE GATT peripheral;
- WPA2 Wi-Fi station; and
- HTTPS client.

The C3 remained the connected GATT central while the bench PC supplied the
local TLS endpoint. The PC and target were on different routed subnets: the
classic target received `192.168.50.102/24` with gateway `192.168.50.1`, while
the HTTPS server bound to `192.168.1.210`. The server observed one translated
client address, `192.168.1.207`. Successful end-to-end HTTPS therefore proved
that the available router path joined the two test networks even though their
active SSIDs were not identical.

### Combined endpoint result

| Coverage | Result |
|---|---:|
| Classic combined target checks | 10/10 pass |
| C3 GATT central checks | 7/7 pass |
| Host-correlated target completion | Pass |
| Host-correlated GATT before and after HTTPS | Pass |
| Host-observed HTTPS endpoint request | Pass |

The correlated sequence proved:

1. the classic target advertised and the C3 selected and connected to its
   public BLE address;
2. service discovery and the run-bound challenge read succeeded;
3. the C3 wrote acknowledgement `A120121` before the network operation;
4. the classic joined the configured WPA2 network;
5. BLE remained connected before the HTTPS request;
6. the target received HTTP status 200 and the complete 744-byte response;
7. BLE remained connected after the HTTPS response;
8. the C3 wrote completion value `D120121` over the held GATT connection; and
9. the target then disconnected and cleaned up deliberately.

The server received exactly one request for the generated
`/ble-https/20261114T120121Z` path. Both target and peer summaries matched that
run ID, and neither reported a failed check.

### Memory observations

| Phase | Native free heap | Minimum native heap | Largest native block |
|---|---:|---:|---:|
| Initial | 67,584 | 67,412 | 65,536 |
| After BLE connection | 63,752 | 62,480 | 61,440 |
| After Wi-Fi connection | 53,992 | 53,372 | 53,248 |
| After HTTPS response | 53,216 | 22,848 | 22,528 |
| After cleanup | 59,328 | 22,848 | 24,576 |

The HTTPS/TLS phase temporarily reduced the minimum and largest free native
heap blocks, but the complete response, post-HTTPS GATT write and cleanup all
completed without assertion, reboot or allocation failure.

### Stage 8 disposition

The recommended combined direction passes. It directly proves concurrent BLE
GATT, Wi-Fi station and HTTPS client operation through source areas affected
by the consolidation. The reverse `c3-target` direction is explicitly optional
in the runtime plan and was not required to complete Stage 8.

## Stage 9 result

Stage 9 completed on 14 November 2026. No observed result is classified as an
identified regression introduced by the automated IDF5 consolidation. The
failed and unusual subresults remain visible below; successful endpoint tests
do not replace or conceal them.

### Failure triage and classification

| Observation | Reproduction and isolation evidence | Classification | Disposition |
|---|---|---|---|
| Classic target-specific OneWire runner expected only two DS18B20s but found a fitted DS2413 as well | The mixed-family runner used the actual bus population; both DS18B20 operations and all DS2413 operations passed | Harness/test precondition mismatch | Resolved by the applicable mixed-family test; not a firmware failure |
| Classic and C3 shared MCP3008 scripts failed the final high and dependent checks after PWM use | Target-specific SPI/ADC tests passed low, high and midpoint on both boards; focused analog tests also passed | Pre-existing firmware/API state behaviour: PWM-to-digital GPIO reclaim | Retained as failed subchecks; no comparison build required for the POC |
| First C3 removable-flash run returned zero identity/status bytes | Unchanged repeat returned JEDEC `EF 40 17`; flash-specific checks then passed | Unresolved transient external-device/bench response | No further action unless it recurs; not evidence of a transformation regression |
| C3 flash-extension repeat measured MCP3008 low as 224 and span as 798 | Immediate focused analog runner passed 7/7 with low `0.004150` and high `0.999756`; flash identity remained valid | Unresolved narrow runner/API-state interaction | Physical analog and flash paths independently proved; no further POC comparison required |
| Classic OneWire had one incomplete search; C3 found both devices in 39/50 soak scans | The fixed baseline does not contain the later quiet-timing fix that achieved 50/50; `src/jswrap_onewire.c` was unchanged by the transformer | Pre-existing fixed-baseline firmware limitation | Exact untransformed-baseline run only if stakeholders require stricter causal proof |
| Wi-Fi `Wifi.ping()` timed out in all four target-to-peer checks, both target-AP station checks and three attempted reverse checks | Scan, WPA2, DHCP, events, bidirectional UDP and cleanup passed in every role; later ping-hardening commits are not ancestors of the fixed baseline | Pre-existing fixed-baseline API limitation; exact low-level cause not re-investigated here | Retained separately from 4/4 core UDP endpoint success; exact baseline comparison remains optional |
| Filtered `NRF.findDevices()` returned no device in both BLE directions | Both advertisers configured successfully; bidirectional `NRF.requestDevice()` GATT discovery and transactions passed; current-master history records the same empty result | Pre-existing ESP32-family filtered-discovery behaviour | Retained as 0/2 filtered-scan result; exact baseline comparison remains optional |
| Both GATT peripheral roles emitted duplicate connect and disconnect callbacks | Application writes occurred once, both GATT transactions completed and historical comparisons record the same duplicate events | Pre-existing shared ESP32-family BLE event behaviour | Recorded without weakening the successful application-level assertions |
| The no-wiring UART lifecycle runner did not retain its separate final `PASS iterations=100` line | Each target reported iteration 100, then its completion marker, without any scripted failure form | Runner-output capture limitation | Completion evidence accepted from the retained progress and terminal marker |

### Exact-baseline comparison decision

No unchanged-baseline firmware was built or flashed during Stage 9. An exact
same-IDF comparison is not required for the present POC assessment because:

- every persistent failure class was identified in the pre-existing evidence
  or explained by a known fix that is absent from the fixed baseline;
- relevant working paths were independently demonstrated on the same POC
  firmware and hardware;
- no failure produced a crash, assertion, unexpected reboot, corrupt flash,
  missing endpoint or target-specific loss of a previously proven function;
  and
- the POC is supporting a stakeholder assessment of consolidation
  practicality, not claiming complete production qualification.

Exact-baseline comparison remains available for OneWire, `Wifi.ping()` or BLE
filtered discovery if stakeholder review requires stronger causal attribution.
That work should be treated as a deliberate comparison exercise using the
same IDF, board, harness mode and runner, rather than added retrospectively as
an assumed pass/fail oracle.

### Runtime completion audit

| Runtime completion requirement | Evidence status |
|---|---|
| Verified POC identity on classic ESP32, C3 and S3 | Complete |
| Result for every selected core test, including failures and exclusions | Complete |
| Classic and C3 selector state recorded for each wired mode | Complete |
| Four independent Wi-Fi role directions | Complete; application endpoints 4/4 |
| Classic/C3 BLE advertising and GATT in both directions | Complete; filtered discovery 0/2 and GATT endpoints 2/2 |
| Extended tests separated from core evidence | Complete; target AP, Wi-Fi lifecycle, flash/Grove/DS2413 and coexistence results are identified separately |
| Unexpected results classified or explicitly unresolved | Complete; classifications and dispositions are listed above |

The runtime stage is complete. Its outcome is successful supporting evidence
with documented fixed-baseline and runner limitations. It finds no runtime
regression attributable to the automated transformation.

This runtime conclusion does not itself complete or authorize the production
change. The specification's stakeholder review and final POC assessment remain
separate activities, and the draft pull request must remain experimental.

## References

- [Runtime test plan](ESP_IDF5_consolidation_POC_Runtime_Test_Plan.md)
- [Build and initial loose-board flash evidence](ESP_IDF5_consolidation_POC_Build_Flash_Evidence.md)
- [Run-specific bench configuration](../../../tests/WIFI_BLE/esp32_idf5_consolidation_poc_bench_config.json)
- [Classic ESP32 V1 wiring](../../targets/esp32-devkitc-v4/wiring.md)
- [ESP32-C3 V1 wiring](../../targets/esp32-c3-devkitc-02/wiring.md)
