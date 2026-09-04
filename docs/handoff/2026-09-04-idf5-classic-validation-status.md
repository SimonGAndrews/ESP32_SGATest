# Classic ESP32 IDF5 Validation Status

Date: 2026-09-04

## Conclusion

The corrected classic ESP32 IDF5 candidate is broadly comparable with current
classic ESP32 master across the wired Espruino APIs and improves several
behaviours, but it is not yet ready to treat as equivalent overall. The
remaining IDF5-specific blockers are Wi-Fi station scanning, WPA2 access-point
authentication, static-IP operation and addressed DS18B20 CRC reliability.

Bluetooth GATT passes in both roles on both firmware lines. The observed plain
advertising/service-data anomaly is shared by master and IDF5 and is therefore
not evidence of an IDF5 regression.

## Compared Firmware

| Role | Board | Version | Source commit |
|---|---|---|---|
| current classic comparator | `ESP32` | `2v29.277` | `c5ff787b199148c31ef2776fb6f70673cba01a25` |
| corrected IDF5 candidate | `ESP32_IDF5` | `2v29.75` | `354fa95fb` |
| radio peer | `ESP32C3_IDF4` | `2v29.274` | `b905c8099` |

The corrected candidate is based on official IDF5 commit `25f81a8e1` plus the
separately prepared corrective commits. The Wi-Fi debug-build and I2C
configuration changes have been merged upstream. ADC, GPIO-matrix,
PWM/DAC and undefined-pin-state changes have been submitted separately. The
OneWire timing change remains held because reliable discovery did not also
produce reliable addressed DS18B20 reads.

## Settled Results

- GPIO, watches, `digitalPulse()`, `shiftOut()`, ADC, PWM, DAC, I2C, SPI,
  external SPI flash and UART core data paths are comparable or improved on
  the corrected IDF5 image.
- IDF5 corrects master-observed DAC full-scale output, DAC-pin release and
  undefined cleanup-state behaviour.
- IDF5 consistently discovers both DS18B20 devices, improving on master, but
  addressed scratchpad reads still fail CRC frequently.
- IDF5 `Wifi.scan()` repeatedly returns no networks while the controlled peer
  access point is active.
- A peer can see an IDF5 WPA2 access point but fails its four-way handshake.
- IDF5 `Wifi.setIP()` displays the requested address but reports failure and
  subsequent network traffic fails.
- BLE GATT read/write/disconnect transactions pass with either board acting as
  central or peripheral.

## Authoritative Evidence

- `docs/IDF5_port_testing/Gordon_ESP32_master_vs_IDF5_build_defects_2026-08-31.md`
- `tests/Results/2026-08-31-esp32-master-vs-idf5-regression.md`
- `tests/Results/WIFI_BLE_Results/2026-09-01-esp32-master-vs-idf5-peer-regression.md`
- `tests/Results/2026-08-31-esp32-idf5-corrective-candidate.md`
- `docs/investigations/IDF5_port_testing/2026-08-31-remaining-classic-esp32-idf5-priorities.md`

## Recommended Next Work

Investigate the three Wi-Fi paths separately before assigning a common root
cause: station scanning, WPA2 access-point authentication and static-IP
routing. Then return to the held OneWire change and isolate why stable search
coexists with addressed DS18B20 CRC failures. After upstream changes are
merged, build one clean official-IDF5 image and rerun the same master
comparison matrix without local source patches.

Firmware changes continue to belong in the Espruino checkout. Shared runners,
bench configurations and retained evidence belong in this repository.
