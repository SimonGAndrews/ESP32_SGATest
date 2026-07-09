# Piggyback DS18B20 Cross-Target Comparison

Date: 2026-07-09

## Objective

This note records a controlled rerun of the shared DS18B20 OneWire tests using
one removable piggyback board across:

- `ESP32-C3` `IDF4`
- classic `ESP32_V1` `ESP32_IDF4`
- classic `ESP32_V1` legacy build

The aim is to reduce sensor-side and bus-load variation before closing out the
current OneWire investigation and before testing PR branches that carry only
the localized ESP32 quiet-timing fix.

## Scope

The piggyback board is intended to hold constant:

- the two `DS18B20` devices
- the pull-up fitted on the test bus
- the short local bus topology used for the comparison

This should remove most sensor-side variation between harnesses.

Isolation plan for this comparison:

- on `ESP32-C3`, `SEL_D0` can be left open and the piggyback can be wired
  directly to the CPU-side `D0`
- on classic `ESP32_V1`, the existing `D13` OneWire `DQ` connection will be
  removed and replaced by the piggyback connection

So this comparison can be treated as a much cleaner cross-target DS18B20 bus
comparison than the normal harness-mounted configuration.

## Test Intent

The close-out question for this exercise is:

- does the same two-sensor piggyback bus reproduce the earlier practical split
  between `ESP32-C3`, classic `ESP32_V1` `ESP32_IDF4`, and classic
  `ESP32_V1` legacy?

The PR-preparation question is:

- when tested on the same piggyback arrangement, which firmware lines show a
  clear improvement from the localized quiet-timing fix alone?

## Common Test Set

The same three checks should be used on each target/build combination:

1. Shared REPL functional test:
   - `python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js --port <PORT> --baud 115200 --timeout 15`
2. Search stability soak:
   - `python3 tools/common/onewire_soak_generic.py --port <PORT> --baud 115200 --pin <PIN> --scans 50`
3. Addressed DS18B20 read soak:
   - `python3 tools/common/ds18b20_read_soak.py --port <PORT> --baud 115200 --pin <PIN> --runs 20 --family-prefix 28`

Pin by target:

- classic `ESP32_V1`: `<PIN> = D13`
- `ESP32-C3`: `<PIN> = D0`

## Bench Preconditions

Before each target run, record:

- board / target
- firmware build line
- serial port
- exact piggyback connection point
- whether harness-mounted `DS18B20` devices have been removed
- whether `DS2413` has been removed
- whether any fixed harness pull-up still remains electrically present
- selector state relevant to OneWire isolation

Expected comparison setup:

- use the piggyback board as the only active `DS18B20` population
- remove the `DS2413` breakout
- remove the harness-mounted `DS18B20` devices on both harnesses for this
  exercise
- on `ESP32-C3`, leave `SEL_D0` open and wire the piggyback directly to `D0`
- on classic `ESP32_V1`, remove the existing `D13` `DQ` connection and replace
  it with the piggyback connection

## Recommended Test Sequence

To minimize physical rewiring, group tests by board rather than by firmware
class.

Recommended order:

1. Fit the piggyback board to classic `ESP32_V1` on `D13`.
2. Run classic `ESP32_V1` current `ESP32_IDF4`.
3. Run classic `ESP32_V1` current legacy build.
4. Run classic `ESP32_V1` PR branch `ESP32_IDF4`, when ready.
5. Run classic `ESP32_V1` PR branch legacy build, when ready.
6. Move the piggyback board to `ESP32-C3` on `D0`.
7. Run `ESP32-C3` current `IDF4`.
8. Run `ESP32-C3` PR branch `IDF4`, when ready.

This keeps the board move between classic `ESP32_V1` and `ESP32-C3` to one
changeover.

## Result Recording

Each run should record:

- whether the shared functional test passed
- whether all `50/50` search scans succeeded
- how many addressed DS18B20 soak runs failed CRC or payload integrity checks
- any unexpected ROM duplication, missing devices, or other selection/read
  anomalies

Results and final conclusions will be appended below as the exercise proceeds.

