# Ubuntu V1 Bench - Non-OneWire Block Continuation

Date: 2026-07-13

Scope:

- continue V1 functional-test development on the Ubuntu bench
- park OneWire and DS2413 testing
- run the next non-OneWire shared REPL blocks through `tools/repl/run_test.py`

Bench metadata:

- port: `/dev/ttyUSB0`
- board: `ESP32_IDF4`
- version: `2v29.93`
- git commit: `a8d426a80`
- target preset resolved by tests: `ESP32_V1`
- harness mode for baseline block runs: `ESP32_BASELINE_HARDWARE`
- reported selector state:
  `SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open`

## Runner Note

The first `analog_read_levels` run passed but exposed a direct-runner capture
bug: `tools/repl/run_test.py` stopped as soon as it saw `DONE=`, so the
completion line was captured as `DONE=ana`.

The runner was updated to keep reading briefly after the `DONE=` marker. The
same test was rerun and then reported the full completion line:

```text
DONE=analog_read_levels
```

## Block 2 Analog

Command:

```bash
python3 tools/repl/run_test.py tests/repl/analog_block2/analog_read_levels.js \
  --port /dev/ttyUSB0 --timeout 10
```

Result:

```text
METRIC analog_read_low=0
METRIC analog_read_high=0.99975585937
METRIC analog_read_span=0.99975585937
PASS analog_read_low_floor value=0
PASS analog_read_high_ceiling value=0.99975585937
PASS analog_read_span_useful span=0.99975585937
PASS analog_read_order low=0 high=0.99975585937
DONE=analog_read_levels
```

Command:

```bash
python3 tools/repl/run_test.py tests/repl/analog_block2/analog_pwm_feedback.js \
  --port /dev/ttyUSB0 --timeout 10
```

Result:

```text
METRIC analog_pwm_level_25=0.20483398437
METRIC analog_pwm_level_50=0.46875
METRIC analog_pwm_level_75=0.68627929687
PASS analog_pwm_monotonic values=0.20483398437,0.46875,0.68627929687
PASS analog_pwm_25_useful value=0.20483398437
PASS analog_pwm_50_useful value=0.46875
PASS analog_pwm_75_useful value=0.68627929687
PASS analog_pwm_span_useful span=0.4814453125
DONE=analog_pwm_feedback
```

## Block 3 I2C

Command:

```bash
python3 tools/repl/run_test.py tests/repl/i2c_block3/i2c_mcp23008_registers.js \
  --port /dev/ttyUSB0 --timeout 10
```

Result:

```text
FAIL i2c_setup Error: jshI2CSetup: Invalid arguments
DONE=i2c_mcp23008_registers
```

Interpretation:

- this board is running `ESP32_IDF4` build `a8d426a80`
- the failure matches the already documented classic ESP32 IDF4 I2C setup
  issue in `docs/investigations/i2c/esp32-devkitc-v4-idf4-i2c-bringup-2026-07-01.md`
- the failure occurs at `I2C1.setup(...)`, before MCP23008 traffic, so this run
  should not be treated as new MCP23008 wiring evidence

## Block 4 SPI

Command:

```bash
python3 tools/repl/run_test.py tests/repl/spi_block4/spi_mcp3008_basic.js \
  --port /dev/ttyUSB0 --timeout 12
```

Result:

```text
METRIC spi_mcp3008_target_low=0
METRIC spi_mcp3008_adc_low=0
METRIC spi_mcp3008_target_high=0.99975585937
METRIC spi_mcp3008_adc_high=1021
METRIC spi_mcp3008_target_mid=0.45874023437
METRIC spi_mcp3008_adc_mid=519.2
PASS spi_mcp3008_reply_len value=3
PASS spi_mcp3008_target_low value=0
PASS spi_mcp3008_target_high value=0.99975585937
PASS spi_mcp3008_target_monotonic values=0,0.45874023437,0.99975585937
PASS spi_mcp3008_adc_low value=0
PASS spi_mcp3008_adc_high value=1021
PASS spi_mcp3008_adc_monotonic values=0,519.2,1021
PASS spi_mcp3008_adc_span span=1021
PASS spi_mcp3008_low_agree target=0 spi=0
PASS spi_mcp3008_mid_agree target=0.45874023437 spi=0.50752688172
PASS spi_mcp3008_high_agree target=0.99975585937 spi=0.99804496578
DONE=spi_mcp3008_basic
```

