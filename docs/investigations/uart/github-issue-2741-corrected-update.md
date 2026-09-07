# Corrected investigation update

Further testing has shown that some of the failures originally reported in
this issue were caused by timing assumptions in our test scripts, rather than
by faults in the ESP32 UART implementation.

Please disregard the earlier claims concerning:

- incomplete transfers at 64-byte or 120-byte boundaries;
- incomplete 128-byte and 200-byte transfers;
- incomplete simultaneous full-duplex transfers;
- a need to restore the former transmit path, 256-byte receive buffer or
  polling interval;
- a need to reduce UART transmit chunks to 32 bytes.

The affected tests were calculating data hashes inside JavaScript `data`
callbacks and then judging completion against a short fixed deadline. After
changing the tests to collect the data first, finish when the expected length
has arrived and calculate the hash afterwards, current master transfers the
complete payload in both directions.

However, two separate UART driver-lifecycle defects remain reproducible on the
classic ESP32 target. Arguably these are edge cases found during stress
testing.

## 1. UART driver lifecycle assertion

Repeatedly using the normal `Serial.setup()` and `Serial.unsetup()` APIs can
delete an ESP-IDF UART driver while Espruino's UART polling task is inside
`uart_read_bytes()`.

This minimal reproduction requires no external UART wiring. UART0 remains the
REPL connection.

This test repeatedly starts and stops Serial2 using the normal Espruino Serial.setup() and Serial.unsetup() APIs.
It checks whether rapid reconfiguration can cause the background UART handling to fail, assert or reboot the ESP32.

```js
echo(false);
print("TEST=esp32_uart_driver_lifecycle");

var iteration = 0;
var finished = false;
var deadline = setTimeout(function() {
  if (finished) return;
  finished = true;
  Serial2.unsetup();
  print("FAIL timeout iteration=" + iteration);
  print("DONE=esp32_uart_driver_lifecycle");
}, 30000);

function next() {
  if (finished) return;
  if (iteration >= 100) {
    finished = true;
    clearTimeout(deadline);
    Serial2.unsetup();
    print("PASS iterations=" + iteration);
    print("DONE=esp32_uart_driver_lifecycle");
    return;
  }
  Serial2.setup(115200, {tx:D4, rx:D35});
  setTimeout(function() {
    Serial2.unsetup();
    iteration++;
    if (!(iteration % 10)) print("INFO iteration=" + iteration);
    setTimeout(next, 5);
  }, 5);
}

next();
```

On untouched current master `ed46a3a0b`, built as `BOARD=ESP32`, this
repeatedly produced:

```text
uart: uart_read_bytes(1227): uart driver error
xQueueGenericReceive ... assert failed
```

The decoded call chain was:

```text
xQueueGenericReceive
  -> uart_read_bytes
  -> pollSerialDevices
  -> uartTask
```

The board then rebooted.

## 2. Unsolicited NUL after UART reconfiguration

Rapidly recreating both non-console UARTs while alternating baud rate,
direction and traffic can place an unsolicited NUL before an otherwise
complete payload.

For this reproduction, cross-connect `D4` to `D36` and `D14` to `D35`. UART0
remains the REPL connection.

This test sends short messages between Serial2 and Serial3 while changing the baud rate and transfer direction.
It checks whether UART reconfiguration inserts an unexpected NUL (\u0000) byte before an otherwise correct message.

```js
echo(false);
print("TEST=esp32_uart_stale_nul");

var cases = [
  {baud:115200, reverse:false, text:"UART_0"},
  {baud: 57600, reverse:true,  text:"UART_1"},
  {baud:115200, reverse:false, text:"UART_2"}
];

var index = 0;

function finish(result) {
  echo(true);
  print(result);
  print("DONE=esp32_uart_stale_nul");
}

function runCase() {
  if (index >= cases.length) {
    finish("NOT REPRODUCED");
    return;
  }

  if (index) {
    Serial2.unsetup();
    Serial3.unsetup();
  }

  setTimeout(function() {
    var c = cases[index];
    var sender = c.reverse ? Serial3 : Serial2;
    var receiver = c.reverse ? Serial2 : Serial3;

    Serial2.setup(c.baud, {tx:D4, rx:D35});
    Serial3.setup(c.baud, {tx:D14, rx:D36});

    receiver.read();
    sender.write(c.text);

    setTimeout(function() {
      var got = receiver.read() || "";
      print("CASE=" + index +
            " BAUD=" + c.baud +
            " RECEIVED=" + JSON.stringify(got));

      if (got.indexOf("\0") >= 0) {
        finish("REPRODUCED unsolicited NUL");
        return;
      }

      index++;
      setTimeout(runCase, 80);
    }, 180);
  }, 80);
}

runCase();
```

