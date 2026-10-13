# Classic ESP32 Flashing And Direct Test Practice

Date: 2026-09-25

## Recommendation

For Codex-driven work on the locally connected classic ESP32, use separate
tools for separate jobs:

1. build and flash firmware with the selected Espruino checkout's own
   provisioning and Make targets;
2. use `tools/repl/run_test.py` with its direct serial transport for routine,
   repeatable execution of a single JavaScript test;
3. use the focused Python runner for multi-board Wi-Fi, BLE or other
   stateful tests;
4. use EspruinoTools CLI as the interactive terminal, for a small one-line
   probe, or as an independent upload-transport comparison;
5. use an ESP-IDF monitor only when raw boot, assertion or backtrace evidence
   is needed.

Do not use EspruinoTools CLI's `-f` option as the normal way to flash a classic
ESP32. That option is intended for supported USB Espruino firmware-update
paths. An ESP32 image has bootloader, partition-table and application
components at target-specific offsets; the Espruino Make target already knows
the correct tool, files and offsets.

The operating priorities are deterministic target identity, one owner of the
serial port, a known firmware and runtime state, paced uploads, explicit
completion markers and preserved raw failure output.

## Scope And Hardware Assumptions

This procedure applies to the classic ESP32 DevKitC V4 / Olimex
ESP32-DevKit-LiPo target used with the V1 harness on Ubuntu.

- The normal console and flashing path is the board USB-UART connection on
  UART0, `D1` and `D3`.
- Do not repurpose UART0 for a functional test.
- `JP_External_5V1` is open unless external power is deliberately required.
  Do not connect USB VBUS and external 5 V through the harness accidentally.
- Record the V1 selector and jumper configuration before a test.
- The normal baseline positions are:
  - `SEL_D33`: pins 1-2, selecting the `D32` to `D33` loopback;
  - `SEL_D26`: pins 1-2, selecting the `D25` to `D26` loopback;
  - `SEL_D35`: I2C-interrupt position;
  - `JP_UART_LOOP2`: open.
- For the UART1/UART2 crosslink only, move `SEL_D35` to the UART position and
  close `JP_UART_LOOP2`. UART0 remains the control connection.

The authoritative wiring detail is in
[`../targets/esp32-devkitc-v4/wiring.md`](../targets/esp32-devkitc-v4/wiring.md).

## Choose And Prove The Serial Device

Do not assume that `/dev/ttyUSB0` still identifies the intended board after a
USB reconnect. Prefer a persistent device link and resolve it before use.

The currently observed classic ESP32 adapter is:

```text
/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0
```

Set a task-specific variable rather than repeating a transient device name:

```bash
ESP32_PORT=/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0
readlink -f "$ESP32_PORT"
ls -l "$ESP32_PORT"
```

When several adapters have indistinguishable identities, use the fixed
`/dev/serial/by-path/` entry from the bench configuration and still verify the
firmware identity after opening it. A persistent pathname reduces accidental
selection; it does not prove which firmware or target is attached.

Before flashing or testing, establish that nothing else owns the device:

```bash
fuser "$ESP32_PORT" || true
lsof "$ESP32_PORT" 2>/dev/null || true
```

Close the Espruino Web IDE, another CLI terminal, `idf.py monitor`, `screen`,
`minicom`, and any other Codex runner using that port. Never allow two REPL
tools to share the connection. Interleaved writers can create corrupted
uploads, false test failures and misleading firmware symptoms.

## Preserve Source And Build Provenance First

Before building, record the exact checkout and whether it contains local
changes:

```bash
git status --short --branch
git rev-parse HEAD
git remote -v
git diff --stat
```

Do not describe a locally patched image only by the commit printed in
`process.env.GIT_COMMIT`; that value names the checked-out commit and does not
identify uncommitted changes. Record the diff or commit the test candidate.

Open a fresh terminal for the build. Use one Espruino checkout and one ESP-IDF
family in that terminal. Do not activate IDF4 and IDF5 sequentially in the
same shell.

From the intended Espruino checkout, select exactly one of:

```bash
# Classic legacy ESP32 line
source scripts/provision.sh ESP32

# Classic ESP32 using ESP-IDF 4.4
source scripts/provision.sh ESP32_IDF4

# Classic ESP32 using ESP-IDF 5.5
source scripts/provision.sh ESP32_IDF5
```