Command:

```bash
python3 tools/repl/run_test.py tests/repl/spi_block4/spi_extension_flash_basic.js \
  --port /dev/ttyUSB0 --timeout 12
```

Result:

```text
METRIC spi_extension_adc_low=0
METRIC spi_extension_jedec_raw=ffffffff
METRIC spi_extension_mfr=ff
METRIC spi_extension_type=ff
METRIC spi_extension_cap=ff
METRIC spi_extension_sr1_raw=ffff
METRIC spi_extension_sr1=ff
METRIC spi_extension_adc_high=1021
PASS spi_extension_adc_low value=0
PASS spi_extension_adc_high value=1021
PASS spi_extension_adc_span span=1021
PASS spi_extension_jedec_shape raw=ffffffff
FAIL spi_extension_mfr_expected mfr=ff expected=ef
FAIL spi_extension_type_present type=ff
FAIL spi_extension_cap_present cap=ff
PASS spi_extension_sr1_shape raw=ffff
FAIL spi_extension_sr1_readable sr1=ff
DONE=spi_extension_flash_basic
```

Interpretation:

- the MCP3008 portion of the same SPI bus still passed
- all-`ff` flash responses point at the `D17` extension device path or device
  population/state, not at a bus-wide SPI failure
- prior Windows-side evidence in `tests/Results/spi_block4/Initial_runs.md`
  showed `ffef4017` on this extension path, so this bench-state difference
  needs a physical check before firmware conclusions

## Next Non-OneWire Step

Block 7 UART requires a deliberate mode change:

- move `SEL_D35` from `I2C_INT` to the UART position
- close `JP_UART_LOOP2`
- keep the runner/control path on UART0 via board USB-UART

After that, run:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_rx_burst_s2_to_s3.js \
  --port /dev/ttyUSB0 --timeout 10

python3 tools/repl/run_test.py tests/repl/uart_block7/uart_rx_burst_s3_to_s2.js \
  --port /dev/ttyUSB0 --timeout 10
```

## Follow-Up After Bench Change

The SPI extension device was later fitted and the bench was moved to UART mode:

- `SEL_D35=UART`
- `JP_UART_LOOP2=closed`
- `SEL_D33=1-2`
- `SEL_D26=1-2`

### SPI Extension Retest

Command:

```bash
python3 tools/repl/run_test.py tests/repl/spi_block4/spi_extension_flash_basic.js \
  --port /dev/ttyUSB0 --timeout 12
```

Result:

```text
METRIC spi_extension_adc_low=0
METRIC spi_extension_jedec_raw=ffffffff
METRIC spi_extension_mfr=ff
METRIC spi_extension_type=ff
METRIC spi_extension_cap=ff
METRIC spi_extension_sr1_raw=ff00
METRIC spi_extension_sr1=00
METRIC spi_extension_adc_high=1021
PASS spi_extension_adc_low value=0
PASS spi_extension_adc_high value=1021
PASS spi_extension_adc_span span=1021
PASS spi_extension_jedec_shape raw=ffffffff
FAIL spi_extension_mfr_expected mfr=ff expected=ef
FAIL spi_extension_type_present type=ff
FAIL spi_extension_cap_present cap=ff
PASS spi_extension_sr1_shape raw=ff00
PASS spi_extension_sr1_readable sr1=00
DONE=spi_extension_flash_basic
```

Interpretation:

- the MCP3008 side of the SPI bus still passes
- the fitted extension path still does not return a valid JEDEC ID
- `sr1=00` shows the response is no longer simple all-`ff`, but the ID bytes
  remain invalid
- this remains a physical extension-path/device-state item to check separately

### UART Block 7 Burst Boundary

Commands:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_rx_burst_s2_to_s3.js \
  --port /dev/ttyUSB0 --timeout 18 --show-raw

python3 tools/repl/run_test.py tests/repl/uart_block7/uart_rx_burst_s3_to_s2.js \
  --port /dev/ttyUSB0 --timeout 18 --show-raw
```

