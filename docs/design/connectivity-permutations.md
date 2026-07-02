# ESP32 Connectivity And REPL Test Permutations

This note exists only to capture the small amount of design intent that is
specific to connectivity testing.

Detailed harness modes now live in
[docs/design/harness-modes.md](harness-modes.md).
REPL and Python/Codex test structure now lives in
[docs/design/repl-test-suite-design.md](repl-test-suite-design.md).

## Purpose

Connectivity testing is separate from normal GPIO and peripheral testing.

The point is to prove the console and control path itself, not just the
peripheral blocks attached to the harness.

That includes:

- REPL attach and command execution
- reset and reconnect behaviour
- flashing with the harness attached
- any alternate console path supported by the target

## Why This Matters On ESP32 Targets

On these harnesses, the active console path affects which DUT pins are reserved
and which other tests can run at the same time.

Examples:

- classic ESP32 uses UART0 on `D1` / `D3` for normal REPL and flashing
- ESP32-C3 normally uses board USB-UART on `D20` / `D21`
- ESP32-C3 native USB Serial/JTAG uses `D18` / `D19` and is a separate feature
  to prove

So connectivity is not just host plumbing. It is part of the target behaviour
under test and part of the harness mode definition.

## Current Working Position

- harness connectivity modes and reserved-pin rules are defined in
  [docs/design/harness-modes.md](harness-modes.md)
- target-specific wiring and selector details are defined in the target wiring
  notes
- REPL-shareable test content and Python runner behaviour are defined in
  [docs/design/repl-test-suite-design.md](repl-test-suite-design.md)
- manual selector and link changes are expected between some test phases and
  should be treated as explicit test preconditions
