# ESP32: run ping task above interpreter priority

Raised as [Espruino PR #2793](https://github.com/espruino/Espruino/pull/2793).

On the single-core ESP32-C3, `Wifi.ping()` accepts a valid request but its
ESP-IDF ping task remains below Espruino's interpreter task and does not run.
Explicitly configure the ping task at priority 6, the lowest priority above
the priority-5 interpreter, so accepted ping requests can execute and deliver
their callbacks.

Fixes #2792.

### Change

- set `ping_config.task_prio` to 6 after `ESP_PING_DEFAULT_CONFIG()`; and
- document the single-core scheduling requirement beside the setting.

The setting is in the shared ESP32 implementation rather than a C3-specific
guard because the priority relationship belongs to the common IDF5 ping path.
No parsing, session-overlap, reset or callback-lifecycle behaviour is changed.

### Validation

- reproduced the current-master C3 failure at `fe558e4b3`: the call was
  accepted but no callback arrived during seven seconds;
- changed only the ping-task priority and received all five configured
  loopback results on the C3;
- completed clean `RELEASE=1` builds for `ESP32`, `ESP32C3` and `ESP32S3` at
  candidate commit `1b820a413`; and
- flashed that exact commit on physical classic ESP32, ESP32-C3 and ESP32-S3
  boards, each of which delivered all five configured loopback results.

Detailed evidence:

- [ESP32-C3 task-priority probe](https://github.com/SimonGAndrews/ESP32_SGATest/blob/main/tests/Results/WIFI_BLE_Results/2026-11-19-esp32c3-ping-task-priority.md)
