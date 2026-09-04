# Proposed OneWire Timing PR — Hold

## Status

**Do not push or submit `fix/esp32-idf5-onewire-timing` yet.**

As of the upstream master merge `5d79af218`, this proposal was not submitted
and is not included. Further OneWire work is now a normal master-line firmware
investigation and must retain the distinction between reliable discovery and
unreliable addressed DS18B20 CRC results.

The local critical-section change is a proven improvement to
`OneWire.search()` on classic ESP32 IDF5, but the final clean-image test shows
that it does not fully fix addressed DS18B20 reads. A pull request description
claiming complete OneWire validation would therefore be incorrect.

## Intended Change

The proposed implementation maps the OneWire reset, read-slot and write-slot
timing guards to a private FreeRTOS critical-section mux for `ESP32_IDF5` only.
It leaves the target-wide `jshInterruptOff()` and `jshInterruptOn()` behaviour
unchanged.

The explicit guard must be:

```c
#if defined(ESP32_IDF5)
```

An earlier follow-up used `ESP_IDF_VERSION_MAJOR >= 5`, but that macro was not
defined in `src/jswrap_onewire.c`, so the protection was silently inactive.
The final validation commit `354fa95fb` corrects the guard.

## Verified Improvement

With the guard active on the final corrected IDF5 source:

- all three fitted devices were returned in 100/100 `OneWire.search()` calls;
- the final formal run returned the same two DS18B20 ROMs and one DS2413 ROM in
  all 6/6 searches;
- all three DS2413 command confirmation/status pairs passed, 6/6.

Current master returned the full three-device set in only 50/100 searches, so
the discovery improvement is material.

## Remaining Failure

The final clean `ESP32_IDF5` image reported board `ESP32_IDF5`, version
`2v29.75`, commit `354fa95fb`. On that exact image:

- the mixed-device test passed 20/21 checks because one of two DS18B20
  scratchpads failed CRC;
- a 20-cycle addressed-read soak captured 19 cycles;
- 13 of those 19 cycles contained at least one bad scratchpad CRC;
- 6 captured cycles had both scratchpads valid;
- one additional cycle was a host capture miss.

The returned scratchpads had the expected nine-byte length and plausible
temperature fields. The failure is corruption detected by the DS18B20 CRC,
not an absent device or a test expecting the wrong number of devices.

## Relationship to Master

Current master also has a OneWire defect: device discovery and addressed reads
are both unstable. The IDF5 critical section improves discovery substantially,
but its addressed reads remain unreliable. The defect is therefore not an
IDF5-only regression, and the patch cannot yet be described as a complete
classic-ESP32 fix.

## Next Investigation

Before preparing a pull request:

1. preserve the current three-device bus and final firmware provenance;
2. use `OneWire.searchDebug()` or equivalent slot-level evidence to separate
   select/write/read timing;
3. compare an addressed DS18B20 scratchpad read with one device and with both
   DS18B20s plus the DS2413 fitted;
4. determine whether critical-section exit/re-entry between bytes or slots is
   responsible for the repeated bit/CRC corruption;
5. rerun at least 20 addressed cycles and require every parsed scratchpad CRC
   to pass before changing this document to submission-ready.

The old local branch `fix/esp32-idf5-onewire-timing` remains reference work
only. It is still based behind the merged official tip and must not be used for
manual GitHub submission.
