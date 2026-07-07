# Portable REPL Tests

This directory is reserved for community-shareable Espruino JavaScript tests.

The intended split is:

- `tests/repl/`: plain Espruino JS that can be pasted into a REPL or uploaded
  with the Espruino Web IDE
- block-specific subdirectories under `tests/repl/` group tests by physical
  harness block
- `tools/`: Python automation and diagnostics that send those tests to a board,
  run them unchanged through the REPL, and parse `PASS` / `FAIL` output

Target-specific pin choices should live in target maps or a small `CFG` block,
not deep inside the test logic. That keeps the same logical tests usable on the
ESP32-C3 harness, the classic ESP32 DevKitC V4 harness, and future ESP32-family
targets.

Recommended structure:

- block 1: `gpio_block`
- block 2: `analog_block`
- block 3: `i2c_block`
- block 4: `spi_block`
- block 5: `onewire_block`
- block 6: `onewire_gpio_block`
- block 7: `uart_block`
- block 8: `grove_i2c_block`

Current shared repo directories:

- `tests/repl/gpio_block1/`
- `tests/repl/analog_block2/`
- `tests/repl/i2c_block3/`
- `tests/repl/spi_block4/`
- `tests/repl/onewire_block5/`
- `tests/repl/onewire_gpio_block6/`
- `tests/repl/grove_i2c_block8/`
- `tests/repl/uart_block7/`

Within each block directory, use one file per logical API-scope task. For
example:

- `tests/repl/gpio_block1/gpio_readwrite_basic.js`
- `tests/repl/gpio_block1/gpio_watch_edges.js`
- `tests/repl/gpio_block1/gpio_pulse.js`
- `tests/repl/i2c_block3/i2c_mcp23008_registers.js`
- `tests/repl/i2c_block3/i2c_mcp23008_interrupt.js`
- `tests/repl/spi_block4/spi_mcp3008_basic.js`
- `tests/repl/grove_i2c_block8/i2c_grove_mcp23008_secondary.js`
- `tests/repl/uart_block7/uart_rx_burst_s2_to_s3.js`

So the directory name identifies the physical harness block, while the filename
identifies the specific Espruino API behaviour under test.
