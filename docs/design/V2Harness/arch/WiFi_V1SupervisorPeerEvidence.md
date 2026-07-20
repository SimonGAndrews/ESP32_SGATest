# V1 Wi-Fi Supervisor Peer Evidence For V2

**Status:** Evidence assessment

**Date:** 20 July 2026

## Conclusion

The V1 bench evidence is sufficient to accept the proposed V2 Harness
Supervisor Wi-Fi peer role as proven in principle. An ESP32-C3-class
Supervisor running a stable Espruino build can provide the programmable Wi-Fi
endpoint described by `StandardControlServices_V2.md`, while the Ubuntu host
coordinates the target and peer through independent USB control paths.

The evidence does not yet prove the complete V2 rack, switched-power, event
handshake or recovery implementation. Those remain Control Service prototype
requirements rather than reasons to reject the Wi-Fi peer architecture.

This document is an evidence input. `StandardControlServices_V2.md` remains
the authority for accepted Supervisor behaviour.

## Proven Supervisor Pattern

The bench proved:

- Supervisor operation as a WPA2 AP and UDP service
- Supervisor operation as a station while the target hosts the AP
- target scan, association, DHCP, connection state and disconnection
- positive bidirectional, run-bound UDP challenge and acknowledgement
- peer-side station join, leave and received-payload observations
- wrong-password and unavailable-SSID negative cases
- host-owned bounded timeouts where target callbacks do not terminate
- logical role reversal without changing the configured physical USB positions
- unique per-run credentials and payloads
- cleanup and true chip-reboot recovery of volatile Wi-Fi state
- fixed `/dev/serial/by-path/` identity and rejection of missing, duplicate or
  physically swapped targets
- independent detection of misleading target API results, including the
  observed `setIP()` and `setAPIP()` defects

This supports the common test pattern in Section 4.3 of
`StandardControlServices_V2.md`: the host configures the peer, starts the
target test, coordinates the wireless exchange and correlates results from
both endpoints.

Wireless signals require no Target Interface or routing-fabric path. A wired
target console and independent recovery path must remain available while the
wireless service is under test.

## Minimum Supervisor Wi-Fi Capability Supported By Evidence

The Supervisor implementation should provide:

- configurable Wi-Fi AP and station roles
- WPA2 SSID, password and channel configuration
- a UDP request/response service using run-bound payloads
- AP join/leave and station connection-event recording
- observed peer address and received-payload recording
- host-readable configuration, actions, observations and timestamps
- explicit service shutdown and volatile-state cleanup
- hardware reset or power-cycle recovery if Supervisor firmware becomes
  unresponsive
- stable host USB identity and verified Supervisor firmware provenance

A host Wi-Fi adapter is not required for this baseline peer service. It is a
useful independent diagnostic endpoint where the two Espruino endpoints cannot
isolate a directional failure.

The Supervisor peer is versioned test equipment, not unquestioned ground
truth. Results should continue to reconcile host orchestration, target state,
peer state and application traffic.

## Architecture And Implementation Gaps

The following gaps remain before the complete V2 Control Service is proven:

1. **Power and recovery:** the V1 tests used `STANDALONE` mode with fully
   powered USB cables. They did not prove switched target power, USB No-VBUS
   operation, reset/boot control or recovery after actual target-power removal.
2. **Host protocol:** the formal host-to-Supervisor command, timestamp and
   result protocol remains to be specified. Current runners upload focused
   Espruino roles directly through the REPL.
3. **Rack selection:** one Supervisor serving up to eight rack positions has
   not been exercised through the proposed TCA9548A and MCP23008 control
   arrangement.
4. **Physical event handshake:** `SUP_EVENT_OUT` and `SUP_EVENT_IN` were not
   connected. Ordinary Wi-Fi peer exchange does not require them, but
   wireless-event-to-physical-action correlation and timestamped
   acknowledgement remain unproved.
5. **Supervisor recovery:** host cleanup and target firmware reboot were
   proved, but independent hardware recovery of an unresponsive Supervisor was
   not.
6. **Resource-constrained roles:** enlarging the classic station script caused
   an interpreter out-of-memory condition during upload. Focused target roles
   should remain small, with broader sequencing composed in the host runner.

These gaps should feed the Control Service prototype and host-protocol design.
They do not require Wi-Fi radio signals on the Target Interface.

## Test-Coverage And Diagnostic Gaps

The following are Wi-Fi test-suite or diagnostic gaps rather than baseline
Supervisor hardware gaps:

- A third independent endpoint is still required to isolate the repeatable
  C3-station-to-classic-AP `Wifi.ping()` anomaly. The planned host Wi-Fi adapter
  can provide independent AP and station controls.
- DNS lookup, hostname, SNTP, saved configuration, restore behaviour,
  enterprise authentication and broader `setConfig()` coverage remain
  untested.
- Controlled RF attenuation, interference generation, packet capture and
  performance measurement are not baseline Supervisor services. External
  equipment is required if later specifications demand them.
- Multi-client AP capacity has not been tested. The current rack proposal is
  sequential, with one active position, and does not require simultaneous
  wireless execution.
- In negative tests, the peer can prove absence of a completed join and
  application traffic. It cannot prove that no management or authentication
  frames were exchanged without packet capture.

BLE has not yet been exercised. The Wi-Fi work validates the common
host/Supervisor orchestration model, but it is not BLE functional evidence.

## Firmware Findings Do Not Invalidate The Supervisor Role

The tests exposed shared Espruino ESP32 firmware defects:

- `Wifi.setAPIP()` applied a custom AP address but returned `"Failure"`
- `Wifi.setIP()` returned `null` but did not replace the DHCP station address
- C3-to-classic-AP `Wifi.ping()` timed out while bidirectional UDP worked
- classic post-`setIP()` continuation runs produced additional reset evidence

These results strengthen the Supervisor test method. They demonstrate why a
V2 test must keep callback conformance, local state, peer-observed state and
application traffic as separate assertions.

Firmware interpretation and open issue status are maintained in:

- [`../../../investigations/wifi/README.md`](../../../investigations/wifi/README.md)

## Evidence Index

The authoritative bench records are:

- [`../../../../tests/Results/WIFI_BLE_Results/2026-07-20-usb-path-identity-baseline.md`](../../../../tests/Results/WIFI_BLE_Results/2026-07-20-usb-path-identity-baseline.md)
- [`../../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-initial.md`](../../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-initial.md)
- [`../../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-negative-cases.md`](../../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-negative-cases.md)
- [`../../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-reversed-roles.md`](../../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-reversed-roles.md)
- [`../../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-target-ap-custom-ip.md`](../../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-target-ap-custom-ip.md)
- [`../../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-station-static-ip.md`](../../../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-station-static-ip.md)

The reusable runner instructions and bench configuration are under:

- [`../../../../tests/WIFI_BLE/README.md`](../../../../tests/WIFI_BLE/README.md)
