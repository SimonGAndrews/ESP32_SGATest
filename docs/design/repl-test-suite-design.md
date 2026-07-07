# REPL Test Suite Design

## Functional Test Strategy

The shared functional REPL suite exists to exercise Espruino's user-facing APIs
on real target hardware, especially where those APIs drive the target port's
`jshardware` layer.

The primary goal is to show that the Espruino MCU port behaves correctly when
the API is used through realistic hardware feedback paths.

A correctly wired and operational harness is an enabling condition for these
tests, not the end goal of the functional suite.

This gives the suite a layered strategy:

1. the harness design is broken into reusable physical test blocks
2. each block provides a hardware mechanism such as loopback, analog feedback,
   bus-attached peripherals, or serial crosslink
3. those mechanisms create controlled test contexts for exercising the
   relevant Espruino APIs
4. the shared `tests/repl/` files then verify API behaviour in those contexts
   across targets

So the harness blocks are the physical enablers, while the functional REPL
tests are the API-facing validation layer built on top of them.

The suite also needs to keep three concepts distinct:

- `block`: a logical hardware capability grouping
- `mode`: a harness configuration that enables one or more blocks
- `test`: a functional validation task that may use one block or multiple
  blocks

Those three should not be forced into a one-to-one mapping.

The same functional tests should also serve two execution contexts:

1. direct REPL or Web IDE use, so an individual test can be shared and run by
   community users or during interactive bench investigation
2. automated runner use, so the same test can be executed efficiently in
   repeatable regression runs

This dual-use requirement is fundamental to the design. The shared test file
must remain understandable and usable as plain Espruino JavaScript, while also
producing structured output that a Python or Codex runner can consume without
changing the test logic.

## Requirements

- one test file per logical test task
- the same test file must run directly in the Espruino REPL or Web IDE
- the same test file must be usable by Python/Codex runners
- target pin assignments must already be preset in the file
- the user should only need to choose a target preset, not understand the full schematic
- selector and jumper requirements must be visible in the file and printed in the test output
- tests must stay concise enough for small targets
- tests must support multiple ESP32-family targets and future non-ESP32 targets
- tests should skip unsupported firmware features cleanly rather than report false failures
- each test must finish or time out in a predictable way
- each test must leave pins, watches, and timers in a safe state when it finishes
- tests must run without prompts or manual interaction after start

## File Layout

- `tests/repl/` contains the authoritative JavaScript test suite
- block-specific subdirectories under `tests/repl/` group tests by physical
  harness block
- `tools/` runs those same JavaScript files through Python automation
- `tools/wiring_tests/` contains target maps or target-specific runner defaults, not separate copies of the test logic

## One File Per Task

Examples:

- `tests/repl/gpio_block1/gpio_readwrite_basic.js`
- `tests/repl/gpio_block1/gpio_watch_edges.js`
- `tests/repl/gpio_block1/gpio_pulse.js`
- `tests/repl/analog_block2/analog_pwm_feedback.js`
- `tests/repl/i2c_block3/i2c_mcp23008_registers.js`
- `tests/repl/spi_block4/spi_mcp3008_basic.js`
- `tests/repl/onewire_block5/onewire_ds18b20_basic.js`

Each file should be standalone and directly shareable in GitHub issues, discussions, and forum posts.

The directory name identifies the physical harness block. The filename
identifies the API-scope task being exercised within that block.

This means one hardware block may contain several individual tests as API
coverage grows, without forcing one large monolithic script.

## Block Scope Principle

In the shared functional suite, the block name tells you the hardware context
required for the test.

The filename tells you the specific Espruino behaviour being exercised in that
context.

For example, `gpio_block1/` is not just a wiring proof for
`digitalWrite`/`digitalRead`. It is the GPIO hardware context in which GPIO
APIs such as `pinMode`, `digitalWrite`, `digitalRead`, `digitalPulse`,
`shiftOut`, and `setWatch` can be exercised.

So each shared test should:

