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

- `tests/repl/gpio_block1/`
- `tests/repl/analog_block2/`
- `tests/repl/bus_spi_i2c_block3/`
- `tests/repl/onewire_block4/`
- `tests/repl/uart_block6/`

Within each block directory, use one file per logical API-scope task. For
example:

- `tests/repl/gpio_block1/gpio_readwrite_basic.js`
- `tests/repl/gpio_block1/gpio_watch_edges.js`
- `tests/repl/gpio_block1/gpio_pulse.js`
- `tests/repl/uart_block6/uart_rx_burst_basic.js`

So the directory name identifies the physical harness block, while the filename
identifies the specific Espruino API behaviour under test.