## Results

### 1. Classic ESP32_V1 current ESP32_IDF4

Bench state:

- target: classic `ESP32_V1`
- firmware line: `ESP32_IDF4`
- reported board: `ESP32_IDF4`
- reported version: `2v29.102`
- port: `/dev/ttyUSB0`
- piggyback wired onto `D13`
- original `D13` `DQ` connection removed and replaced by the piggyback
- harness-mounted `DS18B20` devices removed
- `DS2413` removed

Observed piggyback ROMs:

- `2838498700e8136b`
- `28253387008562df`

#### Shared REPL functional test

Command:

- `python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js --port /dev/ttyUSB0 --baud 115200 --timeout 15`

Observed result:

- search passed cleanly on all `6/6` scans
- both device ROMs were found consistently
- both returned scratchpads produced plausible temperatures
- both returned scratchpads failed CRC

Representative scratchpads:

- `d50100017fe13cab48`
- `d50100017fe13caa0b`

Practical interpretation:

- the piggyback improved the immediate shared-test search result on this target
- but the test still failed because DS18B20 read integrity remained poor

#### Search stability soak

Command:

- `python3 tools/common/onewire_soak_generic.py --port /dev/ttyUSB0 --baud 115200 --pin D13 --scans 50`

Summary:

- `48/50` scans returned the full two-device set
- `1/50` scan returned one ROM only
- `1/50` scan returned `[]`

ROM appearances:

- `2838498700e8136b` seen `49/50`
- `28253387008562df` seen `48/50`

Practical interpretation:

- search behaviour on the piggyback bus is better than the earlier harness-bus
  result
- however, search is still not fully deterministic on classic `ESP32_V1`
  `ESP32_IDF4`

#### Addressed DS18B20 read soak

Command:

- `python3 tools/common/ds18b20_read_soak.py --port /dev/ttyUSB0 --pin D13 --baud 115200 --runs 20 --family-prefix 28`

Initial ROMs:

- `["2838498700e8136b","28253387008562df"]`

Summary:

- `20` runs requested
- helper payload parsing missed `3` runs because of REPL echo ordering
- across the `17` parsed runs, only `2` were fully clean
- soak summary reported `failures=18`
- sensor temperatures remained plausible throughout

Representative scratchpads:

- sensor `2838498700e8136b`
  - good CRC example: `d30100007fe13caa98`
  - bad CRC example: `d30100017fe13caa98`
  - bad CRC example: `d30100007fe13daa99`
- sensor `28253387008562df`
  - good CRC example: `d50100007fe13caa0b`
  - bad CRC example: `d70100007fe13caace`
  - bad CRC example: `d50110007fe13caa0b`

Observed temperature ranges from parsed runs:

- sensor 0: `29.1875C .. 29.3125C`
- sensor 1: `29.3125C .. 29.4375C`

Practical interpretation:

- the piggyback bus did not resolve the main classic `ESP32_V1` `ESP32_IDF4`
  limitation
- discovery improved more than addressed DS18B20 read integrity
- the current result still supports the earlier conclusion that classic
  `ESP32_V1` `ESP32_IDF4` remains only partially usable for DS18B20-style
  OneWire work

### 2. Classic ESP32_V1 current legacy build

Bench state:

- target: classic `ESP32_V1`
- firmware line: legacy `ESP32`
- reported board: `ESP32`
- reported version: `2v29.97`
- reported commit: `d3d33f4aa`
- port: `/dev/ttyUSB0`
- same piggyback remained wired onto `D13`
- original `D13` `DQ` connection remained replaced by the piggyback
- harness-mounted `DS18B20` devices removed
- `DS2413` removed

Observed piggyback ROMs:

- `2838498700e8136b`
- `28253387008562df`

#### Shared REPL functional test

Command:

- `python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js --port /dev/ttyUSB0 --baud 115200 --timeout 15`

Observed result:

- only `3/6` search scans returned the full two-device set
- `3/6` scans returned `[]`
- both scratchpads came back as `ffffffffffffffffff`
- both scratchpads failed CRC and failed the non-all-`ff` data check

