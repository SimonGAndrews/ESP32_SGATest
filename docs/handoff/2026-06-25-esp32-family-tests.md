# Codex Handoff - ESP32-Family Harness Test Bring-Up

Date: 2026-06-25

> **Current-status overlay - 12 July 2026:** The V1 harness hardware described
> here is now complete. Routine V1 hardware development and prototyping have
> stopped. Use the C3 and classic ESP32 harnesses as stable bench platforms for
> shared functional-test development, runner development, regression evidence
> and firmware comparison. The historical construction and "immediate physical
> work" sections below remain useful evidence but are no longer the active task
> list. Read the root `README.md` and inspect `tests/repl/` for progress completed
> after this handover.

This handoff prepares a fresh Codex thread to continue ESP32-family Espruino
test work from the current repository state. It combines the generic test
process developed on the ESP32-C3 harness with the current classic ESP32
DevKitC V4 hardware work, and then calls out the target-specific differences.

The current phase is ESP32-family bench validation and shared functional-test
development using the completed classic ESP32 DevKitC V4 and ESP32-C3 wirewrap
harnesses. The test methodology, evidence rules and most software test blocks
should remain generic across ESP32-family harnesses.

## Start Here In A New Thread

Core read set:

1. `AGENTS.md`
2. `docs/handoff/2026-06-25-esp32-family-tests.md`
3. `docs/design/common-harness-design-and-blocks.md`
4. `docs/design/harness-modes.md`
5. the wiring document for the target being used
6. the relevant block under `tests/repl/`

Read `KICAD/ESP32_V1/README.md` only when physical construction detail is
needed. Read the OneWire and `digitalPulse` investigation documents only when
the task concerns those behaviours. This avoids loading historical firmware
debug context into ordinary runner work.

Additional useful docs:

- `docs/design/target-reference-links.md`
- `docs/handoff/2026-07-05-espruino-repo-structure.md`
- `docs/handoff/2026-07-20-esp32-firmware-lineage-and-test-interpretation.md`
  for cross-build comparison or firmware-anomaly attribution

## Generic ESP32-Family Test Model

The harness family should be treated as one logical test platform with
board-specific pin adapters.

Generic logical test blocks:

| Logical block | Purpose |
|---|---|
| GPIO loopbacks | `digitalWrite`, `digitalRead`, `pinMode`, `setWatch`, `digitalPulse` |
| Analog/PWM feedback | PWM/digital output through RC filter to target ADC and MCP3008 |
| SPI | MCP3008 validation, optional second SPI device for shared-bus behaviour |
| I2C | MCP23008 register I/O, GPIO feedback, interrupt path |
| OneWire DS18B20 | multi-drop search, addressed conversion/read, soak testing |
| OneWire DS2413 | commandable 1-Wire GPIO output with feedback to target GPIO inputs |
| UART/Serial | non-console UART crosslink or external peer tests |
| Automation provision | reset/boot control hooks, initially manual/provisional |

Generic process:

1. Keep Espruino `Dxx` pin names in docs, scripts, and logs.
2. Treat selector/jumper state as part of every test precondition.
3. Prove electrical wiring first with continuity and simple static REPL tests.
4. Then run scripted tests block-by-block.
5. Separate hardware evidence from firmware evidence; do not blame firmware
   until static wiring and simple read/write paths are proven.
6. Record board, firmware build, Espruino version, serial port, physical mode,
   selector state, and exact script/tool command with every result.
7. Do not run multiple REPL tools concurrently on the same serial port.

The right abstraction for future tooling is a common logical harness runner
with target-specific pin/mode maps. The C3 scripts are valuable prototypes, but
new work should avoid duplicating whole scripts for every target where a small
pin-map layer would suffice.

## Target Peculiarities To Preserve

### ESP32-C3-DevKitC-02

Reference docs:

- `docs/targets/esp32-c3-devkitc-02/wiring.md`
- `docs/targets/esp32-c3-devkitc-02/bringup.md`