1. state the required block or blocks clearly
2. stay focused on one clear behaviour or API-scope task
3. use the smallest useful hardware context for clear fault isolation

The `tools/wiring_tests/` scripts remain the authoritative target wiring
regression references. The shared `tests/repl/` files are functional API tests
that use those proven hardware blocks.

A shared test may use more than one block, but only when the combined hardware
context is part of the behaviour being checked. That is valid for cases such as
shared-node comparison, bus coexistence, or extension-device access.

In practice:

- prefer one block when one block is enough
- do not combine unrelated checks just because a mode leaves several blocks
  available
- use multiple blocks only when the test intent genuinely depends on them

## Naming And Grouping Scheme

Use the following structure for shared functional tests:

- one subdirectory per physical harness block under `tests/repl/`
- one JavaScript file per logical API-scope task within that block

The directory identifies the primary hardware block context for the test.
That does not forbid a specific test from also using another block where the
test intent clearly requires it.

### Block Sequence

The family block sequence is:

- block 1: `gpio_block`
- block 2: `analog_block`
- block 3: `i2c_block`
- block 4: `spi_block`
- block 5: `onewire_block`
- block 6: `onewire_gpio_block`
- block 7: `uart_block`
- block 8: `grove_i2c_block`

Current shared repo directory naming:

- `gpio_block1/`
- `analog_block2/`
- `i2c_block3/`
- `spi_block4/`
- `onewire_block5/`
- `onewire_gpio_block6/`
- `grove_i2c_block8/`
- `uart_block7/`

Current shared repo directory intent:

- `gpio_block1/` -> block 1 `gpio_block`
- `analog_block2/` -> block 2 `analog_block`
- `i2c_block3/` -> block 3 `i2c_block`
- `spi_block4/` -> block 4 `spi_block`
- `onewire_block5/` -> block 5 `onewire_block`
- `onewire_gpio_block6/` -> block 6 `onewire_gpio_block`
- `grove_i2c_block8/` -> block 8 `grove_i2c_block`
- `uart_block7/` -> block 7 `uart_block`

Recommended file naming:

- start with the API family or functional area
- end with the specific behaviour under test
- keep names descriptive enough to stand alone when shared

Recommended `PASS` / `FAIL` check naming:

- use a compact API-family prefix that loosely matches the Espruino API grouping
- follow it with the specific behaviour, path, or condition under test
- keep the name short enough for direct REPL readability
- do not repeat the full API function name unless extra clarity is needed

Examples:

- `gpio_loop_a_low`
- `gpio_watch_loop_a_rising`
- `i2c_mcp23008_readback`
- `onewire_ds18b20_search`

Examples:

- `gpio_readwrite_basic.js`
- `gpio_watch_edges.js`
- `gpio_pulse.js`
- `gpio_shiftout.js`
- `analog_read_levels.js`
- `analog_pwm_feedback.js`
- `i2c_mcp23008_registers.js`
- `i2c_mcp23008_interrupt.js`
- `spi_mcp3008_basic.js`
- `onewire_ds18b20_basic.js`
- `i2c_grove_mcp23008_secondary.js`

For block 1 specifically, the intended grouping is:

- `tests/repl/gpio_block1/gpio_readwrite_basic.js`
- `tests/repl/gpio_block1/gpio_watch_edges.js`
- `tests/repl/gpio_block1/gpio_pulse.js`
- `tests/repl/gpio_block1/gpio_shiftout.js`

These files share the same physical loopback block and harness mode family, but
they split the Espruino GPIO API surface into clearer debugging units.

For blocks 3 and 4, the current shared split is:

- `tests/repl/i2c_block3/i2c_mcp23008_registers.js`
- `tests/repl/i2c_block3/i2c_mcp23008_interrupt.js`
- `tests/repl/spi_block4/spi_mcp3008_basic.js`

The shared functional suite now keeps I2C and SPI in separate directories even
though some target-specific wiring regression scripts still use a combined
`i2c_spi_block34.py` cross-check where that matches the underlying bench task.

