# ESP32 IDF5 Backend Consolidation POC: Runtime Test Plan

## 1. Recommended approach

The transformed firmware should be evaluated in stages, starting with firmware
identity and safe no-wiring checks, continuing through the established V1
harness blocks, and finishing with controlled two-board Wi-Fi and BLE endpoint
tests.

The POC evidence should distinguish:

- **core POC tests**, which provide the principal runtime evidence for the
  automated consolidation;
- **extended tests**, which add useful coverage after the core sequence is
  stable; and
- **diagnostic tests**, which investigate known or suspected firmware
  behaviour but must not be treated as consolidation acceptance gates.

This distinction is important because several recent Wi-Fi hardening tests in
this repository were developed against source changes which are not present in
the POC's fixed Espruino baseline. A failure against those later contracts
would not, by itself, show that the consolidation changed IDF5 behaviour.

The test sequence is intended to produce stakeholder-review evidence. It is
not complete production qualification of the ESP32 IDF5 backend.

## 2. Purpose and scope

The runtime test has four purposes:

1. confirm that the three generated IDF5 images run on the intended hardware;
2. exercise the established classic ESP32 and ESP32-C3 V1 harness functions;
3. exercise the transformed Wi-Fi and BLE source through independent endpoint
   roles on two physical boards; and
4. separate transformation regressions from pre-existing firmware, harness or
   runner behaviour.

The required firmware targets are:

- `ESP32_IDF5` on the classic ESP32 V1 harness;
- `ESP32C3_IDF5` on the ESP32-C3 V1 harness; and
- `ESP32S3_IDF5` on the available ESP32-S3 development board.

No firmware correction is permitted during the initial POC run. If a failure
requires a source change, preserve the original result and review the proposed
correction separately.

## 3. Fixed provenance and bench identity

The initial run must use the already built, unmodified consolidation commit:

| Item | Required value |
|---|---|
| Espruino baseline | `2f0bc6bc293dede9458ef9d2b23ce76807f6bc94` |
| Consolidation commit | `953f89309ed0d155d31769017a0f32d51a586f83` |
| Expected Espruino version | `2v29.504` |
| ESP-IDF | `v5.5.3`, commit `2c211b236707889e8400c4dc5644dd5c4ee071e0` |
| Espruino branch | `poc/esp32-idf5-consolidation` |

The current Ubuntu bench mapping is:

| Position | Stable serial path | Hardware identity | Expected board |
|---|---|---|---|
| ESP32-S3 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.1:1.0-port0` | MAC `68:b6:b3:27:2c:40` | `ESP32S3_IDF5` |
| ESP32-C3 V1 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.2:1.0-port0` | MAC `dc:da:0c:d1:c1:90` | `ESP32C3_IDF5` |
| Classic ESP32 V1 | `/dev/serial/by-path/pci-0000:00:14.0-usb-0:2.3:1.0-port0` | MAC `08:b6:1f:70:14:e8` | `ESP32_IDF5` |

The paths and hardware identities must be rechecked at the start of the run.
Linux `/dev/ttyUSBx` allocation alone is not sufficient identification.

After flashing, create the run-specific configuration:

```text
tests/WIFI_BLE/esp32_idf5_consolidation_poc_bench_config.json
```

It should retain the three current stable paths and require the board, version,
commit, Wi-Fi and BLE capabilities recorded above. It is a POC evidence input,
not a replacement for the existing historical bench configurations.

## 4. Evidence rules

Each test record must state:

- date and operator;
- target board and stable serial path;
- physical board identity where relevant;
- Espruino board, version and embedded Git commit;
- source branch and full consolidation commit;
- ESP-IDF version;
- harness mode and every selector or jumper position;
- fitted optional peripherals;
- exact runner, script and command;
- individual subcheck results, not only the runner's overall exit status; and
- raw-log location or a sufficient retained transcript.

Only one REPL tool may access a serial port at a time. Two-board runners may
open their two assigned ports together because they coordinate both endpoints.
No other terminal or monitor may retain either port during those runs.

For Wi-Fi and BLE tests, record which board performed each endpoint role. A
pass in one direction is not evidence for the reverse role.

