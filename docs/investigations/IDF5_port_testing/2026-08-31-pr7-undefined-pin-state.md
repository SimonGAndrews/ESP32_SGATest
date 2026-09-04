# PR 7: Support Undefined Pin State During ESP32 Cleanup

## Submission Details

- Upstream repository: `espruino/Espruino`
- Base branch: `IDF5`
- Fork: `SimonGAndrews/Espruino`
- Head branch: `fix/esp32-idf5-undefined-pin-state`
- Commit: `d533b306781e9c558d3aa5952a8b0dc4b3250e5d`
- PR title: `ESP32: support undefined pin state during cleanup`

This branch is based directly on `official/IDF5` at `25f81a8e1` and is
independent of the other correction branches.

## Copy-ready PR Description

### Issue

Espruino uses `JSHPINSTATE_UNDEFINED` when a peripheral releases its pins.
The ESP32 implementation of `jshPinSetState()` did not handle that state, so
cleanup such as `Serial.unsetup()` fell through to the default case and
reported:

```text
jshPinSetState: Unexpected state: 0
```

The message was therefore caused by a missing valid cleanup-state mapping,
not by an invalid JavaScript API request.

### Fix

Map `JSHPINSTATE_UNDEFINED` to ESP-IDF `GPIO_MODE_DISABLE`. This releases the
pin without selecting an input or output function and avoids treating normal
peripheral cleanup as an error.

The correction adds one three-line switch case.

### Validation

The standalone branch was built from a clean tree using ESP-IDF 5.5.3 and
`BOARD=ESP32_IDF5`:

- clean standard release build with `RELEASE=1`: pass;
- generated firmware version: `2v29.63`;
- firmware binary SHA-256:
  `0293750ed8704df9aaf124cfea545cf61eabb8a87715895ceb4b058f86866405`;
- release archive SHA-256:
  `674513f9d867327b484ef52ada2ca5096fd499d2013d09c66646fe540cbe888d`.

The exact patch was also included in the staged classic ESP32 IDF5 firmware
tested on the V1 bench:

- raw `Serial.setup()`/`Serial.unsetup()` output contained no
  `jshPinSetState: Unexpected state: 0` diagnostic;
- `Serial.isConnected()` returned `false`, `true`, then `false` before setup,
  after setup and after `unsetup()` respectively;
- ten repeated setup/unsetup cycles passed when the connected sender's TX
  idle-high level was established before enabling the receiver.

The TX initialisation order is a physical UART test precondition and does not
change the required cleanup semantics.

The standalone commit and tested staged commit have the same stable Git patch
ID: `1bac1b958d41f35d9400863513ed8da37a6996a3`.

After Gordon merged PR 1 and PR 2, the branch was rebased onto `25f81a8e1`.
The commit ID changed to `d533b3067`; the stable patch ID and three-line file
diff are unchanged, and `git diff --check` passes.

## Manual Submission

Run from a terminal:

```bash
cd /home/simon/MaBecker/Espruino_IDF5_PR
git status --short --branch
git log --oneline official/IDF5..fix/esp32-idf5-undefined-pin-state
git diff --check official/IDF5...fix/esp32-idf5-undefined-pin-state
git push -u simon fix/esp32-idf5-undefined-pin-state
```

On the GitHub **Compare changes** page, select **compare across forks**, then
set:

- base repository: `espruino/Espruino`;
- base branch: `IDF5`;
- head repository: `SimonGAndrews/Espruino`;
- compare branch: `fix/esp32-idf5-undefined-pin-state`.

Use the title and description above. Before selecting **Create pull request**,
confirm that GitHub shows one commit and only `targets/esp32/jshardware.c` in
**Files changed**. The expected change is three inserted lines.