## Target Presets

Each test file should contain:

```js
var TARGET = "AUTO";

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    GPIO_LOOP_A_OUT : D32,
    GPIO_LOOP_A_IN  : D33,
    GPIO_LOOP_B_OUT : D25,
    GPIO_LOOP_B_IN  : D26
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5", "ESP32C3"],
    selectorInfo : "set C3 loopback selector positions for block 1",
    GPIO_LOOP_A_OUT : D1,
    GPIO_LOOP_A_IN  : D2,
    GPIO_LOOP_B_OUT : D3,
    GPIO_LOOP_B_IN  : D4
  }
};

function resolveCfg() {
  if (TARGET !== "AUTO") return CFGS[TARGET];
  var boardId = process.env.BOARD;
  for (var k in CFGS) {
    var ids = CFGS[k].boardIds || [];
    if (ids.indexOf(boardId) >= 0) return CFGS[k];
  }
  throw new Error("Unsupported BOARD for AUTO target: " + boardId);
}

var CFG = resolveCfg();
```

The normal default should be `TARGET = "AUTO"` so the same file can select the
right preset directly in the REPL from `process.env.BOARD`.

Where a manual override is needed, it should happen only in the REPL editor or
temporary pasted copy for that run. Do not change the committed master test
script away from its normal `AUTO` behaviour just to force one run.

The visible mapping from runtime board ID to logical harness preset should live
inside each `CFGS` entry through `boardIds`, so the user can see which Espruino
board identities select each harness configuration.

## Test Structure

Each test file should contain:

1. short purpose comment, including covered API functions
2. `TARGET` selection
3. `CFGS` preset table
4. `CFG` lookup
5. small helper functions
6. test body
7. cleanup path

Helpers should stay minimal, for example:

- `report`
- `metric`
- `expectEq`
- `skip`
- `cleanup`
- `finish`

Recommended top-of-file comment style:

```js
// GPIO block 1 basic read/write functional test
// Covers: pinMode, digitalWrite, digitalRead
```

## Output Contract

Each test should print structured lines only:

- `TEST=<name>`
- `TARGET=<cfg-name>`
- `INFO board=<process.env.BOARD>`
- `INFO api=<comma-separated api functions>`
- `INFO selectors=<text>`
- `PASS <check> ...`
- `FAIL <check> ...`
- `SKIP <reason>`
- `METRIC <key>=<value>`
- `DONE=<name>`

This output must be readable by humans and trivial for Python to parse.

`SKIP` means the test could not make a valid check on this target, firmware, or
harness mode. It must not be used for an actual failing result.

## Selector And Population Rules

Each preset should include:

- harness name
- `boardIds` values used for `AUTO` selection
- selector or jumper state
- any special console or port assumptions

The harness name should be enough to identify the hardware context. The user is
assumed to be working with the named harness and can look up the detailed
hardware design in this `ESP32_SGATest` repository.

Selector or jumper state should still be printed at runtime through `INFO`
lines as well as left visible in the source.

## Capability Flags

Capability flags are optional. The default assumption is that all checks in the
test script should run.

Where needed, a preset may include capability flags, for example:

```js
supportsAnalogRead : true,
supportsAnalogWrite : true
```

Tests should use these only for known unsupported features or deliberate target
exceptions, and should then skip those features cleanly.

## Timeout And Cleanup

Each test should define a small overall timeout, for example:

```js
var TIMEOUT_MS = 2000;
```

If the expected end condition is not reached in time, the test should:

- print a `FAIL` line for timeout
- clear any watches, intervals, and timeouts it created
- return pins to a safe idle state where practical
- print `DONE=<name>`

Normal success and `SKIP` paths should use the same cleanup function.

## Python Runner Role

Python should:

- load the JS test file unchanged
- allow the JS test to auto-select its preset from `process.env.BOARD`
- send the same JS to the REPL
- wait for `DONE=<name>`
- parse `PASS` / `FAIL` / `SKIP` / `METRIC`
- support running multiple test files as a suite
- accumulate overall pass/fail state across the suite
- list failing checks and failure details clearly