## 5. Test classification

### 5.1 Core POC evidence

The core sequence consists of:

- flash and identity verification on all three targets;
- no-wiring ESP32-family UART driver lifecycle on all three targets;
- established classic ESP32 V1 GPIO, analog, I2C, SPI, OneWire and crossed-UART
  tests;
- established ESP32-C3 V1 GPIO, analog, I2C, SPI, OneWire and safe single-UART
  tests;
- positive two-board Wi-Fi endpoint tests with classic ESP32, C3 and S3 in the
  supported AP and station role directions;
- classic/C3 BLE filtered-advertisement tests in both directions, with known
  baseline limitations reported rather than hidden; and
- classic/C3 BLE GATT endpoint tests in both directions.

### 5.2 Recommended extended evidence

After the core sequence is understood, run:

- target-hosted Wi-Fi AP tests on classic ESP32 and C3;
- a selected station transition lifecycle test;
- one combined BLE GATT plus Wi-Fi HTTPS coexistence test; and
- optional external SPI flash, Grove I2C and DS2413 tests when those removable
  devices are fitted and their preconditions have been checked.

### 5.3 Conditional diagnostics

Run the following only to investigate a result or answer a separate firmware
question:

- Wi-Fi connect/disconnect hardening lifecycle and overlap tests;
- focused ping lifecycle, overlap and reset tests;
- persistent Wi-Fi restore tests;
- manual AP removal/recovery;
- incorrect-password and absent-SSID negative cases;
- repeated BLE service replacement; and
- legacy IDF3 API compatibility probes.

These tests are valuable, but most either target later source changes, alter
persistent state, require operator intervention, or investigate a known
negative case rather than the consolidation itself.

## 6. Execution plan

### Stage 1: Physical and harness preflight

Before flashing or running functional tests:

1. confirm all three USB-path symlinks resolve to different devices;
2. probe the chip type and MAC address without writing flash;
3. inspect both V1 harnesses for loose links, unexpected external connections
   and removable peripherals;
4. record the starting selector and jumper states;
5. verify whether the C3 native USB Serial/JTAG connector and its selectable
   VBUS/external-power arrangement are available for the later UART test;
6. leave external power links open unless a test explicitly requires them; and
7. perform continuity or static REPL wiring checks before attributing a result
   to firmware.

The current firmware may be discarded. If it still provides a working REPL,
it may be used for a quick pre-flash wiring check, but that check is not POC
firmware evidence.

### Stage 2: Flash and identity verification

Flash the existing unmodified build for each board. Verify the write, reboot,
and query:

```javascript
process.env.BOARD
process.version
process.env.GIT_COMMIT
```

Expected results are:

| Target | Board | Version | Embedded commit |
|---|---|---|---|
| Classic ESP32 V1 | `ESP32_IDF5` | `2v29.504` | `953f89309` |
| ESP32-C3 V1 | `ESP32C3_IDF5` | `2v29.504` | `953f89309` |
| ESP32-S3 | `ESP32S3_IDF5` | `2v29.504` | `953f89309` |

Create the run-specific bench configuration and verify it before radio tests.
From the harness repository root, the Bash command will be:

```bash
POC_CONFIG=tests/WIFI_BLE/esp32_idf5_consolidation_poc_bench_config.json
python3 tools/repl/verify_bench_config.py "$POC_CONFIG"
```

Do not proceed with a mismatched identity or two positions resolving to the
same serial device.

### Stage 3: No-wiring family smoke tests

Run the 100-cycle no-wiring family UART lifecycle reproducer on all three
targets:

```text
docs/investigations/uart/repros/esp32_uart_driver_lifecycle_family.js
```

Use `tools/repl/run_test.py`, an explicit stable serial path and a timeout long
enough for all 100 cycles. Also run the BLE capability survey on the S3:

```text
tests/WIFI_BLE/ble/ble_capability_survey.js
```

The S3 survey confirms API availability but is not a substitute for a BLE
endpoint exchange. The current BLE two-board runners do not implement an S3
direction; this is an explicit coverage gap for this POC.

