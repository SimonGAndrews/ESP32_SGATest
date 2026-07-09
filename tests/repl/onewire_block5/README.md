# `onewire_block5` Functional Tests

This directory contains shared functional REPL tests that use the DS18B20
OneWire hardware context of harness block 5.

Current shared file:

- `onewire_ds18b20_basic.js`
- `onewire_mixed_ds18b20_ds2413.js`

Precondition note:

- this block is intended for the DS18B20 use case
- if a removable DS2413 breakout is installed on the same OneWire bus, the
  test must either treat that as an additional expected device or the breakout
  should be removed while block 5 DS18B20-only validation is being run
- `onewire_mixed_ds18b20_ds2413.js` is the V1 mixed-family coexistence case:
  two DS18B20 devices plus one fitted DS2413 on the shared harness OneWire bus,
  without requiring the block 6 feedback selector state

Target-specific wiring scripts remain the authoritative regression references until
the shared OneWire files are added.
