# ESP32 Current-Master UART Investigation

Updated: 7 September 2026

## Conclusion

Current Espruino master `ed46a3a0b` has two confirmed classic-ESP32 UART
driver-lifecycle symptoms:

1. `Serial.setup()` or `Serial.unsetup()` can delete an ESP-IDF UART driver
   while Espruino's UART task is inside `uart_read_bytes()`. In the legacy
   `BOARD=ESP32` build this produced `uart driver error`, a FreeRTOS
   `xQueueGenericReceive` assertion and a reboot.
2. Recreating the two non-console UARTs can expose one stale leading byte. In
   the `BOARD=ESP32_IDF5` build, five alternating reverse-direction transfers
   returned `"\0UART_n"` instead of `"UART_n"`.

A minimal source candidate fixes both symptoms. It coordinates driver
replacement with the UART task and flushes receive state after reinstalling a
classic ESP32 UART. The corrected 18-script suite passes under both
`BOARD=ESP32` and `BOARD=ESP32_IDF5`. The exact candidate also passed a
102-check `BOARD=ESP32C3_IDF5` runtime test, with the classic-only change
excluded by `CONFIG_IDF_TARGET_ESP32`.

The earlier apparent 64-byte and 120-byte truncations were test timing
artifacts. With receipt-driven completion, current master delivers 128-byte
and 200-byte payloads in both directions. Buffer size, UART polling timing and
the transmit path therefore do not need changing for this PR.

Status: correction validated and submitted as a pull request; awaiting
upstream review.

## Test Subject

- upstream source: `espruino/Espruino` master `ed46a3a0b`;
- reported version: `2v29.383`;
- candidate branch: `fix/esp32-uart-driver-reconfiguration`;
- candidate commit: `cc6dd86d2`;
- classic target: ESP32 DevKitC V4, MAC `08:b6:1f:70:14:e8`;
- runtime builds: `BOARD=ESP32` and `BOARD=ESP32_IDF5`;
- C3 guard/runtime build: `BOARD=ESP32C3_IDF5`, ESP-IDF 5.5.3.

The classic runtime tests used UART0 for the REPL and cross-connected the two
non-console UARTs:

- `Serial2`: TX `D4`, RX `D35`;
- `Serial3`: TX `D14`, RX `D36`.

## Exact Current-Master Failures

### Driver replacement race

The no-wiring reproduction repeatedly calls:

```js
Serial2.setup(115200, {tx:D4, rx:D35});
Serial2.unsetup();
```

On the untouched `BOARD=ESP32` build it reported:

```text
uart: uart_read_bytes(1227): uart driver error
xQueueGenericReceive ... assert failed
```

The decoded call chain is:

```text
xQueueGenericReceive
  -> uart_read_bytes
  -> pollSerialDevices (targets/esp32/jshardwareUart.c)
  -> uartTask (targets/esp32/main.c)
```

This confirms that the polling task was still using ESP-IDF driver objects
while the Espruino task deleted the driver.

### Stale first receive byte

The cross-UART reproduction repeatedly unsets and recreates `Serial2` and
`Serial3`, alternates 115200/57600 baud and alternates transfer direction. On
the untouched `BOARD=ESP32_IDF5` build, all five `Serial3` to `Serial2`
iterations contained the complete intended payload plus one leading NUL:

```text
got="\u0000UART_1" expected="UART_1"
got="\u0000UART_3" expected="UART_3"
got="\u0000UART_5" expected="UART_5"
got="\u0000UART_7" expected="UART_7"
got="\u0000UART_9" expected="UART_9"
```

The broader legacy suite also observed occasional leading bytes, although the
compact ten-iteration reproduction happened to pass on that build. The
lifecycle assertion is the deterministic legacy-build reproduction.

### No long-transfer defect

The corrected tests no longer compute hashes inside UART `data` callbacks and
no longer judge completion at a short fixed deadline. They collect received
data, evaluate it as soon as the expected length is present, and retain a
failure deadline only for genuinely incomplete transfers.

With that correction:

- 128-byte and 200-byte transfers pass in both directions;
- simultaneous full-duplex payloads are complete;
- the upstream 64-byte UART-task receive buffer is sufficient;
- no 120-byte FIFO-boundary truncation remains.