Do not use the newer ping lifecycle or ping-overlap test as a Stage 3 gate.
The fixed baseline predates the later ping-hardening commits and retains an
IPv4 parsing failure in the relevant non-IPv6 `stringToIP()` path. A resulting
ping failure would be pre-existing baseline behaviour, not evidence that the
automated consolidation selected the wrong source.

### Stage 4: Classic ESP32 V1 harness sequence

#### 4.1 Baseline hardware mode

Set and record:

| Selector or jumper | Required state |
|---|---|
| `SEL_D33` | pins 1-2, GPIO loopback |
| `SEL_D26` | pins 1-2, GPIO loopback |
| `SEL_D35` | MCP23008 interrupt / I2C mode |
| `JP_UART_LOOP2` | open |
| External 5 V or external target supply links | open |

Run the classic target wiring tools for blocks 1-5, followed by the applicable
shared scripts under `tests/repl/`:

- GPIO read/write, watch and pulse;
- analog read, PWM feedback and DAC logic feedback;
- MCP23008 register and interrupt tests;
- MCP3008 SPI test;
- basic two-device DS18B20 OneWire test.

Do not use `gpio_shiftout.js` as a core acceptance result: the present harness
observer arrangement does not provide a valid independent check for that
script.

If fitted, run the Grove MCP23008 and external SPI flash extension tests as
extended evidence.

#### 4.2 DS2413 extension mode

If the removable DS2413 board is fitted, move `SEL_D33` and `SEL_D26` to pins
2-3, run:

- `tools/wiring_tests/esp32_v1/onewire_gpio_block6.py`; and
- `tests/repl/onewire_block5/onewire_mixed_ds18b20_ds2413.js`.

Return both selectors to pins 1-2 before continuing.

#### 4.3 UART1/UART2 crosslink mode

Keep UART0 `D1`/`D3` reserved for flashing and REPL control. Set:

| Selector or jumper | Required state |
|---|---|
| `SEL_D35` | UART1 RX position |
| `JP_UART_LOOP2` | closed |

Run `tools/wiring_tests/esp32_v1/uart_block7.py`, then all 18 applicable
classic cross-UART scripts under `tests/repl/uart_block7/`. Exclude the
C3-specific `c3_uart_single_loop_lifecycle.js`.

After the UART tests, reopen `JP_UART_LOOP2` and restore `SEL_D35` to the
MCP23008 interrupt position.

### Stage 5: ESP32-C3 V1 harness sequence

The C3 harness is multiplexed. Photograph or record every transition rather
than assuming the preceding mode.

#### 5.1 Baseline GPIO mode

Use the documented `C3_BASELINE_GPIO` state:

- `SEL_D1`, `SEL_D2`, `SEL_D3` and `SEL_D4` at `a2-b2` for the two GPIO
  loopbacks;
- D0, D08, D10 and `J10` links open unless the wiring document requires a
  link for the specific subtest; and
- external power links open.

Run `tools/wiring_tests/esp32_c3/gpio_block1.py` and the applicable shared GPIO
scripts.

#### 5.2 Analog/PWM mode

Use `C3_ANALOG_PWM`: set `SEL_D0` to `a2-b2` for `ANALOG_FB`, leave `SEL_D08`
open during boot, and close it only when the documented test step requires it.
Run the target wiring tool and applicable shared analog scripts.

#### 5.3 Combined I2C/SPI mode

Use `C3_BUS_SPI_I2C`: set `SEL_D1`, `SEL_D2`, `SEL_D3` and `SEL_D4` to their
`a1-b1` bus positions, set `SEL_D10` to `a1-b1` for `I2C_INT`, retain
`SEL_D0=a2-b2` if target ADC comparison is included, and observe the
`SEL_D08` boot restriction. Run:

- `tools/wiring_tests/esp32_c3/i2c_spi_block34.py`;
- the shared MCP23008 register and interrupt scripts; and
- the shared MCP3008 SPI script.

If the external flash is fitted, change to `C3_SPI_FLASH_EXTENDED` by moving
`SEL_D10` to `a2-b2`, then run the shared flash-extension script before
restoring the combined bus mode.

#### 5.4 OneWire mode

