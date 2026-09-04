# Wi-Fi And BLE V1 Bench Development

This directory holds V1 bench tests, notes and configurations used to prove
the proposed V2 Wi-Fi and BLE test approach.

## Current Bench Boundary

Both harnesses operate in `STANDALONE` mode. Each target is powered through a
fully connected USB cable with VBUS present. There is no external target
power, USB No-VBUS cable, Harness Supervisor or controlled target-power
service.

The current experiment proves the host USB identity and configuration
principle from Section 5.5 of `StandardControlServices_V2.md`. It does not
claim to prove the V2 rack power or Supervisor sequence.

## Configuration Verification

Run from the repository root with no other REPL tool attached to either port:

```bash
python3 tools/repl/verify_bench_config.py \
  tests/WIFI_BLE/standalone_bench_config.json
```

The verifier:

1. resolves each configured `/dev/serial/by-path/` connection
2. rejects duplicate configured devices
3. opens each control connection sequentially
4. verifies the expected board, version and Git commit
5. verifies the required Wi-Fi and BLE APIs
6. reports `DONE=PASS` or `DONE=CONFIGURATION_FAILURE`

## Physical-Port Swap Test

1. Run the verifier in the recorded physical arrangement and require
   `DONE=PASS`.
2. Close any REPL, Web IDE or serial monitor using either target.
3. Swap the two target USB connectors between their current host or hub ports.
4. Wait for both `/dev/serial/by-path/` entries to reappear.
5. Run the verifier without changing the configuration. Both physical paths
   should report target identity mismatches and the command should exit with
   status 1 and `DONE=CONFIGURATION_FAILURE`.
6. Restore the connectors to their assigned physical ports and rerun the
   verifier. It should return to `DONE=PASS`.

The mismatched run is successful negative-test evidence. Do not edit the
configuration to make the swapped arrangement pass: the point is to prove
that the fixed physical USB position and expected target profile remain
coupled.

Results belong under `tests/Results/WIFI_BLE_Results/`.

## Initial BLE Supervisor Peer Tests

The BLE tests use a generated name and run token so the host can correlate the
two serial transcripts with the peer observed over the air. No event-handshake
wiring or bench modification is required.

Run advertising and filtered discovery with the C3 as the Supervisor Peer:

```bash
python3 tools/repl/run_ble_peer_test.py
```

Reverse the radio roles:

```bash
python3 tools/repl/run_ble_peer_test.py --direction esp32-peer
```

Both directions pass. The scanner requires exactly one matching name, a real
over-air device address, numeric RSSI and the exact run payload under service
UUID `0xFFF0`.

The GATT test adds connection, custom-service and characteristic discovery, a
run-bound read, two writes and disconnection:

```bash
python3 tools/repl/run_ble_gatt_test.py
python3 tools/repl/run_ble_gatt_test.py --direction esp32-peer
```

In `c3-peer`, the C3 is the GATT peripheral and the classic ESP32 is the
central. In `esp32-peer`, those radio roles reverse. Both directions pass the
complete transaction and cleanup. Each role first forces its existing
`Serial1` console with `E.setConsole(..., {force:true})`; otherwise the shared
ESP32 BLE connection handler automatically moves the REPL to Bluetooth while
the default BLE UART service is enabled. The role restores automatic console
selection after the test.

Scripts and runners:

- `ble/ble_capability_survey.js`
- `ble/ble_supervisor_advertiser.js`
- `ble/ble_target_filtered_scan.js`
- `ble/ble_supervisor_gatt_peer.js`
- `ble/ble_target_gatt_client.js`
- `tools/repl/run_ble_peer_test.py`
- `tools/repl/run_ble_gatt_test.py`

Results and interpretation are in
`tests/Results/WIFI_BLE_Results/2026-07-20-ble-supervisor-peer-initial.md`.
Firmware anomalies are registered under `docs/investigations/ble/`.

## Initial Wi-Fi Supervisor Peer Test

The first two-board Wi-Fi proof assigns the roles as follows:

- `esp32_c3_v1`: Supervisor Peer, WPA2 access point and UDP responder
- `esp32_v1`: target station under test
- host: orchestration, identity verification, timeouts and evidence collation

Run from the repository root with no other tool attached to either serial
port:

```bash
python3 tools/repl/run_wifi_peer_test.py
```

The runner performs a true ESP32 chip reboot at the beginning of the run so
the Wi-Fi driver starts from known volatile state. It does not flash firmware,
call `Wifi.save()` or alter persistent Wi-Fi configuration. It then:

