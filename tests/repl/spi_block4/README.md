# `spi_block4` Functional Tests

This directory groups shared functional REPL tests that use the MCP3008 SPI
hardware context of harness block 4.

The block provides the physical mechanism. Individual JavaScript files in this
directory should each cover one clearer Espruino SPI API scope rather than
combining MCP3008 readback, extension-device checks, and unrelated bus activity
into one script.

Current first test set:

- `spi_mcp3008_basic.js`
- `spi_extension_flash_basic.js`

The current shared SPI file uses the harness analog feedback node only as the
physical stimulus strategy for MCP3008 CH0 readback. That keeps the functional
focus on Espruino SPI behaviour while still giving a meaningful hardware proof.

The flash-extension file keeps the same shared SPI bus in scope but switches
the functional emphasis to the fitted `D17` extension device path.
