# ESP32 V1 Block 7 UART Follow-Ups

Date: 2026-07-14

## Scope

Preserve follow-up issues found during V1 Block 7 UART test development without
blocking shared test-block development.

This note is a parking place for later firmware investigation or V2 harness
design input. It is not a request to reopen the completed routine Block 7 test
work immediately.

## Bench Context

- target: `ESP32_V1`
- board: `ESP32_IDF4`
- firmware version: `2v29.107`
- firmware git commit: `0af6e1568`
- harness mode: `ESP32_SERIAL_UART1_UART2_CROSSLINK`
- selector state: `SEL_D35=UART JP_UART_LOOP2=closed SEL_D33=1-2 SEL_D26=1-2`
- runner/control path: UART0 through board USB-UART on `D1` / `D3`

Related evidence:

- `tests/Results/2026-07-13-ubuntu-v1-next-blocks.md`
- `docs/investigations/uart/esp32-legacy-rx-burst-regression-2026-07-05.md`
- <https://github.com/espruino/Espruino/issues/2718#issuecomment-4886914338>

## Open Items

### 1. Large `Serial.flush()` Transfer Reset

Status: parked firmware investigation

Evidence:

- short 32-byte `Serial.write(); Serial.flush(); Serial.read()` passes in both
  crosslink directions
- non-flush 128-byte and 200-byte burst tests pass on the same firmware
- an earlier 160-byte `Serial.write(); Serial.flush()` test reset the board
  before structured completion
- observed assertion:

```text
assert failed: jsvStringIteratorAppend jsvariterator.c:466 (jsvHasStringExt(it->var))
```

Next useful work:

- create a minimal standalone reproduction focused on `Serial.flush()`
- compare `write()` alone against `write(); flush()` at the same payload sizes
- check whether the failure is ESP32-specific UART flush behaviour or a generic
  stream/string handling interaction

### 2. `Serial.unsetup()` Raw Warning

Status: parked firmware cleanup-path investigation

Evidence:

- many passing Block 7 tests emit raw warnings during cleanup:

```text
ERROR: jshPinSetState: Unexpected state: 0
```

- structured test results still pass
- warning appears around `Serial.unsetup()` cleanup on `Serial2` and `Serial3`

Next useful work:

- reproduce with a minimal `Serial2.setup(...); Serial2.unsetup();` case
- identify whether this is harmless pin-state cleanup noise or a real invalid
  state transition in ESP32 hardware serial teardown

### 3. `Serial.isConnected()` Semantics On ESP32

Status: documentation/API semantics note

Evidence:

- after previous use in the same firmware session, `Serial2.isConnected()` and
  `Serial3.isConnected()` can already be `true` before a fresh setup call
- both remained `true` after `Serial.unsetup()`
- the routine test records this observed behaviour instead of treating
  `isConnected()` as a setup/unsetup state probe

Next useful work:

- compare current ESP32 behaviour against Espruino source and docs expectation
- decide whether the ESP32 implementation or documentation needs clarification

### 4. Untested Console And Flow-Control Behaviour

Status: V2 harness design input, not a V1 routine-test blocker

Evidence:

- ESP32_V1 keeps UART0 as the runner/control path, so Block 7 deliberately
  avoids `Serial.setConsole()` / `E.setConsole()` routine testing
- current V1 block has no hardware flow-control or deliberate bad-frame
  injection path

Next useful work:

- feed these gaps into V2 UART block design
- keep routine V1 Block 7 testing focused on non-console hardware serial unless
  a deliberate console-recovery test mode is added

## Not In Scope

- OneWire work
- immediate V2 schematic decisions
- reopening the already-passing routine Block 7 test pack
