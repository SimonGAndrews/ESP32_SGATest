# Recommended V1 Testing To Support The V2 Architecture

**Status:** Superseded evidence plan — USB No-VBUS policy rejected 21 August 2026

**Date:** 20 July 2026

## Recommendation

> **Historical note:** The USB No-VBUS approach below was useful evidence but
> is no longer an accepted V2 architecture direction. Review of CP2102N and
> other accepted targets showed that some targets require VBUS for their normal
> USB connection. The accepted replacement is the daughter-board manual VBUS
> selector and reusable-harness Standalone regulator defined by
> `StandardControlServices_V2.md`. Do not use this document as an implementation
> requirement.

Use the completed V1 harnesses to test the operating behaviours on which the
V2 architecture depends. Give priority to USB No-VBUS operation, externally
supplied target power, host recovery and wireless-peer recovery.

These tests can increase confidence in the V2 architecture without reopening
the V1 hardware design. They do not replace prototype tests of the new V2
power switches, isolated supply rails, rack-control hardware or Target
Interface.

## Priority 1: USB No-VBUS And External Target Power

Run this test on both the classic ESP32 and ESP32-C3 V1 harnesses.

Before connecting a target:

* confirm continuity of USB D+, D- and ground through the USB No-VBUS Cable
* confirm that USB VBUS is open circuit from end to end
* mark the cable clearly as `USB NO VBUS`
* use a current-limited external 5 V supply with verified polarity
* on the classic ESP32, use `J_External_PWR1` and `JP_External_5V1`
* on the ESP32-C3, use the external 5 V connection through `JP12` and leave
  the native-USB VBUS shunt `JP1` open

Do not connect competing 5 V sources. Record the complete jumper and shunt
state as a test precondition.

Test the following sequence:

1. Connect host USB through the USB No-VBUS Cable with external 5 V off.
2. Confirm that the target remains unpowered and does not enumerate.
3. Apply external 5 V and confirm enumeration, REPL operation and reset.
4. Remove external 5 V while leaving USB data and ground connected.
5. Confirm that the target shuts down and disappears from the host.
6. Confirm that the USB connection does not materially back-power the target
   5 V or 3.3 V rail.
7. Restore external 5 V and confirm automatic host reconnection.
8. Repeat the cycle enough times to expose intermittent enumeration or
   recovery failures; twenty cycles is a useful first run.

This tests the V2 operating assumption that host USB remains physically
connected while the external target supply determines whether the target is
running. It does not prove the proposed V2 electronic power switch.

## Priority 2: Ubuntu USB Identity And Sequential Rack Operation

Connect both V1 targets and the proposed Supervisor Peer through the intended
host USB hub. Use an Ubuntu host and fixed hub ports.

Verify that:

* each board has a stable `/dev/serial/by-path/` identity
* removing target power removes only that target's serial device
* restoring power returns the same physical-path identity
* the Supervisor remains connected while a target is power-cycled
* host configuration detects a missing, duplicate or physically swapped board
* a runner can finish one position and move automatically to the next
* failure or absence of one position does not prevent selection of another

This exercises the proposed rack-position and host-configuration model. It
does not prove the TCA9548A or per-position MCP23017 control implementation.

## Priority 3: Wireless Test Interrupted By Target Power Loss

Keep the Supervisor Peer continuously powered. Remove and restore target power
during representative Wi-Fi and BLE operations, including where supported:

* association or connection establishment
* an established connection
* a run-bound Wi-Fi UDP exchange
* BLE advertising or scanning
* a BLE GATT read, write or notification exchange

For each interruption, verify separately that:

* the peer observes the target disappearing
* the host terminates the current operation with a bounded timeout
* the target reconnects after power is restored
* a fresh test run succeeds without stale state from the interrupted run

Use a unique run identifier in credentials, payloads or application messages
where practical. Target callbacks, target state, peer observations and
application traffic are separate evidence and should not be collapsed into a
single pass result.

## Priority 4: Supervisor Failure And Recovery

Restart or disconnect the temporary Supervisor Peer during a target test.
Verify that the host:

* detects loss of the Supervisor
* ends the active test cleanly
* recovers or restarts the Supervisor
* verifies its identity and configuration
* completes a later test without manual cleanup of stale state

Record whether normal USB reset control is sufficient or whether recovery
requires removal of Supervisor power. This evidence will inform the V2
Supervisor watchdog and recovery implementation.

## Supporting Test: Back-Power Survey

With external target power off, attach each intended connection separately
and measure the target 5 V and 3.3 V rails:

* USB No-VBUS Cable
* harness Test Block connections
* I2C or Grove accessories
* UART or debug connections
* logic analyser connections
* any temporary Supervisor event connections

Repeat with the intended connections present together. A path that raises a
supposedly unpowered target rail appreciably should be recorded as a V2
isolation requirement.

## Later Test: Sleep And Supervisor Event Handshake

After the basic BLE work, use a suitable existing V1 interrupt path or a
temporary test accessory to exercise this logical sequence:

1. Put the target into light sleep.
2. Assert an external, latched event.
3. Confirm that the target wakes or detects the event.
4. Read and clear the event.
5. Return an acknowledgement observable by the host or peer.

Start with light sleep. Treat deep sleep as a separate test because it changes
USB, REPL and peripheral state. Check the selected V1 pin and Espruino build
for the required wake capability before wiring the test.

The V1 boards do not directly implement the proposed V2 Supervisor event
interface, so this test proves the handshake behaviour rather than its final
physical implementation.

## Evidence To Preserve

For every result, record:

* target board and logical target/peer role
* Espruino version, firmware commit and build provenance
* Ubuntu USB path and fixed hub port
* cable identifier
* harness mode and complete jumper or selector state
* external voltage, current limit and observed current
* power-off, enumeration and reconnect timing
* host, target and peer observations separately

Put detailed test procedures and results with the relevant V1 test workstream.
This document remains the V2-facing recommendation and interpretation guide.

## Limits Of V1 Evidence

V1 testing cannot prove:

* the V2 target load switch, reverse-current protection or rail discharge
* independent Routing Logic, Test Block and Rack Control supply rails
* route-safe behaviour while a V2 target is unpowered
* TCA9548A channel isolation and per-position MCP23017 control
* the wired-OR rack interrupt implementation
* the physical Target Interface or daughter-board power adaptation

Those items require schematic review and V2 prototype measurement.
