# Understanding ESP32 Wi-Fi Lifecycles In Espruino

Date: 2026-09-15

Validation updated: 2026-09-16

## Purpose And Main Point

Espruino provides a JavaScript `Wifi` API, while the ESP32 port translates
those calls into asynchronous ESP-IDF driver operations and events. The most
important point when reading or changing this code is that these are separate
states:

1. a Wi-Fi operating mode has been selected;
2. the ESP-IDF station or access-point interface has started;
3. a station has associated with an access point; and
4. the station has obtained an IP address and is ready for network traffic.

Selecting or starting station mode does not mean that a connection was
requested. `Wifi.scan()` needs a started station interface to listen for access
points, but it must not connect to one. Confusing those two operations caused
the `Wifi.scan()` empty-result defect investigated in September 2026.

This document explains the ESP32 implementation on upstream base `1c96229d0`
and the scan/connect candidate at `dc274713a`. It is a tutorial and
investigation aid, not a replacement for the public
[Espruino `Wifi` API reference](https://www.espruino.com/Reference#Wifi).

## The Two Software Layers

The public API declarations and documentation are in the Espruino source file:

```text
libs/network/jswrap_wifi.c
```

The ESP32 implementation is in:

```text
libs/network/esp32/jswrap_esp32_network.c
```

The implementation follows this general sequence:

```text
JavaScript Wifi call
        |
        v
ESP32 Espruino wrapper selects a mode and calls ESP-IDF
        |
        v
ESP-IDF performs the operation asynchronously
        |
        v
ESP-IDF posts Wi-Fi or IP events
        |
        v
Espruino's ESP32 event handler updates native state and queues
JavaScript callbacks or Wifi events for the interpreter
```

This means that returning from `Wifi.connect()`, `Wifi.scan()` or
`Wifi.startAP()` does not by itself prove that the requested operation has
finished. Completion is reported later through callbacks and events.

## The Four ESP32 Operating Modes

ESP-IDF exposes four operating modes. Espruino reports corresponding values
through `Wifi.getStatus().mode`, although exact strings and the amount of state
reported can vary between ports and versions.

| Native mode | Meaning | Typical Espruino operation |
|---|---|---|
| `WIFI_MODE_NULL` | Neither station nor access point is selected | Initial or fully inactive state |
| `WIFI_MODE_STA` | The ESP32 can act as a station | `Wifi.scan()` or `Wifi.connect()` |
| `WIFI_MODE_AP` | The ESP32 provides an access point | `Wifi.startAP()` |
| `WIFI_MODE_APSTA` | Access point and station roles coexist | Classic ESP32 AP followed by `Wifi.connect()` |

Mode is configuration, not proof of association or IP connectivity. A station
can be selected and started while scanning, while attempting a connection, or
while disconnected.

ESP-IDF supports simultaneous AP and station operation on ESP32-C3, but the
current Espruino wrapper deliberately replaces one role with the other during
ordinary `Wifi.connect()` and `Wifi.startAP()` transitions. This is a retained
IDF4-era Espruino workaround, not a documented ESP32-C3 capability limit. The
classic ESP32 path uses `WIFI_MODE_APSTA`. Removing the C3 workaround requires
separate lifecycle validation and is deliberately outside the local
scan/connect candidate.

## Native State Used By The ESP32 Wrapper

Here, **native state** means values stored internally by the ESP32 C code to
remember what has happened and what it should do next. They are not properties
that JavaScript applications read from the `Wifi` object. The local
scan/connect candidate adds two of these values, `g_isStaStarted` and
`g_connectAfterStaStart`; the other values already exist in the wrapper:

| State | Purpose | Added by candidate? |
|---|---|---|
| `g_isStaStarted` | Records receipt of station `START` and `STOP` events | Yes |
| `g_isStaConnected` | Records the wrapper's connected state; it is set on association and cleared after bounded retries are exhausted | No; already present |
| `g_connectAfterStaStart` | One-shot instruction saying an explicit `Wifi.connect()` request is waiting for station startup | Yes |
| `g_retryCounter` | Bounds retries following failed or lost station association | No; already present |
| `g_isAPStarted` | Records access-point `START` and `STOP` events | No; already present |
| `g_jsScanCallback` | Records that a scan is in progress and owns its completion callback | No; already present |
| `g_jsGotIpCallback` | Holds a connection callback until IP acquisition or terminal failure | No; already present |

The distinction between the first three station fields is essential:

- `g_isStaStarted` answers **can the driver accept a connect request now?**
- `g_isStaConnected` answers **is the wrapper treating the station as
  connected or still inside its retry sequence?**
- `g_connectAfterStaStart` answers **did JavaScript explicitly request a
  connection that is waiting for startup?**

The retry counter is not a suitable replacement for the one-shot request flag.
It describes retry policy, not why the station interface was started.

## Espruino Functions That Control The Lifecycle

### `require("Wifi")`

```javascript
var wifi = require("Wifi");
```

This obtains the Espruino Wi-Fi library object. The ESP32 networking subsystem
and event handlers are initialized by the port when Wi-Fi hardware support is
enabled; obtaining the object is not itself a request to associate or scan.

The ESP32-specific `ESP32.enableWifi(bool)` function controls whether Wi-Fi
hardware support is enabled persistently. Changing it updates ESP32 nonvolatile
state and reboots the board. It is a port-level enable/disable control, not a
replacement for the ordinary runtime `Wifi.connect()`, `Wifi.disconnect()`,
`Wifi.startAP()` and `Wifi.stopAP()` calls.

### `Wifi.scan(callback)`

```javascript
wifi.scan(function (accessPoints) {
  print(accessPoints);
});
```

Purpose: discover visible access points.

On the ESP32 the wrapper:

1. selects station mode, or AP+station mode if an AP is already active;
2. starts the Wi-Fi driver if necessary;
3. calls the non-blocking ESP-IDF scan function; and
4. receives a later scan-complete event, builds the JavaScript access-point
   array and queues the callback.

Scanning needs the station interface, but it does not request association.
After a station-only scan completes, the current ESP32 wrapper may stop the
idle driver while retaining the configured station mode. A later
`Wifi.connect()` must therefore work whether the driver remained started or
received a station-stop event.

Only one scan is allowed at a time. The public API says that scanning enables
station mode and recommends `Wifi.disconnect()` when the application wants it
disabled again.

The generic API documentation describes a `callback(err, accessPoints)`
signature. The current ESP32 implementation queues the access-point array as
the callback's only argument, which is why the focused ESP32 tests use the
single-argument form shown above. This port/API difference is separate from
the empty-array defect.

### `Wifi.connect(ssid, options, callback)`

```javascript
wifi.connect("network", { password:"secret" }, function (error) {
  if (error) print("Connection failed: " + error);
  else print("Network ready: " + JSON.stringify(wifi.getIP()));
});
```

Purpose: act as a station, associate with the named access point and become
ready for IP traffic.

The candidate implementation handles three starting conditions separately:

| Starting condition | Required action |
|---|---|
| Already associated | Disconnect so that the new configuration can be applied, then reconnect through the retry path |
| Station started but not associated | Call `esp_wifi_connect()` immediately |
| Station stopped | Set `g_connectAfterStaStart`, call `esp_wifi_start()`, then consume the flag when the station-start event arrives |

The successful DHCP sequence is:

```text
Wifi.connect()
  -> station starts if required
  -> explicit esp_wifi_connect()
  -> station-associated event
  -> IP-address-acquired event
  -> Wifi.connect() callback receives null
  -> Wifi "connected" event is queued
```

Association and network readiness are deliberately separate:

- `Wifi.on("associated", ...)` reports that the radio joined the AP;
- `Wifi.on("connected", ...)` reports that an IP address is available for
  traffic; and
- the `Wifi.connect()` callback normally completes at the IP-ready stage when
  DHCP is used.

Applications should provide their own timeout for connection attempts. The
public API notes that temporary conditions such as an unavailable AP can cause
retries instead of an immediate final callback.

### `Wifi.disconnect(callback)`

```javascript
wifi.disconnect(function () {
  print("Station disconnected");
});
```

Purpose: end station association and suppress further connection retries.

The candidate clears both the pending one-shot connection request and the
retry counter before asking ESP-IDF to disconnect. For a station-only idle
interface, the event handler subsequently stops the Wi-Fi driver. If AP mode
is also active, the AP must remain available; that combined transition deserves
its own regression coverage because the native mode is still AP+station.

The `Wifi.on("disconnected", ...)` event reports loss of station association.
It may be caused by an explicit disconnect, loss of the AP, authentication
failure or another ESP-IDF reason. It is not the same event as stopping the
station driver.

### `Wifi.startAP(ssid, options, callback)`

```javascript
wifi.startAP("device-network", {
  authMode:"wpa2",
  password:"password",
  channel:6
}, function (error) {
  print(error || wifi.getAPIP());
});
```

Purpose: make the ESP32 advertise an access point to which other stations can
associate.

On classic ESP32, starting an AP while station mode is present selects AP+
station mode. The callback is completed by the later AP-start event. While the
AP is active:

- `Wifi.on("sta_joined", ...)` reports another device associating;
- `Wifi.on("sta_left", ...)` reports it leaving;
- `Wifi.getAPDetails()` reports AP configuration; and
- `Wifi.getAPIP()` reports the AP-side address, normally `192.168.4.1` unless
  changed.

### `Wifi.stopAP(callback)`

```javascript
wifi.stopAP(function () {
  print("Access point stopped");
});
```

Purpose: stop the access-point role without unnecessarily stopping a station
connection.

The classic ESP32 mode transitions are:

| Before | After `Wifi.stopAP()` |
|---|---|
| AP | inactive/null mode |
| AP+station | station mode, preserving the station connection |
| station only | unchanged |

The AP+station lifecycle test confirmed that a classic ESP32 remained
associated, retained its DHCP address and exchanged UDP after its local AP was
stopped.

### `Wifi.save()` And `Wifi.restore()`

```javascript
wifi.connect("network", { password:"secret" }, function (error) {
  if (!error) wifi.save();
});

// Remove the saved Wi-Fi configuration:
wifi.save("clear");
```

Purpose: persist the current station/AP configuration so it can be reapplied
at boot. `Wifi.restore()` applies the saved configuration explicitly and is
normally invoked by ESP32 startup when saved Wi-Fi state is enabled.

The ESP32 restore path:

1. reads the saved `.wificfg` object from Espruino Storage;
2. restores the saved mode and station/AP configuration;
3. starts the Wi-Fi driver; and
4. explicitly calls `esp_wifi_connect()` when the saved mode includes a
   station.

Restore does not rely on the candidate `g_connectAfterStaStart` flag. It was
nevertheless regression-tested because changing the station-start handler
could otherwise introduce a duplicate connection or prevent automatic boot
reconnection. A real hardware-reboot test confirmed restored association,
DHCP and UDP traffic.

### Observation Functions

These functions observe different parts of the lifecycle:

| Function | What it tells the application |
|---|---|
| `Wifi.getStatus()` | Overall reported mode, station status and power-save state |
| `Wifi.getDetails()` | Station configuration and connection details |
| `Wifi.getIP()` | Station IP address, netmask, gateway and MAC address |
| `Wifi.getAPDetails()` | AP configuration and, where supported, associated stations |
| `Wifi.getAPIP()` | AP-side IP address, netmask, gateway and MAC address |

No single observation proves the complete lifecycle. In particular:

- a mode value does not prove association;
- association does not prove DHCP completed;
- an IP snapshot does not prove the peer is reachable; and
- a callback can itself contain a port defect.

The bench tests therefore combine callback results, local status/IP, events
observed by the other board and run-specific UDP traffic.

### `Wifi.setIP()` And `Wifi.setAPIP()`

These configure static addresses for the station and AP interfaces. They do
not start association themselves, but they alter address and DHCP state inside
an active lifecycle.

They are relevant because earlier tests found two shared-port problems:

- the callback result expression was inverted, so native success was reported
  as `"Failure"` and native failure as `null`; and
- the legacy/IDF4 station implementation used the AP DHCP-server stop function
  instead of stopping the station DHCP client, so a post-association static
  address was not applied.

The current IDF5 station path uses the newer ESP-NETIF DHCP-client operation,
but the callback result and complete target-family behavior must be evaluated
separately. Callback success must not be accepted without checking the actual
address and traffic source observed by the peer.

### Other Configuration And Network-Service Functions

`Wifi.setConfig()` changes settings such as Wi-Fi power saving. Functions such
as `Wifi.setHostname()`, `Wifi.getHostByName()` and `Wifi.setSNTP()` configure
or use services around an established station connection. They are relevant to
complete application testing, but they do not replace the station/AP lifecycle
operations described above.

### `Wifi.ping(host, callback)`

`Wifi.ping()` sends ICMP echo requests after network connectivity exists. It
does not control station/AP mode, but it has its own asynchronous native
session lifecycle and therefore depends on a working connection and sufficient
native heap.

The IDF5 merge guarded out the removed legacy `ping_init()` call without
initially providing the modern ESP-IDF ping-session implementation. That is a
separate defect from the scan/connect sequencing issue. The later candidate
uses the socket-based ping API and was evaluated alongside the proposed native
heap increase.

UDP or another application protocol should remain an independent reachability
check. A successful ping does not prove the application service, while a ping
failure accompanied by successful bidirectional UDP points toward an ICMP- or
ping-specific problem.

## Complete Lifecycle Summary

| Espruino request | Normal native lifecycle | Expected completion evidence |
|---|---|---|
| Scan while inactive | select STA; start; scan; scan-done; optionally stop idle driver | non-empty callback when known AP is visible; no peer association |
| Connect while stopped | select/configure STA; mark pending; start; connect from STA_START | associated event, IP-ready callback/event, `getIP()`, peer traffic |
| Connect after scan | station may be started or stopped; connect immediately or start then connect | same evidence as direct connection |
| Connect while AP active | classic: AP to APSTA, then station connect; C3 wrapper may replace AP mode | AP state plus station association/IP as supported by target |
| Connect while already associated | disconnect and reconnect with configured credentials | renewed association/IP and traffic |
| Explicit disconnect | cancel pending/retries; disassociate; stop station-only idle driver | disconnected state and peer departure |
| Stop AP while also a station | APSTA to STA | station IP and traffic preserved; AP no longer advertised |
| AP disappears | bounded native retries; eventually disconnected/idle | disconnected event; no stale traffic claim |
| AP restored after retries | application issues a new `Wifi.connect()` | new association/IP and peer-confirmed traffic |
| Saved station boot | restore configuration; start; explicit native connect | post-reboot association, IP and traffic |

## The Scan/Connect Defect And Its Correction

### Original behavior

The shared station-start event handler used to call `esp_wifi_connect()` every
time it received a station-start event:

```text
STA_START -> esp_wifi_connect()
```

That assumption was incorrect because `Wifi.scan()` also starts the station.
The resulting sequence was:

```text
Wifi.scan()
  -> station starts
  -> STA_START unconditionally starts a connection
  -> scan and connection overlap
  -> ESP-IDF aborts/conflicts with the scan
  -> Espruino reports an empty access-point array
```

The unconditional connection code predates the IDF5 merge. Historical legacy
builds did not show the same bench failure, so the IDF5 driver/timing behavior
exposed a latent sequencing error rather than introducing the unconditional
call itself.

### Why the first guard was insufficient

A first candidate guarded the station-start connection with state set by
`Wifi.connect()`. That prevented scanning from connecting. It still failed
when `Wifi.connect()` was called while the station had already been started by
AP+station operation: calling `esp_wifi_start()` again did not produce another
station-start event, so the pending request was never consumed.

### Final candidate behavior

The candidate now records station start/stop state and handles both cases:

```c
if (g_isStaConnected) {
  esp_wifi_disconnect();       // reconnect through the existing retry path
} else if (g_isStaStarted) {
  esp_wifi_connect();          // driver is ready; do not wait for STA_START
} else {
  g_connectAfterStaStart = true;
  esp_wifi_start();            // STA_START will consume the one-shot request
}
```

The station-start handler becomes conditional:

```c
g_isStaStarted = true;
if (g_connectAfterStaStart) {
  g_connectAfterStaStart = false;
  esp_wifi_connect();
}
```

The station-stop event clears `g_isStaStarted`. An explicit disconnect or
failed driver start clears the one-shot request so it cannot affect a later
scan or connection.

## Lifecycles Covered By The Candidate Validation

The minimum classic `ESP32_IDF5` validation covered:

| Lifecycle | Result |
|---|---|
| Direct connection from idle | Association, DHCP and UDP passed |
| Scan while connected | Known AP found; existing IP and UDP preserved |
| Reconnect while connected | Callback, renewed association and UDP passed |
| Explicit disconnect | IP removed and peer departure observed |
| Scan while disconnected | Known AP found without an unintended connection |
| Connect after scan | Association, DHCP and UDP passed |
| Start AP then connect as station | Classic AP+station mode and peer association passed |
| Stop AP while connected as station | Station IP and UDP preserved |
| Cancel then repeat | Final disconnected state followed by five successful connect/UDP/disconnect cycles |
| Save and hardware reboot | Saved station association, DHCP and UDP restored |
| Controlled AP loss and restoration | Loss observed; explicit reconnect and UDP passed after restoration |

These results establish the intended behavior on the tested classic IDF5
candidate. The final rebased correction then received the following
cross-family coverage:

| Target | Validation scope | Result |
|---|---|---|
| Classic `ESP32_IDF5` | Controlled clean-master versus rebased-candidate scan comparison, plus the complete lifecycle table above | Clean master returned 0 APs twice; the candidate returned 15 and 13 APs, found the controlled AP once in each run and did not connect during either scan |
| Classic legacy `ESP32` | Direct connection, connected scan, reconnect, disconnect and idle shutdown, disconnected scan, and connection after scan | 15 checks passed with four independently observed UDP exchanges |
| `ESP32C3_IDF4` | The same station-transition lifecycle | 15 checks passed with four independently observed UDP exchanges |
| `ESP32S3_IDF5` | Focused connect, completed disconnect/idle shutdown, then scan from the stopped station | Exact base returned 0 APs; the candidate returned 10 APs, found the expected AP once and did not connect during the scan |
| Classic/C3/S3 IDF4 and IDF5 plus classic legacy | Clean release compilation | All seven ESP32 board configurations built successfully |

The valid S3 comparison used the board's selected external antenna connection
with its antenna fitted. The broader S3 lifecycle is not counted as a complete
pass: reconnecting while already associated stalled on both exact clean base
and candidate firmware. That makes it a separate, pre-existing S3 lifecycle
observation rather than evidence against this correction. One candidate run
did complete the entire S3 lifecycle, but the inconsistent base-and-candidate
behavior requires its own investigation.

Runtime coverage therefore exercises the shared correction on classic legacy,
classic IDF5, C3 IDF4 and the focused S3 IDF5 failure path. Classic IDF4, C3
IDF5 and S3 IDF4 remain compile-qualified for this change. The deliberately
retained C3 AP/station role-replacement workaround also remains outside this
correction and should be evaluated separately across C3 IDF4 and IDF5.

## Other Identified Wi-Fi Issues And Their Lifecycle Position

| Issue | Lifecycle involved | Relationship to this correction |
|---|---|---|
| Empty IDF5 scan result | Station startup and scan | Directly addressed by separating start from connect request |
| Connect after scan or from an active AP | Already-started station | Directly addressed by `g_isStaStarted` and immediate connect |
| `setIP()` does not apply the requested address on tested legacy/IDF4 builds | DHCP-to-static address transition | Separate worker/API defect |
| `setIP()` / `setAPIP()` callback result inversion | Address-configuration completion | Separate callback defect |
| Directional C3-to-classic `Wifi.ping()` failure | ICMP after IP-ready state | Separate open endpoint-attribution issue; UDP still works |
| Missing IDF5 ping mechanism | ICMP session creation | Separate modernization defect and native-heap consideration |
| Classic resets after some post-`setIP()` sequences | Address change followed by ping/UDP | Open; minimal trigger not yet isolated |
| S3 reconnect can stall after a connected scan | Reconnect while already associated | Separate pre-existing S3 behavior; reproduced on exact clean base and candidate |
| C3 ordinary AP/station transitions replace the other role | AP and station mode transition | Retained target-specific workaround; deferred for separate IDF4/IDF5 validation |
| Scan-start/status errors are not fully surfaced | Native scan completion | Separate robustness question; immediate scan-start return and completion status need review |

The detailed evidence is retained in:

- [`esp32-idf5-scan-empty-2026-09-14.md`](esp32-idf5-scan-empty-2026-09-14.md)
- [`ip-configuration-api-2026-07-20.md`](ip-configuration-api-2026-07-20.md)
- [`directional-ping-asymmetry-2026-07-20.md`](directional-ping-asymmetry-2026-07-20.md)
- [`classic-post-setip-reset-2026-07-20.md`](classic-post-setip-reset-2026-07-20.md)

## Practical Rules For Espruino Applications And Tests

1. Treat `Wifi.connect()` as asynchronous and continue network work only after
   its successful callback or the `connected` event.
2. Do not treat station mode or a completed scan as proof of association.
3. Use `associated` for radio-link evidence and `connected`/`getIP()` for
   IP-readiness evidence.
4. Use peer-observed application traffic as the final end-to-end check.
5. After a connection attempt has exhausted its retries, issue a new
   `Wifi.connect()` when the AP becomes available again.
6. Use `Wifi.disconnect()` to cancel pending station activity and clear retry
   intent; use `Wifi.stopAP()` separately to end the AP role.
7. Verify both callback result and actual interface state when testing
   `setIP()` or `setAPIP()`.
8. Keep ping results separate from general reachability results.
9. Test AP+station behavior per target; do not infer classic ESP32 behavior for
   the ESP32-C3.
10. When changing the native event handler, test every operation capable of
    starting or stopping the station, not just the originally failing API.

## References

- [Espruino `Wifi` API reference](https://www.espruino.com/Reference#Wifi)
- [ESP-IDF 5.5.2 Wi-Fi driver API](https://docs.espressif.com/projects/esp-idf/en/v5.5.2/esp32/api-reference/network/esp_wifi.html)
- [ESP-IDF scan example](https://github.com/espressif/esp-idf/tree/v5.5.2/examples/wifi/scan)
- [MicroPython ESP32 WLAN implementation](https://github.com/micropython/micropython/blob/master/ports/esp32/network_wlan.c)
