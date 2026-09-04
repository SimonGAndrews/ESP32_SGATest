# PR 4: Restore GPIO Output After Peripheral Use on ESP32 IDF5

## Upstream Outcome

Merged as Espruino PR `#2736` by commit `4ba8157c9` and included in master
merge `5d79af218`.

## Submission Details

- Upstream repository: `espruino/Espruino`
- Base branch: `IDF5`
- Fork: `SimonGAndrews/Espruino`
- Head branch: `fix/esp32-idf5-gpio-matrix`
- Commit: `301fe8dda69b79dd5f2ae940d11b152c38494d5f`
- PR title: `ESP32 IDF5: restore GPIO output after peripheral use`

This branch is based directly on `official/IDF5` at `25f81a8e1`. It is
intended to merge before the PWM/DAC correction, which exercises
peripheral-to-GPIO reuse.

## Copy-ready PR Description

### Issue

`jshPinSetValue()` must reconnect the ordinary GPIO output signal before
driving a pin that may previously have been assigned to PWM, RMT, UART or
another peripheral.

The IDF5 path called `gpio_iomux_out()` with `SIG_GPIO_OUT_IDX`. In ESP-IDF 5,
the second argument to `gpio_iomux_out()` is an IO-MUX function number, not a
GPIO-matrix signal index. It therefore did not perform the same operation as
the earlier `gpio_matrix_out()` call.

This could leave `digitalWrite()` unable to take control of a pin after
peripheral output use.

### Fix

Use `esp_rom_gpio_connect_out_signal()` to reconnect `SIG_GPIO_OUT_IDX` to the
pin under IDF5. This is the IDF5 spelling of the GPIO-matrix operation used by
the earlier build path; on classic ESP32 it resolves to `gpio_matrix_out`.

The correction changes one line in `jshPinSetValue()`.

### Validation

The standalone branch was built from a clean tree using ESP-IDF 5.5.3 and
`BOARD=ESP32_IDF5`:

- clean standard release build with `RELEASE=1`: pass;
- generated firmware version: `2v29.63`;
- firmware binary SHA-256:
  `0905ac89a9cb2fda4370fce0b6d5ea9f9a053db383c62dfc69f93bd106e8f59c`;
- release archive SHA-256:
  `78856916f3fdcf0c7196b104dc22f01ab7ea164662dbf71710542652ad285d3d`.

The exact patch was also included in the staged classic ESP32 IDF5 firmware
tested on the V1 bench. The focused external-ADC test assigned PWM to an
output, then used `digitalWrite()` on the same pin and finally returned it to
PWM. An MCP3008 independently observed low, high and useful midpoint levels;
all 11 assertions passed.

The broader GPIO regression also passed `digitalWrite()`/`digitalRead()`
(4/4), `digitalPulse()` (3/3), `shiftOut()` (3/3), and watch handling (4/4).

The standalone commit and tested staged commit have the same stable Git patch
ID: `526d2baa4dd2e9af6538652ceba522b24c31f7c0`.

After Gordon merged PR 1 and PR 2, the branch was rebased onto `25f81a8e1`.
The commit ID changed to `301fe8dda`; the stable patch ID and one-line file
diff are unchanged, and `git diff --check` passes.

## Manual Submission

Run from a terminal:

```bash
cd /home/simon/MaBecker/Espruino_IDF5_PR
git status --short --branch
git log --oneline official/IDF5..fix/esp32-idf5-gpio-matrix
git diff --check official/IDF5...fix/esp32-idf5-gpio-matrix
git push -u simon fix/esp32-idf5-gpio-matrix
```

On the GitHub **Compare changes** page, select **compare across forks**, then
set:

- base repository: `espruino/Espruino`;
- base branch: `IDF5`;
- head repository: `SimonGAndrews/Espruino`;
- compare branch: `fix/esp32-idf5-gpio-matrix`.

Use the title and description above. Before selecting **Create pull request**,
confirm that GitHub shows one commit and only `targets/esp32/jshardware.c` in
**Files changed**. The expected change is one replacement line.
