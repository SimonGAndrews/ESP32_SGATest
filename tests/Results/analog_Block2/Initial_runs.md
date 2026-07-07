# Initial REPL Runs During Development

This note records the first shared `analog_block2` bench runs from the common
REPL functional suite.

These runs used the shared Python runner:

```bash
python3 tools/repl/run_test.py tests/repl/analog_block2/analog_read_levels.js \
  --port /dev/ttyUSB0 --timeout 8

python3 tools/repl/run_test.py tests/repl/analog_block2/analog_pwm_feedback.js \
  --port /dev/ttyUSB0 --timeout 8
```

Bench metadata for these runs:

- board: `ESP32`
- version: `2v29.97`
- git commit: `916c92d63`
- port: `/dev/ttyUSB0`
- target preset resolved by test: `ESP32_V1`
- harness mode: `ESP32_BASELINE_HARDWARE`
- selector state confirmed on bench before rerun:
  `SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open`

## board=ESP32

TEST=analog_read_levels
TARGET=ESP32_V1
INFO board=ESP32
INFO api=pinMode,digitalWrite,analogRead
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
INFO analog_out=D27
INFO analog_in=D34
METRIC analog_read_low=0.01708984375
METRIC analog_read_high=0.99975585937
METRIC analog_read_span=0.98266601562
PASS analog_read_low_floor value=0.01708984375
PASS analog_read_high_ceiling value=0.99975585937
PASS analog_read_span_useful span=0.98266601562
PASS analog_read_order low=0.01708984375 high=0.99975585937
METRIC checks_total=4
METRIC checks_passed=4
METRIC checks_failed=0
DONE=analog_read_levels

TEST=analog_pwm_feedback
TARGET=ESP32_V1
INFO board=ESP32
INFO api=analogWrite,analogRead,pinMode
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
INFO pwm_out=D27
INFO adc_in=D34
INFO pwm_levels=[0.25,0.5,0.75]
METRIC analog_pwm_level_25=0.22241210937
METRIC analog_pwm_level_50=0.39892578125
METRIC analog_pwm_level_75=0.62475585937
PASS analog_pwm_monotonic values=0.22241210937,0.39892578125,0.62475585937
PASS analog_pwm_25_useful value=0.22241210937
PASS analog_pwm_50_useful value=0.39892578125
PASS analog_pwm_75_useful value=0.62475585937
PASS analog_pwm_span_useful span=0.40234375
METRIC checks_total=5
METRIC checks_passed=5
METRIC checks_failed=0
DONE=analog_pwm_feedback