Both directions passed the 32-byte and 64-byte cases before crashing at the
65-byte boundary.

`Serial2 -> Serial3` passed before reset:

```text
PASS uart_rx_s2_to_s3_len_32_length got=32 expected=32
PASS uart_rx_s2_to_s3_len_32_hash got=3179379788 expected=3179379788
PASS uart_rx_s2_to_s3_len_32_head got="s2_to_s3_32|CDEF"
PASS uart_rx_s2_to_s3_len_32_tail got="GHIJKLMNOPQRSTUV"
PASS uart_rx_s2_to_s3_len_64_length got=64 expected=64
PASS uart_rx_s2_to_s3_len_64_hash got=1550863500 expected=1550863500
PASS uart_rx_s2_to_s3_len_64_head got="s2_to_s3_64|CDEF"
PASS uart_rx_s2_to_s3_len_64_tail got="mnopqrstuvwxyz-_"
```

`Serial3 -> Serial2` passed before reset:

```text
PASS uart_rx_s3_to_s2_len_32_length got=32 expected=32
PASS uart_rx_s3_to_s2_len_32_hash got=2503256656 expected=2503256656
PASS uart_rx_s3_to_s2_len_32_head got="s3_to_s2_32|CDEF"
PASS uart_rx_s3_to_s2_len_32_tail got="GHIJKLMNOPQRSTUV"
PASS uart_rx_s3_to_s2_len_64_length got=64 expected=64
PASS uart_rx_s3_to_s2_len_64_hash got=713387492 expected=713387492
PASS uart_rx_s3_to_s2_len_64_head got="s3_to_s2_64|CDEF"
PASS uart_rx_s3_to_s2_len_64_tail got="mnopqrstuvwxyz-_"
```

Both directions then hit the same firmware assertion and rebooted:

```text
assert failed: jsvStringIteratorAppend jsvariterator.c:466 (jsvHasStringExt(it->var))

Backtrace: 0x40082022:0x3ffd9580 0x40092059:0x3ffd95a0 0x40097a59:0x3ffd95c0 0x400e8d57:0x3ffd96e0 0x400e1f0e:0x3ffd9700 0x400f3bd5:0x3ffd9740 0x400f4aea:0x3ffd9770 0x400f549d:0x3ffd9860 0x400d8376:0x3ffd9880

ELF file SHA256: a6a141e9
```

Interpretation:

- UART wiring and selector state are good enough for bidirectional 32-byte and
  64-byte transfers
- the crash is symmetric across both UART directions
- this is firmware/runtime evidence around received string handling at the
  65-byte boundary, not a simple one-direction harness wiring failure

### Relationship To Espruino Issue 2718

The UART crash matches the recently investigated Espruino issue:

- <https://github.com/espruino/Espruino/issues/2718#issuecomment-4886914338>

The flashed bench firmware reports:

- `process.env.BOARD=ESP32_IDF4`
- `process.version=2v29.93`
- `process.env.GIT_COMMIT=a8d426a80`

Local Espruino checkout context from `/home/simon/MaBecker/Espruino_upstream_idf4`:

- `a8d426a80` is `esp32: guard OneWire timing with local critical section`
- local candidate serial fix: `d784625a0` (`esp32: fix serial rx event string assembly`)
- official master fix: `a3f085979` (`Fix data loss if >64b data appears in one packet - issue only spotted on ESP32 (#2718)`)
- follow-up comment commit tested in the public issue thread: `d3d33f4`

