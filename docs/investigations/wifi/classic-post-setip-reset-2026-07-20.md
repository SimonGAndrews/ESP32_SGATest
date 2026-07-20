# Classic ESP32 Post-`setIP()` Reset Observations

Date: 2026-07-20

Issue ID: WIFI-004

Status: open; reset observations preserved; minimal trigger not isolated

## Conclusion

Two classic legacy confirmation runs reset after `Wifi.setIP()` had returned
`null` without changing the DHCP address. The first progressed through ping
and UDP before aborting; the second encountered a task-watchdog reset as the
test proceeded to ping.

These resets are material firmware evidence, but the differing reset points
and a small runner revision between runs do not justify attributing them to
`setIP()` alone. WIFI-001 and WIFI-002 are confirmed independently of this
follow-up.

## Firmware And Bench Context

- board: classic `ESP32`
- version: `2v29.97`
- commit: `d3d33f4aa`
- board line: legacy `boards/ESP32.py`
- harness: `ESP32_V1`, `STANDALONE`
- power: fully connected USB cable; no external target power
- peer: C3 IDF4 target-hosted AP at `192.168.4.1`
- requested static station address: `192.168.4.77`
- actual station address before reset: DHCP `192.168.4.2`

## Observed Runs

### Run `20260720T183133Z`

Stable evidence before reset:

- DHCP association passed
- `setIP()` callback returned `null`
- immediate `getIP()` remained `192.168.4.2`
- ping to the C3 AP passed
- UDP challenge and acknowledgement passed
- C3 AP observed the challenge source as `192.168.4.2`

The classic console then reported an abort after the UDP callback while the
first focused-script revision closed its socket. During the subsequent boot
sequence the console also reported a brownout event before booting again.

Do not infer from that sequence that USB power caused the original abort, or
that `setIP()` alone caused the later brownout report.

### Run `20260720T183319Z`

The focused role was revised so it no longer closed the UDP socket in-role.
Stable evidence before reset:

- DHCP association passed
- `setIP()` callback returned `null`
- immediate `getIP()` remained `192.168.4.2`

As the script proceeded to its ping phase, the console reported:

```text
rst:0x8 (TG1WDT_SYS_RESET)
```

No UDP challenge was sent in this run.

## What Is And Is Not Established

Established:

- the classic build did not apply the static address in either run
- both callbacks returned false success
- both runs later reset before producing a normal `DONE` marker
- the host runner retained bounded control and restored an inactive Wi-Fi
  state

Not established:

- a minimal `setIP()` call alone causes a reset
- ping is the sole trigger
- UDP socket closure is the sole trigger
- the boot-time brownout message explains the earlier abort
- the C3 peer contributes to the reset

## Required Narrowing

Use a minimal direct sequence on the classic build, one case per clean reboot:

1. connect by DHCP, call `setIP()`, record callback and `getIP()`, then wait
2. repeat, then call only `getStatus()` / `getIP()` periodically
3. repeat, then perform ping only
4. repeat, then perform a single UDP send without closing a socket
5. repeat, then close the UDP socket after acknowledgement
6. run matching cases without calling `setIP()` as controls

Capture raw reset cause and backtrace for every case. Only after a stable
minimal trigger exists should source attribution or a candidate fix be folded
into WIFI-001/WIFI-002 work.

## Runner Constraint Discovered Separately

An earlier attempt enlarged the existing general-purpose station role. The
classic interpreter reported `OUT OF MEMORY` during upload, before any Wi-Fi
association or `setIP()` call. A focused 5.7 KiB role was then used
successfully.

That out-of-memory result is a test-runner size constraint, not part of
WIFI-004.

## Primary Evidence And Test Asset

- [`../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-station-static-ip.md`](../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-station-static-ip.md)
- [`../../../tests/WIFI_BLE/wifi/wifi_station_static_ip.js`](../../../tests/WIFI_BLE/wifi/wifi_station_static_ip.js)
- [`../../../tools/repl/run_wifi_target_ap_test.py`](../../../tools/repl/run_wifi_target_ap_test.py)