Python should not be the source of the test logic.

This should be done with minimal impact on the JavaScript test content. The JS
files should only need the common structured output contract.

## Transport Backends

The runner architecture should remain Python-first. Python owns:

- suite selection
- metadata capture
- result parsing
- overall pass/fail handling
- bench workflow integration

The transport layer used to send JavaScript to the board may vary.

Current practical options are:

- direct serial transport from Python
- EspruinoTools / `espruino` CLI used as a transport backend

Current position:

- direct serial transport is simple and has no extra tool dependency, but raw
  REPL paste can produce noisy echoed output
- EspruinoTools can provide cleaner upload behaviour and still preserve the
  structured test output, but it introduces an additional Node-based tool
  dependency and its own startup noise

So EspruinoTools should be treated as an optional transport implementation
choice, not as the core test-runner architecture.

If EspruinoTools is used, the installation must be explicit and validated. Do
not rely on a globally installed `espruino` command or on whatever happens to
exist on one development machine.

The runner should either:

- call a known local `espruino-cli.js` path explicitly, or
- validate a supported installation path before use and fail clearly if it is
  missing

The direct-serial backend should remain available as a fallback until the
EspruinoTools installation and behaviour are considered sufficiently stable for
this repo's workflow.

## Design Rules

- keep logical test names common across targets
- keep pin maps inside target presets
- do not duplicate whole test files per target
- prefer small visible configuration over hidden injection
- prefer plain JS that can be pasted directly into the REPL
- keep execution non-interactive once the test starts

## Working Positions And Open Questions

The design above fixes the shared test-suite model. The points below capture
the current working positions for the first shared-runner implementation, while
also marking the items that still need design discussion before they should be
treated as settled decisions.

### Working Positions

- First authoritative logical test:
  `gpio_block1`
- Shared-runner proving strategy:
  block at a time on both targets, using Espruino IDF4 builds first where
  practical to establish a reliable baseline, while accepting that some IDF4
  fixes may still be required
- Minimum runner scope:
  start with single-test execution, then add suite execution early, beginning
  with the second logical block
- First runner output format:
  console/log output only in v1; JSON may be added later
- Wiring-test migration strategy:
  phased migration after behaviour parity is demonstrated
- Capability flags:
  standardise across tests so `SKIP` remains deliberate and consistent
- Shared JS helper structure:
  keep it to the minimum needed by the REPL test itself; prefer the runner to
  do transport, orchestration, and result handling work
- V1 runner metadata set:
  board or harness identity, Espruino version, firmware build provenance,
  harness mode, exact command, test file or test name, resolved target preset,
  and pass/fail/skip result summary

For v1, the following are non-mandatory or derived rather than required as
separate metadata fields:

- serial port, if it is already visible in the recorded command
- selector state, if it is fully implied by the chosen harness mode
- hardware-versus-firmware distinction, treated as a test or suite
  classification rule rather than a per-run metadata field

### Open Questions Requiring Design Discussion

- Which target-selection mechanism should the Python runner use while still
  keeping the JS test effectively unchanged for direct REPL use?
  Current idea: the JS test should normally resolve its own preset from
  `process.env.BOARD` using `boardIds` inside `CFGS`, while the runner probes
  `process.env` for metadata capture and validation.

```js
>print process.env
={
  VERSION: "2v28",
  GIT_COMMIT: "dedba55bf",
  BOARD: "ESP32C3_IDF5",
  RAM: 409600, FLASH: 0, STORAGE: 917504,
  SERIAL: "dcda0cd1-c190",
  CONSOLE: "Serial1",
  MODULES: "timer,Flash,Storage,heatshr" ... "JS,Wifi,TelnetServer,crypto",
  EXPTR: 1008160952 }
>
```

- Which saved artifact shape should follow the console/log output in a later
  runner revision, if and when JSON or other machine-readable outputs are
  added?