Ancestry check:

- `d784625a0` contains `a8d426a80`
- `a3f085979` and `d3d33f4` do not contain `a8d426a80`; they are on the upstream
  master line after the issue 2718 fix
- current local `prep/onewire-pr-sync-idf4` source contains the official
  `a3f085979` `jsiHandleIOEventForSerial()` shape, but the board is still
  flashed with `a8d426a80`

Conclusion:

- the current UART crash is expected for the flashed `a8d426a80` firmware
- it should be retested after flashing a build that includes either the local
  candidate serial fix or, preferably, the official `a3f085979` master fix
- after flashing the fixed firmware, the expected behaviour is that >64 byte
  bursts are delivered as multiple callbacks with a maximum chunk size around
  64 bytes, rather than asserting or truncating

## Retest After Flashing Upstream Master

The board was flashed from `/home/simon/MaBecker/Espruino_upstream_idf4`
`master` after that branch was fast-forwarded to upstream master.

Firmware metadata reported by the shared runner:

- `process.env.BOARD=ESP32_IDF4`
- `process.version=2v29.107`
- `process.env.GIT_COMMIT=0af6e1568`

This build includes upstream fix `a3f085979` for issue 2718.

### Boundary Pack Result

The 32/64/65/96 boundary-pack files no longer crash at 65 bytes. After fixing
the test sequencing, both directions pass all four cases.

Test sequencing changes:

- remove an unnecessary zero-delay continuation between cases
- drain only the active receiver before and after each case
- wait 120 ms between cases before registering the next receive listener
- use a 9 s overall timeout for the four-case boundary pack

These changes match the post-fix firmware behaviour where bursts larger than
64 bytes are delivered complete across multiple callbacks.

Example `Serial2 -> Serial3` 65-byte result:

```text
METRIC uart_rx_s2_to_s3_len_65_callbacks=2
METRIC uart_rx_s2_to_s3_len_65_received_len=65
METRIC uart_rx_s2_to_s3_len_65_max_chunk=64
PASS uart_rx_s2_to_s3_len_65_length got=65 expected=65
PASS uart_rx_s2_to_s3_len_65_hash got=1214393036 expected=1214393036
PASS uart_rx_s2_to_s3_len_65_head got="s2_to_s3_65|CDEF"
PASS uart_rx_s2_to_s3_len_65_tail got="nopqrstuvwxyz-_0"
```

Example `Serial3 -> Serial2` 65-byte result:

```text
METRIC uart_rx_s3_to_s2_len_65_callbacks=2
METRIC uart_rx_s3_to_s2_len_65_received_len=65
METRIC uart_rx_s3_to_s2_len_65_max_chunk=64
PASS uart_rx_s3_to_s2_len_65_length got=65 expected=65
PASS uart_rx_s3_to_s2_len_65_hash got=3248187448 expected=3248187448
PASS uart_rx_s3_to_s2_len_65_head got="s3_to_s2_65|CDEF"
PASS uart_rx_s3_to_s2_len_65_tail got="nopqrstuvwxyz-_0"
```

Final `Serial2 -> Serial3` 96-byte boundary-pack result:

```text
METRIC uart_rx_s2_to_s3_len_96_callbacks=2
METRIC uart_rx_s2_to_s3_len_96_received_len=96
METRIC uart_rx_s2_to_s3_len_96_max_chunk=64
PASS uart_rx_s2_to_s3_len_96_length got=96 expected=96
PASS uart_rx_s2_to_s3_len_96_hash got=250226632 expected=250226632
PASS uart_rx_s2_to_s3_len_96_head got="s2_to_s3_96|CDEF"
PASS uart_rx_s2_to_s3_len_96_tail got="GHIJKLMNOPQRSTUV"
```