Use `C3_ONEWIRE`, setting `SEL_D0` to `a1-b1` for the OneWire bus and retaining
the `SEL_D08` boot restriction. Run:

- `tools/wiring_tests/esp32_c3/onewire_block5.py`;
- `tests/repl/onewire_block5/onewire_ds18b20_basic.js`; and
- `tools/wiring_tests/esp32_c3/onewire_soak.py --scans 50`.

The current C3 harness has no DS2413 block, so the mixed-family test is not
applicable.

#### 5.5 Safe single-UART mode and full-crosslink exclusion

The D3-to-D4 single-UART lifecycle has its own power and console preconditions.
For this mode:

- use native USB Serial/JTAG on D18/D19 for REPL control;
- disconnect the onboard USB-UART cable;
- provide power through the documented, verified external 5 V or native-USB
  VBUS arrangement;
- set `SEL_D3=a2-b2` and `SEL_D4=a2-b2` for the loop-B path; and
- leave both `J10` signal shunts open.

Then run `tests/repl/uart_block7/c3_uart_single_loop_lifecycle.js` for its 100
cycles. Record the native-USB serial path separately; it is not the normal
board USB-UART path listed in Section 3.

Do not run the full C3 UART0/UART1 crosslink merely by fitting the `J10`
shunts. Although that mode also requires native USB Serial/JTAG control, its
D3-to-D20 direction additionally requires deliberate isolation of the onboard
CP2102N TX path. The D3-to-D4 single-loop lifecycle is the POC's C3 UART
evidence unless the full-crosslink electrical preconditions are separately
established and verified.

### Stage 6: Two-board Wi-Fi endpoint tests

Use only generated test SSIDs and credentials for the core peer tests. These
tests do not need the local router credentials.

Run all four positive role directions supported for the three POC boards:

```bash
POC_CONFIG=tests/WIFI_BLE/esp32_idf5_consolidation_poc_bench_config.json

python3 tools/repl/run_wifi_peer_test.py --config "$POC_CONFIG" \
  --scenario positive --direction c3-peer
python3 tools/repl/run_wifi_peer_test.py --config "$POC_CONFIG" \
  --scenario positive --direction esp32-peer
python3 tools/repl/run_wifi_peer_test.py --config "$POC_CONFIG" \
  --scenario positive --direction esp32-peer-s3
python3 tools/repl/run_wifi_peer_test.py --config "$POC_CONFIG" \
  --scenario positive --direction s3-peer
```

The role mapping is:

| Direction | AP/UDP peer | Station target |
|---|---|---|
| `c3-peer` | ESP32-C3 | Classic ESP32 |
| `esp32-peer` | Classic ESP32 | ESP32-C3 |
| `esp32-peer-s3` | Classic ESP32 | ESP32-S3 |
| `s3-peer` | ESP32-S3 | Classic ESP32 |

For each direction report scan, WPA2 association, DHCP, event, UDP exchange,
cleanup and ping separately. The independent UDP request/reply exchange is the
principal endpoint proof. Do not convert a known baseline ping failure into a
failure of otherwise successful association and UDP evidence.

Do not use `--skip-scan` in the first run. Scanning is part of the transformed
network wrapper's exercised behaviour. Use `--skip-scan` only as an isolation
step if the initial result needs diagnosis.

As recommended extended evidence, run both target-hosted AP directions:

```bash
python3 tools/repl/run_wifi_target_ap_test.py --config "$POC_CONFIG" \
  --target-board c3
python3 tools/repl/run_wifi_target_ap_test.py --config "$POC_CONFIG" \
  --target-board esp32
```

These add target AP service, custom subnet, station association and UDP
coverage. Record `setAPIP()`, ping and UDP subresults independently because
historical results contain shared callback and ping anomalies.

One station transition lifecycle may then be run with the C3 as the controlled
peer and classic ESP32 as the target:

```bash
python3 tools/repl/run_wifi_peer_test.py --config "$POC_CONFIG" \
  --target-script tests/WIFI_BLE/wifi/wifi_station_transition_lifecycle.js \
  --direction c3-peer \
  --target-timeout 90 --overall-timeout-ms 60000
```