Important peculiarities:

- KiCad project: `KICAD/ESP32_C3_v1/`
- schematic/PCB revision: v1.1
- GPIO budget is tight, so selectors are central to the design.
- `D18`/`D19` are native USB Serial/JTAG and are fixed to the harness USB
  Serial/JTAG connector.
- `D20`/`D21` are UART0 and are reserved by default for board USB-UART
  REPL/flashing.
- `D20`/`D21` are still deliberately available through `J10` /
  `SEL_UART0_UART1` for UART0/UART1 crosslink or external UART access.
- `J10` / `SEL_UART0_UART1` is a 2x3 UART connector/selector, not a simple
  shunt block. Two columns are UART crosslink signal shunts; the third column
  is GND for external UART access.
- UART0/UART1 crosslink testing should use native USB Serial/JTAG as the
  runner/control path, because UART0 is under test in that mode.
- `J_Auto` is only a provision until external reset/boot control hardware is
  wired.
- Initial flashing/bring-up has used a known-good custom Espruino build with
  `ESPR_USE_USB_SERIAL_JTAG` disabled/commented out, with the first expected
  console path on board USB-UART.

### Classic ESP32 DevKitC V4 / ESP32_V1

Reference docs:

- `docs/targets/esp32-devkitc-v4/wiring.md`
- `KICAD/ESP32_V1/README.md`

Important peculiarities:

- KiCad project: `KICAD/ESP32_V1/`
- The PCB is a wirewrap placement/silkscreen guide, not a routed PCB.
- Classic ESP32 has more available GPIO, so most test blocks are fixed wiring.
- UART0 on `D1`/`D3` remains the board USB-UART REPL/flashing/control path.
- Do not move UART0 into test service on this harness.
- UART testing uses UART1/UART2 crosslink instead:
  - `D4 -> JP_UART_LOOP2 -> D36`
  - `D14 -> SEL_D35 -> D35`
- `D35` is shared between MCP23008 interrupt and UART1 RX via `SEL_D35`.
- `D33` and `D26` have selectors so they can be either normal loopback inputs
  or DS2413 PIO feedback inputs.
- `D0` is reserved for BOOT/download control.
- `D2`, `D5`, `D12`, and `D15` are strapping pins; avoid fixed harness loads.
- `D6`-`D11` are module SPI-flash signals; do not use.
- `D34`-`D39` are input-only and lack internal pull-up/down.

## Current Repository State

Harness repo:

- Windows working path: `C:\Users\simon\Documents\ESP32_SGATest`
- Active KiCad project for the classic ESP32 harness: `KICAD/ESP32_V1/`
- Current focus: ESP32 DevKitC V4 / ESP32-WROOM-32E/32UE style target
- Prior C3 project remains important reference material: `KICAD/ESP32_C3_v1/`

Recent committed ESP32_V1 checkpoints:

- schematic and project-local footprint setup
- PCB placement/silkscreen guide
- measured prototype-board geometry
- DS2413 OneWire GPIO breakout addition
- documentation for the final prototype board grid/datum

At the time of this note, `KICAD/ESP32_V1/ProtoBoard.jpg` may exist as an
untracked local reference photo. It is useful for human inspection but is not
required by the committed design.

## Immediate Physical Work

**Historical status:** completed. This section records the construction plan
that produced the current classic ESP32 V1 bench harness; it is not an active
V1 hardware task list.

The ESP32 DevKitC V4 harness is ready to print and wire.

Recommended physical sequence:

1. Print the PCB construction guide at actual size / 100%.
2. Verify the printed 90 mm x 70 mm outline against the physical prototype
   board.
3. Start wiring with power/GND rails and continuity checks.
4. Fit/verify the DevKitC socket orientation, pin 1, USB end, and antenna end.
5. Wire DUT fanout before peripheral blocks.
6. Wire peripheral/test blocks one at a time and run continuity checks after
   each block.