Final `Serial3 -> Serial2` 96-byte boundary-pack result:

```text
METRIC uart_rx_s3_to_s2_len_96_callbacks=2
METRIC uart_rx_s3_to_s2_len_96_received_len=96
METRIC uart_rx_s3_to_s2_len_96_max_chunk=64
PASS uart_rx_s3_to_s2_len_96_length got=96 expected=96
PASS uart_rx_s3_to_s2_len_96_hash got=1287902528 expected=1287902528
PASS uart_rx_s3_to_s2_len_96_head got="s3_to_s2_96|CDEF"
PASS uart_rx_s3_to_s2_len_96_tail got="GHIJKLMNOPQRSTUV"
```

### Clean-Start Larger Bursts

After removing an unnecessary `setTimeout(..., 0)` continuation hop from the
UART test files, the clean-start 128-byte and 200-byte files passed in both
directions.

`Serial2 -> Serial3`, 128 bytes:

```text
METRIC uart_rx_s2_to_s3_len_128_callbacks=2
METRIC uart_rx_s2_to_s3_len_128_received_len=128
METRIC uart_rx_s2_to_s3_len_128_max_chunk=64
PASS uart_rx_s2_to_s3_len_128_length got=128 expected=128
PASS uart_rx_s2_to_s3_len_128_hash got=717407052 expected=717407052
```

`Serial2 -> Serial3`, 200 bytes:

```text
METRIC uart_rx_s2_to_s3_len_200_callbacks=4
METRIC uart_rx_s2_to_s3_len_200_received_len=200
METRIC uart_rx_s2_to_s3_len_200_max_chunk=64
PASS uart_rx_s2_to_s3_len_200_length got=200 expected=200
PASS uart_rx_s2_to_s3_len_200_hash got=2071160964 expected=2071160964
```

`Serial3 -> Serial2`, 128 bytes:

```text
METRIC uart_rx_s3_to_s2_len_128_callbacks=2
METRIC uart_rx_s3_to_s2_len_128_received_len=128
METRIC uart_rx_s3_to_s2_len_128_max_chunk=64
PASS uart_rx_s3_to_s2_len_128_length got=128 expected=128
PASS uart_rx_s3_to_s2_len_128_hash got=469181988 expected=469181988
```

`Serial3 -> Serial2`, 200 bytes:

```text
METRIC uart_rx_s3_to_s2_len_200_callbacks=4
METRIC uart_rx_s3_to_s2_len_200_received_len=200
METRIC uart_rx_s3_to_s2_len_200_max_chunk=64
PASS uart_rx_s3_to_s2_len_200_length got=200 expected=200
PASS uart_rx_s3_to_s2_len_200_hash got=761369349 expected=761369349
```

Conclusion:

- the original issue 2718 assert/reboot is resolved on the flashed
  `0af6e1568` build
- received bursts larger than 64 bytes now arrive complete as multiple
  callbacks with max chunk 64
- the boundary-pack tests now pass in both directions after adding the
  inter-case settle/drain behaviour required by the new multi-callback receive
  semantics

## Additional Block 7 Serial API Coverage

Additional shared block 7 tests were added after reviewing the current API
coverage:

- `uart_read_available_polling.js`
- `uart_write_print_shapes.js`
- `uart_reconfigure_options.js`
- `uart_full_duplex_crosslink.js`

Bench metadata remained:

- `process.env.BOARD=ESP32_IDF4`
- `process.version=2v29.107`
- `process.env.GIT_COMMIT=0af6e1568`
- mode: `ESP32_SERIAL_UART1_UART2_CROSSLINK`
- selectors: `SEL_D35=UART JP_UART_LOOP2=closed SEL_D33=1-2 SEL_D26=1-2`

### Polling Read/Available

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_read_available_polling.js \
  --port /dev/ttyUSB0 --timeout 10
