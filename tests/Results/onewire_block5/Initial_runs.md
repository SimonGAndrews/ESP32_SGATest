# Initial REPL Runs During Development

This note records the first shared block 5 `onewire_block` bench run from the
common REPL functional suite on the classic ESP32 harness.

The shared OneWire file is:

- `tests/repl/onewire_block5/onewire_ds18b20_basic.js`

It keeps the test focused on Espruino OneWire API behaviour and follows the
existing target-specific V1 DS18B20 regression logic closely enough to act as a
small shared reproducer.

This run used the shared Python runner:

```bash
python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js \
  --port /dev/ttyUSB0 --timeout 12
```

Bench metadata for this run:

- board: `ESP32`
- version: `2v29.97`
- git commit: `916c92d63`
- port: `/dev/ttyUSB0`
- target preset resolved by test: `ESP32_V1`
- harness mode: `ESP32_BASELINE_HARDWARE`
- selector state confirmed on bench:
  `SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open`

## board=ESP32

### Shared Test: `onewire_ds18b20_basic`

TEST=onewire_ds18b20_basic
TARGET=ESP32_V1
INFO board=ESP32
INFO api=OneWire.reset,OneWire.search,OneWire.skip,OneWire.select,OneWire.write,OneWire.read
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
INFO onewire_dq=D13
INFO search_passes=6
INFO convert_wait_ms=1000
METRIC onewire_reset=true
PASS onewire_reset value=true
METRIC onewire_scan_0=["28b27e8700667bcf"]
METRIC onewire_scan_1=["28b27e8700667bcf","289ac18700ef2bbe","3a27d15e000000f2"]
METRIC onewire_scan_2=["28b27e8700667bcf"]
METRIC onewire_scan_3=[]
METRIC onewire_scan_4=["28b27e8700667bcf"]
METRIC onewire_scan_5=["28b27e8700667bcf","289ac18700ef2bbe"]
METRIC onewire_device_count=3
METRIC onewire_roms=["28b27e8700667bcf","289ac18700ef2bbe","3a27d15e000000f2"]
FAIL onewire_device_count count=3
FAIL onewire_search_stability two_rom_scans=1/6
FAIL onewire_distinct_roms roms=["28b27e8700667bcf","289ac18700ef2bbe","3a27d15e000000f2"]
FAIL onewire_family_codes roms=["28b27e8700667bcf","289ac18700ef2bbe","3a27d15e000000f2"]
METRIC onewire_scratch_0=c80100007fe13caa23
METRIC onewire_temp_c_0=28.5
PASS onewire_scratch_len_0 len=9
PASS onewire_scratch_crc_0 hex=c80100007fe13caa23
PASS onewire_scratch_data_0 hex=c80100007fe13caa23
PASS onewire_temp_plausible_0 temp_c=28.5
METRIC onewire_scratch_1=cb0100007fe13caae6
METRIC onewire_temp_c_1=28.6875
PASS onewire_scratch_len_1 len=9
PASS onewire_scratch_crc_1 hex=cb0100007fe13caae6
PASS onewire_scratch_data_1 hex=cb0100007fe13caae6
PASS onewire_temp_plausible_1 temp_c=28.6875
METRIC onewire_scratch_2=ffffffffffffffffff
METRIC onewire_temp_c_2=-0.0625
PASS onewire_scratch_len_2 len=9
FAIL onewire_scratch_crc_2 hex=ffffffffffffffffff
FAIL onewire_scratch_data_2 hex=ffffffffffffffffff
PASS onewire_temp_plausible_2 temp_c=-0.0625
PASS onewire_scratch_count scratchpads=3 roms=3
METRIC checks_total=18
METRIC checks_passed=12
METRIC checks_failed=6
DONE=onewire_ds18b20_basic

### Canonical V1 Regression Cross-Check

The target-specific reference script was then rerun against the same bench:

```bash
python3 tools/wiring_tests/esp32_v1/onewire_block5.py --port /dev/ttyUSB0
```

That script reproduced the same core behaviour:

- intermittent empty and single-device `OneWire.search()` passes
- occasional phantom third ROM such as `3a27d15e000000f2`
- good scratchpad/CRC on the two real DS18B20 devices
- all-`ff` scratchpad on the phantom ROM

So the present conclusion is:

- the selector correction did not fix block 5
- the new shared JS test is behaving consistently with the existing canonical
  V1 OneWire regression script
- this should be treated as classic ESP32 block 5 firmware/investigation
  territory, not yet as a shared-suite design problem

## Legacy Firmware Retest With OneWire Patch

Date:

- `2026-07-08`

Firmware source used for this retest:

- repo: `/home/simon/MaBecker/Espruino_master`
- branch: `fix/esp32-onewire-quiet-timing`
- patch commit on branch head: `957e837f2`
- patch intent: localized ESP32 OneWire timing guard plus `OneWire.searchDebug()`
- build path: legacy `ESP32` target, not `ESP32_IDF4`
- provision command used:
  `source ./scripts/provision.sh ESP32`
- build command used:
  `BOARD=ESP32 RELEASE=1 make`
- flash command used:
  `BOARD=ESP32 RELEASE=1 make flash COMPORT=/dev/ttyUSB0`

Bench metadata observed after flashing:

- board: `ESP32`
- version: `2v29.101`
- `typeof (new OneWire(D13)).searchDebug` -> `function`
- `process.env.GIT_COMMIT` still reported `916c92d63`, so API presence was the
  practical proof that the patched firmware image was running

### Shared Test: `onewire_ds18b20_basic`

The same shared block 5 test was rerun after flashing the patched legacy
firmware:

```bash
python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js \
  --port /dev/ttyUSB0 --timeout 12
```

Observed behaviour:

- `OneWire.search()` no longer wandered between empty, one-device, and
  two-device results
- instead it returned the same three ROMs on every pass
- the third ROM was `3a27d15e000000f2`

That third ROM was then checked with `searchDebug()`:

```bash
python3 tools/common/onewire_search_debug.py --port /dev/ttyUSB0 --pin D13 --runs 5
```

Important interpretation:

- family code `0x3A` matches the DS2413 OneWire GPIO device
- so the third ROM is not random search corruption
- it indicates that the DS2413 breakout is physically present on the same
  `D13` OneWire bus during this block 5 retest

This means the original shared block 5 DS18B20 test precondition was not met
for that retest: it assumed every discovered ROM on the bus was a DS18B20 and
therefore tried to read DS18B20 scratchpads from the DS2413 as well.

### Filtered DS18B20 Follow-Up

A direct REPL check filtered the OneWire search results down to family `0x28`
DS18B20 devices only and then read scratchpads from just those two ROMs.

Observed result:

- the bus still reported the two expected DS18B20 ROMs plus the DS2413 ROM
- the filtered DS18B20 scratchpads were:
  - `af0101017fe13dab51`
  - `b10101017fe13dabbd`
- both filtered DS18B20 scratchpads failed Maxim CRC

So the patched legacy build changed the failure shape in an important way:

- search enumeration became stable and deterministic
- but DS18B20 readback is still not correct on this legacy ESP32 build

Current conclusion from the patched legacy retest:

- the earlier C3-proven OneWire patch is definitely present in the flashed
  legacy firmware
- it is not yet sufficient evidence for an upstream PR targeted at the legacy
  `ESP32` build
- block 5 shared-test preconditions also need clarifying when the removable
  DS2413 breakout is installed on the same bus
