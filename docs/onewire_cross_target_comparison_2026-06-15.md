# OneWire Cross-Target Comparison

Date: 2026-06-15

This note records the comparison between:

- ESP32-C3 Espruino on the harness test setup
- Espruino Pico running the same external OneWire daughterboard

The purpose was to determine whether the unstable OneWire results seen on the
ESP32-C3 were caused by:

- the original harness wiring
- the DS18B20 devices
- the replacement OneWire daughterboard
- or the ESP32-C3 target/firmware side

## Test Hardware

External OneWire daughterboard used for both targets:

- two DS18B20 devices
- one `4.7k` pull-up from `DQ` to `3.3V`
- direct wiring to `3.3V`, `GND`, and data pin
- minimal soldered construction

Observed ROM codes on the daughterboard:

- `2838498700e8136b`
- `28253387008562df`

## ESP32-C3 Result

Board/firmware:

- `BOARD=ESP32C3_IDF4`
- `VERSION=2v29.81`

Connection:

- daughterboard data connected to `D0`

Functional block result:

- `OW_RESET=true`
- `OW_COUNT=2`
- both scratchpads valid
- both CRCs valid
- search stability still failed

Functional block detail:

```text
OW_SCAN_0=["2838498700e8136b","28253387008562df"]
OW_SCAN_1=["2838498700e8136b","28253387008562df"]
OW_SCAN_2=["2838498700e8136b","28253387008562df"]
OW_SCAN_3=["2838498700e8136b","28253387008562df"]
OW_SCAN_4=["2838498700e8136b"]
OW_SCAN_5=["2838498700e8136b","28253387008562df"]
```

Soak result using `tools/esp32_c3_onewire_soak.py`:

```text
scans=50
two_device=30
one_device=12
zero_device=8
more_than_two=0
rom 28253387008562df seen 30/50
rom 2838498700e8136b seen 42/50
```

Interpretation:

- the cleaner daughterboard improved confidence in the sensor hardware
- the ESP32-C3 still showed repeated OneWire discovery failures

## Espruino Pico Result

Board/firmware:

- `BOARD=PICO_R1_3`
- `VERSION=2v29`

Connection:

- daughterboard data connected to `B1`

REPL test:

```js
pinMode(B1, 'input');
var ow = new OneWire(B1);

var sensors = ow.search().map(function(device) {
  return require("DS18B20").connect(ow, device);
});
console.log(sensors);
```

Returned two devices with the expected ROM codes.

Soak result using `tools/espruino_onewire_soak_generic.py`:

```text
scans=50
two_device=50
one_device=0
zero_device=0
more_than_two=0
rom 28253387008562df seen 50/50
rom 2838498700e8136b seen 50/50
```

Interpretation:

- the daughterboard is stable
- both DS18B20 devices are stable
- repeated `OneWire.search()` is completely reliable on the Pico

## Conclusion

This comparison is strong evidence that:

- the external OneWire daughterboard is not the root cause
- the two DS18B20 devices are not the root cause
- the general Espruino `OneWire` / `DS18B20` usage pattern is not the root cause

The remaining problem is now strongly associated with the ESP32-C3 side.

Most likely remaining fault domains are:

- ESP32-C3 Espruino OneWire timing/implementation
- ESP32-C3 board or pin-specific behavior on `D0`
- less likely, a remaining ESP32-C3-specific wiring or signal-integrity issue

Logic-analyzer comparison of the Pico reference and multiple ESP32-C3 search
outcomes is recorded in:

- [onewire_logic_trace_comparison_2026-06-15.md](/home/simon/MaBecker/ESP32_SGATest/docs/onewire_logic_trace_comparison_2026-06-15.md)

That note shows the ESP32-C3 failing runs start with a broadly plausible
waveform family but appear to terminate the search transaction early.

## Practical Implication

The Pico result means the daughterboard can now be treated as a known-good
reference OneWire test load.

Future C3 work can use this comparison as evidence that:

- unstable OneWire behavior on the ESP32-C3 is not sufficient evidence against
  the sensors or the daughterboard
- C3 firmware/target-side investigation is now justified

## Related Tools

- [esp32_c3_onewire_block4.py](/home/simon/MaBecker/ESP32_SGATest/tools/esp32_c3_onewire_block4.py)
- [esp32_c3_onewire_soak.py](/home/simon/MaBecker/ESP32_SGATest/tools/esp32_c3_onewire_soak.py)
- [espruino_onewire_soak_generic.py](/home/simon/MaBecker/ESP32_SGATest/tools/espruino_onewire_soak_generic.py)
