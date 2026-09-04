# PR 1: Fix the ESP32 IDF5 Wi-Fi Debug Build

## Submission Details

- Upstream repository: `espruino/Espruino`
- Base branch: `IDF5`
- Fork: `SimonGAndrews/Espruino`
- Head branch: `fix/esp32-idf5-wifi-debug-build`
- Commit: `75210faca79c2a18e6cb93dee3f06fd43c8ee9dd`
- PR title: `ESP32 IDF5: fix WiFi debug build`

## Copy-ready PR Description

### Issue

The ESP32 IDF5 Wi-Fi event callback receives the event number in the
`event_id` argument. Its unhandled-event debug message instead referenced
`event->event_id`, which belongs to the callback used with older ESP-IDF
versions.

Normal release builds did not expose the problem because `jsDebug()` and its
arguments are removed when debug output is disabled. A debug-enabled
`ESP32_IDF5` build compiled the expression and failed because `event` is not
defined in the IDF5 callback.

### Fix

Select the event expression appropriate to the ESP-IDF callback:

- IDF5 and later use `event_id`;
- earlier IDF versions retain `event->event_id`.

This changes only the unhandled-event diagnostic. It does not change Wi-Fi
event handling in a normal release build.

### Validation

Using ESP-IDF 5.5.3 and `BOARD=ESP32_IDF5`:

- clean debug-enabled release build with `DEBUG=1 RELEASE=1`: pass;
- clean standard release build with `RELEASE=1`: pass;
- release firmware flashed to the classic ESP32 V1 bench: pass;
- boot and USB-UART REPL connection: pass;
- reported commit: `75210faca`;
- basic Espruino `digitalWrite()`/`digitalRead()` loopback test: 4/4 pass.

## Manual Submission

Run from a new terminal:

```bash
cd /home/simon/MaBecker/Espruino_IDF5_PR
git status --short --branch
git log --oneline official/IDF5..fix/esp32-idf5-wifi-debug-build
git diff --check official/IDF5...fix/esp32-idf5-wifi-debug-build
git remote add simon https://github.com/SimonGAndrews/Espruino.git
git push -u simon fix/esp32-idf5-wifi-debug-build
```

Then open GitHub and create the pull request with:

- base repository: `espruino/Espruino`;
- base branch: `IDF5`;
- head repository: `SimonGAndrews/Espruino`;
- compare branch: `fix/esp32-idf5-wifi-debug-build`.

Use the title and description above, review the **Files changed** tab to
confirm that only `libs/network/esp32/jswrap_esp32_network.c` is present, and
select **Create pull request**.

Do not select the combined `fix/esp32-idf5-wired-regressions` branch for this
PR; it also contains the five corrections still undergoing bench validation.
