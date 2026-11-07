# Classic ESP32 IDF3 Wi-Fi API Regression

Date: 2026-11-07

## Purpose

This record expands the legacy-backend check for the stacked ESP32 Wi-Fi
hardening candidate into a broad physical regression of the classic
`BOARD=ESP32` Wi-Fi API. The connection and disconnection hardening is guarded
to IDF5; this run checks that the candidate source still builds and operates
with the long-established IDF3 backend.

This is regression evidence, not a claim that every historical IDF3 behavior
matches the current shared API documentation. Pre-existing contract
differences are recorded separately below.

## Firmware And Bench Identity

| Position | Board | Version | Embedded revision | Role |
|---|---|---|---|---|
| classic ESP32 | `ESP32` | `2v29.504` | `14cd9932f` | IDF3 target under test |
| XIAO ESP32-C3 | `ESP32C3_IDF5` | `2v29.504` | `14cd9932f` | controlled AP/station peer |
| ESP32-S3 | `ESP32S3_IDF5` | `2v29.504` | `14cd9932f` | identity-checked, not used as a peer |

The classic image was built clean from the candidate branch with:

```text
source scripts/provision.sh ESP32
BOARD=ESP32 RELEASE=1 make clean
BOARD=ESP32 RELEASE=1 make
```

The application used 1,526,608 of 1,572,864 bytes. The final bench identity
verification passed for all three physical positions. The retained bench
configuration is
`tests/WIFI_BLE/esp32_classic_idf3_wifi_api_candidate_bench_config.json`.

## Runtime Results

### Station lifecycle and failure recovery

The local `SHED` regression passed 15/15 checks:

- five successful station/DHCP connections, each with one connection callback;
- deliberate disconnection with the established two-callback IDF3 behavior;
- unavailable SSID reporting `NO_AP_FOUND` and no usable IP;
- successful recovery after the unavailable network;
- three repeated connection/disconnection cycles; and
- `associated`, `connected` and `disconnected` event delivery.

The retained totals were:

```text
valid connection callbacks:       5
deliberate disconnect callbacks: 11
unavailable-network callbacks:    1
associated events:                5
connected events:                 5
disconnected events:              6
```

A separate incorrect-password run completed its failure callback once,
remained without an IP address, then recovered through one successful
connection callback. Exactly one `connected` event was observed for the
recovery connection.

Cancellation of an in-progress connection left the target disconnected. Five
subsequent connection/UDP/disconnection cycles passed 11/11 checks.

### Scan, reconnection and controlled AP loss

Against the C3 controlled AP, the station-transition role passed 15/15 checks:

- connection from an idle station;
- scan while connected, preserving the address and UDP link;
- explicit reconnect while already connected;
- deliberate disconnect;
- scan while disconnected without an unsolicited connection; and
- connection and UDP exchange after the disconnected scan.

The standard positive peer exchange passed 12/12 target checks. It covered
scan result shape, WPA2 authentication, `getStatus()`, `getDetails()`,
`getIP()`, gateway reporting, ICMP ping, UDP, BLE-advertising continuity and
the three station lifecycle events. The controlled peer independently
confirmed station join, application traffic, station leave and cleanup.

The controlled outage role stopped the peer AP for eight seconds. The classic
target observed the loss, then explicitly reconnected after restoration and
completed UDP before and after the outage. All 6/6 target checks and the peer
observations passed.

### Access-point and mode transitions

The classic AP-to-AP+STA-to-STA transition passed 7/7 target checks. It
verified:

- WPA2 AP startup and `getAPIP()`;
- simultaneous AP+station mode;
- station DHCP while the local AP remained active;
- `stopAP()` preserving the station association and address; and
- UDP after returning to station-only mode.

With the classic board as the target-hosted WPA2 AP, the authentication-only
run passed 6/6 AP checks and 9/9 station checks. The AP emitted `sta_joined`
and `sta_left`, returned the expected `getAPDetails()` data, served DHCP and
completed UDP.

The custom-subnet run then applied `192.168.47.1/24` with `setAPIP()`. Its
callback returned `null`, `getAPIP()` reported the requested address, the C3
received `192.168.47.2`, and scan, ping and UDP passed. The classic AP role
passed 7/7 checks and the station role passed 12/12.

### Static station address