Do not compensate KiCad geometry for printer scaling. One trial print produced
about 91 mm for the nominal 90 mm board width; that explains approximately
1 mm cumulative drift in the printed grid. The correct fix is print scaling,
not changing the board model.

## Prototype Board Geometry

The KiCad PCB is a wirewrap placement/silkscreen guide, not a routed PCB.

Measured guide geometry in `KICAD/ESP32_V1/ESP32_V1.kicad_pcb`:

| Item | Value |
|---|---:|
| Board outline | 90 mm x 70 mm |
| KiCad outline coordinates | `(70,45)` to `(160,115)` |
| Main matrix | 31 columns x 26 rows |
| Pitch | 2.54 mm |
| First main matrix hole centre | `(78.5,48.25)` |
| Last main matrix hole centre | `(154.7,111.75)` |
| First main hole offset from left edge | 8.5 mm |
| Mounting-hole drill | 1 mm NPTH |

The physical board has vertical side pad columns, but these are deliberately
not included in the KiCad guide because they are not used for component
placement.

For footprint placement in KiCad:

```text
Grid: 2.54 mm
Grid origin: (78.5,48.25)

X = 78.5  + column * 2.54
Y = 48.25 + row    * 2.54
```

Column 0, row 0 is the top-left main matrix hole.

## ESP32 DevKitC V4 Harness Allocation

Use Espruino `Dxx` names matching GPIO numbers.

Reserved/avoided:

- `D1` / `D3`: UART0 USB-UART REPL/flashing
- `D0`: BOOT/download path
- `D2`, `D5`, `D12`, `D15`: strapping pins; no fixed harness loads
- `D6`-`D11`: module SPI flash signals; do not use
- `D34`-`D39`: input-only; no internal pull-up/pull-down

Core allocation:

| Function | ESP32 pins / notes |
|---|---|
| GPIO loop A | `D32 -> SEL_D33 -> 470R -> D33` |
| GPIO loop B | `D25 -> SEL_D26 -> 470R -> D26` |
| PWM/analog feedback | `D27 -> 10k/100nF -> D34` and MCP3008 CH0 |
| I2C | SDA `D21`, SCL `D22`, MCP23008, Grove I2C |
| I2C interrupt | MCP23008 INT via `SEL_D35` to `D35` |
| I2C feedback | MCP23008 GP0 through 470R to `D39` |
| SPI | SCK `D18`, MISO `D19`, MOSI `D23`, ADC CS `D16`, flash CS `D17` |
| OneWire | `D13`, two DS18B20 devices, external OneWire, DS2413 socket |
| UART0 | `D1`/`D3`, kept for REPL/flashing |
| UART1/UART2 crosslink | `D4 -> JP_UART_LOOP2 -> D36`, `D14 -> SEL_D35 -> D35` |

Selector defaults:

- `SEL_D33`: pins 1-2 for normal `D32` to `D33` loopback
- `SEL_D26`: pins 1-2 for normal `D25` to `D26` loopback
- `SEL_D35`: I2C interrupt position for default harness tests
- `JP_UART_LOOP2`: open by default
- `JP_External_5V1`: open by default

UART crosslink test mode:

- keep runner/control on UART0 via board USB-UART
- move `SEL_D35` to UART position
- close `JP_UART_LOOP2`
- test `Serial2` on `D4`/`D35` against `Serial3` on `D14`/`D36`

## DS2413 OneWire GPIO Breakout

The DS2413 addition is intended to extend OneWire testing beyond DS18B20
temperature reads by proving commandable 1-Wire GPIO output and feedback.

Physical connector:

- `J_DS2413`: vertical 1x04, 2.54 mm female socket on the harness
- removable breakout gets downward-facing male pins
- fit only when required

Pinout:

| `J_DS2413` pin | Signal |
|---:|---|
| 1 | `DS2413_PIOB` |
| 2 | `DS2413_PIOA` |
| 3 | `D13_ONEWIRE_DQ` |
| 4 | GND |

Electrical details:

