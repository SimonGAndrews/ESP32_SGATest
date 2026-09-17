# ESP32 IDF5 Validation Closure and Post-Merge Sanity

Date: 2026-09-04

## Conclusion

The expedited ESP32 IDF5 validation has completed its purpose. V1
harness regression evidence was supplied to Gordon Williams and informed the
decision to merge the official `IDF5` branch into Espruino `master`. The merge
is commit `5d79af2185f33020a02e315c6318dab81e27dfde`, with previous master
`c5ff787b199148c31ef2776fb6f70673cba01a25` and IDF5 tip
`955305fd29e1c3e38380ff72b23106cf4b3c441b` as its parents.

The same-source sanity comparison is now complete. `BOARD=ESP32` and
`BOARD=ESP32_IDF5` were built from official-master commit `e5341719a` and run
through the established classic ESP32 V1 suite. Both builds pass the wired
GPIO, ADC, PWM, DAC, I2C, SPI and external-flash coverage, including Gordon's
metadata-based DAC pin selection. IDF5 is materially better in the UART and
addressed-OneWire samples, but retains Wi-Fi regressions as an AP and in
station scan/ping behaviour. Continuing Wi-Fi, OneWire, UART or BLE defects
are now ordinary Espruino-master investigations rather than continuation of
the expedited port-validation project.

The authoritative post-merge result is:

- `tests/Results/2026-09-05-esp32-post-idf5-merge-same-source-sanity.md`

Follow-up on 17 September established that the historical IDF5 WPA2
access-point timeout is not present on current official master or on the
closeout integration branch containing PRs `#2749` and `#2752`. Current master
and the integration image each completed three focused authentication, DHCP
and UDP cycles with the C3 station. A retained 40 KB image and the 70 KB
integration image then each completed three cycles with a stable classic
station, including AP join/leave events. The 70 KB reserve is therefore not a
requirement for this small AP workload, and the exact historical cause remains
unproven. See:

- `tests/Results/WIFI_BLE_Results/2026-09-17-esp32-idf5-wpa2-ap-follow-up.md`

A subsequent focused UART investigation produced pull request `#2742`, merged
into Espruino `master` as `e6a3fe089`. Revision `363ba92c9` coordinates driver
reconfiguration across the ESP32 family and deliberately excludes the separate
setup-time byte caused by enabling a receiver before its TX source has reached
the idle-high state. It compiles for all seven current ESP32-family board
definitions and completed runtime lifecycle validation on classic ESP32,
ESP32-C3 and ESP32-S3 hardware. See:

- `tests/Results/2026-09-08-esp32-uart-family-driver-lifecycle-validation.md`

## Contribution to Upstream

The following submitted corrections are now present in master through the IDF5
merge:

| Upstream PR | Correction | IDF5 integration |
|---|---|---|
| `#2733` | Wi-Fi debug-build correction | merge `6ad8b4c71` |
| `#2734` | complete I2C configuration initialisation | merge `25f81a8e1` |
| `#2735` | ADC restoration | merge `149ccda22` |
| `#2736` | GPIO-matrix restoration | merge `4ba8157c9` |
| `#2737` | PWM/DAC restoration and DAC pin release | patch-equivalent commits `919ac70f1`, `176614e08`, `b0fa32b4b` |
| `#2738` | undefined pin-state cleanup | merge `c1c95ae69` |

Gordon followed PR `#2737` with commit `43fb9e08d`, replacing hard-coded DAC
GPIO numbers with `pinInfo` function metadata and explicit DAC pin-state
tracking. The post-merge sanity run validated this portability improvement on
the merged source: both D25 and D26 passed low/full-scale DAC feedback and
subsequent ordinary GPIO use.

The proposed OneWire timing change was deliberately held, was not submitted,
and is not included in the upstream merge. It improved device discovery but
did not resolve frequent addressed DS18B20 CRC failures.

## Pre-Merge Evidence

The completed comparison used:

| Role | Board | Version | Source commit |
|---|---|---|---|
| classic comparator | `ESP32` | `2v29.277` | `c5ff787b199148c31ef2776fb6f70673cba01a25` |
| corrected local IDF5 candidate | `ESP32_IDF5` | `2v29.75` | `354fa95fb` |
| radio peer | `ESP32C3_IDF4` | `2v29.274` | `b905c8099` |

That evidence established wired API comparability, several IDF5 improvements,
remaining addressed OneWire CRC failures, IDF5-only Wi-Fi failures and BLE
GATT parity. It was valid input to the merge decision, but it is not a test of
the final merge tree or Gordon's subsequent DAC metadata change.

Authoritative records:

- `docs/IDF5_port_testing/Gordon_ESP32_master_vs_IDF5_build_defects_2026-08-31.md`
- `tests/Results/2026-08-31-esp32-master-vs-idf5-regression.md`
- `tests/Results/WIFI_BLE_Results/2026-09-01-esp32-master-vs-idf5-peer-regression.md`
- `tests/Results/2026-08-31-esp32-idf5-corrective-candidate.md`
- `docs/investigations/IDF5_port_testing/2026-08-31-remaining-classic-esp32-idf5-priorities.md`

## Completed Post-Merge Sanity Run

The clean Espruino checkout used validation branch
`validation/post-idf5-merge-sanity` at `e5341719a`. Both board configurations
were built sequentially with board-specific provisioning. The completed suite
covered:

1. DAC low/full-scale output and ordinary GPIO use after DAC release;
2. ADC, PWM and GPIO-matrix behaviour;
3. I2C, SPI and external flash;
4. UART, including transfers beyond the former 120-byte limit;
5. OneWire search and addressed DS18B20 CRC soak;
6. Wi-Fi station scan, WPA2 access-point authentication and static IP;
7. BLE GATT in both roles and advertising/service-data behaviour.

Both D25 and D26 were exercised as DAC outputs, with low/full-scale analogue
feedback and later GPIO use. The dated result preserves build-specific,
shared and test-runner findings without rewriting the pre-merge evidence.

## Workstream Return Point

Firmware changes belong in focused branches of the Espruino repository.
Shared runners, bench configurations and evidence belong here. Once the
post-merge sanity record is complete, use the general V1 functional-runner
handover and the relevant normal investigation area for further work. V2
architecture and implementation can continue independently.
