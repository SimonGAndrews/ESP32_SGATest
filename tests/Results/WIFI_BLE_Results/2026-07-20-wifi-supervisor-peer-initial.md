# Initial Wi-Fi Supervisor Peer Proof

Date: 20 July 2026

## Conclusion

The initial two-board test passed and proves the principle of using a second
harness as an active Wi-Fi Supervisor Peer. The C3 created a controlled WPA2
network and UDP service; the classic ESP32 scanned, associated, obtained an IP
address, pinged the peer, exchanged a run-bound challenge and disconnected.
The peer independently recorded the target joining, sending the exact
challenge and leaving.

This is stronger evidence than target-only API reporting: the runner required
consistent observations from the host, target and peer before reporting pass.

## Bench And Firmware Preconditions

- both V1 harnesses in `STANDALONE` mode
- both targets powered only through their fully connected USB cables
- no external target power
- no `SUP_EVENT_OUT` / `SUP_EVENT_IN` connection
- no other REPL, Web IDE or serial monitor attached
- bench configuration: `tests/WIFI_BLE/standalone_bench_config.json`

| Role | Position | Board | Version | Git commit | Control path suffix |
|---|---|---|---|---|---|
| Supervisor Peer | `esp32_c3_v1` | `ESP32C3_IDF4` | `2v29.107` | `0af6e1568` | `usb-0:10.4:1.0-port0` |
| Target | `esp32_v1` | `ESP32` | `2v29.97` | `d3d33f4aa` | `usb-0:10.3:1.0-port0` |

The runner used `ESP32.reboot()` to establish clean volatile Wi-Fi-driver
state before uploading either role. It did not flash either board, save Wi-Fi
configuration or require physical bench interaction.

## Command And Result

```bash
python3 tools/repl/run_wifi_peer_test.py
```

Confirmation run:

```text
RUNNER run_id=20260720T152927Z
RUNNER_RESULT=PASS
```

## Target Evidence

| Check or metric | Observation | Result |
|---|---|---|
| controlled SSID scan | one matching WPA2 AP | pass |
| peer RSSI | `-27 dBm` | recorded |
| peer channel | `6` | recorded |
| association event | C3 AP MAC `dc:da:0c:d1:c1:91` | pass |
| connection state | `connected`, WPA2 | pass |
| target address | `192.168.4.2/24` | pass |
| gateway | `192.168.4.1` | pass |
| ping | `83 ms`, structured result with `error: 0` | pass |
| UDP reply | `ACK\|20260720T152927Z\|1\|ESPRUINO_WIFI_PEER` | pass |
| reply source | `192.168.4.1:41234` | pass |
| disconnect request | issued | pass |
| associated, connected and disconnected events | all observed | pass |

The target reported 12 passed checks, zero failed checks and `DONE=PASS`.
Generated WPA2 credentials were unique to the run and are redacted from the
reported evidence.

## Independent Supervisor Peer Evidence

The C3 peer reported:

```text
PEER_EVENT sta_joined mac=08:b6:1f:70:14:e8
PEER_RX 20260720T152927Z|1|ESPRUINO_WIFI_PEER from 192.168.4.2
PEER_EVENT sta_left mac=08:b6:1f:70:14:e8
```

The host runner separately required all three observations, the matching
run-bound payload and successful peer cleanup. These checks all passed.

## Espruino Wi-Fi API Coverage

The following `Wifi` APIs received direct functional coverage in this test:

| Espruino API | Board role | Coverage |
|---|---|---|
| `Wifi.scan()` | ESP32 target | Found exactly one matching peer SSID and checked WPA2, RSSI and channel. |
| `Wifi.connect()` | ESP32 target | Associated with the generated WPA2 network and completed DHCP configuration. |
| `Wifi.getStatus()` | both | Checked connected target state and final peer/target state. |
| `Wifi.getDetails()` | ESP32 target | Checked SSID, authentication mode and connection status; password was redacted from evidence. |
| `Wifi.getIP()` | both | Checked target address, netmask and gateway, then verified address removal during cleanup. |
| `Wifi.ping()` | ESP32 target | Pinged the C3 peer and validated the structured successful result. |
| `Wifi.startAP()` | C3 peer | Created the unique WPA2 Supervisor Peer network on channel 6. |
| `Wifi.getAPDetails()` | C3 peer | Checked the running AP identity and WPA2 configuration. |
| `Wifi.getAPIP()` | C3 peer | Obtained and reported the peer address and gateway (`192.168.4.1`). |
| `Wifi.disconnect()` | both | Requested station disconnection and contributed to final runtime cleanup. |
| `Wifi.stopAP()` | both | Stopped the controlled AP and any boot-time AP during isolation and cleanup. |

The test also covered Wi-Fi event delivery through `Wifi.on()`:

- target events: `associated`, `connected`, `disconnected`
- peer events: `sta_joined`, `sta_left`

`Wifi.removeAllListeners()` was used to isolate each run. UDP traffic proof used
Espruino's `dgram` socket API (`createSocket`, `bind`, `send`, `message` and
`close`), rather than an additional `Wifi` function.

The following Wi-Fi API areas were not tested by this initial case: AP-client
operation with the target as AP, static IP setters, hostname and DNS lookup,
SNTP, general Wi-Fi configuration, saved configuration, restore behaviour and
enterprise authentication. These remain available for later cases rather
than being implied by this pass.

## Cleanup Evidence

| Board | Final Wi-Fi mode | Final IP | Active AP |
|---|---|---|---|
| C3 peer | `NULL` | `0.0.0.0` | no |
| classic ESP32 target | `STA`, station reason `ASSOC_LEAVE` | `0.0.0.0` | no |

The legacy ESP32 retains station mode in its reported mode after disconnect,
but the address and gateway were cleared and no AP remained. The runner
therefore treats inactive station mode with `0.0.0.0` as clean rather than
requiring a non-existent `off` status string.

## API And Runner Findings

Development runs exposed three compatibility requirements that are now
encoded in the runner:

1. On the legacy ESP32 build, `Wifi.scan` supplies the access-point array as
   the callback's first and only argument. The target role also tolerates an
   error-first two-argument form for other firmware lines.
2. `Wifi.ping` supplies a result object containing `error`, `timeoutCount` and
   `respTime`, rather than only a numeric response time.
3. A development run showed that `Wifi.disconnect()` can acknowledge the
   request while local `getStatus()` and `getIP()` retain a stale connected
   snapshot. The C3 still independently observed `sta_left`. An Espruino
   `reset()` did not clear this driver state, while `ESP32.reboot()` did.

The third finding directly supports the Supervisor Peer role: peer evidence
can distinguish an actual over-air departure from stale or missing target-side
reporting. It also justifies a true chip reboot as the runner's initial
isolation step.

## Scope Boundary And Next Step

This result proves the software-controlled Supervisor Peer principle using
the C3 as AP/peer and the classic ESP32 as station target. It does not yet
prove reverse roles, negative credentials and unavailable-SSID cases, target
AP mode, saved-configuration behaviour, external event handshaking or V2
controlled power.

No physical event wiring is required for the next Wi-Fi API cases. When event
handshake timing is added later, spare MCP23008 GPIOs can simulate
`SUP_EVENT_OUT` and `SUP_EVENT_IN` without reopening the V1 hardware design.
