# Draft: Espruino ESP32 IDF4 I2C Fix

## Suggested Title

`esp32: initialize I2C clk_flags for IDF4`

## Draft Body

This fixes a classic ESP32 IDF4 I2C setup failure in `targets/esp32/jshardwareI2c.c`.

On the bench, `I2C1.setup(...)` could fail before any useful bus traffic was
attempted:

```text
E (...) i2c: i2c_param_config(...): i2c clock choice is invalid, please check flag and frequency
Error: jshI2CSetup: Invalid arguments
```

The issue was that `i2c_config_t` was not fully initialized on the classic
ESP32 path, and `clk_flags` was only being set under a target guard for C3/S3.
On IDF4, `i2c_param_config(...)` validates `clk_flags`, so classic ESP32 could
end up passing an undefined value there.

This is an IDF4-related change in the way Espruino prepares the
`i2c_config_t` object before passing it to the ESP-IDF driver.

This change:

- zero-initializes `i2c_config_t`
- sets `conf.clk_flags = 0` explicitly for this path

That lets IDF use its default valid source-clock selection for the requested
bitrate.

## Simple REPL Reproducer

This is the smallest REPL check I used to demonstrate the problem on the
unpatched build:

```js
try {
  I2C1.setup({scl:D22, sda:D21, bitrate:100000});
  print("I2C_OK");
} catch (e) {
  print("I2C_ERR=" + e);
}
```

Before the fix, this reported:

```text
I2C_ERR=Error: jshI2CSetup: Invalid arguments
```

After the fix, the same REPL check reports:

```text
I2C_OK
```

I also checked:

```js
I2C1.setup({scl:D22, sda:D21});
I2C1.setup({scl:D22, sda:D21, bitrate:400000});
```

and both passed on the patched `ESP32_IDF4` build.

## Bench Result

After applying this fix and flashing the patched `ESP32_IDF4` build:

- direct REPL `I2C1.setup(...)` checks passed
- the `ESP32_V1` combined bus block progressed through the MCP23008 path
  normally
- MCP23008 register read/write, feedback, and interrupt checks all passed

So this looks like a real target-side ESP32 IDF4 I2C fix, not a harness
wiring change.
