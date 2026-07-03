# GPIO Block 1 Functional Tests

This directory groups shared functional REPL tests that use the GPIO loopback
hardware context of harness block 1.

The block provides the physical mechanism. Individual JavaScript files in this
directory should each cover one clearer Espruino GPIO API scope rather than
combining the whole GPIO surface into one script.

Intended first test set:

- `gpio_readwrite_basic.js`
- `gpio_watch_edges.js`
- `gpio_pulse.js`
- `gpio_shiftout.js`

These tests should share the same family of harness mode assumptions where
practical, while keeping failures isolated enough to support issue
identification and debugging.
