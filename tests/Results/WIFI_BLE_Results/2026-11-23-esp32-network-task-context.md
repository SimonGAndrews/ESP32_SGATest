# ESP32 network native-task context probe

Date: 2026-11-23

## Result

`Wifi.connect()` and `Wifi.disconnect()` begin in Espruino's interpreter task,
but their ESP-IDF Wi-Fi and IP completion events run in the separate
`sys_evt` task. Current event-handler code performs JavaScript allocation,
event publication and callback ownership changes directly in `sys_evt`.

This is the same task-boundary class found in `Wifi.ping()`, although the
native producer and API-specific completion conditions differ:

| API | Request context | Native result context |
|---|---|---|
| `Wifi.ping()` | `espruinoTask` | ESP-IDF `ping` task |
| `Wifi.connect()` | `espruinoTask` | ESP-IDF `sys_evt` task |
| `Wifi.disconnect()` | `espruinoTask` | ESP-IDF `sys_evt` task |
| `Wifi.scan()` | `espruinoTask` | ESP-IDF `sys_evt` task |

## Firmware and target

| Item | Value |
|---|---|
| Espruino parent | upstream `master` `4addf143c74900044d8b6ba84784d2deb807f2c4` |
| Espruino version | `2v29.535` |
| Board | `ESP32S3` |
| ESP-IDF | `v5.5.3` |
| Target | ESP32-S3 revision 0.1, MAC `68:b6:b3:27:2c:40` |
| Serial path | `/dev/serial/by-id/usb-Espressif_USB_JTAG_serial_debug_unit_68:B6:B3:27:2C:40-if00` |
| Instrumented firmware SHA-256 | `6812f1f60b5954fea8e88a82cefd130068b425c2f58065f01af95af036a58cad` |

The only firmware changes were temporary `jsDebug()` statements printing
`pcTaskGetName(NULL)` and `xPortGetCoreID()` at the public connect/disconnect
wrapper entries and the common Wi-Fi/IP event handler. No lifecycle or
callback code changed.

## Scan context

The retained `esp32_wifi_scan_empty.js` probe produced station-start,
scan-complete and station-stop events. Each event came through `sys_evt` on
core 0:

```text
wifi_event_handler task=sys_evt core=0
Event: STA_START (2)
wifi_event_handler task=sys_evt core=0
Event: SCAN_DONE (1)
wifi_event_handler task=sys_evt core=0
Event: STA_STOP (3)
```

## Connect and disconnect context

The retained `esp32_wifi_disconnect_connected.js` probe was run with the
credential-sanitising local runner. Its relevant trace was:

```text
jswrap_wifi_connect task=espruinoTask core=0
wifi_event_handler task=sys_evt core=0
Event: STA_START (2)
wifi_event_handler task=sys_evt core=0
Event: STA_CONNECTED (4)
wifi_event_handler task=sys_evt core=0
Event: OTHER (0)
INFO connect_callback=null
jswrap_wifi_disconnect task=espruinoTask core=0
INFO disconnect_callback=1
wifi_event_handler task=sys_evt core=0
Event: STA_DISCONNECTED (5)
INFO disconnect_callback=2
wifi_event_handler task=sys_evt core=0
Event: STA_DISCONNECTED (5)
INFO disconnected_event={"ssid":"<SSID>","mac":"ac:84:c6:18:a3:e8","reason":"8","msg":"ASSOC_LEAVE"}
```

Both tasks are pinned to core 0 in this build, but they remain distinct
FreeRTOS tasks. The ESP-IDF default event loop creates `sys_evt` pinned to core
0; Espruino independently creates `espruinoTask` pinned to core 0 at priority
5. Sharing a core therefore does not make interpreter access from `sys_evt`
safe.

The probe also reproduced the separately recorded disconnect lifecycle defect:
one deliberate request invoked its callback once from the immediate API path
and once after the native event. This observation does not by itself prove
that cross-task access caused the duplicate; it demonstrates that both paths
currently act on the same JavaScript callback state.

The runner reported password exposure and returned status 1 because the
diagnostic build's existing connect message printed the configured password.
Retained output was sanitised. The JavaScript scenario itself reached
`DONE=PASS` because its purpose is to record, rather than require, the current
callback counts.

## Source inventory

The common `wifi_event_handler()` currently performs the following work in
`sys_evt`:

| ESP-IDF event | Interpreter or callback work performed directly |
|---|---|
| terminal `WIFI_EVENT_STA_DISCONNECTED` | inspects, schedules, unlocks and clears disconnect/connect callbacks; creates the public-event object |
| `WIFI_EVENT_STA_CONNECTED` | creates the association object and publishes `associated` |
| `IP_EVENT_STA_GOT_IP` / `IP_EVENT_GOT_IP6` | creates the address object, publishes `connected`, schedules and releases the connect callback |
| `WIFI_EVENT_SCAN_DONE` | creates the access-point array and objects, schedules and releases the scan callback |
| AP station joined/left | creates details and publishes the public event |
| `WIFI_EVENT_AP_START` | schedules and releases the AP-start callback |

The station-start and station-stop branches currently change plain C state
only. The terminal-disconnection retry branch also remains native until the
retry count is exhausted.

`jsiQueueEvents()` is not a native-to-interpreter handoff. It creates a
JavaScript event object and argument array and appends them to the global
interpreter `events` array before returning.

## Existing IO-event buffer assessment

The general IO-event buffer is bounded and has a 64-byte maximum event
payload, so it initially appeared suitable for a plain-C `EV_CUSTOM` record.
It cannot yet be treated as a proven multi-task transport on ESP32:

- `jshPushEvent()` expects `jshInterruptOff()` / `jshInterruptOn()` to protect
  its variable-length ring updates;
- those two functions are no-ops on ESP32;
- the `jshPushIOCharEvents()` append path also updates the shared buffer and
  head positions directly; and
- ESP32 UART and Bluetooth paths already feed this buffer from FreeRTOS/native
  callbacks.

Adding the independent `ping` and `sys_evt` producers would therefore rely on
an unestablished multi-producer guarantee. A passing stress test could not
prove that the unsynchronised ring is safe.

## Design consequence

The ping and station APIs should share a task-safe transport but retain their
own operation lifecycles. Two plausible boundaries remain for maintainer
discussion:

1. make Espruino's general IO-event buffer explicitly safe for ESP32 native
   task producers, then use an interpreter-side custom event; or
2. add one bounded ESP32 network-event queue for ping, Wi-Fi and IP records,
   wake the interpreter with `jshHadEvent()`, and drain it through the existing
   `net_esp32_idle()` hook.

The second option contains the change within the ESP32 network backend and
does not alter the core IO ring. Its idle path should begin with a cheap
pending check so it adds no queue work when no native network event awaits
delivery. Queue bounds, overflow behaviour, reset identity and event ordering
still require agreement before implementation.

No production correction was implemented by this probe.

The temporary trace statements were removed after capture. A clean release
image rebuilt from `4addf143c`, SHA-256
`9159edafbfa0cf1aa814b03c7401be2eb214df5d19bfff99e7c13ed7f9de1f15`,
was flashed back to the S3. A read-only memory snapshot then confirmed
`ESP32S3`, version `2v29.535`, commit `4addf143c` and `DONE=PASS`.