Practical interpretation:

- on the same piggyback bus, legacy is materially worse than the current
  `ESP32_IDF4` build
- the failure is not only CRC noise; readback can collapse to all `ff`

#### Search stability soak

Command:

- `python3 tools/common/onewire_soak_generic.py --port /dev/ttyUSB0 --baud 115200 --pin D13 --scans 50`

Summary:

- `22/50` scans returned the full two-device set
- `13/50` scans returned one ROM only
- `15/50` scans returned `[]`

ROM appearances:

- `2838498700e8136b` seen `35/50`
- `28253387008562df` seen `22/50`

Practical interpretation:

- legacy search stability on the piggyback bus is much poorer than the current
  `ESP32_IDF4` result
- the current localized quiet-timing work appears to improve search behaviour
  substantially on classic `ESP32_V1`

#### Addressed DS18B20 read soak

Command:

- `python3 tools/common/ds18b20_read_soak.py --port /dev/ttyUSB0 --pin D13 --baud 115200 --runs 20 --family-prefix 28`

Initial ROMs:

- `["2838498700e8136b","28253387008562df"]`

Summary:

- `20` runs requested and parsed
- soak summary reported `failures=18`
- many runs still produced plausible temperatures, but integrity remained poor
- several runs produced all-`ff` scratchpads
- one run produced an obviously implausible `284.5625C` result

Representative scratchpads:

- sensor `2838498700e8136b`
  - good CRC example: `c90100007fe13caa60`
  - bad CRC example: `c90100007fe13dab60`
  - bad/implausible example: `c91100007fe13caa60`
  - all-`ff` example: `ffffffffffffffffff`
- sensor `28253387008562df`
  - good CRC example: `cb0100007fe13caae6`
  - bad CRC example: `cb0100047fe13caae6`
  - bad CRC example: `cd0100007fe13caa36`
  - corrupted all-`ff` example: `fffffffffdffffffff`

Observed temperature ranges:

- sensor 0: `-0.0625C .. 284.5625C`
- sensor 1: `-0.0625C .. 28.8125C`

Practical interpretation:

- legacy addressed DS18B20 reads remain badly degraded on the piggyback bus
- compared with current `ESP32_IDF4`, legacy shows a broader and more severe
  failure pattern:
  - more discovery failures
  - more all-`ff` scratchpads
  - occasional obviously implausible values

### 3. Classic ESP32_V1 legacy PR-scope quiet-timing build

Bench state:

- target: classic `ESP32_V1`
- firmware line: legacy `ESP32`
- build provenance:
  - repo `/home/simon/MaBecker/Espruino_master_legacy_baseline`
  - branch `fix/esp32-onewire-quiet-timing-pr`
  - local uncommitted patch containing only the ESP32 quiet-timing change
- reported board: `ESP32`
- reported version: `2v29.97`
- reported commit string remained `d3d33f4aa` because the PR-scope patch had
  not yet been committed in the test worktree
- port: `/dev/ttyUSB0`
- same piggyback remained wired onto `D13`
- original `D13` `DQ` connection remained replaced by the piggyback
- harness-mounted `DS18B20` devices removed
- `DS2413` removed

Observed piggyback ROMs:

- `2838498700e8136b`
- `28253387008562df`

Patch scope under test:

- local ESP32 `jshInterruptOff/jshInterruptOn` override inside
  `src/jswrap_onewire.c`
- reset-window protection re-enabled in `OneWireReset()`
- no `searchDebug()` instrumentation
- no additional helper changes

#### Shared REPL functional test

Command:

- `python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js --port /dev/ttyUSB0 --baud 115200 --timeout 15`

Observed result:

- full pass
- `6/6` search scans returned the full two-device set
- both scratchpads had valid CRC
- both temperatures were plausible

Representative scratchpads:

- `c70100007fe13caad9`
- `c90100007fe13caa60`

Practical interpretation:

- on the same piggyback bus, the quiet-timing-only legacy PR build converted
  the shared functional test from a clear fail into a clean pass

