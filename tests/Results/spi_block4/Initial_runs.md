# Initial REPL Runs During Development

This note records the first shared block 4 `spi_block` bench run from
the common REPL functional suite on the classic ESP32 harness.

The shared SPI file is:

- `tests/repl/spi_block4/spi_mcp3008_basic.js`

It keeps the test focused on Espruino SPI API behaviour and uses the shared
analog feedback node only as the physical stimulus strategy for MCP3008
readback.

This run used the shared Python runner:

```bash
python3 tools/repl/run_test.py tests/repl/spi_block4/spi_mcp3008_basic.js \
  --port /dev/ttyUSB0 --timeout 10
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

### Shared Test: `spi_mcp3008_basic`

TEST=spi_mcp3008_basic
TARGET=ESP32_V1
INFO board=ESP32
INFO api=SPI.setup,SPI.send,analogRead,digitalWrite,analogWrite,pinMode
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
INFO spi_port=SPI1
INFO spi_miso=D19
INFO spi_mosi=D23
INFO spi_sck=D18
INFO spi_cs_adc=D16
INFO pwm_out=D27
INFO adc_in=D34
INFO adc_channel=MCP3008 CH0
METRIC spi_mcp3008_reply_len=3
PASS spi_mcp3008_reply_len value=3
METRIC spi_mcp3008_target_low=0
METRIC spi_mcp3008_adc_low=0
METRIC spi_mcp3008_target_high=0.99975585937
METRIC spi_mcp3008_adc_high=1020
METRIC spi_mcp3008_target_mid=0.46411132812
METRIC spi_mcp3008_adc_mid=501.8
PASS spi_mcp3008_target_low value=0
PASS spi_mcp3008_target_high value=0.99975585937
PASS spi_mcp3008_target_monotonic values=0,0.46411132812,0.99975585937
PASS spi_mcp3008_adc_low value=0
PASS spi_mcp3008_adc_high value=1020
PASS spi_mcp3008_adc_monotonic values=0,501.8,1020
PASS spi_mcp3008_adc_span span=1020
PASS spi_mcp3008_low_agree target=0 spi=0
PASS spi_mcp3008_mid_agree target=0.46411132812 spi=0.49051808406
PASS spi_mcp3008_high_agree target=0.99975585937 spi=0.99706744868
METRIC checks_total=11
METRIC checks_passed=11
METRIC checks_failed=0
DONE=spi_mcp3008_basic

So the current evidence is:

- `SPI1.setup(...)` and MCP3008 transfers on `D18/D19/D23` with `D16` chip
  select are working on `ESP32_V1`
- the MCP3008 CH0 low/high readback follows the harness analog node cleanly
- target ADC and SPI ADC agree closely enough at low, mid, and high levels for
  this shared functional test
