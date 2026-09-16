# ESP32-C3 `NRF.setServices()` Lifecycle Isolation

Date: 2026-09-11

## Conclusion

The minimal `NRF.setServices()` lifecycle test reproducibly faults on the
current-master `ESP32C3_IDF4` build, but it does not reproduce the fault on the
current-master `ESP32C3_IDF5` build. Three IDF5 runs completed 150 service
replacements without a warning, assertion or reboot.

An older C3 IDF5 image completed the JavaScript loop without crashing, but
ESP-IDF rejected the service operation with `BT_GATT: Active Service Found` on
each cycle. It is therefore not counted as a functional pass. Current master
removes that warning on IDF5 and completes the same test cleanly.

This evidence does not establish a current IDF5 regression and does not support
reverting the service-stop change for IDF5. It does establish a repeatable
IDF4 service-lifecycle failure for this deliberately repeated API operation.

A candidate correction on branch `fix/esp32-gatts-service-lifecycle` now waits
for the asynchronous stop/delete/unregister sequence to finish before replacing
the shared service state. On the same spare C3, patched IDF4 and IDF5 builds
each completed two 50-iteration runs. The correction is deliberately shared:
the unsafe ordering is in common ESP32 GATT code, while the observed IDF4/IDF5
difference is consistent with different callback timing rather than a distinct
IDF4-only implementation.

Subsequent two-board testing proved that the replacement state is functional
over the air. After 50 timed replacements, a classic ESP32 central discovered
the final C3 service, read its exact run-specific value, wrote two run-specific
responses and disconnected. This passed on patched C3 IDF4 and IDF5 builds.

Following maintainer review of PR #2749, the candidate was revised so that
`gatts_reset()` itself owns the bounded wait for teardown completion. This
covers callers other than `NRF.setServices()` and ensures that
`NRF.updateServices()` cannot observe service arrays during teardown. The
revised candidate passed the original lifecycle test and a new three-service
replacement/update test on the classic ESP32 legacy, IDF4 and IDF5 builds and
on ESP32-C3 IDF4 and IDF5.

## Scope and Method

The test uses one locally owned ESP32-C3 at a time. It requires no BLE peer,
external wiring, network access or security testing. A wired Espruino console
is used only to upload the JavaScript and capture the result.

The script creates one service containing one readable characteristic. It
calls `NRF.setServices()` 50 times, changes the characteristic value on each
call and waits 500 ms between calls. It records entry to and return from each
API call. A healthy execution reaches `DONE=PASS` without an ESP-IDF warning,
assertion or reboot.

Reproducer:

- [`../../../docs/investigations/ble/repros/esp32_gatt_setservices_lifecycle.js`](../../../docs/investigations/ble/repros/esp32_gatt_setservices_lifecycle.js)

## Results

| Target and source | Device | Runs completed | Observed result |
|---|---|---:|---|
| `ESP32C3_IDF4`, Espruino `2v29.392`, commit `d8322cec9`, ESP-IDF 4.4.8 | Original C3 peer, serial ending `7990a0` | 0 of 2 | Both runs returned from the first `NRF.setServices()` call and then failed with `jsvUnLockInline` assertion and RISC-V store/AMO access fault before iteration 2 |
| `ESP32C3_IDF5`, Espruino `2v28`, commit `821c40cd5` | Spare C3, serial ending `7b6390` | 1 of 1 JavaScript loops | Reached 50 calls without a reboot, but emitted `BT_GATT: Active Service Found` throughout; not a functional pass |
| `ESP32C3_IDF5`, Espruino `2v29.392`, commit `d8322cec9`, ESP-IDF 5.5.3 | Same spare C3 | 3 of 3 | 150 calls completed with no `BT_GATT` warning, assertion or reboot |
| Classic ESP32, current-master image | Classic ESP32 bench board | 1 of 1 | 50 calls completed without a warning, assertion or reboot; user-observed comparison only, because the complete firmware identity header was not retained |
| Patched `ESP32C3_IDF4`, source base `d8322cec9`, ESP-IDF 4.4.8 | Same spare C3 | 2 of 2 | 100 calls completed without an assertion or reboot |
| Patched `ESP32C3_IDF5`, source base `d8322cec9`, ESP-IDF 5.5.3 | Same spare C3 | 2 of 2 | 100 calls completed without a warning, assertion or reboot; one complete raw capture was inspected |