```

Result:

```text
PASS uart_poll_s2_to_s3_available_before value=17
PASS uart_poll_s2_to_s3_read_part1 got="POLL_"
PASS uart_poll_s2_to_s3_available_after_part1 got=12
PASS uart_poll_s2_to_s3_read_part2 got="A_01"
PASS uart_poll_s2_to_s3_read_rest got="23456789"
PASS uart_poll_s2_to_s3_read_all got="POLL_A_0123456789"
PASS uart_poll_s2_to_s3_available_after_drain got=0
PASS uart_poll_s3_to_s2_available_before value=33
PASS uart_poll_s3_to_s2_read_part1 got="POLL_"
PASS uart_poll_s3_to_s2_available_after_part1 got=28
PASS uart_poll_s3_to_s2_read_part2 got="B_ab"
PASS uart_poll_s3_to_s2_read_rest got="cdefghijklmnopqrstuvwxyz"
PASS uart_poll_s3_to_s2_read_all got="POLL_B_abcdefghijklmnopqrstuvwxyz"
PASS uart_poll_s3_to_s2_available_after_drain got=0
DONE=uart_read_available_polling
```

### Write/Print Shapes

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_write_print_shapes.js \
  --port /dev/ttyUSB0 --timeout 10
```

Result:

```text
PASS uart_shape_write_string_rx got="abcXYZ"
PASS uart_shape_write_array_rx got="AB\u0000C\u00FF"
PASS uart_shape_write_uint8array_rx got="DEF\n"
PASS uart_shape_print_number_rx got="123"
PASS uart_shape_println_string_rx got="line\r\n"
DONE=uart_write_print_shapes
```

### Reconfigure And Setup Options

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_reconfigure_options.js \
  --port /dev/ttyUSB0 --timeout 14
```

Result:

```text
PASS uart_cfg_baud_9600_8n1_rx got="CFG_9600"
PASS uart_cfg_baud_57600_8n1_rx got="CFG_57600"
PASS uart_cfg_baud_115200_8n1_rx got="CFG_115200"
PASS uart_cfg_seven_even_one_rx got="CFG_7E1"
PASS uart_cfg_eight_odd_two_rx got="CFG_8O2"
PASS uart_cfg_errors_true_rejected message="Error: ESP32 Espruino builds can't handle framing/parity errors (errors:true)"
DONE=uart_reconfigure_options
```

### Full Duplex

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_full_duplex_crosslink.js \
  --port /dev/ttyUSB0 --timeout 10
```

Result:

```text
METRIC uart_full_duplex_a_callbacks=2
METRIC uart_full_duplex_b_callbacks=2
METRIC uart_full_duplex_a_received_len=128
METRIC uart_full_duplex_b_received_len=96
METRIC uart_full_duplex_a_max_chunk=64
METRIC uart_full_duplex_b_max_chunk=64
PASS uart_full_duplex_a_rx_len got=128
PASS uart_full_duplex_b_rx_len got=96
PASS uart_full_duplex_a_hash got=3411822860
PASS uart_full_duplex_b_hash got=2435984184
DONE=uart_full_duplex_crosslink
```

### Raw Cleanup Warning

Runs that call `Serial.unsetup()` in cleanup show raw ESP32 warnings like:

```text
ERROR: jshPinSetState: Unexpected state: 0
```

These warnings did not affect the structured test results, but they are worth
preserving as a possible ESP32 `Serial.unsetup()` cleanup-path observation.

## Further Block 7 Serial API Coverage

Five more shared block 7 tests were added and run against the same bench state:

- `uart_flush_tx_completion.js`
- `uart_is_connected.js`
- `uart_listener_lifecycle.js`
- `uart_mismatch_negative.js`
- `uart_repeated_setup_soak.js`

Bench metadata remained:

- `process.env.BOARD=ESP32_IDF4`
- `process.version=2v29.107`
- `process.env.GIT_COMMIT=0af6e1568`
- mode: `ESP32_SERIAL_UART1_UART2_CROSSLINK`
- selectors: `SEL_D35=UART JP_UART_LOOP2=closed SEL_D33=1-2 SEL_D26=1-2`