1. verifies both configured board and firmware identities
2. starts a unique WPA2 AP and UDP responder on the Supervisor Peer
3. scans, associates and obtains an address on the target
4. checks the target gateway and pings the peer
5. exchanges a run-bound UDP challenge and acknowledgement
6. checks target-side Wi-Fi events and peer-side join/leave events
7. stops both roles and verifies that neither board retains an active IP or AP

The scripts are:

- `wifi/wifi_supervisor_peer.js`
- `wifi/wifi_station_peer_exchange.js`

The initial result is recorded in
`tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-initial.md`.

## Negative Wi-Fi Station Cases

The negative scenario keeps the C3 Supervisor Peer AP active while the classic
ESP32 target runs two isolated subcases. The runner performs a true chip reboot
and cleanup between them:

1. a visible controlled WPA2 AP with deliberately incorrect credentials
2. a generated SSID first proved absent from scan results

Run:

```bash
python3 tools/repl/run_wifi_peer_test.py --scenario negative
```

The test requires both target-side negative state and independent peer-side
absence of a completed station join or application traffic. Connection
attempts for an unavailable AP are bounded by the test runner rather than
waiting indefinitely for a `Wifi.connect()` callback.

The target role is `wifi/wifi_station_negative_cases.js`. Results are recorded
in
`tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-negative-cases.md`.

The positive scenario remains the default and may also be selected explicitly:

```bash
python3 tools/repl/run_wifi_peer_test.py --scenario positive
```

## Reversed Supervisor Peer Roles

Logical roles can be reversed without changing the configured physical USB
positions:

```bash
python3 tools/repl/run_wifi_peer_test.py \
  --scenario positive \
  --direction esp32-peer
```

This assigns the classic ESP32 as the WPA2 AP/UDP Supervisor Peer and the C3
as the station target. The reversed test proved scan, association, DHCP,
bidirectional UDP, peer join/leave events and cleanup. It retained an overall
failure because C3 `Wifi.ping()` received no reply from the classic ESP32 AP,
even though the classic peer successfully pinged the C3 station. The evidence
is recorded in
`tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-reversed-roles.md`.

## Target-Hosted AP And Custom Subnet

This test reverses the service relationship: the selected target creates the
WPA2 AP and UDP service, while the other harness board acts as the Supervisor
station. It exercises a target-controlled AP address of `192.168.47.1/24`
rather than relying on the ESP32 port's default AP subnet.

Run the C3 as the target AP and classic ESP32 as the Supervisor station:

```bash
python3 tools/repl/run_wifi_target_ap_test.py
```

Run the classic ESP32 as the target AP and C3 as the Supervisor station:

```bash
python3 tools/repl/run_wifi_target_ap_test.py --target-board esp32
```

Both builds applied the custom address, served DHCP and completed the
run-bound UDP exchange. Both also returned the string `"Failure"` to the
documented `Wifi.setAPIP()` callback despite applying the requested address.
The runner deliberately reports this API-contract mismatch as a failure while
retaining the successful functional observations. With the classic target AP,
the previously recorded C3-to-classic-AP `Wifi.ping()` timeout also repeated;
UDP continued to pass.

The target role is `wifi/wifi_target_ap_service.js`; the station role reuses
`wifi/wifi_station_peer_exchange.js`. Full results and interpretation are in
`tests/Results/WIFI_BLE_Results/2026-07-20-wifi-target-ap-custom-ip.md`.

## Static Supervisor-Station Address

The focused static-address scenario starts the selected target AP on its reset
default `192.168.4.1/24` subnet. The other board associates by DHCP, calls
`Wifi.setIP()` requesting `192.168.4.77`, and then checks the callback and
actual address separately. The target AP independently records the source
address of the run-bound UDP challenge.

Run with the classic ESP32 as the Supervisor station:

```bash
python3 tools/repl/run_wifi_target_ap_test.py --station-address static
```

Reverse the roles so the C3 is the Supervisor station:

```bash
python3 tools/repl/run_wifi_target_ap_test.py \
  --target-board esp32 \
  --station-address static
```

On both builds, the callback returned documented success (`null`) but the
station retained its DHCP address `192.168.4.2`. The AP likewise observed UDP
from `.2`, not the requested `.77`. The C3 completed the remaining lifecycle
and cleanup checks; classic confirmation runs showed additional post-call
abort/watchdog resets that remain a separate firmware-investigation result.

The focused station role is `wifi/wifi_station_static_ip.js`. Full results are
in
`tests/Results/WIFI_BLE_Results/2026-07-20-wifi-station-static-ip.md`.
