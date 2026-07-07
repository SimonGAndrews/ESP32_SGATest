# Bus SPI I2C Block 3 Functional Tests

This directory groups shared functional REPL tests that use the block 3 bus
hardware context.

The physical block contains two separate API-facing areas:

- I2C through MCP23008
- SPI through MCP3008

These should be kept split into smaller task-focused tests so failures remain
clearer than the older combined wiring scripts.

Intended first test set:

- `i2c_mcp23008_registers.js`
- `i2c_mcp23008_interrupt.js`
- `spi_mcp3008_basic.js`
