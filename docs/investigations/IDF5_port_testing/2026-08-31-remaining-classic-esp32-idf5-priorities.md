# Classic ESP32 IDF5 Corrective Work Status

Date: 31 August 2026

## Conclusion

Four remaining corrections are bench-validated and prepared as focused
branches on the merged official `IDF5` tip: ADC, GPIO-matrix routing,
PWM/DAC output including DAC pin release, and undefined pin-state cleanup.

The proposed OneWire critical-section change is **not submission-ready**. It
makes device discovery reliable but leaves frequent CRC corruption in addressed
DS18B20 reads. It remains an investigation branch rather than the next PR.

## Current Base and Validation Image

| Item | Value |
|---|---|
| Official base | `official/IDF5` at `25f81a8e1` |
| Merged upstream work | Wi-Fi debug build and I2C configuration PRs |
| Final combined validation head | `354fa95fb` |
| Flashed identity | `ESP32_IDF5`, `2v29.75`, `354fa95fb` |
| ESP-IDF | 5.5.3 |
| Release build | pass, 28% application partition free |

## Runtime Status

| Finding | Status | Evidence |
|---|---|---|
| debug-enabled compile failure | Closed/merged | Wi-Fi diagnostic PR merged by Gordon |
| `I2C1.setup()` rejected | Closed/merged | onboard registers 6/6, interrupt 5/5, second device 8/8 |
| `analogRead()` returned `NaN` | Corrected | low/high 4/4 |
| PWM midpoint was full scale | Corrected | ordered 25/50/75% feedback, 5/5; MCP3008 11/11 |
| DAC full scale wrapped to zero | Corrected | D25-to-D26 endpoints 2/2 |
| GPIO did not recover after DAC/peripheral use | Corrected | GPIO, pulse and watch pass after DAC use |
| OneWire found no devices on uncorrected IDF5 | Improved, not closed | full three-device result in 100/100 searches |
| DS18B20 addressed-read reliability | Open | 13/19 captured soak cycles had a CRC failure |
| DS2413 addressed command/status | Pass | 6/6 in final formal run |
| cleanup diagnostic | Corrected | no unexpected-state error after `Serial.unsetup()` |
| UART 200-byte receive | Functional with timing caveat | exact data arrives; official IDF5 is behind newer master UART fix |

## Submission-Ready Branches

Recommended order after the two already merged PRs:

1. ADC: `fix/esp32-idf5-adc`, commit `bb7282d61`;
2. GPIO matrix: `fix/esp32-idf5-gpio-matrix`, commit `301fe8dda`;
3. PWM/DAC: `fix/esp32-idf5-analog-output`, three commits ending
   `a45f9e661`;
4. cleanup: `fix/esp32-idf5-undefined-pin-state`, commit `d533b3067`.

Every branch is directly based on `25f81a8e1`, is clean, and passes
`git diff --check`. The analogue-output branch also completed a fresh exact
`BOARD=ESP32_IDF5 RELEASE=1` build after its third DAC-release commit was added.
The smaller branch patches have stable patch IDs matching the combined image
used for bench validation.

The GPIO-matrix PR should precede the analogue-output PR because restoring a
DAC/PWM pin to normal GPIO depends on the corrected output routing operation.

## Held Branch

Do not push `fix/esp32-idf5-onewire-timing` from its current local state. It is
behind the merged official base and contains only the earlier patch shape. The
final validated implementation also needs the explicit `ESP32_IDF5` guard, but
even that implementation still fails the addressed DS18B20 CRC soak.

The hold evidence and required next investigation are recorded in
[`2026-08-31-pr6-onewire-timing.md`](2026-08-31-pr6-onewire-timing.md).

## Compatibility Finding

The corrected source was also built with the existing classic procedure,
`BOARD=ESP32 RELEASE=1`. GPIO, ADC, PWM, DAC, I2C, SPI, flash and cleanup checks
passed. This is positive evidence that the correction set does not break the
existing classic build.

The legacy compatibility image retained master-style OneWire instability and
reached an IDF3 FreeRTOS queue assertion on iteration 9 of a repeated UART setup
test. The official IDF5 base is behind current-master UART commit `a3f085979`,
so this is retained as a source-lineage concern rather than attributed to the
four submission-ready patches.