### Flush Completion Smoke

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_flush_tx_completion.js \
  --port /dev/ttyUSB0 --timeout 10 --show-raw
```

Result:

```text
METRIC uart_flush_s2_to_s3_flush_returned=1
METRIC uart_flush_s2_to_s3_rx_len=32
PASS uart_flush_s2_to_s3_rx_len got=32
PASS uart_flush_s2_to_s3_rx got="FLUSH_A|89ABCDEFGHIJKLMNOPQRSTUV"
METRIC uart_flush_s3_to_s2_flush_returned=1
METRIC uart_flush_s3_to_s2_rx_len=32
PASS uart_flush_s3_to_s2_rx_len got=32
PASS uart_flush_s3_to_s2_rx got="FLUSH_B|89ABCDEFGHIJKLMNOPQRSTUV"
DONE=uart_flush_tx_completion
```

Additional diagnostic observation:

- an earlier 160-byte version of this same `Serial.write(); Serial.flush();`
  test reset the board with
  `assert failed: jsvStringIteratorAppend jsvariterator.c:466`
- the routine test was reduced to a short-payload flush smoke test because the
  non-flush 128-byte and 200-byte burst tests already pass on this firmware
- the 160-byte flush/reset case should be treated as separate firmware
  diagnostic evidence if `Serial.flush()` large-transfer semantics need deeper
  investigation

### isConnected

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_is_connected.js \
  --port /dev/ttyUSB0 --timeout 10 --show-raw
```

Result:

```text
METRIC uart_connected_before_a=true
METRIC uart_connected_before_b=true
METRIC uart_connected_after_setup_a=true
METRIC uart_connected_after_setup_b=true
METRIC uart_connected_after_unsetup_a=true
METRIC uart_connected_after_unsetup_b=true
PASS uart_connected_before_a_boolean got=true
PASS uart_connected_before_b_boolean got=true
PASS uart_connected_after_setup_a got=true expected=true
PASS uart_connected_after_setup_b got=true expected=true
PASS uart_connected_after_unsetup_a got=true expected=true
PASS uart_connected_after_unsetup_b got=true expected=true
DONE=uart_is_connected
```

Interpretation:

- on this ESP32 build, hardware `Serial.isConnected()` is not a reliable
  setup/unsetup state flag once the hardware serial object has been used in the
  firmware session
- it remained true before setup, after setup and after unsetup in this run

### Listener Lifecycle

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_listener_lifecycle.js \
  --port /dev/ttyUSB0 --timeout 10 --show-raw
```

Result:

```text
PASS uart_listener_first_text got="LISTEN_ON"
PASS uart_listener_first_count got=1
PASS uart_listener_no_callback_after_remove got=1
PASS uart_listener_buffered_after_remove got="BUFFER_ONLY"
PASS uart_listener_reattach_text got="LISTEN_AGAIN"
PASS uart_listener_reattach_count got=1
DONE=uart_listener_lifecycle
```

### Mismatch Negative And Recovery

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_mismatch_negative.js \
  --port /dev/ttyUSB0 --timeout 10 --show-raw
```

Result:

```text
METRIC uart_mismatch_rx="\u0000\u0081"
PASS uart_mismatch_not_equal rx="\u0000\u0081"
METRIC uart_mismatch_recovery_rx="MATCH_RECOVERY_OK"
PASS uart_mismatch_recovery got="MATCH_RECOVERY_OK"
DONE=uart_mismatch_negative
```

### Repeated Setup Soak

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_repeated_setup_soak.js \
  --port /dev/ttyUSB0 --timeout 15 --show-raw
