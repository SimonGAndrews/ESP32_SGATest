# UART Block 6 Functional Tests

This directory groups shared functional REPL tests that use the non-console
UART crosslink hardware context of harness block 6.

The current UART RX burst pack targets the `ESP32_V1` harness, using the
existing UART1/UART2 crosslink while UART0 remains the runner/control path.

The pack is split by direction and burst-size scope so each file stays focused
and bench failures remain easy to interpret:

- `uart_rx_burst_s2_to_s3.js`
- `uart_rx_burst_s3_to_s2.js`
- `uart_rx_burst_128_s2_to_s3.js`
- `uart_rx_burst_128_s3_to_s2.js`
- `uart_rx_burst_200_s2_to_s3.js`
- `uart_rx_burst_200_s3_to_s2.js`

Current intent:

- boundary coverage around the original `64`-byte failure point in the
  direction-pair files
- clean-start single-case coverage for `128` and `200` byte bursts
- structured output that works in direct REPL use and through the shared
  runner
