# ESP32 Espruino Hardware Test Harnesses

This repository designs, documents, builds, and exercises ESP32-family hardware
test harnesses for Espruino port validation.

It is both a hardware-design repo and a test/debug evidence base. The harnesses
are intended to exercise Espruino's user-facing APIs on real ESP32-family
targets, especially where those APIs drive the low-level target-port layer and
its `jshardware` implementation.

The test strategy is to break the harness family into reusable physical test
blocks, then use those blocks as controlled hardware contexts for functional
API validation. So the harness wiring is an enabling condition, while the main
goal is to show that the Espruino MCU port behaves correctly when GPIO, timers,
buses, serial ports, and timing-sensitive protocols are used through realistic
hardware feedback paths.

## Purpose

The practical goal is to build repeatable ESP32-family Espruino hardware
harnesses, run target-port validation tests against them, and preserve enough
design/debug context that hardware faults, firmware regressions, and test-runner
behaviour are documented.

The design principles are:

- keep the logical test blocks common across ESP32-family targets
- adapt those blocks to each board through target-specific pin allocation,
  selectors, and wiring fanout
- build shared functional tests around Espruino API behaviour, not just around
  per-target wiring checks
- record the physical mode and firmware/test evidence well enough that future
  runs are comparable

## Project Progression

The work in this repository has progressed through these stages:

1. Developed the first ESP32-C3-DevKitC-02 hardware harness around the common
   Espruino test blocks.
2. Brought up the C3 harness with IDF4-based Espruino builds and validated the
   initial GPIO, analog, bus, and OneWire test paths.
3. Compared C3 IDF4 and IDF5 behaviour and captured IDF5 regression evidence,
   especially around `digitalPulse`.
4. Investigated C3-specific failures using comparison hardware and reference
   targets, separating harness wiring questions from firmware timing issues.
5. Resolved the major ESP32 OneWire instability as a targeted firmware timing
   issue while preserving the evidence and rationale in `docs/investigations/`.
6. Started the classic ESP32 harness generation, using the Olimex
   ESP32-DevKit-LiPo Rev.D / ESP32-WROOM-32E-style pinout as the practical
   DevKitC-compatible target for `ESP32_V1`.
7. Designed the ESP32 DevKitC V4 / `ESP32_V1` harness and PCB construction
   guide, ready for wirewrap build and bring-up.
8. Completed wirewrap builds for both the ESP32-C3 and classic ESP32 harnesses
   and added board photos under `Hardware/`.
9. Completed scripted wiring checks for the current harness blocks, including
   GPIO, analog/PWM, SPI, I2C, OneWire, DS2413, UART crosslink, and external
   connector paths where fitted.
10. Defined the shared REPL functional-test design, with JavaScript-owned
    target presets, Python-owned runner/parsing, and structured machine-readable
    output.
11. Proved the first shared functional block (`gpio_block1`) end to end across
    both current family targets on IDF4 firmware, using the same logical test
    files unchanged.

## Current Targets

### ESP32-C3-DevKitC-02

The ESP32-C3 harness is built and has already been used for bring-up, scripted
wiring checks, and firmware debugging.

Important C3-specific features include:

- native USB Serial/JTAG on `D18` / `D19`
- UART0 on `D20` / `D21` reserved by default for board USB-UART REPL/flashing
- selector-heavy GPIO allocation due to the smaller available pin budget
- UART0/UART1 crosslink mode that uses native USB Serial/JTAG as the runner
  path because UART0 is under test

KiCad project:

```text
KICAD/ESP32_C3_v1/
```

### Classic ESP32 DevKitC V4 / ESP32_V1

The classic ESP32 DevKitC V4 harness is now built and has completed its first
scripted wiring-check phase. The practical target is the Olimex
ESP32-DevKit-LiPo Rev.D. Olimex describe this board as pin-to-pin comparable
with the Espressif ESP32-CoreBoard
(`ESP32-DevKitC`), while adding LiPo charging and battery-powered operation.
The selected Rev.D hardware uses the classic ESP32 / ESP32-WROOM-32E-class
module family.

The harness uses a KiCad PCB design as a placement/silkscreen construction
guide rather than as a routed copper PCB.

Important ESP32_V1-specific features include:

- UART0 on `D1` / `D3` reserved for board USB-UART REPL/flashing/control
- UART1/UART2 crosslink for serial testing
- mostly fixed wiring because the classic ESP32 has more available GPIO
- selected sharing for `D35`, `D33`, and `D26`
- DS2413 removable OneWire GPIO breakout support

KiCad project:

```text
KICAD/ESP32_V1/
```

## Common Harness Blocks

The harness family reuses the same logical test blocks wherever possible:

- GPIO loopbacks for `digitalWrite`, `digitalRead`, `pinMode`, `setWatch`, and
  `digitalPulse`
- PWM-to-ADC feedback
- SPI validation through MCP3008, with optional shared-bus flash device
- I2C validation through MCP23008, with feedback and interrupt paths
- OneWire validation through two DS18B20 devices
- OneWire GPIO validation through a DS2413 breakout
- UART/Serial crosslink tests
- reset/boot/automation provisions

Tests and documentation use Espruino `Dxx` pin names, matching GPIO numbers.

## Functional REPL Tests

The authoritative shared functional tests live under `tests/repl/`.

These tests are designed to:

- stay directly usable in the Espruino REPL or Web IDE
- keep target-specific pin and mode maps visible inside the JavaScript file
- emit structured output that a Python runner can parse unchanged
- validate Espruino API behaviour within the physical harness block that makes
  that behaviour observable

The current reference design for this test model is:

- `docs/design/repl-test-suite-design.md`

The first proven shared block is `tests/repl/gpio_block1/`, which currently
covers:

- `pinMode`
- `digitalWrite`
- `digitalRead`
- `setWatch`
- `digitalPulse`
- `shiftOut`

## Repository Map

```text
AGENTS.md                  Codex/new-thread operating notes
docs/                      Wiring specs, handoffs, investigation notes
tools/                     Python/REPL test utilities and wiring-test runners
KICAD/                     Harness schematic/PCB projects
Hardware/                  Hardware reference material
tests/repl/                Portable community-facing REPL test scripts
```

Key starting documents:

- `AGENTS.md`
- `docs/handoff/2026-06-25-esp32-family-tests.md`
- `docs/design/common-harness-design-and-blocks.md`
- `docs/design/repl-test-suite-design.md`
- `docs/design/harness-modes.md`
- `docs/targets/esp32-c3-devkitc-02/wiring.md`
- `docs/targets/esp32-devkitc-v4/wiring.md`

Useful external references:

- Olimex ESP32-DevKit-LiPo open-source hardware page:
  <https://www.olimex.com/Products/IoT/ESP32/ESP32-DevKit-LiPo/open-source-hardware>

## Test And Debug Context

The repo preserves the history and reasoning from real Espruino ESP32 testing,
including:

- REPL bring-up process
- C3 harness block tests
- OneWire investigation and final timing-fix shape
- IDF4 vs IDF5 comparisons
- `digitalPulse` regression evidence
- watch/debounce investigation notes
- scripted REPL test tools

Important conclusions from prior work:

- ESP32 OneWire instability was narrowed to firmware-side timing behaviour, not
  simply bad harness wiring.
- The accepted OneWire fix shape is a localized ESP32 timing guard inside
  `src/jswrap_onewire.c`, not a broad/global interrupt semantic change.
- `digitalPulse` was a separate ESP32-C3 IDF5 regression signal after basic
  `digitalWrite`, `digitalRead`, and `setWatch` paths had been shown to work.
- Selector/jumper state is part of every test precondition and must be recorded
  with test evidence.

## Current Active Work

The current hardware state is that both harness boards are built and their
initial scripted wiring-check coverage is in place.

The current software state is that the shared functional REPL runner and the
first shared functional block are now in place and validated across both
current targets on IDF4:

- `ESP32_C3` / `ESP32C3_IDF4`
- `ESP32_V1` / `ESP32_IDF4`

The current active work is to continue block-by-block expansion of the shared
functional suite, with the aim of:

- exercising Espruino APIs more fully across the common harness blocks
- preserving the existing per-target wiring checks as hardware-regression
  references
- establishing IDF4 as the baseline family proof first
- then repeating the same shared functional coverage on IDF5 firmware variants