With the classic board as the station, `setIP()` changed the DHCP address from
`192.168.4.2` to `192.168.4.77`. Its callback returned `null`; `getIP()`
reported the requested address; ping and UDP passed; and the AP independently
observed the UDP source as `192.168.4.77`. The station passed 10/10 checks and
the peer AP passed 6/6.

The final cleanup needed the runner's reset fallback after the station role
had already emitted `DONE=PASS`. Both interfaces were subsequently verified
inactive.

### Saved configuration

The persistence role connected to a generated controlled AP, called
`Wifi.save()`, performed a hardware reboot, and allowed boot-time
`Wifi.restore()` to re-establish the station connection. The target recovered
`192.168.4.2` and completed a UDP exchange. The peer independently observed a
join before and after reboot and received the restored-runtime UDP challenge.

Cleanup called `Wifi.save("clear")`; the final target status and IP were
inactive. No saved test credentials remain.

The first two host verdicts were false failures caused by a retained harness
schema mismatch: the peer emitted `eventNames` and `receivedData`, while the
runner expected `events` and `received`. The target restored and exchanged UDP
in both runs. The parser was corrected compatibly and the complete retained
rerun passed.

### Ping

Two strictly sequential loopback sessions completed. Each produced the
legacy IDF3 shape of five per-request callbacks and a sixth duplicated
cumulative terminal callback, for 12 callbacks in total. The second session
was started only after the first terminal callback.

The controlled-peer station run also completed a real over-air ICMP request
and reported a valid response before its UDP exchange.

### Accessors and ancillary services

All 20 ESP32 Wi-Fi methods exposed by the shared wrapper were present. The
accessor role passed 30 checks covering:

- synchronous `getStatus()`, `getDetails()`, `getIP()` and `getHostname()`;
- one callback each from `getDetails()` and `getIP()`;
- `setSNTP()` request acceptance; and
- API presence for connection, AP, persistence, addressing, DNS, hostname,
  configuration and ping methods.

`getHostByName("127.0.0.1")` completed one callback with `127.0.0.1`.
Connected `setHostname()` returned, `getHostname()` returned the requested
`espruino-idf3-regression` value and its callback completed once. Debug output
reported `mDNS service_add failed: 258` during both initial and replacement
mDNS setup, but it did not prevent the hostname API result.

`setConfig({phy:"11n", powersave:"ps-poll"})` completed and `getStatus()`
reported the established IDF3 `modem` power-save state.

## Retained Legacy Limitations

The following observations are not regressions introduced by the candidate:
the exact candidate diff does not modify these IDF3 code paths.

1. `getStatus(callback)` and `getHostname(callback)` returned their synchronous
   values but did not invoke the optional callbacks documented by the shared
   API. Both callback counts remained zero.
2. `setConfig({powersave:"none"})` caused ESP-IDF 3 to abort with:

   ```text
   wifi:Error! Should enable WiFi modem sleep when both WiFi and Bluetooth are enabled!!!!!!
   abort() was called ...
   ```

   Calling `NRF.sleep()` before starting Wi-Fi did not avoid the abort because
   it did not disable the underlying Bluetooth controller. The supported
   `ps-poll` setting was therefore restored and qualified separately.
3. IDF3 deliberately retains the historical duplicate callback from a normal
   connected `Wifi.disconnect(callback)` call. The IDF5 exactly-once contract
   is not imposed on this backend.
4. The `auth_change`, `dhcp_timeout` and `probe_recv` events were not forced;
   their native preconditions were outside this controlled regression. The
   associated, connected, disconnected, `sta_joined` and `sta_left` events
   were physically exercised.

## API Coverage Matrix

| API | Physical evidence | Result |
|---|---|---|
| `connect()` | valid, unavailable, incorrect password, reconnect, cancellation, AP outage | pass |
| `disconnect()` | idle/connected use, cancellation, repeated cycles | pass with recorded legacy duplicate callback |
| `scan()` | connected and disconnected scans, controlled SSID/auth/channel/RSSI | pass |
| `startAP()` / `stopAP()` | WPA2 AP, AP+STA, station preservation | pass |
| `getStatus()` | station/AP/mode/power-save states | synchronous pass; optional callback absent |
| `setConfig()` | `11n` and `ps-poll`; `none` with BT enabled | supported values pass; retained abort for `none` |
| `getDetails()` | connected and failed station states | synchronous and callback pass |
| `getAPDetails()` | WPA2 target-hosted AP | pass |
| `save()` / `restore()` | save, hardware reboot, restored DHCP/UDP, clear | pass |
| `getIP()` / `getAPIP()` | DHCP, static station, default and custom AP subnet | synchronous and applicable callback pass |
| `getHostByName()` | literal IPv4 resolution | pass |
| `getHostname()` | default and changed hostname | synchronous pass; optional callback absent |
| `setHostname()` | connected station, callback and readback | pass, with mDNS diagnostic |
| `setSNTP()` | accepted request | pass for API acceptance |
| `setIP()` | static station address verified by independent peer | pass |
| `setAPIP()` | custom AP address and DHCP subnet | pass |
| `ping()` | two loopback sessions and controlled peer | pass with legacy six-callback shape |