## Minimal Source Correction

The candidate changes only `targets/esp32/jshardwareUart.c`, and only for
`CONFIG_IDF_TARGET_ESP32`:

1. `initSerial()` and `uninitSerial()` request a cooperative pause and wait
   for the UART task to acknowledge it before deleting or installing a UART
   driver.
2. The UART task waits while driver replacement is in progress, then resumes
   normal polling.
3. `Serial2` and `Serial3` call `uart_flush_input()` immediately after driver
   installation so receive state from the former driver/pin route is not
   exposed to JavaScript.

The candidate does not change the transmit implementation, receive-buffer
size, polling delay, receive timeout or UART0 behavior. It does not use a USB
feature as a proxy for target identity.

## Validation

| Source/build | Corrected 18-script suite | Focused result |
|---|---:|---|
| untouched master, `BOARD=ESP32` | disrupted by lifecycle failures | setup/unsetup reproducer asserted and rebooted |
| untouched master, `BOARD=ESP32_IDF5` | 17/18 scripts passed | first-receive reproducer failed 5/10 iterations |
| candidate, `BOARD=ESP32` | 18/18 scripts passed | both focused reproducers passed |
| candidate, `BOARD=ESP32_IDF5` | 18/18 scripts passed | both focused reproducers passed |
| candidate, `BOARD=ESP32C3_IDF5` | focused C3 runtime test | clean build; all 102 checks passed; classic-only code excluded |

The candidate completed 100 repeated `Serial2.setup()`/`unsetup()` cycles on
both runtime build lines with no driver error, assertion or reboot. The
cross-UART reproduction completed ten alternating setup/write/read cycles on
both builds with no extra byte or malformed payload.

The exact candidate C3 build completed polling and event-driven reception plus
100 alternating 115200/57600-baud setup/write/read/unsetup cycles. It reported
no unexpected bytes, failed checks, assertions or resets.

The full functional suite covers:

- `Serial.setup()`, `Serial.unsetup()` and `Serial.isConnected()`;
- `Serial.write()`, `print()`, `println()` and `flush()`;
- `available()`, partial `read()` and `on("data")` delivery;
- listener addition, removal, ordering and reattachment;
- `inject()` and `pipe()`;
- baud and frame reconfiguration, mismatch and recovery;
- simultaneous full-duplex transfer;
- repeated setup/write/read/unsetup;
- 32, 64, 65, 96, 128 and 200-byte transfers in both directions.

## Simple REPL Reproductions

The focused scripts are under `docs/investigations/uart/repros/`:

- `esp32_uart_driver_lifecycle.js`: no external UART wiring required;
- `esp32_uart_stale_nul.js`: three short alternating transfers reproduce the
  stale NUL and stop without a final driver teardown;
- `esp32_uart_first_receive.js`: connect `D4` to `D36` and `D14` to `D35`;
- `core_stream_buffer_multichunk.js`: separate Core buffering issue described
  below.

They can be pasted directly into an Espruino REPL or run with:

```bash
python3 tools/repl/run_test.py \
  docs/investigations/uart/repros/esp32_uart_driver_lifecycle.js \
  --port <REPL_PORT> --timeout 40 --show-raw
```

## Separate Core Stream-Buffer Defect

There is a third issue, but it is not part of the proposed ESP32 driver PR.
When physical serial data arrives in multiple 64-byte events while no
JavaScript `data` listener is attached, `Serial.read()` does not reliably
return the complete buffered payload.

On untouched current master:

- `BOARD=ESP32` asserted in `jsvStringIteratorAppend()` while
  `jswrap_stream_pushData()` appended the second chunk;
- `BOARD=ESP32_IDF5` returned only 64 of 128 bytes.

This path is in Espruino Core stream buffering, after the target driver has
already supplied the events. It should be reported and corrected separately;
bundling it would obscure the narrowly evidenced UART driver fix.

## PR Boundary

The submitted PR contains only the one-file, classic-target driver
coordination and input-flush change. Its evidence should include the two
simple reproductions, both corrected classic runtime suites and the C3 clean
compile/runtime check. It does not claim a receive-buffer-size or UART-FIFO
fix and does not include the separate Core stream-buffer correction.
