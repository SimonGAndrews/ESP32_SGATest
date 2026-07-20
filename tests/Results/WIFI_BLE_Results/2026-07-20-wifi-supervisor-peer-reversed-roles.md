# Wi-Fi Supervisor Peer Reversed Roles

Date: 20 July 2026

## Conclusion

The classic ESP32 successfully performed the active Supervisor Peer role for
an ESP32-C3 station target. WPA2 AP creation, scan, association, DHCP,
bidirectional UDP challenge/acknowledgement, independent join/leave events and
cleanup all worked.

The complete API test nevertheless reports `RUNNER_RESULT=FAIL` because the
C3 target's `Wifi.ping("192.168.4.1")` received no replies from the classic
ESP32 AP. A deliberate reverse ping from the classic peer to the C3 station
succeeded five times. This is a repeatable directional ICMP asymmetry in this
firmware pairing and must not be hidden by weakening the ping assertion.

## Bench And Firmware Preconditions

- both V1 harnesses in `STANDALONE` mode
- both targets powered only through fully connected USB cables
- no external target power
- no `SUP_EVENT_OUT` / `SUP_EVENT_IN` connection
- no other REPL, Web IDE or serial monitor attached
- physical USB positions unchanged
- configuration: `tests/WIFI_BLE/standalone_bench_config.json`

| Role | Position | Board | Version | Git commit |
|---|---|---|---|---|
| Supervisor Peer | `esp32_v1` | `ESP32` | `2v29.97` | `d3d33f4aa` |
| Target | `esp32_c3_v1` | `ESP32C3_IDF4` | `2v29.107` | `0af6e1568` |

The runner selected logical roles with `--direction esp32-peer`; it did not
exchange the configured physical target identities or USB paths.

## Command And Confirmation Run

```bash
python3 tools/repl/run_wifi_peer_test.py \
  --scenario positive \
  --direction esp32-peer
```

```text
RUNNER run_id=20260720T160109Z
RUNNER_RESULT=FAIL
```

The failure is the expected evidence result for the observed ping issue, not a
runner, identity, association, UDP or cleanup failure.

## Successful C3 Target Coverage

| Check or metric | Observation | Result |
|---|---|---|
| controlled SSID scan | one matching WPA2 AP | pass |
| peer RSSI | `-33 dBm` | recorded |
| peer channel | `6` | recorded |
| association | classic AP MAC `08:b6:1f:70:14:e9` | pass |
| target address | `192.168.4.2/24` | pass |
| gateway | `192.168.4.1` | pass |
| UDP acknowledgement | matching run-bound payload from `192.168.4.1:41234` | pass |
| target events | `associated`, `connected`, `disconnected` | pass |
| disconnect | reason 8, `ASSOC_LEAVE` | pass |

The C3 target completed 11 checks successfully. UDP proved application traffic
in both directions: the C3 sent the challenge to the classic peer, which
received it and returned the matching acknowledgement.

## Failed C3-To-Peer Ping

The C3 `Wifi.ping()` callback reported five attempts plus a final summary. All
contained zero received bytes:

```text
totalCount=5
totalBytes=0
timeoutCount=5
bytes=0
respTime=999
error=0
```

The test correctly uses returned bytes and timeout count rather than the
`error` field alone: `error=0` did not indicate that an echo reply had been
received. The bounded ping assertion therefore reported:

```text
FAIL wifi_ping_peer timeout
```

## Successful Peer-To-C3 Ping

After receiving the UDP challenge, the classic ESP32 Supervisor Peer pinged
the still-associated C3 station. All five requests received replies:

```text
totalCount=5
totalBytes=160
totalTime=417
respTime=112
timeoutCount=0
bytes=32
error=0
PASS wifi_peer_pinged_target
```

This proves that ICMP worked in the reverse direction during the same Wi-Fi
association. Together with the bidirectional UDP exchange, it narrows the
failure to directional ping behaviour between the C3 station and classic AP;
it does not indicate general radio, WPA2, addressing or packet-transfer
failure.

The present two-board result cannot by itself distinguish between a classic
ESP32 AP echo-response limitation and a C3 station-side ping issue for the AP
address. That distinction needs a focused firmware investigation or a third
network endpoint.

## Independent Supervisor Peer Evidence

The classic ESP32 peer reported and the host runner asserted:

```text
PASS wifi_peer_received_challenge
PASS wifi_peer_observed_station_join
PASS wifi_peer_observed_station_leave
PASS wifi_peer_pinged_target
PASS wifi_peer_cleanup
```

This proves that the active peer role is portable between the two current V1
boards even though the full target API matrix is not symmetric.

## Espruino API Coverage

| API or event | Reversed-role result |
|---|---|
| `Wifi.startAP()` | Classic ESP32 created the controlled WPA2 AP. |
| `Wifi.getAPDetails()` / `getAPIP()` | Classic peer reported correct AP identity and `192.168.4.1`. |
| `Wifi.scan()` | C3 found the peer with expected SSID, WPA2 and channel. |
| `Wifi.connect()` | C3 associated and completed DHCP. |
| `Wifi.getStatus()` / `getDetails()` / `getIP()` | C3 connection and addressing checks passed. |
| `Wifi.ping()` C3 to classic AP | failed, five timeouts and zero bytes. |
| `Wifi.ping()` classic AP to C3 | passed, five replies and 160 bytes. |
| `Wifi.disconnect()` / `stopAP()` | both roles cleaned up successfully. |
| station and AP events | target association lifecycle and peer join/leave passed. |

## Cleanup And Design Significance

The classic peer finished in mode `NULL` with IP `0.0.0.0`; the C3 target
finished in inactive station mode with status `ASSOC_LEAVE` and IP `0.0.0.0`.
Neither required cleanup recovery and neither retained an AP.

For the V2 test approach, this result supports a run-bound application-layer
challenge/response as the primary peer reachability proof. ICMP remains useful
diagnostic coverage, but it cannot currently be assumed symmetric across these
two firmware/role combinations. The ping asymmetry should be tracked as a
firmware investigation rather than treated as a Supervisor Peer hardware
failure.