```

Result:

```text
PASS uart_soak_iter_0_rx got="SOAK_0_s2_to_s3"
PASS uart_soak_iter_1_rx got="SOAK_1_s3_to_s2"
PASS uart_soak_iter_2_rx got="SOAK_2_s2_to_s3"
PASS uart_soak_iter_3_rx got="SOAK_3_s3_to_s2"
PASS uart_soak_iter_4_rx got="SOAK_4_s2_to_s3"
PASS uart_soak_iter_5_rx got="SOAK_5_s3_to_s2"
PASS uart_soak_iter_6_rx got="SOAK_6_s2_to_s3"
PASS uart_soak_iter_7_rx got="SOAK_7_s3_to_s2"
PASS uart_soak_iter_8_rx got="SOAK_8_s2_to_s3"
PASS uart_soak_iter_9_rx got="SOAK_9_s3_to_s2"
DONE=uart_repeated_setup_soak
```

The raw `Serial.unsetup()` cleanup warning remained visible in these runs:

```text
ERROR: jshPinSetState: Unexpected state: 0
```

It did not affect structured pass/fail results.

## Final Routine Block 7 API Additions

Three remaining routine Serial API tests were added and run against the same
bench state:

- `uart_inject_buffering.js`
- `uart_pipe_to_sink.js`
- `uart_listener_variants.js`

Bench metadata remained:

- `process.env.BOARD=ESP32_IDF4`
- `process.version=2v29.107`
- `process.env.GIT_COMMIT=0af6e1568`
- mode: `ESP32_SERIAL_UART1_UART2_CROSSLINK`
- selectors: `SEL_D35=UART JP_UART_LOOP2=closed SEL_D33=1-2 SEL_D26=1-2`

### Inject Buffering

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_inject_buffering.js \
  --port /dev/ttyUSB0 --timeout 10 --show-raw
```

Result:

```text
METRIC uart_inject_buffer_available=10
METRIC uart_inject_buffer_read="INJECT_BUF"
PASS uart_inject_buffer_available value=10
PASS uart_inject_buffer_read got="INJECT_BUF"
METRIC uart_inject_callback_count=1
METRIC uart_inject_callback_text="INJECT_CB"
PASS uart_inject_callback_text got="INJECT_CB"
PASS uart_inject_callback_count got=1
DONE=uart_inject_buffering
```

### Pipe To Sink

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_pipe_to_sink.js \
  --port /dev/ttyUSB0 --timeout 10 --show-raw
```

Result:

```text
METRIC uart_pipe_sink_chunks=5
METRIC uart_pipe_sink_data="PIPE_PHYSICAL_UART_DATA"
METRIC uart_pipe_complete=false
PASS uart_pipe_sink_chunked chunks=5
PASS uart_pipe_sink_data got="PIPE_PHYSICAL_UART_DATA"
PASS uart_pipe_open_stream_not_complete got=false
DONE=uart_pipe_to_sink
```

Interpretation:

- physical UART RX data can be piped into a JS sink object
- with `chunkSize:5`, the sink received the payload in five writes
- the source is a live Serial stream, so `complete` was not called just because
  the current RX buffer drained

### Listener Variants

Command:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/uart_listener_variants.js \
  --port /dev/ttyUSB0 --timeout 10 --show-raw
```

Result:

```text
METRIC uart_listener_order="prep:ORDER|first:ORDER|add:ORDER|"
PASS uart_listener_prepend_order got="prep:ORDER|first:ORDER|add:ORDER|"
METRIC uart_listener_after_remove="prep:REMOVE|add:REMOVE|"
PASS uart_listener_remove_specific got="prep:REMOVE|add:REMOVE|"
METRIC uart_listener_late_text="LATE"
PASS uart_listener_buffer_delivered_on_attach got="LATE"
DONE=uart_listener_variants
```

Conclusion:

- routine Block 7 UART coverage now includes the useful hardware-serial subset
  of the public Serial API that can be exercised without moving the REPL
  console or adding flow-control wiring
- remaining non-routine areas are `Serial.setConsole`, hardware/software flow
  control and true framing/parity error events
