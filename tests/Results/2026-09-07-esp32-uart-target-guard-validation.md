# ESP32 Current-Master UART Reevaluation

Date: 7 September 2026

> Superseded: the candidate was subsequently changed to coordinate UART driver
> reconfiguration across the ESP32 family and to omit the proposed RX flush.
> Current validation is recorded in
> [the family-wide result](2026-09-08-esp32-uart-family-driver-lifecycle-validation.md).

## Result

The corrected functional tests disprove the previously reported long-transfer
and full-duplex truncation. Current master delivers the complete intended
payload at 128 and 200 bytes when the test waits for receipt rather than doing
expensive hash calculations inside `data` callbacks against a fixed deadline.

Two real classic-ESP32 driver symptoms remain:

- the legacy `BOARD=ESP32` build can delete a UART driver while its polling
  task is reading it, causing a FreeRTOS assertion and reboot;
- `BOARD=ESP32_IDF5` can deliver one stale leading NUL after repeated UART
  reconfiguration.

A one-file, classic-target source candidate corrects both symptoms. The
candidate has been submitted as a pull request and is awaiting upstream
review.

## Provenance

- upstream source: `ed46a3a0b` (`2v29.383`);
- candidate branch: `fix/esp32-uart-driver-reconfiguration`;
- modified source: `targets/esp32/jshardwareUart.c`;
- classic hardware: ESP32 DevKitC V4, MAC `08:b6:1f:70:14:e8`;
- IDF5 toolchain: ESP-IDF 5.5.3.
- C3 runtime build: `BOARD=ESP32C3_IDF5`, `2v29.384`, candidate commit
  `cc6dd86d2`.

The runtime tests used UART0 for the REPL and cross-connected:

- `Serial2` TX `D4` to `Serial3` RX `D36`;
- `Serial3` TX `D14` to `Serial2` RX `D35`.

## Validation Matrix

| Source/build | Full UART suite | Focused reproduction |
|---|---:|---|
| untouched master, `BOARD=ESP32` | lifecycle faults prevented a valid clean pass | `uart driver error`, `xQueueGenericReceive` assertion, reboot |
| untouched master, `BOARD=ESP32_IDF5` | 17/18 scripts passed | 5/10 alternating receives had a leading NUL |
| candidate, `BOARD=ESP32` | 18/18 scripts passed | 100 lifecycle cycles and 10 alternating transfers passed |
| candidate, `BOARD=ESP32_IDF5` | 18/18 scripts passed | 100 lifecycle cycles and 10 alternating transfers passed |
| candidate, `BOARD=ESP32C3_IDF5` | focused C3 runtime test | clean build; all 102 checks passed |

No failed checks, extra bytes, assertions or resets were observed in either
complete candidate classic-target suite.

The exact candidate C3 build also completed polling and event-driven UART
reception checks plus 100 alternating 115200/57600-baud
setup/write/read/unsetup cycles. All 102 checks passed, with no unexpected
bytes, assertions or resets.

## Corrected Functional Coverage

The 18 scripts exercise the following Espruino APIs and behavior:

- `Serial.setup()`, reconfiguration, `unsetup()` and `isConnected()`;
- `Serial.write()`, `print()`, `println()` and `flush()`;
- `available()`, whole and partial `read()` operations;
- `on("data")`, listener removal, ordering and reattachment;
- `inject()` and `pipe()`;
- mismatched-baud behavior and recovery;
- traffic in both directions at once;
- ten alternating setup/write/read/unsetup iterations;
- 32, 64, 65, 96, 128 and 200-byte payloads in both directions.

The seven transfer tests were corrected so their callbacks only collect data.
They evaluate content after the expected length arrives and use a longer
deadline only to identify a genuinely incomplete transfer.

## Focused REPL Evidence

`docs/investigations/uart/repros/esp32_uart_driver_lifecycle.js` needs no UART
wiring. It repeatedly executes `Serial2.setup()` and `Serial2.unsetup()`. The
untouched legacy build asserted and rebooted; the candidate completed all 100
cycles under both classic build lines.

`docs/investigations/uart/repros/esp32_uart_first_receive.js` uses the two
cross-wires stated above. It recreates `Serial2` and `Serial3`, alternates baud
and direction, writes a short string, then compares `Serial.read()` with that
string. Untouched IDF5 master returned `"\0UART_n"` in all five reverse
iterations; the candidate passed all ten iterations under both builds.

`docs/investigations/uart/repros/esp32_uart_stale_nul.js` reduces that behavior
to three alternating transfers. On untouched classic `BOARD=ESP32` master it
returned `"\0UART_2"` on the third case, reported the unsolicited NUL, and
stopped without a final driver teardown or native assertion.

## Candidate Scope

The candidate is guarded by `CONFIG_IDF_TARGET_ESP32`. It:

- pauses the UART polling task cooperatively while a driver is deleted or
  reinstalled;
- flushes `Serial2`/`Serial3` receive state immediately after installation.

It does not alter UART transmit handling, receive-buffer size, polling timing,
receive timeout, UART0 or ESP32-C3 source behavior.

## Separate Finding

`docs/investigations/uart/repros/core_stream_buffer_multichunk.js` identified
a separate generic Espruino stream-buffer problem when 128 serial bytes arrive
as multiple events before a `data` listener is attached. Untouched legacy
master asserted while appending the second event; untouched IDF5 master later
returned only 64 bytes. This is not included in the UART driver candidate and
needs its own investigation or issue.

## Commands

The functional suite was run sequentially with:

```bash
python3 tools/repl/run_test.py tests/repl/uart_block7/<test>.js \
  --port /dev/serial/by-id/usb-1a86_USB_Serial-if00-port0 \
  --timeout 20
```

The focused lifecycle test used a 40-second runner timeout because 100 IDF5
driver recreations take approximately 27 seconds on this build.