Continue the build in that same terminal. Clean whenever the board target,
IDF family or significant configuration has changed:

```bash
make BOARD=ESP32_IDF5 clean
make BOARD=ESP32_IDF5 RELEASE=1
```

Substitute the actual board name. For comparison testing, use the same
`RELEASE` choice on both builds. A release image and an assertion-enabled
diagnostic image are different test subjects.

Before flashing, inspect the generated identity. For a classic ESP32 target,
the generated pin count should be 40:

```bash
rg 'for board|PC_BOARD_ID|JSH_PIN_COUNT' \
  gen/platform_config.h gen/jspininfo.h
```

If the generated files name another target, stop and clean. Stale generated
C3 files have previously contaminated a classic build when the target was
changed without cleaning.

## Flash With The Espruino Build System

First release every terminal or runner that has the serial port open. Then use
the board-family-specific Make variable:

```bash
# Legacy classic ESP32 uses COMPORT
make BOARD=ESP32 RELEASE=1 flash COMPORT="$ESP32_PORT"

# IDF4 and IDF5 classic ESP32 use PORT
make BOARD=ESP32_IDF4 RELEASE=1 flash PORT="$ESP32_PORT"
make BOARD=ESP32_IDF5 RELEASE=1 flash PORT="$ESP32_PORT"
```

Normally build and flash as separate steps so a compile failure cannot be
confused with a flashing failure. The flash target is nevertheless allowed to
build missing prerequisites.

Routine reflashing does not require erasing the whole device. A full erase
also destroys saved Espruino code and persistent configuration, so perform it
only when the test explicitly requires a clean persistent state. Record an
erase as part of the test precondition.

If automatic reset into the ROM loader fails:

1. confirm that no process owns the port;
2. disconnect and reconnect USB, then resolve the persistent link again;
3. retry at a lower flash baud if the USB path is marginal;
4. only then use the board's BOOT/RESET buttons to enter download mode.

Do not replace the Make target with a hand-written `esptool` command unless the
investigation is specifically about flashing. It is too easy to mix artifacts
or use offsets from the wrong ESP32 family.

## Verify The Flashed Image Before Functional Testing

Allow the board to complete its post-flash reset, then query the running
firmware rather than relying only on the build directory:

```js
print(JSON.stringify({
  board: process.env.BOARD,
  version: process.version,
  gitCommit: process.env.GIT_COMMIT,
  console: process.env.CONSOLE
}));
```

Also retain the boot banner when it contains useful SDK or reset information.
The minimum evidence header is:

- source repository, branch, commit and local-diff state;
- board definition and ESP-IDF family;
- build command and `RELEASE` setting;
- resolved serial device;
- runtime `BOARD`, version and `GIT_COMMIT`;
- harness mode and selector/jumper positions;
- exact JavaScript file and runner command.

Do not proceed with a comparison if the runtime identity differs from the
intended image.

## Which REPL Method To Use

| Need | Preferred method | Reason |
|---|---|---|
| Repeatable single-script evidence | `tools/repl/run_test.py`, direct transport | Queries metadata, synchronises the REPL, resets JavaScript state, paces multiline upload, parses structured output and returns a useful exit status |
| Multi-board Wi-Fi/BLE or stateful lifecycle test | The matching `tools/repl/run_*.py` runner | Owns both ports, correlates roles and run IDs, performs chip reboots and checks independent peer evidence |
| Interactive exploration | EspruinoTools CLI terminal | Convenient direct REPL with human-visible output |
| Small one-line probe without resetting JavaScript | EspruinoTools CLI `-e` | Explicitly evaluates one expression without a file upload |
| Independent upload-path comparison | `run_test.py --transport cli` or direct CLI file upload | Helps distinguish runner/transport behaviour from firmware behaviour |
| Manual human reproduction | Espruino Web IDE | Useful for paste-and-run confirmation, but weaker for automated provenance and exit-status evidence |
| Boot log, assertion or decoded ESP-IDF backtrace | `idf.py monitor` from the matching provisioned build | Retains raw low-level output and uses the matching ELF where supported |

