# ESP32-Family UART Driver Lifecycle Validation

Date: 8 September 2026

## Conclusion

The revised UART driver-lifecycle candidate is suitable for family-wide
upstream review. It prevents the ESP32 UART polling task from using a driver
while `Serial.setup()` or `Serial.unsetup()` deletes or reinstalls that driver.
The change compiles for all seven current ESP32-family board definitions and
completed repeated runtime lifecycle tests on classic ESP32, ESP32-C3 and
ESP32-S3 hardware without an assertion, abort or reboot.

This candidate addresses only the driver deletion/reconfiguration race. It no
longer contains the classic-target guard or an RX flush, and it makes no claim
to correct unsolicited bytes seen during UART setup on the legacy classic
build.

## Source Under Test

- upstream base: `ed46a3a0be4cd788ec55fc4ccd9df45f5b219214`;
- source repository: `SimonGAndrews/Espruino`, synchronized from
  `espruino/Espruino`;
- candidate branch: `fix/esp32-uart-driver-reconfiguration`;
- candidate revision: `363ba92c96ee2ccdf346fa7cb259f4e3016aa598`;
- reported Espruino version: `2v29.385`;
- modified firmware file: `targets/esp32/jshardwareUart.c`;
- upstream pull request:
  [espruino/Espruino#2742](https://github.com/espruino/Espruino/pull/2742).

The cumulative firmware change pauses the UART polling task cooperatively
before deleting or creating a UART driver, waits for the task to acknowledge
that pause, performs the driver operation, and then resumes polling. The
coordination applies to the shared ESP32-family implementation rather than
being guarded to the classic target.

## Validation Matrix

| Board definition | Compile | Hardware runtime result |
|---|---:|---|
| `ESP32` | passed | 100 consecutive `Serial2.setup()` / `Serial2.unsetup()` cycles completed without assertion or reboot |
| `ESP32_IDF4` | passed | compile check only |
| `ESP32_IDF5` | passed | 100 lifecycle cycles completed; all 18 distinct classic cross-UART functional scenarios were satisfied after correcting the setup order in the repeated-lifecycle test |
| `ESP32C3_IDF4` | passed | compile check only |
| `ESP32C3_IDF5` | passed | 100 lifecycle cycles plus 102 exact loopback checks completed |
| `ESP32S3_IDF4` | passed | compile check only |
| `ESP32S3_IDF5` | passed | 100 lifecycle cycles plus 100 exact crossed-UART transfers completed |

The compile checks confirm that the unguarded coordination code is accepted by
the legacy, IDF4 and IDF5 implementations for each supported target. Runtime
claims are limited to the builds and physical boards shown above.

Each build used the board-specific environment selected by the candidate
revision's `scripts/provision.sh`, followed by a clean release build. The
provisioned SDK lines were the legacy ESP32 V3.1 build environment, ESP-IDF
4.4.8 and ESP-IDF 5.5.3 respectively.

## Runtime Coverage

### Classic ESP32 IDF5

The classic ESP32 V1 harness cross-connected `Serial2` and `Serial3`, while
UART0 remained the REPL connection. Eighteen separate scripts exercised:

- `Serial.setup()`, reconfiguration, `unsetup()` and `isConnected()`;
- `write()`, `print()`, `println()` and `flush()`;
- `available()`, whole and partial `read()` operations;
- `on("data")`, listener ordering, removal and reattachment;
- `inject()` and `pipe()`;
- mismatched-baud behaviour and recovery;
- simultaneous full-duplex traffic;
- repeated setup/write/read/unsetup operations;
- 32, 64, 65, 96, 128 and 200-byte transfers in both directions.

Seventeen scripts passed on the initial run. The repeated-lifecycle script
initially enabled the crossed receiver before its transmitting source had
established the UART idle-high state. After the test was corrected to configure
the sender first, its ten alternating 115200/57600-baud transfers all matched
exactly. The focused no-wiring lifecycle reproduction also completed all 100
cycles.

### ESP32-C3 IDF5

The C3 used its native USB Serial/JTAG connection for the REPL and looped
`Serial2` from `D3` to `D4`. The focused test completed polling reception,
event-driven reception and 100 alternating 115200/57600-baud
setup/write/read/unsetup transfers. All 102 payload checks matched exactly.
The separate no-wiring lifecycle reproduction completed 100 cycles.

### ESP32-S3 IDF5

An Olimex ESP32-S3-DevKit-LiPo used native USB Serial/JTAG for the REPL. The
test cross-connected `Serial2` and `Serial3` using `D4` to `D16` and `D15` to
`D7`. After establishing the transmitting UART before enabling its crossed
receiver, all 100 alternating-direction payloads matched exactly. The separate
no-wiring lifecycle reproduction also completed 100 cycles.

## Legacy Classic Result and Deferred Unsolicited Bytes

The legacy `BOARD=ESP32` build completed the PR's focused 100-cycle lifecycle
reproduction without the former FreeRTOS queue assertion or a reboot. This is
the direct validation of the defect addressed by the candidate.

The broader 18-script run produced six completely clean scripts and twelve
scripts with an unsolicited byte at UART startup. Most received `0x00`; the
9600-baud reconfiguration case received `0xC0`. The remaining failed length,
hash, partial-read and listener-count checks were consequences of those leading
bytes. No incomplete intended payload, assertion, abort or reboot occurred.

This has the same form as the separate unsolicited-byte behaviour already
reproduced on untouched master. At upstream request, the RX flush previously
proposed for that symptom has been removed from this PR. The result is retained
as evidence but is not attributed to, or claimed to be fixed by, the driver
lifecycle change.

## Hardware Preconditions

- Classic ESP32: UART0 USB-UART control; `SEL_D35=UART`;
  `JP_UART_LOOP2=closed`; `SEL_D33=1-2`; `SEL_D26=1-2`; external 5 V disabled.
- ESP32-C3: native USB Serial/JTAG control; external 5 V enabled; onboard
  USB-UART disconnected; `SEL_D3` and `SEL_D4` in loop positions; J10 signal
  shunts open.
- ESP32-S3: native USB Serial/JTAG control; external 5 V supply; crossed UART
  wires `D4 -> D16` and `D15 -> D7`.

## Test Assets

- `docs/investigations/uart/repros/esp32_uart_driver_lifecycle_family.js`:
  100 driver create/delete cycles without external UART wiring;
- `docs/investigations/uart/repros/esp32s3_uart_crosslink_lifecycle.js`:
  100 exact transfers between two crossed S3 UARTs;
- `tests/repl/uart_block7/c3_uart_single_loop_lifecycle.js`: polling, event and
  repeated C3 loopback reception;
- `tests/repl/uart_block7/`: the 18-script classic UART API suite.
