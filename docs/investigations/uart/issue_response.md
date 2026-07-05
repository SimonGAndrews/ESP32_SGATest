# Draft Issue Response

Hi Gordon,

We were able to reproduce the UART RX burst problem on the `ESP32_V1` harness
using the UART1/UART2 crosslink, with UART0 left as the REPL/control path.

We built a small shared REPL test pack in my
[`ESP32_SGATest`](https://github.com/SimonGAndrews/ESP32_SGATest) repo under
`tests/repl/uart_block6/` and used it to check:

- boundary cases around the original failure point: `32`, `64`, `65`, `96`
- clean-start larger bursts: `128` and `200`
- both directions:
  - `Serial2 -> Serial3`
  - `Serial3 -> Serial2`

Pre-fix conclusion from the investigation:

- legacy `ESP32` and `ESP32_IDF4` both failed at the `65`-byte transition with
  the same `jsvStringIteratorAppend` assertion/reboot
- `ESP32_IDF5` did not assert, but practically truncated at `64` bytes in the
  same test scenario
- so the issue looked like one underlying serial-event assembly problem in
  Espruino Core, with different symptoms across the three ESP32 lines

Why this fix:

- the failure sits in `jsiHandleIOEventForSerial()`
- the first RX event chunk was being created with `jsvNewStringOfLength(...)`
- later RX chunks were appended with `jsvAppendStringBuf(...)`
- that means the first chunk could be created one way, while later chunks were
  appended through a different path
- the failure is consistent with that mismatch showing up at the first
  multi-chunk boundary
- the candidate fix is to build the serial event string incrementally from
  `jsvNewFromEmptyString()` and append the first chunk explicitly, so later
  chunks stay on the same append path
- the whole received UART payload is then built through one consistent
  appendable string path from the start
- in short: it removes the "first chunk created one way, later chunks appended
  a different incompatible way" mismatch

Bench result with that change:

- legacy `ESP32`: passes the split burst pack through `200` bytes
- `ESP32_IDF4`: passes the same pack through `200` bytes
- `ESP32_IDF5`: passes the same pack through `200` bytes

Candidate fix scope:

- one narrow change in `src/jsinteractive.c`
- no target-specific UART-driver change was needed

Screenshot to attach:

- `src/jsinteractive.c` diff for `jsiHandleIOEventForSerial()`
- suggested caption:
  "Narrow candidate fix: build serial RX event data from an empty string and append chunks incrementally"

[Insert diff screenshot here]
