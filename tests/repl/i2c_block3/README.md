# `i2c_block3` Functional Tests

This directory groups shared functional REPL tests that use the MCP23008 I2C
hardware context of harness block 3.

The block provides the physical mechanism. Individual JavaScript files in this
directory should each cover one clearer Espruino I2C API scope rather than
combining register access, interrupt behaviour, and unrelated bus activity into
one script.

Current first test set:

- `i2c_mcp23008_registers.js`
- `i2c_mcp23008_interrupt.js`

These tests should share the same family of harness mode assumptions where
practical, while keeping failures isolated enough to support issue
identification and debugging.
