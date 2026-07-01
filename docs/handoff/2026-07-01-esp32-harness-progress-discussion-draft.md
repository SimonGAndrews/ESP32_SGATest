# ESP32 Harness Progress Discussion Draft

A quick progress note on the ESP32 Espruino harness work.

The aim has been to build simple wirewrap hardware test harnesses for the ESP
ports, so target behavior can be checked on the bench in a repeatable way while
work continues on IDF5, and while comparing results across targets and IDF
versions.

The work is being supported heavily by Codex AI within VS Code.

The harness work is here:

<https://github.com/SimonGAndrews/ESP32_SGATest>

Status at this point is:

- both harness boards are built
- the harness wiring-check test scripts are completed

The two current harnesses are:

- ESP32-C3-DevKitC-02
- classic ESP32 DevKitC V4 style board

The main value is repeatable, fuller functional coverage across ESP32-family
targets and across IDF4 and IDF5 builds, rather than one-off ad hoc checks.

The functional tests are intended to be usable in two ways from the same
`ESP32_SGATest` codebase:

- as individual Espruino JavaScript test scripts
- as test suites executed by Codex

Across the two boards, the current target set covered by the work is:

- ESP32
- ESP32_IDF4
- ESP32_IDF5
- ESP32C3_IDF4
- ESP32C3_IDF5

The integrated test devices, taking the superset across both harnesses, are:

- MCP3008 for SPI ADC checks
- MCP23008 for I2C GPIO expander, feedback, and interrupt checks
- DS18B20 devices for OneWire testing
- DS2413 for commandable OneWire GPIO testing
- W25Qxx / W25xxx SPI flash for shared SPI bus checks

The harnesses support repeatable functional testing of GPIO, analog/PWM
feedback, SPI, I2C, OneWire, UART crosslink, and selected external connector
paths. They also give us a way to rerun regression tests on ESP targets under
IDF4 as well as IDF5.

The next aim is to keep extending the functional coverage, including Espruino
Bluetooth and WiFi communication tests across the boards.