On untouched current master, built as `BOARD=ESP32`, this produced:

```text
TEST=esp32_uart_stale_nul
CASE=0 BAUD=115200 RECEIVED="UART_0"
CASE=1 BAUD=57600 RECEIVED="UART_1"
CASE=2 BAUD=115200 RECEIVED="\u0000UART_2"
REPRODUCED unsolicited NUL
DONE=esp32_uart_stale_nul
```

A setup-only test with no UART traffic did not reproduce the NUL. The current
evidence therefore points to stale or transitional receive state during rapid
UART traffic and driver reconfiguration, rather than `Serial.setup()` alone.

## Source attribution

The unsafe driver-replacement pattern predates the IDF5 merge: the classic
ESP32 implementation already deleted and reinstalled a UART driver during
`Serial.setup()` without coordinating with the polling task.

In our pre-IDF5 BOARD=ESP32 comparison, an  earlier ten-cycle UART reconfiguration test completed without an assertion or unsolicited NUL. A focused 100-cycle lifecycle and stale-NUL reproductions were developed only after the merge, so the earlier result does not prove that the defects were absent.

The IDF5 UART lifecycle work made `Serial.unsetup()` delete the installed
driver as well, increasing the number of normal API paths that can expose the
existing race. The most accurate description is therefore a long-standing
latent driver-replacement race that was widened or exposed by the IDF5 UART
lifecycle changes, not a wholly new UART failure created by IDF5.

## Proposed correction

The proposed correction is deliberately narrow and changes only
`targets/esp32/jshardwareUart.c` for the classic ESP32 target:

1. Pause the UART polling task cooperatively before deleting or reinstalling a
   UART driver, and wait until the task acknowledges the pause.
2. Resume the polling task after driver configuration is complete.
3. Flush the newly installed `Serial2` or `Serial3` receive path before it is
   exposed to JavaScript.

It does not alter UART transmission, receive-buffer size, polling frequency,
receive timeout or UART0 behaviour. The code is guarded by
`CONFIG_IDF_TARGET_ESP32`, rather than by a USB-related feature definition.

## Validation

Source base: current master `ed46a3a0b`.

Using the ESP32 test harness and the Codex generated test suite:

| Build | Validation result |
|---|---|
| `BOARD=ESP32` | All 18 UART functional scripts completed with no failed checks. The two focused defect reproductions also passed. |
| `BOARD=ESP32_IDF5` | All 18 UART functional scripts completed with no failed checks. The two focused defect reproductions also passed. |
| `BOARD=ESP32C3_IDF5` | Firmware compiled successfully and all 102 checks in the focused C3 UART runtime test completed without failure. |

The two classic target builds each completed 100 repeated
`Serial2.setup()`/`Serial2.unsetup()` cycles without an assertion or reboot.
They also completed the alternating UART reconfiguration test without an
extra byte or malformed payload.

The C3 build completed polling and event-driven UART reception checks plus 100
alternating 115200/57600-baud setup, write, read and unsetup cycles. No
unexpected bytes, failed checks, assertions or resets were observed.

Runtime coverage included:

- setup, reconfiguration and unsetup;
- listener lifecycle and buffered reads;
- write, print, println and flush;
- mismatched-baud recovery;
- simultaneous full-duplex traffic;
- repeated setup/write/read/unsetup cycles;
- 32, 64, 65, 96, 128 and 200-byte transfers in both directions.

The C3 runtime test used firmware version `2v29.384` built from the exact
candidate commit `cc6dd86d2`. Together with the build guard check, this
confirms both that the classic-only correction is excluded from the C3 binary
and that ordinary C3 hardware UART operation remains functional.

The narrowly scoped source change has now been submitted as a proposed PR and
is awaiting upstream review.