This is extended lifecycle evidence, not required proof if the four basic peer
directions already provide clear results.

### Stage 7: Two-board BLE endpoint tests

#### 7.1 Filtered advertising and scan

Run both classic/C3 role directions:

```bash
python3 tools/repl/run_ble_peer_test.py --config "$POC_CONFIG" \
  --direction c3-peer
python3 tools/repl/run_ble_peer_test.py --config "$POC_CONFIG" \
  --direction esp32-peer
```

The runner generates a unique name and token, advertises from the peer, and
requires the target to find the matching address, RSSI and service data.

Retain this test because it exercises a real two-board radio path, but report
it with its known history: current-master qualification has previously
returned an empty filtered-scan result in both directions. A repeated empty
result must be preserved and investigated; it must not be presented as a new
consolidation regression without same-source comparison evidence.

#### 7.2 GATT client/peripheral exchange

Use the GATT runner as the primary BLE endpoint proof in both directions:

```bash
python3 tools/repl/run_ble_gatt_test.py --config "$POC_CONFIG" \
  --direction c3-peer
python3 tools/repl/run_ble_gatt_test.py --config "$POC_CONFIG" \
  --direction esp32-peer
```

The exchange must prove service and characteristic discovery, a correlated
read, two writes observed by the peripheral, and deliberate disconnect.

Do not add `--service-replacements 50` to the core run. That option is a
focused lifecycle stress test with historical C3-peripheral intermittency. It
may be used later as a diagnostic, with the peripheral role and every reboot
or assertion recorded.

### Stage 8: Combined BLE and Wi-Fi coexistence

If the isolated router, ignored local credentials file and bench-PC network
address are ready, run one combined endpoint test as recommended extended
evidence:

```bash
python3 tools/repl/run_ble_https_test.py --config "$POC_CONFIG" \
  --direction classic-target \
  --local-server-address <BENCH_PC_LAN_IPV4>
```

In this test the target simultaneously acts as a BLE GATT peripheral, Wi-Fi
station and HTTPS client, while the other board acts as the GATT central and
the bench PC supplies the TLS endpoint. This is high-value combined coverage
because both network backends were within the transformed source set.

The reverse `--direction c3-target` run is optional. Credentials must remain in
the ignored `tests/WIFI_BLE/local_wifi_credentials.json`; do not copy them into
the result document or raw logs.

### Stage 9: Failure triage and comparison

For any unexpected result:

1. preserve the complete first-run log;
2. verify target identity, harness mode, selectors and serial ownership;
3. repeat once without changing firmware;
4. run the smallest relevant test to isolate the failing API or peripheral;
5. compare with existing result records and known baseline limitations;
6. if causation remains unclear, run the same test on an unchanged build from
   the exact POC baseline using the same IDF, hardware, configuration and
   runner; and
7. classify the result as transformation regression, pre-existing firmware
   behaviour, harness/setup issue, runner issue or unresolved.

Do not attribute a failure to the automated transformation merely because it
appears during this run. Conversely, do not suppress a failure because a
similar historical issue exists; record both the observed result and the
comparison evidence.

## 7. Wi-Fi and BLE test inventory reviewed

### 7.1 Wi-Fi runners and roles

