# ESP32 IDF5 Validation Closure and Post-Merge Sanity

Date: 2026-09-04

## Conclusion

The expedited ESP32 IDF5 validation has largely completed its purpose. V1
harness regression evidence was supplied to Gordon Williams and informed the
decision to merge the official `IDF5` branch into Espruino `master`. The merge
is commit `5d79af2185f33020a02e315c6318dab81e27dfde`, with previous master
`c5ff787b199148c31ef2776fb6f70673cba01a25` and IDF5 tip
`955305fd29e1c3e38380ff72b23106cf4b3c441b` as its parents.

The remaining acceptance task is a same-source sanity comparison: build
`BOARD=ESP32` and `BOARD=ESP32_IDF5` from one recorded official-master commit
and run the established classic ESP32 V1 suite. After that run, continuing
Wi-Fi, OneWire or other defects become ordinary Espruino-master investigations
rather than continuation of the expedited port-validation project.

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
tracking. This is a sound portability improvement, but it was made after the
bench-tested PR commits and therefore requires a focused DAC and GPIO-release
rerun on the merged source.

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

## Required Post-Merge Sanity Run

Use the clean `/home/simon/MaBecker/Espruino_master` checkout. Fast-forward its
local `master` from official `upstream/master`, preserve the previous
`b905c8099` position on an archive branch, and create one temporary validation
branch at the selected upstream commit. Build the two board configurations
sequentially from that branch, using a fresh terminal and board-specific
provisioning for each build.

Run the full classic ESP32 V1 suite on both images. Prioritise:

1. DAC low/full-scale output and ordinary GPIO use after DAC release;
2. ADC, PWM and GPIO-matrix behaviour;
3. I2C, SPI and external flash;
4. UART, including transfers beyond the former 120-byte limit;
5. OneWire search and addressed DS18B20 CRC soak;
6. Wi-Fi station scan, WPA2 access-point authentication and static IP;
7. BLE GATT in both roles and advertising/service-data behaviour.

Where the harness permits it, exercise both D25 and D26 as DAC outputs so the
new metadata-based channel selection is covered rather than testing only the
original D25-to-D26 direction.

Record the result in a new dated file under `tests/Results/`; do not rewrite the
pre-merge evidence. If a failure appears only on `BOARD=ESP32_IDF5`, retain
that board attribution. If it appears on both builds, treat it as a shared
master-line issue.

## Workstream Return Point

Firmware changes belong in focused branches of the Espruino repository.
Shared runners, bench configurations and evidence belong here. Once the
post-merge sanity record is complete, use the general V1 functional-runner
handover and the relevant normal investigation area for further work. V2
architecture and implementation can continue independently.