#### Search stability soak

Command:

- `python3 tools/common/onewire_soak_generic.py --port /dev/ttyUSB0 --baud 115200 --pin D13 --scans 50`

Summary:

- `50/50` scans returned the full two-device set
- `0/50` one-device scans
- `0/50` empty scans

ROM appearances:

- `2838498700e8136b` seen `50/50`
- `28253387008562df` seen `50/50`

Practical interpretation:

- the localized quiet-timing change appears to solve the major legacy search
  instability on this classic `ESP32_V1` piggyback setup

#### Addressed DS18B20 read soak

Command:

- `python3 tools/common/ds18b20_read_soak.py --port /dev/ttyUSB0 --pin D13 --baud 115200 --runs 20 --family-prefix 28`

Initial ROMs:

- `["2838498700e8136b","28253387008562df"]`

Summary:

- `20` runs requested and parsed
- soak summary reported `failures=10`
- sensor 0 was good in most runs
- sensor 1 still alternated between clean reads and CRC-bad but plausible
  scratchpads
- no all-`ff` scratchpads were seen in this run
- no obviously implausible temperatures were seen in this run

Representative scratchpads:

- sensor `2838498700e8136b`
  - good CRC example: `c70100007fe13caad9`
  - bad CRC example: `c90100007fe13caa23`
- sensor `28253387008562df`
  - good CRC example: `c90100007fe13caa60`
  - bad CRC example: `cb0100007fe13caaa5`

Observed temperature ranges:

- sensor 0: `28.4375C .. 28.5625C`
- sensor 1: `28.5625C .. 28.6875C`

Practical interpretation:

- the quiet-timing-only legacy PR build gives a major improvement over legacy
  baseline on the same piggyback bus
- the improvement is strongest in search stability and in eliminating the
  gross all-`ff` / implausible read failures seen on baseline legacy
- however, the current 20-run addressed-read soak still shows remaining CRC
  weakness on one sensor, so this result should be described as a strong
  improvement rather than a complete DS18B20 close-out for classic legacy
  ESP32

### 4. Classic ESP32_V1 ESP32_IDF4 PR-scope quiet-timing build

Bench state:

- target: classic `ESP32_V1`
- firmware line: `ESP32_IDF4`
- build provenance:
  - repo `/home/simon/MaBecker/Espruino_upstream_idf4`
  - branch `fix/esp32-idf4-onewire-quiet-timing`
  - branch head `a8d426a80`
- port: `/dev/ttyUSB0`
- same piggyback remained wired onto `D13`
- original `D13` `DQ` connection remained replaced by the piggyback
- harness-mounted `DS18B20` devices removed
- `DS2413` removed

Observed piggyback ROMs:

- `2838498700e8136b`
- `28253387008562df`

Patch scope under test:

- local ESP32 `jshInterruptOff/jshInterruptOn` override inside
  `src/jswrap_onewire.c`
- reset-window protection in `OneWireReset()`
- no `searchDebug()` instrumentation
- no open-drain-preservation helper

Important provenance note:

- the build output identified the image as `RELEASE_2V29-93-ga8d426a80`
- however, the REPL still reported:
  - `process.version = 2v29.102`
  - `process.env.GIT_COMMIT = f3205c09f`
- this mismatch has been seen before on this IDF4 line, so the branch/build
  provenance for this run should be taken from the explicit build and flash
  path rather than the REPL metadata alone

#### Shared REPL functional test

Command:

- `python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js --port /dev/ttyUSB0 --baud 115200 --timeout 15`

Observed result:

- `4/6` search scans returned the full two-device set
- `2/6` scans returned one ROM only
- both scratchpads produced plausible temperatures
- both scratchpads failed CRC

Representative scratchpads:

- `c70101017fe13dab9b`
- `c90101017fe13dab61`

Practical interpretation:

- on this classic `ESP32_V1` piggyback setup, the minimal IDF4 PR-scope branch
  did not achieve a shared-test pass

#### Search stability soak

Command:

- `python3 tools/common/onewire_soak_generic.py --port /dev/ttyUSB0 --baud 115200 --pin D13 --scans 50`

Summary:

- `45/50` scans returned the full two-device set
- `4/50` scans returned one ROM only
- `1/50` scan returned `[]`

ROM appearances:

- `2838498700e8136b` seen `49/50`
- `28253387008562df` seen `45/50`

Practical interpretation:

- the minimal IDF4 quiet-timing branch gave usable but not clean search
  behaviour on this setup
- compared with the current helper-enabled `ESP32_IDF4` branch tested earlier
  in this note, it was not an improvement

#### Addressed DS18B20 read soak

Command:

- `python3 tools/common/ds18b20_read_soak.py --port /dev/ttyUSB0 --pin D13 --baud 115200 --runs 20 --family-prefix 28`

Initial ROMs:

- `["2838498700e8136b","28253387008562df"]`

Summary:

- `20` runs requested
- helper payload parsing missed `3` runs because of REPL echo ordering
- across the parsed runs, every run still failed CRC integrity checks
- soak summary reported `failures=20`
- temperatures remained plausible but the scratchpads were consistently
  corrupted

Representative scratchpads:

- sensor `2838498700e8136b`
  - `c60101017fe13dab9b`
  - `c70101017fe13dab9b`
  - `c70101017fe13dabd9`
- sensor `28253387008562df`
  - `c80101017fe13dab23`
  - `c90101017fe13dab61`
  - `c80101017fe93dab23`

Observed temperature ranges from parsed runs:

- sensor 0: `28.3750C .. 28.4375C`
- sensor 1: `28.5000C .. 28.5625C`

Practical interpretation:

- on classic `ESP32_V1` `ESP32_IDF4`, the minimal quiet-timing-only branch did
  not solve the addressed DS18B20 integrity problem on the piggyback bus
- unlike the legacy PR-scope branch, this IDF4 PR-scope branch did not convert
  the setup into a convincing DS18B20 pass case

### 5. Classic ESP32_V1 ESP32_IDF4 quiet-timing plus open-drain preservation

Bench state:

- target: classic `ESP32_V1`
- firmware line: `ESP32_IDF4`
- build provenance:
  - repo `/home/simon/MaBecker/Espruino_upstream_idf4`
  - branch `fix/esp32-idf4-onewire-quiet-timing`
  - branch head `a8d426a80`
  - local source addition in `src/jswrap_onewire.c`:
    - preserve `JSHPINSTATE_GPIO_OUT_OPENDRAIN_PULLUP` before reset, read, and
      write
- build banner during clean rebuild: `RELEASE_2V29-93-ga8d426a80-dirt`
- reported board: `ESP32_IDF4`
- reported version: `2v29.93`
- reported commit: `a8d426a80`
- port: `/dev/ttyUSB0`
- same piggyback remained wired onto `D13`
- original `D13` `DQ` connection remained replaced by the piggyback
- harness-mounted `DS18B20` devices removed
- `DS2413` removed

Observed piggyback ROMs:

- `2838498700e8136b`
- `28253387008562df`

Patch scope under test:

- local ESP32 `jshInterruptOff/jshInterruptOn` override inside
  `src/jswrap_onewire.c`
- reset-window protection in `OneWireReset()`
- open-drain-preservation helper used before reset, read, and write
- no `searchDebug()` instrumentation

#### Shared REPL functional test

Command:

- `python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js --port /dev/ttyUSB0 --baud 115200 --timeout 15`

Observed result:

- PASS
- all `6/6` search scans returned the full two-device set
- both scratchpads passed CRC
- both temperatures were plausible

Representative scratchpads:

- `c70100007fe13caad9`
- `c90100007fe13caa60`

Practical interpretation:

- on the classic `ESP32_V1` piggyback setup, adding open-drain preservation on
  top of quiet timing converted the shared DS18B20 block-5 test into a clean
  pass case

#### Search stability soak

Command:

- `python3 tools/common/onewire_soak_generic.py --port /dev/ttyUSB0 --baud 115200 --pin D13 --scans 50`

