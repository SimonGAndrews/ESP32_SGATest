# ESP32 IDF5 WPA2 Access-Point Follow-up

Date: 17 September 2026

## Conclusion

The historical classic `ESP32_IDF5` WPA2 access-point failure is not present
on current Espruino master or on the closeout integration branch containing
PRs `#2749` and `#2752`. Both images repeatedly accepted an independently
controlled station, supplied a DHCP address and completed an exact
bidirectional UDP exchange. No run ended in the previously observed
`4WAY_HANDSHAKE_TIMEOUT`.

A retained 40 KB native-heap image also completed three consecutive cycles
with a stable classic ESP32 station. The current 70 KB setting is therefore
not required for this small WPA2 AP workload and must not be described as the
proven fix for the historical timeout. The older failing image also used
`variables: 0` with `RESIZABLE_JSVARS`; whether that older allocation method
caused the failure remains unproven.

PRs `#2749` and `#2752` do not regress the tested AP path. Priority-one WPA2 AP
qualification can be closed for current master, while the historical report
remains valid evidence about the images tested at that time.

## Test Scope

The focused runner deliberately isolates `Wifi.startAP()` and WPA2
authentication from other known Wi-Fi findings. For each cycle it:

1. reboots and verifies both boards by fixed USB path;
2. starts the classic IDF5 target as a WPA2 AP on channel 6 using the default
   `192.168.4.1/24` subnet;
3. connects the station directly using the generated SSID and password,
   without calling `Wifi.scan()`;
4. requires DHCP address `192.168.4.2` and gateway `192.168.4.1`;
5. exchanges a run-specific UDP challenge and exact acknowledgement;
6. disconnects and verifies inactive Wi-Fi state on both boards.

`Wifi.ping()` and `Wifi.setAPIP()` are omitted because they have separate
investigations. BLE advertising is disabled on the station peer to prevent
peer-side Bluetooth activity from contaminating the authentication result;
BLE is not disabled on the classic IDF5 target.

The runner and role changes are harness commit `fba6c73`.

## Firmware and Bench Provenance

| Role or build | Board | Version | Commit | Native allocation | Control path |
|---|---|---|---|---|---|
| official-master target | `ESP32_IDF5` | `2v29.396` | `1c96229d0` | 70 KB, `JSVAR_MALLOC` | `/dev/ttyUSB1` |
| closeout-integration target | `ESP32_IDF5` | `2v29.401` | `7ad526102` | 70 KB, `JSVAR_MALLOC` | `/dev/ttyUSB1` |
| retained comparison target | `ESP32_IDF5` | `2v29.396` | `cfd696413` | 40 KB, `JSVAR_MALLOC` | `/dev/ttyUSB1` |
| C3 station peer | `ESP32C3_IDF4` | `2v29.397` | `dc274713a` | board default | `/dev/ttyACM0` |
| stable classic station peer | `ESP32` | `2v29.397` | `dc274713a` | board default | `/dev/ttyUSB2` |

The official-master and integration images were clean release builds using
ESP-IDF 5.5.3. The integration image includes the proposed GATT service
lifecycle correction and Wi-Fi scan/connect-intent correction from PRs
`#2749` and `#2752`.

Build artefacts:

| Image | Application size | Application SHA-256 |
|---|---:|---|
| official master `1c96229d0` | 1,497,280 bytes | `ac671b3c207223a1fd760690c771fe2f8a79147730d195fee94637e5b7dd640a` |
| integration `7ad526102` | 1,498,208 bytes | `aec2c3c903facf93ed2c8a13c05fb7bb7efb84f1f624a12ce022be5e03094804` |
| 40 KB comparator `cfd696413` | 1,501,664 bytes | `c5cb422c8d637e14d1c1c8792edc175423bb1cbf6aa93497d4e79e9cc79e3b97` |

## Results

### Current master and integration with the C3 station

| Target image | Run IDs | Result |
|---|---|---|
| official master `1c96229d0` | `20260917T093241Z`, `093339Z`, `093431Z` | three complete passes |
| integration `7ad526102` | `20260917T094437Z`, `094530Z`, `094622Z` | three complete passes |

Every counted run completed WPA2 association, DHCP, exact UDP transfer,
station-side disconnect and inactive cleanup. The IDF5 AP independently
recorded the station join and the exact challenge payload.

### 40 KB and 70 KB targets with the stable classic station

| Target image | Run IDs | Result |
|---|---|---|
| 40 KB `cfd696413` | `20260917T095238Z`, `095328Z`, `095415Z` | three complete passes |
| 70 KB integration `7ad526102` | `20260917T095707Z`, `095757Z`, `095844Z` | three complete passes |

All six runs additionally recorded both `sta_joined` and `sta_left` on the AP.
This is direct evidence that the 40 KB build can perform the tested WPA2 AP
operation. The 70 KB reserve remains justified by the separate BLE-plus-HTTPS
native-memory margin measurements, not by a demonstrated requirement for this
small AP exchange.

## Additional Observations

The C3 peer at `dc274713a` asserted twice in `jsvNewWithFlags()` while handling
the acquired-IP event, once with default BLE advertising and once after
`NRF.sleep()`. In both cases the IDF5 AP had already recorded `sta_joined`, so
WPA2 authentication had completed before the peer failed. Those attempts are
excluded from the AP pass counts and are consistent with the separately
recorded C3 JsVar/heap instability; they are not IDF5 AP failures.

The C3's disconnect did not produce an AP-side `sta_left` event in these
focused runs, although the C3 recorded its own `disconnected` event and both
radios cleaned up. The stable classic station produced `sta_left` in all six
40/70 KB comparison runs. This makes the missing leave event a peer-specific
shutdown observation, not evidence of failed WPA2 authentication.

Two earlier official-master runs also completed association, DHCP and UDP but
were reported as failures by the older runner verdict because it required the
C3-triggered AP-side leave event. They are not included in the three formal
passes above.

## Current Interpretation

The current `Wifi.startAP()` implementation and ESP-IDF 5.5.3 WPA2 path work on
the tested classic ESP32. Source review found no relevant `Wifi.startAP()`
correction between the historical same-source image and current master. The
material board-definition change is from the old `RESIZABLE_JSVARS`
configuration to fixed `JSVAR_MALLOC`; the later 70 KB reserve is not itself
necessary for this workload because the fixed-allocation 40 KB image passes.

The exact historical root cause is therefore not established by this test.
Reconstructing the old `variables: 0` plus `RESIZABLE_JSVARS` image would be an
optional historical experiment, not a blocker to current IDF5 use.

## Reproduction Command

For a configuration containing the classic IDF5 target and stable classic
station positions:

```bash
python3 tools/repl/run_wifi_target_ap_test.py \
  --config tests/WIFI_BLE/esp32_idf5_integration_7ad526_wpa2_classic_peer_bench_config.json \
  --target-position esp32_v1 \
  --station-position esp32_station_peer \
  --focus-auth
```

The generated WPA2 credentials are unique to each run and are not retained as
bench secrets.
