# ESP32 Post-IDF5-Merge UART Compatibility Regression

Date: 5 September 2026

## Conclusion

A local Espruino source candidate restores the classic ESP32 UART behaviour
lost after the IDF5 merge. The candidate passes all 18 V1 Block 7 UART scripts
when built as either `BOARD=ESP32` or `BOARD=ESP32_IDF5`. Both builds again
deliver complete 128-byte and 200-byte transfers in both directions, and pass
full-duplex and repeated setup/unsetup tests.

The correction preserves the newer UART-task transmit path for targets that
define `ESPR_USE_USB_SERIAL_JTAG`, while restoring the proven pre-merge
execution model for classic ESP32 targets. A clean `BOARD=ESP32C3_IDF5` build
and focused C3 V1 runtime test confirm that the native USB path remains
compileable and functional.

Status: validated local candidate committed as `154d4a8c8`; not yet submitted
upstream.

## Regression Context

The same-source post-merge run at `e5341719a` found:

- classic `ESP32`: 2 of 18 UART scripts passed;
- `ESP32_IDF5`: 16 of 18 UART scripts passed;
- classic failures included leading NUL data, lifecycle assertions and long
  transfers stopping at an internal boundary;
- pre-IDF5-merge `ESP32_IDF4` at `0af6e1568`, including Core fix
  `a3f085979`, had previously passed clean-start 128-byte and 200-byte bursts
  in both directions.

The current investigation used Espruino branch
`fix/esp32-classic-uart-compat`, based on `bffc6d068`. Firmware reports
`2v29.380`; the candidate source is commit `154d4a8c8`.

## Source Attribution

The earlier Core correction `a3f085979` remains present and is still required.
It prevents failure when serial data from multiple internal event chunks is
assembled into a JavaScript string. It does not address the later target-side
UART scheduling regression investigated here.

The relevant post-baseline ESP32 changes are:

- `391070be2` moved physical UART transmission out of `jshUSARTKick()` and
  into the high-priority UART polling task;
- `5dc64163d` added 64-byte transmit batching and replaced the former
  256-byte receive buffer with a 64-byte task-local buffer;
- `ac9189744` made `Serial.unsetup()` delete an installed UART driver, which
  exposed a race if the UART task was blocked inside `uart_read_bytes()`;
- later adaptive/idle-delay changes were designed for native USB Serial/JTAG
  targets but also changed classic ESP32 polling timing.

The most diagnostic symptom was deterministic receipt of exactly 120 bytes
from a 128-byte or 200-byte transfer. This matches the ESP32 UART FIFO-full
threshold: the full-threshold portion was delivered while the trailing partial
FIFO was not consistently serviced in the merged scheduling model.

## Candidate Correction

The candidate changes only the shared ESP32 UART implementation:

1. When `ESPR_USE_USB_SERIAL_JTAG` is not defined, physical UART output is
   again drained synchronously by `jshUSARTKick()`, one byte at a time.
2. The UART polling task leaves classic physical-UART transmit data to that
   synchronous path. Native USB targets retain task-owned 64-byte batching.
3. Classic builds regain a 256-byte receive buffer and the pre-merge 50 ms
   UART0 read interval; native USB targets retain the newer 64-byte/adaptive
   path.
4. Classic receiver setup flushes stale input and explicitly enables a short
   receive timeout so a trailing partial FIFO is delivered.
5. On classic ESP32 only, setup and unsetup pause the UART polling task before
   deleting or replacing a driver. This prevents `uart_driver_delete()`
   invalidating driver objects while `uart_read_bytes()` is using them. The
   pause state and handshake are excluded entirely when
   `ESPR_USE_USB_SERIAL_JTAG` is defined.
6. Classic UART0 polling remains unconditional because its console driver is
   installed for the task lifetime. Native USB targets retain the
   initialisation check because UART0 can legitimately be absent.

The principal compatibility boundary is target capability, not IDF version:
classic ESP32 builds under both the legacy IDF and IDF5 use the classic path;
C3/native-USB builds retain the newer path.

## Validation Results

Hardware and mode:

