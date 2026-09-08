# `uart_block7` Functional Tests

This directory groups shared functional REPL tests that use the non-console
UART crosslink hardware context of harness block 7.

The current UART RX burst pack targets the `ESP32_V1` harness, using the
existing UART1/UART2 crosslink while UART0 remains the runner/control path.
Four scripts also contain an `ESP32_C3_V1` UART0/UART1 map. That map requires
native USB Serial/JTAG for control and deliberate isolation of the
ESP32-C3-DevKitC-02 onboard CP2102N TX connection to `D20`. The bridge holds
`D20` high both when the board is externally powered with its USB-UART cable
disconnected and when the board is powered through that onboard USB
connection. Without CP2102N TX isolation, use the `D3` to `D4` loop-B path for
a single-UART C3 lifecycle check rather than interpreting the blocked `D3` to
`D20` direction as a firmware failure.

The pack is split by direction and burst-size scope so each file stays focused
and bench failures remain easy to interpret:

- `uart_read_available_polling.js`
- `uart_write_print_shapes.js`
- `uart_reconfigure_options.js`
- `uart_full_duplex_crosslink.js`
- `uart_flush_tx_completion.js`
- `uart_is_connected.js`
- `uart_listener_lifecycle.js`
- `uart_listener_variants.js`
- `uart_inject_buffering.js`
- `uart_pipe_to_sink.js`
- `uart_mismatch_negative.js`
- `uart_repeated_setup_soak.js`
- `uart_rx_burst_s2_to_s3.js`
- `uart_rx_burst_s3_to_s2.js`
- `uart_rx_burst_128_s2_to_s3.js`
- `uart_rx_burst_128_s3_to_s2.js`
- `uart_rx_burst_200_s2_to_s3.js`
- `uart_rx_burst_200_s3_to_s2.js`

Focused firmware-investigation tests outside the V1 harness pack are under
`docs/investigations/uart/repros/`:

- `esp32_uart_driver_lifecycle_family.js` repeats the no-wiring driver
  setup/unsetup reproduction with safe pins selected for classic ESP32, C3
  and S3 board definitions;
- `esp32s3_uart_crosslink_lifecycle.js` exercises both S3 hardware UARTs over
  a temporary `D6 -> D18` and `D17 -> D7` crosslink on an
  ESP32-S3-DevKitC-1.

Current intent:

- polling coverage for `Serial.available()` and partial `Serial.read(n)`
- write-shape coverage for `Serial.write`, `Serial.print`, and
  `Serial.println`
- setup/reconfiguration coverage for baud rate, frame options and unsupported
  ESP32 `errors:true`
- simultaneous bidirectional traffic over the UART1/UART2 crosslink
- short-payload `Serial.flush()` transmit completion in both directions
- `Serial.isConnected()` behaviour around setup/unsetup on hardware serial
- data listener attach, remove and reattach lifecycle
- listener alias and ordering coverage for `addListener`, `prependListener`,
  `removeListener` and late buffered delivery
- synthetic RX coverage for `Serial.inject()`
- open-stream `Serial.pipe()` coverage from physical UART RX into a JS sink
- mismatched baud negative case plus same-session recovery
- repeated setup/write/read/unsetup lifecycle soak across both directions
- boundary coverage around the original `64`-byte failure point in the
  direction-pair files
- clean-start single-case coverage for `128` and `200` byte bursts
- structured output that works in direct REPL use and through the shared
  runner