One additional IDF4 attempt did not start the JavaScript test because the host
blocked while writing to the C3 native USB Serial/JTAG endpoint. No test marker
was produced, and the attempt is excluded from the firmware result. Resetting
the USB endpoint restored the transport for the next complete run.

## Over-The-Air Validation

The over-the-air test uses the spare C3 as the GATT peripheral and the classic
ESP32 as a controlled GATT central. Both boards retain wired host consoles, and
the test uses no Wi-Fi, Internet endpoint or external system.

For the repeated-service case, the C3 calls `NRF.setServices()` 50 times with a
500 ms interval. Calls 1 through 49 use iteration-specific values. Call 50
installs the final run challenge and only then starts advertising. The central
must:

1. select the uniquely named run-specific advertisement;
2. connect and discover service `0xFFF0`;
3. discover and read characteristic `0xFFF1`;
4. receive the exact final challenge rather than any earlier value;
5. discover and write run-specific values to `0xFFF2` and `0xFFF3`;
6. disconnect, with both boards subsequently reporting `connected == false`.

The runner also requires exactly 50 replacement records and requires record 50
to be marked final with the expected challenge.

| C3 peripheral build | Run ID | Result |
|---|---|---|
| Patched `ESP32C3_IDF4`, IDF 4.4.8 | `20260912T081039Z` | Normal GATT transaction passed: nine central checks, both peripheral writes and disconnected cleanup |
| Patched `ESP32C3_IDF4`, IDF 4.4.8 | `20260912T081437Z` | Strict 50-replacement over-the-air test passed all replacement, discovery, read, write, correlation and cleanup checks |
| Patched `ESP32C3_IDF5`, IDF 5.5.3 | `20260912T082431Z` | The same strict 50-replacement over-the-air test passed all checks |

The controlled central in all three runs was `ESP32_IDF5` `2v29.396`, source
commit `20302d7f9`. The C3 images report `2v29.392` and source commit
`d8322cec9`; that commit identifies the source base, while the uncommitted
candidate correction is present in both test images.

The already-recorded ESP32 peripheral behaviour of delivering duplicate
`connect` and `disconnect` callbacks was visible in these runs. It did not
duplicate either characteristic write and is tracked separately as BLE-003.
The IDF5 run also printed an ESP-IDF HCI disconnect warning with reason `0x13`
during the successful client disconnect; both boards then explicitly reported
not connected. Neither observation is counted as a service-replacement
lifecycle failure.

## PR Review Revision Validation

Date: 2026-09-14

The revised candidate moves the completion wait from `gatts_set_services()`
into `gatts_reset()`. It starts the stop/delete/unregister sequence for every
active service and waits once for the final application-unregister callback;
the callback only signals completion after every registered service has been
removed. A five-second timeout prevents an indefinite block and prevents
`gatts_set_services()` from rebuilding state when teardown did not complete.

Two wired-console tests were executed on each build:

1. The original reproducer replaces one custom service 50 times. The default
   Espruino BLE UART service remains enabled, so two registered services are
   involved in each replacement.
2. The multi-service test replaces two custom services 50 times while the BLE
   UART service remains enabled, giving three registered services. After each
   replacement it calls `NRF.updateServices()` to update a characteristic in
   each custom service. A complete execution therefore proves 50 replacements
   and 50 post-replacement updates.

| Hardware and build | ESP-IDF | Original lifecycle test | Three-service replacement/update test |
|---|---|---|---|
| Classic ESP32, `BOARD=ESP32` | Legacy 3.1 lineage | 50 replacements completed | 50 replacements and 50 updates completed |
| Classic ESP32, `BOARD=ESP32_IDF4` | 4.4.8 | 50 replacements completed | 50 replacements and 50 updates completed |
| Classic ESP32, `BOARD=ESP32_IDF5` | 5.5.3 | 50 replacements completed | 50 replacements and 50 updates completed |
| ESP32-C3, `BOARD=ESP32C3_IDF4` | 4.4.8 | 50 replacements completed | 50 replacements and 50 updates completed |
| ESP32-C3, `BOARD=ESP32C3_IDF5` | 5.5.3 | 50 replacements completed | 50 replacements and 50 updates completed |

