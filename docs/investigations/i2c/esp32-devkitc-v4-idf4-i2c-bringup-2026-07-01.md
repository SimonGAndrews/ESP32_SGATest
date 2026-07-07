# ESP32 DevKitC V4 IDF4 I2C Bring-Up

Date: 2026-07-01

## Scope

This note starts a separate investigation for the classic ESP32 I2C failure
seen during `ESP32_V1` harness bring-up.

The aim is to keep this separate from:

- the earlier ESP32-C3 `digitalPulse` and IDF5 work
- the separate classic ESP32 OneWire questions
- any MCP23008 or harness-wiring conclusions that are not yet justified

## Test Context

Target and harness:

- classic ESP32 DevKitC V4 style target
- `ESP32_V1` harness

Harness state for the combined bus block:

- `SEL_D33` normal loopback
- `SEL_D26` normal loopback
- `SEL_D35` in `I2C_INT`
- `JP_UART_LOOP2` open

Relevant bus wiring from the harness spec:

- `D21` SDA
- `D22` SCL
- MCP23008 address `0x20`
- MCP23008 INT to `D35` through `SEL_D35`
- MCP23008 GP0 feedback to `D39`

## What Passed First

Before looking at I2C, these harness blocks passed on the same flashed board:

- `gpio_block1`
- `analog_block2`

That matters because it shows the board is alive, the REPL path is usable, and
the harness is not failing in a general way.

## Observed I2C Failure

The combined bus script failed at the first I2C setup step:

```js
I2C1.setup({scl:D22, sda:D21, bitrate:100000});
```

Observed error:

```text
E (...) i2c: i2c_param_config(...): i2c clock choice is invalid, please check flag and frequency
Error: jshI2CSetup: Invalid arguments
```

After that, all MCP23008 accesses failed because the I2C driver was not
installed.

## Direct REPL Check

The same failure was reproduced directly in the REPL, without the harness test
script around it:

```js
I2C1.setup({scl:D22,sda:D21});
I2C1.setup({scl:D22,sda:D21,bitrate:100000});
I2C1.setup({scl:D22,sda:D21,bitrate:400000});
```

All three forms failed with the same `i2c_param_config(...)` error.

## What This Rules Out

This does not yet look like a pull-up, socket, MCP23008, or interrupt wiring
problem.

Reason:

- the failure happens during `I2C1.setup(...)`
- that is before any useful traffic can go onto the bus
- the same failure appears even in the smallest direct REPL setup call

So the current suspicion is firmware-side I2C configuration on this target,
not the external I2C device.

## First Code Area To Inspect

Current main suspect:

- [jshardwareI2c.c](/home/simon/MaBecker/Espruino/targets/esp32/jshardwareI2c.c:93)

Relevant detail:

- `i2c_config_t conf;` is declared
- the struct is then filled field-by-field
- `clk_flags` is only set for `ESP32C3` and `ESP32S3`

That leaves classic ESP32 depending on whatever default state the struct
happens to have for fields not explicitly written.

## Current Hypothesis

The current working hypothesis is:

- this may be a long-standing classic ESP32 port issue
- it may have been present for a long time because this path was not exercised
  often on real hardware
- the immediate trigger is likely in the ESP32 Espruino I2C setup code rather
  than in the `ESP32_V1` harness wiring

This is still a hypothesis, not a conclusion.

## Diagnosis So Far

Reading the IDF4 driver code makes the current failure mechanism look very
likely.

Relevant points:

- IDF4 `i2c_config_t` includes a `clk_flags` field on classic ESP32
- `i2c_param_config(...)` validates that field before any bus traffic starts
- in the current Espruino ESP32 target code, the config struct is declared and
  then filled field-by-field
- on classic ESP32, `clk_flags` is not explicitly set

That means classic ESP32 can pass stack garbage into `i2c_param_config(...)`.
If the random `clk_flags` bits do not describe a valid source-clock choice, the
driver rejects the setup with the exact error seen on the bench.

So the present diagnosis is:

- the immediate failure is in target-side I2C config setup
- the most likely specific bug is an incompletely initialized `i2c_config_t`
  on classic ESP32

## Minimal Patch Under Test

The smallest local diagnostic patch is:

- initialize `i2c_config_t` as zeroed
- set `conf.clk_flags = 0` explicitly

Applied in the clean local IDF4 build tree:

- `/home/simon/MaBecker/Espruino_upstream_idf4/targets/esp32/jshardwareI2c.c`

## Bench Result After Patch

The patched `ESP32_IDF4` build was rebuilt, flashed to the classic ESP32 bench
board, and retested.

Direct REPL checks now pass:

```js
I2C1.setup({scl:D22,sda:D21});
I2C1.setup({scl:D22,sda:D21,bitrate:100000});
I2C1.setup({scl:D22,sda:D21,bitrate:400000});
```

The combined harness script then progressed through the MCP23008 path as
expected:

- register write/read passed
- interrupt idle/assert/clear passed
- GP0 feedback low/high passed

That confirms the original blocker was the target-side I2C setup bug, not the
basic `ESP32_V1` I2C harness wiring.

After the patch, block 3 reached the SPI/MCP3008 part normally. One run gave a
bad low ADC reading, but an immediate direct SPI probe and a second full block
run both produced the expected low/high ADC result. So the I2C issue itself is
considered confirmed fixed by this patch.

Later shared-test work on the same block also showed that an
`I2C_INT_ASSERT=1` result should not be assumed to mean a fresh ESP32 I2C
firmware regression by itself. On the `ESP32_V1` harness, that assert failure
can also be caused by the `SEL_D35` link being left in the wrong position
instead of selecting `I2C_INT` through to `D35`.

## Next Debug Order

1. Move the confirmed patch from the clean test tree into the working ESP32
   source tree that will carry classic ESP32 fixes.
2. Keep the classic ESP32 OneWire problem as a separate investigation.
3. If block 3 shows further intermittent ADC behavior, treat that as a
   separate SPI/MCP3008 or test-sequencing question, not as part of the I2C
   root cause.

## Relationship To OneWire

This note should be treated in the same spirit as the classic ESP32 OneWire
question:

- a harness block may never have worked properly on the classic ESP32 port
- that should not be confused with a new harness wiring fault
- the right starting point is a small direct reproducer and then target-port
  code review
