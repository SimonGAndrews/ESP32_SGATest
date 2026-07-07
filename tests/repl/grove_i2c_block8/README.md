# `grove_i2c_block8` Functional Tests

This directory groups shared functional REPL tests that use the external Grove
I2C extension path.

These tests are intended to prove that:

- the target can still reach the onboard MCP23008 on the primary bus
- a second external I2C device on the Grove connector is reachable on the same
  bus
- operations on the external device do not accidentally disturb the onboard
  harness expander state

Intended first test set:

- `i2c_grove_mcp23008_secondary.js`