All five firmware builds completed successfully. All ten runtime executions
printed their expected pass and completion markers. No captured execution
reported a GATT teardown timeout, active-service warning, Espruino assertion,
processor access fault, panic or reboot.

The test images were built from the PR branch at reported commit `7bcdeeed5`
with the uncommitted review revision applied. The firmware therefore reports
`7bcdeeed5` at runtime even though the revised source differs from that commit.
That tested revision was subsequently committed as `ace840200c` and pushed to
update PR #2749.

Revised test:

- [`../../../docs/investigations/ble/repros/esp32_gatt_multiservice_lifecycle.js`](../../../docs/investigations/ble/repros/esp32_gatt_multiservice_lifecycle.js)

## Failure Evidence

Both current-master C3 IDF4 attempts printed:

```text
ITERATION=1
RETURNED=1
assert failed: jsvUnLockInline jsvar.c:876 (jsvGetLocks(var)>0)
...
MCAUSE : 0x00000007
MTVAL  : 0x00000000
...
Rebooting...
```

`MCAUSE=7` is a RISC-V store/AMO access fault. Because `RETURNED=1` appears
before the assertion, the synchronous JavaScript API call returned and the
failure occurred during later processing.

The earlier qualification work also observed RISC-V access faults and an
ESP-IDF `heap_tlsf.c` heap-integrity assertion during custom GATT service
replacement. The minimal test now provides a reliable IDF4 failure, but the
different assertion signatures are not by themselves proof of one root cause.

## Source Interpretation

The source path replaces service state while ESP-IDF service stop, delete and
application-unregister operations are callback-driven. This remains a
plausible place for an asynchronous lifetime or ordering defect on IDF4, but
the bench evidence alone does not prove that source-level cause.

The candidate correction makes that ordering explicit. It retains the current
service-data `JsVar` while ESP-IDF owns the old registrations, checks callback
interface lookups before indexing the service array, and waits for the final
application-unregister callback before freeing and rebuilding the global GATT
arrays. It also checks the actual return from
`esp_ble_gatts_stop_service()` instead of the previously uninitialised local
value. The wait is bounded; a teardown that does not complete reports a warning
and leaves the current state in place rather than constructing replacement
state over it.

Gordon's service-stop change in commit `ed46a3a0b` replaced an invalid direct
delete of an active service with stop-then-delete handling. The old IDF5 image
predates that correction and reports `BT_GATT: Active Service Found`; the
current IDF5 image contains it and runs cleanly. For the tested IDF5 path, the
observed behaviour is consistent with that correction working as intended.

## Evidence Limits

- Completion proves that all 50 JavaScript calls returned and that no captured
  lifecycle warning, assertion or reboot occurred. The later two-board test
  independently discovers and exercises the final service, but it does not
  discover the service after every intermediate replacement.
- The failing IDF4 and passing IDF5 observations use different ESP-IDF
  runtimes. Timing and callback behaviour may therefore differ even where the
  Espruino source is shared.
- The IDF4 failure was reproduced on the original peer and the IDF5 result on
  the spare C3. A same-device IDF4/IDF5 flash comparison was not required to
  decide whether the current IDF5 image reproduces the reported fault.
- The classic result is a useful comparison but is not counted as a fully
  provenance-captured qualification result.

## Firmware Preservation

Before replacing the spare C3's older IDF5 image, its complete 4 MiB flash was
saved locally under the ignored `tests/Results/firmware-backups/` directory.
The backup has SHA-256:

```text
4b5a99eeeb89d8fc1a7816d8cc4b4c0feb90620113387837071df7ba7b37a0a0
```

The spare C3 was then erased and flashed with an exact current-master
`ESP32C3_IDF5` build from commit `d8322cec957a81e7a927b969a271568dad475c46`.