| Runner or script family | Coverage | POC use |
|---|---|---|
| `run_wifi_peer_test.py`, default positive scenario | Generated WPA2 AP, station scan/connect, DHCP, events, ping, bidirectional UDP and cleanup | **Core**, four supported POC directions |
| `run_wifi_target_ap_test.py` | Selected target hosts WPA2 AP and UDP service; peer is DHCP or static station | **Extended**, classic and C3 target directions |
| `wifi_station_transition_lifecycle.js` through peer runner | Connect/scan/reconnect/disconnect/reconnect and UDP through several station states | **Extended**, one selected direction |
| `wifi_connect_cancel_lifecycle.js` | Cancel plus five connection cycles | Diagnostic; later lifecycle focus |
| `wifi_station_recovery_lifecycle.js` with `wifi_recovery_peer.js` | Peer AP removal/restoration and explicit reconnect | Diagnostic recovery test |
| `run_wifi_peer_test.py --scenario negative` | Wrong password and absent SSID with independent peer evidence | Diagnostic negative test |
| `run_wifi_restore_test.py` | Writes `.wificfg`, hardware reboot, restore, UDP and cleanup | Diagnostic; persistent-state mutation |
| `run_wifi_local_test.py` | Credentialed local-router lifecycle and hardening scripts | Diagnostic; later connect/disconnect source changes |
| `run_wifi_connect_reset_test.py` and `run_wifi_disconnect_reset_test.py` | Callback detachment and reset lifetime | Diagnostic; later hardening contracts |
| `run_wifi_manual_ap_test.py` | Operator removes and restores AP | Interactive diagnostic |
| `wifi_ping_lifecycle.js`, ping reset and overlap probes | Address, callback, overlap and reset ownership | Diagnostic; fixed baseline predates hardening |
| `wifi_apsta_transition_lifecycle.js` | Classic AP/APSTA/station transitions | Optional classic-only diagnostic |
| `wifi_classic_idf3_*` scripts | Legacy IDF3 API accessors and compatibility probes | Not applicable to the IDF5 consolidation runtime test |

The connect hardening commit `610007d3f`, disconnect hardening commit
`14cd9932f`, and later ping-hardening work are not ancestors of the fixed POC
baseline. Their focused tests therefore remain useful probes, but their newer
expected behaviour is not a valid pass/fail contract for this POC.

### 7.2 BLE and combined runners

| Runner or script family | Coverage | POC use |
|---|---|---|
| `run_ble_peer_test.py` | Generated advertiser name/token and filtered discovery with service data, address and RSSI | **Core**, classic/C3 both directions; preserve known scan anomaly |
| `run_ble_gatt_test.py` | Central/peripheral service discovery, read, two writes and disconnect | **Core**, primary BLE endpoint proof in both directions |
| `run_ble_gatt_test.py --service-replacements 50` | Repeated service replacement before advertising | Diagnostic lifecycle stress |
| `run_ble_https_test.py` | Concurrent BLE GATT peripheral plus Wi-Fi station and HTTPS client, with second-board central and PC TLS endpoint | **Extended**, default classic-target direction; reverse optional |
| `ble_capability_survey.js` | API and capability presence on one board | S3 smoke only; not endpoint proof |

Existing BLE peer runners do not provide an ESP32-S3 direction. Adding that
direction would be useful future runner work, but it is not necessary to alter
the test tooling before this POC run unless stakeholder review specifically
requires S3 BLE endpoint qualification.

## 8. Completion criteria

The runtime stage is complete when:

- all three targets have verified POC firmware identity;
- each core test has a result, including preserved failures and skipped tests
  with explicit reasons;
- classic and C3 harness modes and selectors are recorded for every wired run;
- all four supported Wi-Fi POC role directions have independent endpoint
  results;
- classic/C3 BLE advertising and GATT results exist in both directions;
- extended tests selected for this run are clearly separated from the core
  result; and
- every unexpected result has a triage classification or is explicitly left
  unresolved for stakeholder review.

The result summary should use one row per target, mode and endpoint direction.
Totals may be included for readability, but totals must not conceal individual
failed, skipped or known-baseline subchecks.

## 9. References

- [POC specification](ESP_IDF5_consolidation_POC_Specification.md)
- [Build and flash evidence](ESP_IDF5_consolidation_POC_Build_Flash_Evidence.md)
- [Runtime test evidence](ESP_IDF5_consolidation_POC_Runtime_Test_Evidence.md)
- [Wi-Fi and BLE test guide](../../../tests/WIFI_BLE/README.md)
- [Shared REPL test guide](../../../tests/repl/README.md)
- [ESP32-family V1 test handover](../../handoff/2026-06-25-esp32-family-tests.md)
- [Classic ESP32 V1 wiring](../../targets/esp32-devkitc-v4/wiring.md)
- [ESP32-C3 V1 wiring](../../targets/esp32-c3-devkitc-02/wiring.md)
- [Firmware-lineage interpretation](../../handoff/2026-07-20-esp32-firmware-lineage-and-test-interpretation.md)
