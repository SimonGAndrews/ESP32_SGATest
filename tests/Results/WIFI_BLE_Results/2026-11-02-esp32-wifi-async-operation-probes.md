# ESP32-C3 Wi-Fi Asynchronous Operation Probes

Date: 2026-11-02

## Conclusion

Four focused, credential-free probes establish the missing lifecycle evidence
for the current ESP32 Wi-Fi work:

- an IDF5 `Wifi.ping()` without a callback still owns the native session,
  rejects an overlapping ping with a catchable exception and releases the
  session for a later five-result ping;
- a second `Wifi.connect()` can destroy the first attempt's callback before
  the second operation has been accepted, including when the second call
  fails JavaScript argument validation;
- a valid overlapping `Wifi.connect()` can report only a console `jsError`,
  return normally and invoke neither callback;
- `Wifi.disconnect()` while connecting invokes its callback twice: once from
  the API call and once from `WIFI_EVENT_STA_DISCONNECTED`;
- `reset()` while an IDF5 ping is active leaves native results targeting the
  discarded JavaScript runtime. Each remaining result produces `ERROR:
  Unknown type of callback in Event Queue`. The native session does drain and
  a later ping succeeds.

The `PASS` markers in the connect, disconnect and reset probes mean that the
diagnostic completed and recovery was possible. They do not declare the
observed API behaviour correct.

## Firmware And Bench Identity

| Item | Value |
|---|---|
| Board | Seeed Studio XIAO ESP32-C3 |
| Espruino board definition | `ESP32C3_IDF5` |
| Espruino version | `2v29.498` |
| Runtime firmware commit | `10403016b` |
| Espruino source branch | `fix/esp32-idf5-ping` |
| Espruino repository | `/home/simon/MaBecker/Espruino_master` |
| Evidence repository | `/home/simon/MaBecker/ESP32_SGATest` |
| Console | persistent Espressif USB Serial/JTAG by-id path |

The tested firmware contains the three current ping commits:

- `b5a3942e6` — restore IPv4 string parsing;
- `7f9162edc` — correct ESP-IDF 5 ping-session lifecycle;
- `9f310b87b` — deliver ping results across classic ESP32, C3 and S3.

The tests did not use saved or bench Wi-Fi credentials. Loopback addresses and
deliberately unavailable synthetic SSIDs kept the probes independent of the
`SHED` access point.

## Reproducers

| Probe | Program / runner | SHA-256 |
|---|---|---|
| Callback-less ping overlap | `docs/investigations/wifi/repros/esp32_wifi_ping_no_callback_overlap.js` | `f4d9d3b5d25fefc7bd664510cdf065a8a7c86d4793976524cc45289d1804e232` |
| Connect overlap variants | `docs/investigations/wifi/repros/esp32_wifi_connect_overlap_variants.js` | `e03c009dc5cf7a99ceb75e0531157dffa2e152941c3805f8f656585a9eb432d5` |
| Disconnect idle/cancel | `docs/investigations/wifi/repros/esp32_wifi_disconnect_idle_and_cancel.js` | `5f2bbf663edbdd07ca3f65ab9bac6f5a0bf2181d265f3b651a9bbc7407de1187` |
| Ping across `reset()` | `docs/investigations/wifi/repros/esp32_wifi_ping_reset.js` | `a98948f54542d6741f8afd1264e558d97a7fc37b57dcbe78d60db07decdb2f15` |
| Ping reset runner | `tools/repl/run_wifi_ping_reset_probe.py` | `86714adff18339f4136ad2d087cc33435d1c37bc9f64d2421e210e59a7754e5f` |

The ordinary programs were run with `tools/repl/run_test.py`. The reset probe
uses a purpose-built runner because each mode must begin with `E.reboot()`,
invoke the weaker JavaScript `reset()` under test, observe a fixed-duration
window and then attempt a recovery ping.

## Results

### Callback-less ping owns the session

The callback-less loopback ping was accepted. An immediate second ping threw:

```text
Error: A ping is already in progress
```

After four seconds, a recovery loopback ping was accepted and delivered all
five result objects:

| Metric | Result |
|---|---:|
| overlap rejected | `true` |
| overlap callbacks | 0 |
| recovery callbacks | 5 |