## Evidence Identity

| Retained file | SHA-256 |
|---|---|
| classic IDF3 bench configuration | `db530e9eace7ceddf374e4b491be92fe4146ea8bbe54508e715bebad065466dc` |
| `wifi_legacy_station_regression.js` | `eb547dcf2db1b0880797fe93597a9b046a1b9eb13d8eaecc5d05e1070eaf33f1` |
| `wifi_classic_idf3_wrong_password.js` | `0c749e30dbdaedcb3c9b8fd5828b45ac8d1742b3409a2136fe179bc615fe682d` |
| `wifi_station_transition_lifecycle.js` | `c1ae9c67b33ba8709c177de7884207d7e5b40c3e807cdd9f897d4fd3948cffbd` |
| `wifi_connect_cancel_lifecycle.js` | `b55c2a9168d9aeb2c468271fc31538d2a87dd917a027bc7e22046fddc2041e29` |
| `wifi_station_recovery_lifecycle.js` | `1af316907813f80cc829dba49d2d6d8a2d3c4b0e9056911f6b873c6bb4d4321e` |
| `wifi_apsta_transition_lifecycle.js` | `4f3deb215f50d1e522aeac49bb4e936b4a8f52b020dfa42542a10d707297ab7d` |
| `wifi_station_peer_exchange.js` | `32ae835c7841599978316a4ad6473e6c4c5a35b4b3292ab474d2f7bc687f7fd7` |
| `wifi_target_ap_service.js` | `ed7afcd94f24d7a22a8d5cba12b06d5d16d10e6d76a8c6f350bd1ead9f37ea91` |
| `wifi_station_static_ip.js` | `96ee20b4cabb679d0598404929b124fa8fbfd2299c3a81387b38590ae5855043` |
| `wifi_restore_prepare.js` | `a66bcf5b55f72e7bd3a4e3bb596221af1c1c631a414c6c3ce4d856298f39a285` |
| `wifi_restore_verify.js` | `e7b3a9913a854eba0acc2fde902fe79544ba1a9da93f8b181a4c96bd6998ede9` |
| `esp32_wifi_ping_legacy_two_sessions.js` | `e256004b4ea52c7ee02a0df48d3307ec16e72fc41a4357b85bab2512c81c9e53` |
| `wifi_classic_idf3_api_accessors.js` | `552a96b236d78268c25f341e131691a7f05596f681be58ae23ed433b5220a6e0` |
| `wifi_classic_idf3_dns_probe.js` | `c918611723ae48be039b312a107502c527126ee6c5c29aa7ce559a26454d54ce` |
| `wifi_classic_idf3_hostname_probe.js` | `89b9d68bb97081d53ceed945fde749724f152a5f77824b8a22108bc426ba7fc1` |
| `wifi_classic_idf3_setconfig_supported.js` | `5c86fef1f5d3fa2f505fcb7e07a306a3b7a29386f97260602a4fc1298720be32` |
| `wifi_classic_idf3_setconfig_probe.js` | `e89f0d1a3975297d5afdf3f3fde76e1ebc5132c47045062cf19541e9f27feb97` |
| `run_wifi_restore_test.py` | `6d0a8fed1897827d6287d21212c38b8897d6e9e6698aaeac24dca8815148034f` |

## Disposition

The candidate introduces no observed functional regression in the classic
IDF3 Wi-Fi paths. All supported operational tests passed, including full
station/AP transitions, persistence, addressing and recovery. The retained
IDF3 callback differences and the Bluetooth/power-save abort are pre-existing
backend limitations and are outside the IDF5 hardening PRs.