Summary:

- `48/50` scans returned the full two-device set
- `1/50` scan returned one ROM only
- `1/50` scan returned `[]`

ROM appearances:

- `2838498700e8136b` seen `49/50`
- `28253387008562df` seen `48/50`

Practical interpretation:

- the search soak did not improve beyond the earlier helper-enabled
  `ESP32_IDF4` branch result on this setup
- however, it was clearly better than the minimal quiet-timing-only PR branch

#### Addressed DS18B20 read soak

Command:

- `python3 tools/common/ds18b20_read_soak.py --port /dev/ttyUSB0 --pin D13 --baud 115200 --runs 20 --family-prefix 28`

Initial ROMs:

- `["2838498700e8136b","28253387008562df"]`

Summary:

- `20` runs requested
- helper payload parsing missed `1` run because of REPL echo ordering
- one parsed run had a single CRC failure on sensor `28253387008562df`
- soak summary reported `failures=2`
- the remaining parsed runs were CRC-clean and plausible

Representative scratchpads:

- sensor `2838498700e8136b`
  - `c70100007fe13caad9`
  - `c80100007fe13caa23`
- sensor `28253387008562df`
  - `c90100007fe13caa60`
  - `ca0100007fe13caaa5`
  - one CRC-fail example: `c90100007fe53caa60`

Observed temperature ranges from parsed runs:

- sensor 0: `28.4375C .. 28.5000C`
- sensor 1: `28.5625C .. 28.6250C`

Practical interpretation:

- on classic `ESP32_V1` `ESP32_IDF4`, adding open-drain preservation on top of
  quiet timing made a major improvement to addressed DS18B20 read integrity
- this result is materially better than both:
  - the minimal quiet-timing-only IDF4 branch
  - the earlier helper-enabled IDF4 branch result recorded above
- the remaining weakness is now small enough that the dominant limitation on
  this setup appears to be intermittent search rather than persistent
  scratchpad corruption

### 6. Classic ESP32_V1 ESP32_IDF4 improved build on restored mixed harness bus

Bench state:

- target: classic `ESP32_V1`
- firmware line: `ESP32_IDF4`
- build provenance:
  - repo `/home/simon/MaBecker/Espruino_upstream_idf4`
  - branch `fix/esp32-idf4-onewire-quiet-timing`
  - branch head `a8d426a80`
  - local source addition in `src/jswrap_onewire.c`:
    - preserve `JSHPINSTATE_GPIO_OUT_OPENDRAIN_PULLUP` before reset, read, and
      write
- reported board: `ESP32_IDF4`
- reported version: `2v29.93`
- reported commit: `a8d426a80`
- port: `/dev/ttyUSB0`
- piggyback board left fitted
- harness-mounted soldered `DS18B20` devices removed
- normal harness `D13` connection restored, so the piggyback now sits on the
  full harness OneWire network rather than an isolated local bus
- `DS2413` refitted

Observed ROMs on the restored mixed bus:

- `2838498700e8136b`
- `28253387008562df`
- `3a27d15e000000f2`

Interpretation note:

- this setup is no longer directly comparable with the isolated piggyback-only
  measurements above
- it is instead a realism check for the improved firmware on the mixed-family
  harness bus

#### Shared REPL functional test

Command:

- `python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_ds18b20_basic.js --port /dev/ttyUSB0 --baud 115200 --timeout 15`

Observed result:

- all `6/6` scans returned the same stable three-ROM set
- the two `DS18B20` scratchpads both passed CRC
- the extra third ROM caused the existing `DS18B20`-only shared test to fail
  its exact-two-device assertions

Observed ROM set:

- `["2838498700e8136b","28253387008562df","3a27d15e000000f2"]`

Representative scratchpads:

- `cf0100007fe13caaf3`
- `d10100007fe13caa1e`

Practical interpretation:

- this was not a OneWire search-collapse result
- instead it showed that the current shared block-5 DS18B20 test is scoped for
  a two-`DS18B20` bus and is therefore not the correct pass/fail test once the
  mixed-family harness bus is restored