This is the desired ownership behaviour. It also proves that native operation
activity must be represented independently of whether a JavaScript callback
was supplied.

### Connect overlap loses callback ownership

Each first call targeted a unique unavailable SSID. The second call was made
immediately, before the first attempt could complete.

| Scenario | First callback count | Second callback count | Second returned | Second threw |
|---|---:|---:|---|---|
| two callbacks, valid arguments | 0 | 0 | `true` | `false` |
| first callback, invalid second password type | 0 | 0 | `false` | `true` |
| callback-less first call, valid second callback | 0 | 0 | `true` | `false` |

The valid overlapping calls emitted an ESP-IDF error through `jsError` but did
not throw. Depending on the precise driver timing, the raw trace recorded
`ESP_ERR_WIFI_CONN` from `esp_wifi_connect()` or `ESP_ERR_WIFI_STATE` from
`esp_wifi_set_config()`. No callback reported either failure.

The invalid-options scenario is especially decisive: the second call threw
the expected argument exception, but the first attempt's callback had already
been cleared and was never delivered. Rejection therefore mutates an operation
that was already in progress.

### Disconnect completes twice during connect

The scan control completed with station mode already auto-stopped. Calling
`disconnect()` then produced one callback, no `disconnected` event and no
duplicate:

```json
{"disconnectCallbackCount":1,"disconnectedEventCount":0}
```

The active-connect case produced:

```json
{
  "connectCallbackCount": 1,
  "disconnectCallbackCount": 2,
  "disconnectedEventCount": 1
}
```

The raw trace shows the first disconnect callback queued directly by
`jswrap_wifi_disconnect()` and the second queued when
`WIFI_EVENT_STA_DISCONNECTED` is processed. The connect callback was invoked
once with ESP-IDF reason 36, rendered by this build as `"Unknown reason"`.

The idle-scan result does not prove a station-mode leak: this firmware's scan
completion path had already called `stopWifiIfIdle()` before the disconnect
probe began.

### Reset leaves ping deliveries bound to the old runtime

Each mode started after a chip-level `E.reboot()`. The phase program then
started a ping and called JavaScript `reset()` while native work was live.

| Mode | Old callbacks after reset requested | Unknown-callback errors | Recovery callbacks | Recovery complete |
|---|---:|---:|---:|---|
| active loopback success | 0 | 5 | 5 | `true` |
| active timeout target | 0 | 5 | 5 | `true` |
| native results queued before reset teardown | 1 | 4 | 5 | `true` |

In the queued-final mode, one old callback ran after `reset()` was requested
but before the boot banner showed teardown complete. The four remaining
results then generated invalid-event-queue errors. The other modes generated
five errors, one for every remaining ping result.

After the old native session drained, all three modes accepted a recovery
loopback ping and delivered five callbacks. This bounds the defect: reset is
not lifecycle-safe, but the session does not permanently wedge the driver.

## Source Alignment

The observations match the current implementation in
`libs/network/esp32/jswrap_esp32_network.c`:

- `jswrap_wifi_connect()` clears `g_jsGotIpCallback` before completing option
  validation and stores the new callback only after the native start path;
- immediate ESP-IDF failures call `jsError` and return without a terminal
  callback;
- `jswrap_wifi_disconnect()` stores its callback, queues that same callback
  immediately and leaves the stored reference for the later disconnected
  event path to queue again;
- the IDF5 ping globals and response queue have no Wi-Fi wrapper kill/reset
  hook. `jswrap_esp32_wifi_soft_init()` only re-establishes network state and
  does not cancel or detach the old ping session.

The debug trace also confirms that the current connect debug statement prints
the password value. The reproducers used dummy strings, but real credentials
must not be used in a debug transcript until that diagnostic is removed or
redacted.

## Required Before/After Checks

Any corrective firmware should rerun these files without changing their
contract assertions. The corrected behaviour should demonstrate:

1. overlap rejection before mutation of an accepted connect operation;
2. a catchable or callback-delivered immediate connect failure, never only a
   console diagnostic;
3. exactly one disconnect completion;
4. no old ping callback and no invalid event-queue callback after `reset()`;
5. five-result recovery ping completion in every reset mode;
6. preservation of the existing callback-less ping overlap behaviour.
