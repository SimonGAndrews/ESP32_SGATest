# ESP32 UART transmit-buffer pull request

> **Status — 14 October 2026:** Submitted and merged upstream as
> [espruino/Espruino#2768](https://github.com/espruino/Espruino/pull/2768).
> The upstream merge commit is `5e90a914531e6724349c38f22c392747fe49f4f8`.

## Submitted title

ESP32: Update UART TX buffer size

## Summary

Use a 256-byte UART transmit buffer instead of 128 bytes when installing an
ESP32 UART driver.

ESP-IDF requires a nonzero software transmit buffer to be larger than the UART
hardware FIFO. The classic ESP32 FIFO is 128 bytes, so the current 128-byte
configuration is rejected by ESP-IDF 5.5.3. A 256-byte buffer retains the
intended memory reduction from the former 1024-byte buffer while satisfying
the driver requirement.

## Problem

On current master, a classic `BOARD=ESP32_IDF5` image builds and flashes, but
the normal UART0 Espruino console is unavailable after reset. ESP-IDF reports
repeated UART driver errors because `uart_driver_install()` rejected the
configuration during startup.

This is a pre-REPL failure, so it cannot be demonstrated with a JavaScript
command on the affected image. The minimal reproduction is:

1. build and flash current master as `BOARD=ESP32_IDF5`;
2. open the board UART0 console at 115200 baud; and
3. reset the board.

The console does not reach a usable Espruino prompt and repeatedly reports
UART driver errors.

### Observed console/REPL behaviour

With the console opened at the correct 115200 baud, the unmodified
current-master image does not present a usable `>` prompt. It repeatedly emits
errors of this form:

```text
uart_write_bytes(...): uart driver error
uart_read_bytes(...): uart driver error
```

The board has booted far enough to produce ESP-IDF diagnostics, but the UART
driver installation has failed. Consequently, Espruino cannot reliably write
the prompt or receive a JavaScript command, so there is no REPL command that
can reproduce the fault from inside the affected image.

Garbled or apparently binary console output seen at 9600 baud was simply a
terminal-baud mismatch; the ESP32 classic Espruino console uses 115200 baud and
that observation is not part of this defect.

## Source cause

The 128-byte TX value was introduced by Espruino commit
[`7be3a7d92` — ESP32 buffer size adjustments to help with uploads specifically
over USB](https://github.com/espruino/Espruino/commit/7be3a7d92cb8fd6b51ebb7b2ab3e9b893ff178a5).
That commit reduced the UART driver's RX and TX buffers from 1024 bytes each
to 512 and 128 bytes respectively. This PR retains the reduced 512-byte RX
buffer and changes only the invalid 128-byte TX value.

The current code requests:

```c
uart_driver_install(uart_num, 512, 128, 0, NULL, 0);
```

The official
[ESP-IDF 5.5.3 `uart_driver_install()` documentation](https://docs.espressif.com/projects/esp-idf/en/v5.5.3/esp32/api-reference/peripherals/uart.html)
requires:

```text
RX buffer > UART hardware FIFO length
TX buffer = 0 or TX buffer > UART hardware FIFO length
```

The 128-byte nonzero transmit buffer is therefore invalid on the classic
ESP32. ESP-IDF 5.5.3 defines that target's
[`SOC_UART_FIFO_LEN` as 128 bytes](https://github.com/espressif/esp-idf/blob/v5.5.3/components/soc/esp32/include/soc/soc_caps.h#L360).
Consequently, a buffered configuration must use a TX value greater than 128
bytes; this PR uses 256 bytes.

## Correction

```diff
-  err = uart_driver_install(uart_num, 512, 128, 0, NULL, 0);
+  // ESP-IDF requires a nonzero TX buffer to be larger than the 128-byte
+  // hardware FIFO. Keep this reduced from the former 1024 bytes, but valid.
+  err = uart_driver_install(uart_num, 512, 256, 0, NULL, 0);
```

The change is intentionally limited to
`targets/esp32/jshardwareUart.c`.

## Source and branch

| Item | Value |
|---|---|
| Upstream base | `92fe2b5cf40ed0d9313ac0c8b9a46347bcb6979c` |
| Upstream PR | [`#2768`](https://github.com/espruino/Espruino/pull/2768), merged |
| Upstream merge | `5e90a914531e6724349c38f22c392747fe49f4f8` |
| Branch | `fix/esp32-uart-tx-buffer` |
| Commit | `b404ed671f1fc378bea40a2a89389059f831dd33` |
| Files changed | 1 |

The branch is based directly on the current upstream master used for the
reproduction. It does not contain the separate `Wifi.ping()` work.

## Validation

The 256-byte candidate restored the classic `ESP32_IDF5` UART0 console.

The classic ESP32 V1 UART crosslink then completed:

- 100 repeated `Serial2.setup()`, transfer and `Serial2.unsetup()` cycles;
- all 18 UART functional scripts (including setup, reconfiguration and
  unsetup; `write`, `print`, `println` and `flush`; polling and event-driven
  reads; listener removal and reattachment; `inject` and `pipe`; recovery from
  mismatched baud rates; simultaneous full-duplex traffic; and burst
  transfers); and
- all 122 individual functional checks (including connection state, exact
  payload content and length, `available()` and partial-read results, callback
  and listener behaviour, transmit completion, and 32-, 64-, 65-, 96-, 128-
  and 200-byte transfers in both directions).

The 200-byte transfers were delivered correctly across multiple internal
JavaScript data-event chunks. No assertion, reboot, UART driver error,
incomplete transfer or malformed payload was observed.

The same correction was present during final IDF5 family validation:

| Target | UART lifecycle result |
|---|---|
| Classic `ESP32_IDF5` | 100/100 cycles passed |
| `ESP32C3_IDF5` | 100/100 cycles passed |
| `ESP32S3_IDF5` | 100/100 cycles passed |

For C3 and S3, this was the focused, no-wiring family lifecycle reproducer.
It configured the target's `Serial2` port at 115200 baud, waited 5 ms,
unconfigured the port, waited another 5 ms and repeated that sequence 100
times. C3 used `D3`/`D4`; S3 used `D4`/`D7`. Both targets reached
`PASS iterations=100` without a setup exception, assertion or reboot.

This focused C3/S3 run did not transmit UART payloads and was not the complete
18-script classic cross-UART suite. Its purpose was to confirm that the shared
driver could be installed and deleted repeatedly with the corrected buffer
size on both additional IDF5 targets.

Clean combined-candidate builds also passed for all seven maintained ESP32
board definitions: `ESP32`, `ESP32_IDF4`, `ESP32_IDF5`, `ESP32C3_IDF4`,
`ESP32C3_IDF5`, `ESP32S3_IDF4` and `ESP32S3_IDF5`.

An additional clean `ESP32_IDF5` build from the exact focused PR branch also
completed successfully at commit `b404ed671`. The resulting application image
was `0x17a060` bytes, leaving `0x79fa0` bytes (24%) free in the smallest app
partition.

## Reviewer note

The family runtime images used for the final closeout also contained separate
`Wifi.ping()` corrections. Those changes do not touch the UART source and are
not present in this PR. The initial classic UART restoration and complete
18-script UART suite were run on the focused 256-byte UART candidate before
the ping work was added.
