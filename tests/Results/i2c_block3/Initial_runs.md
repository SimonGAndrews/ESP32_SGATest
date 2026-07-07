# Initial REPL Runs During Development

This note records the first shared block 3 `i2c_block` bench runs
from the common REPL functional suite on the classic ESP32 harness.

The current shared block-3 work keeps the MCP23008 tasks as smaller
API-focused tests. The first two files are:

- `i2c_mcp23008_registers.js`
- `i2c_mcp23008_interrupt.js`

These runs used the shared Python runner:

```bash
python3 tools/repl/run_test.py tests/repl/i2c_block3/i2c_mcp23008_registers.js \
  --port /dev/ttyUSB0 --timeout 8

python3 tools/repl/run_test.py tests/repl/i2c_block3/i2c_mcp23008_interrupt.js \
  --port /dev/ttyUSB0 --timeout 8
```

Bench metadata for these runs:

- board: `ESP32`
- version: `2v29.97`
- git commit: `916c92d63`
- port: `/dev/ttyUSB0`
- target preset resolved by test: `ESP32_V1`
- harness mode: `ESP32_BASELINE_HARDWARE`
- selector state confirmed on bench:
  `SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open`

## board=ESP32

### Shared Test: `i2c_mcp23008_registers`

TEST=i2c_mcp23008_registers
TARGET=ESP32_V1
INFO board=ESP32
INFO api=I2C.setup,I2C.writeTo,I2C.readFrom,pinMode,digitalRead
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
INFO i2c_port=I2C1
INFO i2c_sda=D21
INFO i2c_scl=D22
INFO i2c_fb=D39
INFO i2c_addr=0x20
METRIC i2c_mcp23008_iodir=252
METRIC i2c_mcp23008_gppu=0
METRIC i2c_mcp23008_olat_low=0
PASS i2c_mcp23008_iodir got=252 expected=252
PASS i2c_mcp23008_gppu got=0 expected=0
PASS i2c_mcp23008_olat_low got=0 expected=0
METRIC i2c_mcp23008_fb_low=0
PASS i2c_mcp23008_fb_low got=0 expected=0
METRIC i2c_mcp23008_olat_high=1
METRIC i2c_mcp23008_fb_high=1
PASS i2c_mcp23008_olat_high got=1 expected=1
PASS i2c_mcp23008_fb_high got=1 expected=1
METRIC checks_total=6
METRIC checks_passed=6
METRIC checks_failed=0
DONE=i2c_mcp23008_registers

### Shared Test: `i2c_mcp23008_interrupt`

TEST=i2c_mcp23008_interrupt
TARGET=ESP32_V1
INFO board=ESP32
INFO api=I2C.setup,I2C.writeTo,I2C.readFrom,pinMode,digitalRead
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
INFO i2c_port=I2C1
INFO i2c_sda=D21
INFO i2c_scl=D22
INFO i2c_int=D35
INFO i2c_addr=0x20
METRIC i2c_mcp23008_int_idle=1
PASS i2c_mcp23008_int_idle got=1 expected=1
METRIC i2c_mcp23008_int_assert=0
METRIC i2c_mcp23008_intf=4
METRIC i2c_mcp23008_intcap=7
PASS i2c_mcp23008_int_assert got=0 expected=0
PASS i2c_mcp23008_intf_gp2 got=4 expected=4 raw=4
PASS i2c_mcp23008_intcap_gp2 got=4 expected=4 raw=7
METRIC i2c_mcp23008_int_clear=1
PASS i2c_mcp23008_int_clear got=1 expected=1
METRIC checks_total=5
METRIC checks_passed=5
METRIC checks_failed=0
DONE=i2c_mcp23008_interrupt

### Jumper-State Note

An earlier interrupt-test run produced `i2c_mcp23008_int_assert=1` while
`INTF` still indicated the GP2 source. That result was traced to an incorrect
`SEL_D35` selection link position on the bench rather than to a new shared-test
logic problem.

After correcting the jumper state and rerunning:

- the shared interrupt test passed as shown above
- the interrupt line was observed low during assert
- `INTF` and `INTCAP` still matched the expected GP2-triggered event

### Wiring Script Cross-Check

The older wiring script remains a useful cross-check for this block:

```bash
python3 tools/wiring_tests/esp32_v1/i2c_spi_block34.py --port /dev/ttyUSB0
```

When `I2C_INT_ASSERT=1` is seen for this block on `ESP32_V1`, bench setup
should first confirm:

- `SEL_D35` is in the `I2C_INT` position
- the UART-crosslink position is not fitted
- `JP_UART_LOOP2` remains open

So the current evidence is:

- basic I2C setup, register access, and GP0 feedback path are working
- MCP23008 interrupt idle, assert, source capture, and clear are working when
  the `SEL_D35` link is set correctly
- an interrupt-assert failure on this block can be caused by incorrect `D35`
  selection state and should not immediately be treated as a firmware defect