- OneWire bus pull-up: nominal 2.2 kOhm to 3.3 V; 2.0 kOhm fitted/acceptable
  for the short ESP32_V1 wirewrap bus
- `DS2413_PIOA`: 4.7 kOhm pull-up to 3.3 V
- `DS2413_PIOB`: 4.7 kOhm pull-up to 3.3 V
- DS2413 breakout is parasite-powered from the OneWire data connection and GND
- PIO outputs are open-drain

Feedback selector modes:

- PIOA feedback: `SEL_D33` pins 2-3, observed on `D33` through 470R
- PIOB feedback: `SEL_D26` pins 2-3, observed on `D26` through 470R
- return both selectors to pins 1-2 for normal GPIO loopback tests

## Generic Test Bring-Up Strategy

The C3 scripts in `tools/` are the best starting point for the process, but
their pin map and selector states are C3-specific. For `ESP32_V1`, adapt the
same logical block order onto the DevKitC V4 allocation above. For future
targets, prefer adding a target map rather than copying the entire runner.

Suggested first-run order after wiring any ESP32-family harness:

1. power/GND continuity and resistance checks with the DUT removed
2. fit DUT and prove the intended runner/control REPL path
3. baseline identity check:

   ```js
   process.env.BOARD
   process.version
   ```

4. GPIO loopbacks:
   - target's normal/default selector state
   - for ESP32_V1: `D32 -> D33` and `D25 -> D26`
   - static `digitalWrite`/`digitalRead`
   - `setWatch` on both inputs
   - `digitalPulse` reproduction/guard check
5. analog/PWM feedback:
   - target PWM/digital feedback output
   - target ADC input
   - MCP3008 CH0 comparison
6. I2C:
   - MCP23008 bus I/O
   - GP feedback input
   - interrupt path/selector if present
   - Grove connector only after base bus is proven
7. SPI:
   - MCP3008 on target SPI pins
   - optional W25xxx shared-bus device
8. OneWire DS18B20:
   - target OneWire pin
   - two device search
   - addressed temperature conversion/read
   - soak/search repeat
9. DS2413 OneWire GPIO:
   - if fitted on the target harness
   - discover DS2413
   - command PIOA/PIOB low and released
   - observe feedback through the target's selected GPIO inputs
10. UART/Serial crosslink:
    - use the target's defined non-console UART mode
    - for C3, UART0/UART1 crosslink uses native USB Serial/JTAG as runner
    - for ESP32_V1, leave UART0 as runner/control, move `SEL_D35`, close
      `JP_UART_LOOP2`, then test `Serial2` and `Serial3`
11. coexistence/regression runs:
    - OneWire under timer/watch/UART/SPI/I2C activity
    - Wi-Fi coexistence if the build supports it and the test is in scope

## Existing Test Tools

Current Python tools are C3-oriented unless named generic:

- `tools/wiring_tests/esp32_c3/gpio_block1.py`
- `tools/wiring_tests/esp32_c3/analog_block2.py`
- `tools/wiring_tests/esp32_c3/i2c_spi_block34.py`
- `tools/wiring_tests/esp32_c3/onewire_block5.py`
- `tools/wiring_tests/esp32_c3/digitalpulse_check.py`
- `tools/wiring_tests/esp32_c3/digitalpulse_nondebounce_check.py`
- `tools/wiring_tests/esp32_c3/onewire_soak.py`
- `tools/common/onewire_search_debug.py`
- `tools/common/onewire_soak_generic.py`
- `tools/common/ds18b20_read_soak.py`

At the time of the original handover, the expected next software task was:

**Historical note:** subsequent shared functional-runner work is reflected in
the root `README.md`, `docs/design/repl-test-suite-design.md` and `tests/repl/`.
Use those current files to determine the next unimplemented block.

- create ESP32-family parameterized harness runners that map the same logical
  test blocks onto C3 and ESP32_V1 target allocations
- keep `Dxx` names in all Espruino scripts and logs
- avoid concurrent access to the same serial port