### Preferred automated single-script command

Run from the `ESP32_SGATest` repository root:

```bash
python3 tools/repl/run_test.py \
  tests/repl/gpio_block1/gpio_readwrite_basic.js \
  --port "$ESP32_PORT" \
  --baud 115200 \
  --timeout 12 \
  --show-raw
```

`--show-raw` is especially important during investigation. A missing `DONE`
marker may be caused by an assertion, reboot, malformed upload or timeout; the
raw transcript distinguishes those cases.

The direct runner is preferred over invoking the CLI for routine regression
evidence because it gives Codex explicit control over synchronisation,
upload pacing, output parsing and the process exit code.

### EspruinoTools CLI transport through the runner

The most current local EspruinoTools checkout observed while writing this
guide is:

```text
/home/simon/SGAdev/EspruinoTools-dev/bin/espruino-cli.js
```

Confirm that its Git tree and Node environment are suitable before using it.
The separate checkout under
`/home/simon/Espruino/MyEspruinoTester01/EspruinoTools` was 17 commits behind
its upstream branch at the time of inspection and should not be selected by
accident.

```bash
ESPRUINO_CLI_PATH=/home/simon/SGAdev/EspruinoTools-dev/bin/espruino-cli.js
command -v node
node --version

python3 tools/repl/run_test.py \
  tests/repl/gpio_block1/gpio_readwrite_basic.js \
  --port "$ESP32_PORT" \
  --baud 115200 \
  --timeout 12 \
  --transport cli \
  --cli-path "$ESPRUINO_CLI_PATH" \
  --show-raw
```

This preserves the common result parsing while changing only the upload
transport.

### Direct EspruinoTools CLI use

Interactive terminal:

```bash
node "$ESPRUINO_CLI_PATH" --no-ble -b 115200 -p "$ESP32_PORT"
```

Press Ctrl-C twice to leave the terminal. Do not leave it connected while a
different runner starts.

Run one expression without a file upload:

```bash
node "$ESPRUINO_CLI_PATH" -q --no-ble -b 115200 \
  -p "$ESP32_PORT" \
  -e 'print(JSON.stringify(process.env))' \
  --sleep 1
```

Upload a test file and keep the connection open long enough for asynchronous
output:

```bash
node "$ESPRUINO_CLI_PATH" -q --no-ble -b 115200 \
  -p "$ESP32_PORT" \
  --sleep 15 \
  tests/repl/gpio_block1/gpio_readwrite_basic.js
```

Use `-q` to suppress tool chatter, `--no-ble` to stop the host tool scanning
for BLE devices, and always state `-b 115200` for this UART console. Avoid CLI
minification when reproducing a firmware problem because it changes the exact
program being tested. Use a bounded `--sleep` long enough for asynchronous
completion.

The line `Prompt not detected - upload failed. Trying to recover...` is a
transport warning, not by itself proof that the firmware test failed. We have
seen scripts continue and print valid results after that message. Judge the
run using the structured markers, raw transcript and board reset evidence.
Repeat through the direct runner if the CLI result is ambiguous.

## Establish The Required Runtime State

There are three different reset levels; choose deliberately:

1. **REPL synchronisation**: send Ctrl-C twice, a newline and restore echo.
   This interrupts JavaScript input but does not reset the firmware.
2. **`reset()`**: clears ordinary Espruino JavaScript runtime state. The shared
   direct runner uses this before a normal functional test.
3. **`ESP32.reboot()`**: reboots the ESP32 chip and reinitialises native
   drivers. Use this for Wi-Fi, BLE, saved-configuration, driver-lifecycle or
   reset-cause tests where `reset()` is not a sufficiently clean precondition.

After `ESP32.reboot()`, allow roughly two seconds for boot and then
resynchronise the REPL. Do not upload a large script into the boot banner.

For paired Wi-Fi/BLE tests, use the purpose-built runner. Those runners reboot
both devices, verify their identities, pace each role upload and clean up both
roles. Do not recreate that sequencing with two concurrently running CLI
processes.

## JavaScript Test Shape

A Codex-run test should be standalone, bounded and machine-readable. Follow
the established shared-test conventions:

