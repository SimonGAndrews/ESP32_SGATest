# Wiring Tests

This directory contains harness wiring-test runners.

The purpose of these tests is to prove that a specific hardware test block is
wired correctly on a specific harness target before wider firmware conclusions
are made.

These tests are target-orientated in directory structure:

- `esp32_c3/`
- `esp32_v1/`

Each target directory contains runners for the wiring and signal paths that are
actually present on that harness.

Typical examples are:

- `gpio_block1.py`
  proves the basic GPIO loopback wiring used for `digitalWrite`,
  `digitalRead`, watches, and pulse observation
- `uart_block6.py`
  proves the non-console UART crosslink wiring on the classic ESP32 harness
- `grove_i2c_block8.py`
  proves that the external Grove I2C connector can reach an external device on
  the same bus as the onboard harness I2C block

These runners are intentionally wiring-focused.

They are not intended to be the final portable REPL test suite. Their role is
to support harness bring-up, bench validation, and investigation work with
clear target-specific pin maps and selector expectations.

Underlying schematics and hardware reference material can be found under
[Hardware](/home/simon/MaBecker/ESP32_SGATest/Hardware).