## Firmware And Debugging Context To Preserve

Previous C3 work established several important habits and conclusions.

### OneWire

- The earlier ESP32-C3 OneWire failures were firmware timing failures, not
  simply bad harness wiring.
- The accepted fix shape was a localized ESP32 timing guard inside
  `src/jswrap_onewire.c`.
- Avoid broad/global ESP32 interrupt semantic changes unless explicitly
  reviewed.
- `OneWire.searchDebug()` was added as a bench diagnostic and should remain
  available while investigating ESP32-family OneWire behaviour.
- C3 OneWire was validated on both IDF4 and IDF5 local trees after the fix.
- The original harness-mounted DS18B20 path was later revalidated, so do not
  treat it as inherently suspect without fresh evidence.

For details read:

- `docs/handoff/2026-06-16-onewire-idf4-idf5.md`
- `docs/investigations/onewire/quiet-timing-design-2026-06-16.md`
- `docs/investigations/onewire/cross-target-comparison-2026-06-15.md`
- `docs/investigations/onewire/logic-trace-comparison-2026-06-15.md`

### digitalPulse

- `digitalPulse` was the clearest remaining ESP32-C3 IDF5 regression after
  OneWire was fixed.
- Basic `digitalWrite`, `digitalRead`, and `setWatch` worked in the same loop
  where `digitalPulse` failed to generate observed transitions.
- Keep this as a guard/regression check on the classic ESP32 harness too; do
  not assume it is C3-only until tested.

For details read:

- `docs/investigations/digitalpulse/esp32-c3-idf5-regressions-2026-06-12.md`
- `docs/investigations/digitalpulse/split-submission-plan-2026-06-19.md`
- `docs/investigations/digitalpulse/mabecker-idf5-pr-draft-2026-06-19.md`

### setWatch / debounce

- Later Pico work explored watch/debounce behaviour separately from ESP32.
- Do not conflate `digitalPulse` failure with watch failure unless the evidence
  shows both.
- Where possible, test static writes and normal transitions before blaming
  pulse generation or watch handling.

For details read:

- `docs/investigations/watch-debounce/pico-repro-2026-06-19.md`
- `docs/investigations/watch-debounce/pico-simple-repro-2026-06-19.md`

### REPL/flashing

- Keep the runner serial path explicit for every test.
- On the classic ESP32 DevKitC V4 harness, UART0 on `D1`/`D3` is reserved for
  board USB-UART REPL/flashing.
- Do not move UART0 into test service on the ESP32_V1 harness; use UART1/UART2
  for the serial crosslink.
- Do not run multiple REPL scripts concurrently on the same port.
- Always record board name, Espruino version, port, selector state, and build
  provenance with test evidence.

## External Firmware Repos

Earlier handoffs refer to Linux paths from the multi-root workspace:

- harness repo: `/home/simon/MaBecker/ESP32_SGATest`
- IDF4 reference Espruino tree: `/home/simon/Espruino2/Espruino`
- MaBecker IDF5 Espruino tree: `/home/simon/MaBecker/Espruino`

This Windows checkout lives at:

- `C:\Users\simon\Documents\ESP32_SGATest`

A new thread should inspect the actual workspace roots before assuming those
firmware paths exist on the current machine/session.

## What Not To Lose

- Use Espruino `Dxx` names consistently.
- Treat selector state as part of every test precondition.
- Separate hardware proof from firmware proof; use static electrical tests and
  simple REPL checks before firmware conclusions.
- Preserve the OneWire conclusion: targeted ESP32 timing protection fixed the
  observed instability; broad interrupt changes remain risky.
- Preserve the `digitalPulse` conclusion: it was a distinct IDF5 regression
  signal, not explained by basic GPIO or watch failure.
- Preserve UART0 on classic ESP32 as the control/flashing path.
- The ESP32_V1 PCB is a wirewrap guide; ratsnest/net data helps wiring checks,
  but there is no routed copper dependency for the first build.
