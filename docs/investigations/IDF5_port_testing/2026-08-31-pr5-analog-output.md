# PR 5: Restore PWM and DAC Output on ESP32 IDF5

## Submission Details

- Upstream repository: `espruino/Espruino`
- Base branch: `IDF5` at `25f81a8e1`
- Fork: `SimonGAndrews/Espruino`
- Head branch: `fix/esp32-idf5-analog-output`
- Commits:
  - `1e0dcb8f6` — restore PWM and DAC output paths;
  - `970643223` — enable the DAC and preserve full scale;
  - `a45f9e661` — release DAC pins when returning to GPIO.
- PR title: `ESP32 IDF5: restore PWM and DAC output`

This branch is based directly on Gordon’s branch after PR 1 and PR 2 were
merged. It has no Git dependency on the ADC or cleanup branches. Merging the
GPIO-matrix correction first is recommended because returning a peripheral pin
to ordinary output also relies on correct GPIO-matrix routing.

## Copy-ready PR Description

### Issue

The ESP32 hardware layer explicitly disabled `jshPinAnalogOutput()` and
`jshSetOutputValue()` for ESP-IDF 5. Espruino `analogWrite()` therefore
reported that DAC output was not implemented instead of using the existing
ESP32 PWM or DAC backends.

Three DAC details also prevented correct and reusable output:

- the IDF4/IDF5 path wrote a voltage before enabling the selected DAC channel;
- multiplying Espruino’s inclusive value `1` by 256 wrapped to zero when cast
  to `uint8_t`;
- disabling the DAC channel alone did not release the pin from the RTC IO mux,
  so later `digitalWrite()` or `digitalPulse()` could not reliably take control.

### Fix

- Remove the IDF5-only stubs so `analogWrite()` and subsequent value updates
  use the existing PWM/DAC implementations.
- Enable a valid DAC channel before writing its voltage.
- Scale the inclusive `0..1` value to `0..255`, preserving full scale.
- When a DAC pin is returned to ordinary GPIO use, disable its DAC channel and
  call `rtc_gpio_deinit()` to return it to the digital IO mux.

The three commits keep path restoration, endpoint correction and pin teardown
individually reviewable.

### Validation

The exact three-commit branch was clean-built using ESP-IDF 5.5.3 and
`BOARD=ESP32_IDF5 RELEASE=1`:

- build: pass;
- generated version: `2v29.69`;
- application size: `0x169d10`, 28% of the application partition free;
- firmware binary SHA-256:
  `3f9b3c2e7d1b5f62305a858c954c7e06638b0effc6d2856f3bb0fa7401128cc3`;
- release archive SHA-256:
  `1d2f3a9bcabc73f9bd35b2245f31fe7922baefe197ee51eabd410ed250f339f2`.

The same three patches were included in the final corrected classic ESP32
IDF5 firmware tested on the V1 bench:

- PWM requests of 0.25, 0.5 and 0.75 produced ordered analogue feedback; 5/5
  assertions passed;
- an external MCP3008 independently confirmed useful low, midpoint and high
  PWM levels as part of an 11/11 test;
- `analogWrite(D25,0)` and `analogWrite(D25,1)` produced low and high feedback
  respectively on connected pin D26; 2/2 assertions passed;
- after DAC use, the same D25/D26 pair again passed ordinary GPIO read/write,
  pulse and watch checks. Calling `dac_output_disable()` without
  `rtc_gpio_deinit()` had failed this check; the final three-commit change
  passed it.

The stable patch IDs match the bench-tested validation commits:

- path restoration: `54bb1737ff101f1e68d0d5a193efcd1b5ac8ecd6`;
- DAC enable/full scale: `6c21b8bf66393a617654f2ed89f5917b65f93e34`;
- DAC teardown/RTC mux release:
  `0ae3312db6e0c9c58fab8915d11822d00664bd37`.

### Compatibility

The corrections were also included in a legacy `BOARD=ESP32 RELEASE=1` build
from the same source. ADC, PWM, DAC, GPIO-after-DAC, I2C, SPI and flash checks
passed, providing evidence that these changes do not break the existing
classic build path.

## Manual Submission

Run from a terminal:

```bash
cd /home/simon/MaBecker/Espruino_IDF5_PR
git status --short --branch
git log --oneline official/IDF5..fix/esp32-idf5-analog-output
git diff --check official/IDF5...fix/esp32-idf5-analog-output
git push -u simon fix/esp32-idf5-analog-output
```

On the GitHub **Compare changes** page, select **compare across forks**, then
set:

- base repository: `espruino/Espruino`;
- base branch: `IDF5`;
- head repository: `SimonGAndrews/Espruino`;
- compare branch: `fix/esp32-idf5-analog-output`.

Use the title and description above. Before selecting **Create pull request**,
confirm that GitHub shows three commits and only these files in **Files
changed**:

- `targets/esp32/jshardware.c`;
- `targets/esp32/jshardwareAnalog.c`;
- `targets/esp32/jshardwareAnalog.h`.
