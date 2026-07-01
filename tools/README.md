# Tooling Map

This directory contains automation and diagnostic utilities used to run
Espruino REPL tests, capture evidence, and support investigations.

The long-term direction is to keep reusable test logic separate from
target-specific pin/mode configuration.

## `common/`

Reusable tools that are not tied to one harness target.

Current examples:

- OneWire search/debug diagnostics
- generic OneWire soak testing
- DS18B20 read soak testing

## `targets/`

Target-specific automation scripts. These usually encode a particular harness
pin allocation, selector state, or bring-up sequence.

Current targets:

- `esp32_c3/` - scripts originally developed for the ESP32-C3-DevKitC-02
  harness
- `esp32_v1/` - first-pass scripts for the classic ESP32 DevKitC V4 harness

Future ESP32-family work should prefer a shared runner plus target maps, rather
than copying whole scripts for each board.

## `experiments/`

One-off or comparison tools used during investigations. These are useful
evidence generators, but they are not necessarily part of the accepted harness
test suite.

Current experiment areas:

- `pico/` - Pico comparison scripts used during watch/debounce and pulse
  investigation work
