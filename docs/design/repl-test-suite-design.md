# REPL Test Suite Design

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
- `tools/` runs those same JavaScript files through Python automation
- `tools/wiring_tests/` contains target maps or target-specific runner defaults, not separate copies of the test logic

## One File Per Task

Examples:

- `tests/repl/gpio_block1.js`
- `tests/repl/analog_block2.js`
- `tests/repl/bus_spi_i2c_block3.js`
- `tests/repl/onewire_block4.js`

Each file should be standalone and directly shareable in GitHub issues, discussions, and forum posts.

## Target Presets

Each test file should contain:

```js
var TARGET = "ESP32_V1";

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    GPIO_LOOP_A_OUT : D32,
    GPIO_LOOP_A_IN  : D33,
    GPIO_LOOP_B_OUT : D25,
    GPIO_LOOP_B_IN  : D26
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    selectorInfo : "set C3 loopback selector positions for block 1",
    GPIO_LOOP_A_OUT : D1,
    GPIO_LOOP_A_IN  : D2,
    GPIO_LOOP_B_OUT : D3,
    GPIO_LOOP_B_IN  : D4
  }
};

var CFG = CFGS[TARGET];
if (!CFG) throw new Error("Unknown TARGET: " + TARGET);
```

The only user edit should normally be the `TARGET` line.

## Test Structure

Each test file should contain:

1. short purpose comment
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

## Output Contract

Each test should print structured lines only:

- `TEST=<name>`
- `TARGET=<cfg-name>`
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
- optionally select the target preset automatically
- send the same JS to the REPL
- wait for `DONE=<name>`
- parse `PASS` / `FAIL` / `SKIP` / `METRIC`
- support running multiple test files as a suite
- accumulate overall pass/fail state across the suite
- list failing checks and failure details clearly

Python should not be the source of the test logic.

This should be done with minimal impact on the JavaScript test content. The JS
files should only need the common structured output contract.

## Design Rules

- keep logical test names common across targets
- keep pin maps inside target presets
- do not duplicate whole test files per target
- prefer small visible configuration over hidden injection
- prefer plain JS that can be pasted directly into the REPL
- keep execution non-interactive once the test starts
