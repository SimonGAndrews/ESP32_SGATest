# ESP32 Wi-Fi Directional Ping Asymmetry

Date: 2026-07-20

Issue ID: WIFI-003

Status: open; repeatable direction identified; failing endpoint not yet
isolated

## Conclusion

An ESP32-C3 IDF4 station receives no `Wifi.ping()` reply from a classic legacy
ESP32 AP, even though bidirectional UDP works during the same association. The
opposite role direction—classic station pinging the C3 AP—passes.

This is a real directional firmware anomaly, not general Wi-Fi link failure.
The current two-board evidence cannot determine whether the failure belongs to
the C3 ping sender or the classic AP echo-response path.

## Reproduction Summary

| Target AP | Station calling `Wifi.ping()` | Ping result | Application result |
|---|---|---|---|
| C3 IDF4 | classic legacy | reply received | UDP passed |
| classic legacy | C3 IDF4 | five timeouts, zero bytes | UDP passed |

The C3-to-classic direction repeated with:

- the AP's reset-default `192.168.4.1/24` subnet
- a custom AP `192.168.47.1/24` subnet
- the normal DHCP station role
- the static-IP investigation after `setIP()` left the DHCP lease unchanged

This repetition makes subnet selection and static-address success unlikely to
be the primary cause.

## Counter-Evidence Against General Connectivity Failure

During the failing direction:

- scan succeeded
- WPA2 association succeeded
- DHCP succeeded
- gateway checks succeeded
- the C3 sent a run-bound UDP challenge
- the classic AP received the exact challenge
- the classic AP sent the matching acknowledgement
- the C3 received the acknowledgement
- AP join/leave and station lifecycle events were observed

In the initial reversed-role test, the classic AP also successfully initiated
ping toward the C3 station. That proves ICMP was not absent from the
association, but does not prove that the classic AP correctly responds when it
is itself the echo target.

## Primary Evidence

- [`../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-reversed-roles.md`](../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-reversed-roles.md)
- [`../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-target-ap-custom-ip.md`](../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-target-ap-custom-ip.md)
- [`../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-station-static-ip.md`](../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-station-static-ip.md)

## Isolation Plan

A third independent Wi-Fi endpoint is needed. A host Wi-Fi adapter capable of
station and AP operation is sufficient; internet access is not required.

Use two independent controls:

1. independent AP: associate the C3 and classic boards separately, then ping
   the adapter's AP address from each board
2. independent station: host an AP on each Espruino board in turn, associate
   the host adapter and ping the Espruino AP address

Interpretation:

| Result | Stronger suspicion |
|---|---|
| C3 cannot ping independent AP; classic station can | C3 `Wifi.ping()` sender path |
| independent station cannot ping classic AP; can ping C3 AP | classic AP echo-response path |
| both controls pass | interaction specific to the two firmware endpoints |
| either control fails in more than one direction | broaden to common ping/API or test-environment investigation |

Capture packet traces on the host where possible. The decisive distinction is
whether the echo request leaves the C3 and whether the classic AP emits an echo
reply.

## Test-Strategy Consequence

Keep UDP challenge/acknowledgement as the primary reachability proof. Continue
to exercise `Wifi.ping()` as its own API assertion and report its failure; do
not remove or weaken that assertion merely because application traffic works.