#### Search stability soak

Command:

- `python3 tools/common/onewire_soak_generic.py --port /dev/ttyUSB0 --baud 115200 --pin D13 --scans 50`

Summary:

- `47/50` scans returned the full three-device set
- `1/50` scan returned one ROM only
- `2/50` scans returned `[]`

ROM appearances:

- `2838498700e8136b` seen `48/50`
- `28253387008562df` seen `47/50`
- `3a27d15e000000f2` seen `47/50`

Practical interpretation:

- the improved `ESP32_IDF4` build carries most of its search improvement onto
  the restored mixed-family harness bus
- the mixed bus is still not perfectly deterministic, but it is much closer to
  usable harness behaviour than the earlier classic ESP32 IDF4 results

#### Addressed DS18B20 read soak

Command:

- `python3 tools/common/ds18b20_read_soak.py --port /dev/ttyUSB0 --pin D13 --baud 115200 --runs 20 --family-prefix 28`

Initial ROMs:

- all ROMs: `["2838498700e8136b","28253387008562df","3a27d15e000000f2"]`
- filtered DS18B20 ROMs: `["2838498700e8136b","28253387008562df"]`

Summary:

- `20` runs requested
- helper payload parsing missed `5` runs because of REPL echo ordering
- among the parsed runs, `2` runs showed DS18B20 corruption on sensor
  `28253387008562df`
- soak summary reported `failures=7`

Representative scratchpads:

- sensor `2838498700e8136b`
  - `ce0100007fe13caab0`
  - `cd0100007fe13caa75`
- sensor `28253387008562df`
  - good: `d00100007fe13caa5d`
  - good: `cf0100007fe13caaf3`
  - bad: `ffffffffffffffffff`
  - bad: `d00100007fe13cab5d`

Observed temperature ranges from parsed runs:

- sensor 0: `28.8125C .. 28.8750C`
- sensor 1: `28.9375C .. 29.0000C` in clean reads

Practical interpretation:

- reintroducing the full harness OneWire network and `DS2413` degraded
  DS18B20 addressed-read robustness compared with the isolated piggyback-only
  bus
- even so, the mixed-bus result still looks materially better than the older
  classic `ESP32_IDF4` harness behaviour that motivated this investigation
- the restored harness therefore appears to have become a mixed-device margin
  case rather than a straightforward OneWire failure case

#### Prototype shared mixed-device REPL test

To avoid misusing the DS18B20-only shared test on the restored mixed bus, a new
shared REPL file was then created:

- `tests/repl/onewire_block5/onewire_mixed_ds18b20_ds2413.js`

Intent:

- keep this in block 5 as a shared-bus coexistence test
- verify mixed-family `OneWire.search()` stability on the restored harness bus
- read the two DS18B20 scratchpads
- issue a minimal DS2413 access-write/status sequence
- avoid block-6-only GPIO feedback assertions

Command:

- `python3 tools/repl/run_test.py tests/repl/onewire_block5/onewire_mixed_ds18b20_ds2413.js --port /dev/ttyUSB0 --baud 115200 --timeout 15`

Observed result:

- PASS
- all `6/6` search scans returned the stable three-ROM set
- both DS18B20 scratchpads passed CRC with plausible temperatures
- the DS2413 access-write sequence returned:
  - `0xFF -> confirm aa, status 0f`
  - `0xFC -> confirm aa, status f0`
  - `0xFF -> confirm aa, status 0f`

Observed ROM set:

- `["2838498700e8136b","28253387008562df","3a27d15e000000f2"]`

Representative DS18B20 scratchpads:

- `c90100007fe13caa60`
- `cb0100007fe13caae6`

Practical interpretation:

- the mixed-family shared REPL test shape is valid for the restored harness bus
- on this run, the improved `ESP32_IDF4` build supported:
  - stable three-device discovery
  - clean DS18B20 addressed reads
  - clean minimal DS2413 command/status exchange
- this gives a better shared functional test entry point for the mixed harness
  case than continuing to force the two-DS18B20 test against a three-device bus