```js
echo(false);
print("TEST=short_descriptive_name");
print("BOARD=" + process.env.BOARD);
print("GIT_COMMIT=" + process.env.GIT_COMMIT);

// Perform the test and print one line per assertion:
// PASS check_name
// FAIL check_name expected=... actual=...

// Print exactly one final marker after all asynchronous work and cleanup:
print("DONE=PASS");
```

The full test should:

- use `Dxx` pin names;
- state required selector/jumper positions;
- have a timeout for every asynchronous phase;
- print `PASS`, `FAIL`, useful `METRIC` lines and one final `DONE` marker;
- avoid huge JSON dumps that can overrun or obscure the UART REPL;
- clean up intervals, timeouts, watches, sockets, listeners and peripherals;
- place pins in a safe state at completion;
- avoid `save()` or persistent Wi-Fi changes unless persistence is the test;
- never print Wi-Fi passwords, tokens or other credentials.

For long scripts, retain upload pacing. The direct runner sends lines in small
groups with short delays because unpaced multiline uploads have previously
lost input and produced false failures.

## Evidence And Repetition

For a new failure:

1. preserve the first raw transcript, including boot/reset text;
2. rerun the same unchanged test from the same precondition;
3. reduce it to the smallest direct REPL script that still reproduces;
4. repeat after a true chip reboot;
5. compare another firmware build only after the target, wiring and script
   have been held constant;
6. treat the mature legacy build as a comparator, not as an infallible oracle.

One clean pass is useful smoke evidence. A timing or lifecycle correction
needs enough repetition to exercise the original failure mode. Record both
the number of completed runs and what each run actually exercised; avoid an
unexplained `passed 18/18` summary.

To preserve output while retaining the runner's failure exit code:

```bash
set -o pipefail
python3 tools/repl/run_test.py path/to/test.js \
  --port "$ESP32_PORT" --timeout 20 --show-raw \
  2>&1 | tee path/to/evidence.log
```

Do not store credentials in the evidence log. The existing wireless runners
load ignored, permission-restricted credential files and inject them with REPL
echo disabled.

## Failure Interpretation And Recovery

| Observation | Interpretation and next action |
|---|---|
| No serial device | Check USB seating, power, persistent link and kernel enumeration before changing firmware |
| Permission denied or resource busy | Check group/access and find the owning process; do not retry with another tool concurrently |
| Flash cannot enter download mode | Close the REPL owner, power-cycle, retry, then use BOOT/RESET only if automatic reset still fails |
| CLI says prompt was not detected but test output follows | Preserve the output; use markers and raw reset evidence, then compare with the direct runner |
| Missing `DONE` with assertion/backtrace/reboot banner | Firmware crash or reset evidence; capture the complete raw transcript and matching build identity |
| Missing `DONE` without crash text | Could be timeout, lost upload, asynchronous test stall or console migration; resynchronise and run the minimal test |
| First run fails but repeated warm runs pass | Suspect boot/startup state, saved configuration, floating input or test sequencing; compare `reset()` with `ESP32.reboot()` |
| Large script fails inconsistently | Use paced direct upload, reduce output volume and split the test into focused scripts |
| REPL disappears during BLE connection | The ESP32 console may have migrated to BLE; focused BLE roles should force `Serial1` and restore automatic selection afterwards |

After a firmware crash, wait for the complete reboot banner and prompt before
reopening the port. If the console remains confused, release the port and
power-cycle once. Do not erase flash merely to recover a serial session.

## Codex Execution Checklist

The other Codex thread should use this order:

1. name the Espruino checkout, branch, commit, board definition and intended
   test;
2. record the physical harness mode and power arrangement;
3. resolve the persistent serial path and prove it has one owner;
4. provision one IDF family in a fresh terminal;
5. clean, build and verify generated board identity;
6. flash using the matching Make target;
7. query and record the runtime firmware identity;
8. run a small REPL smoke check;
9. run the focused test using direct `run_test.py` or the appropriate
   stateful runner;
10. preserve raw failures and repeat from the required reset level;
11. clean up peripherals and release the serial port;
12. record commands, results, exclusions and any recovery action in the
    harness evidence repository.

This ordering keeps build proof, transport proof, harness proof and firmware
behaviour separate enough that a failure can be attributed without guessing.