- classic ESP32 DevKitC V4 target, MAC `08:b6:1f:70:14:e8`;
- ESP32 V1 harness;
- `Serial2`: TX `D4`, RX `D35`;
- `Serial3`: TX `D14`, RX `D36`;
- `SEL_D35=UART`, `JP_UART_LOOP2=closed`, `SEL_D33=1-2`,
  `SEL_D26=1-2`;
- UART0 on `D1`/`D3` used as the runner/control connection.

| Build | Toolchain | Result |
|---|---|---|
| `BOARD=ESP32` | legacy ESP-IDF build | 18/18 UART scripts pass |
| `BOARD=ESP32_IDF5` | ESP-IDF 5.5.3 | 18/18 UART scripts pass |
| `BOARD=ESP32C3_IDF5` | ESP-IDF 5.5.3 | clean build and focused C3 UART loopback pass, 22/22 checks |

The 18-script runtime suite covers:

- `Serial.setup()`, `Serial.unsetup()` and `Serial.isConnected()`;
- `Serial.write()`, `print()`, `println()` and `flush()`;
- `available()`, partial `read()` and buffered delivery;
- `on("data")`, listener ordering/removal and listener reattachment;
- `inject()` and `pipe()`;
- baud rate, frame options, mismatch and recovery;
- simultaneous full-duplex transfer;
- ten alternating setup/write/read/unsetup iterations;
- 32, 64, 65, 96, 128 and 200-byte transfers in both directions.

No failed checks, leading NUL bytes, assertions or resets were observed in
either complete candidate run.

### C3 Native-USB Guard Validation

The final C3 run used:

- ESP32-C3-DevKitC-02 V1 target, MAC `dc:da:0c:d1:c1:90`;
- `BOARD=ESP32C3_IDF5`, Espruino `2v29.380`, source `154d4a8c8`;
- ESP-IDF 5.5.3;
- native USB Serial/JTAG on `D18`/`D19` as `/dev/ttyACM0` for control;
- external 5 V harness power, with the board USB-UART cable disconnected;
- `SEL_D3=a2-b2` and `SEL_D4=a2-b2` for the `D3 -> R7 -> D4`
  loop-B path;
- both signal shunts on `J10 / SEL_UART0_UART1` open.

The focused test exercised `Serial2` on TX `D3` and RX `D4`. It passed a
polling `available()`/`read()` transfer, an `on("data")` transfer, and twenty
alternating 115200/57600-baud setup/write/read/unsetup cycles. All 22 checks
passed. This directly covers the setup/unsetup lifecycle that motivated
guarding the pause handshake away from native-USB targets.

Source inspection provides the second part of the C3 confidence: all pause
state, pause/resume helpers and calls are inside
`#ifndef ESPR_USE_USB_SERIAL_JTAG`. The native C3 uninitialisation ordering,
64-byte UART-task transmit batching, receive buffer and adaptive polling path
remain the upstream implementation.

### C3 DevKit UART0 RX Limitation

The intended full UART0/UART1 crosslink was also checked, but it is not a valid
two-way test on the fitted DevKitC-02 without isolating its onboard USB-UART
bridge. The board schematic powers the CP2102N from `VCC_3V3` and connects its
TXD to `U0RXD` through zero-ohm resistor `R21`. Live GPIO tests found `D20`
high with floating, pull-up and pull-down input modes, and still high while
`D3` was driven low. By contrast, the `D21 -> D4` path followed both logic
levels and passed a polling serial transfer.

Therefore failures in the `D3 UART1 TX -> D20 UART0 RX` direction are a
hardware ownership conflict, not candidate firmware evidence. The full
crosslink requires deliberate CP2102N TX isolation. The non-destructive
loop-B test above is the accepted C3 runtime evidence for this source guard.

Temporary detailed runner logs from this investigation are under:

- `/tmp/espruino-classic-uart-compat-full-suite/`;
- `/tmp/espruino-idf5-uart-compat-full-suite/`;
- `/tmp/espruino-c3-uart-guard-suite/`.

These paths are local evidence only and are not repository artifacts.

## Next Action

Package Espruino commit `154d4a8c8` as the proposed fix associated with the
classic ESP32 UART regression issue. The classic builds and the native-USB C3
guard have now received the required local validation.
