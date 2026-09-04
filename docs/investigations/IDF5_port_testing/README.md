# ESP32 IDF5 Port Investigations

This directory contains the detailed source, build and firmware-attribution
records supporting the concise reports in `docs/IDF5_port_testing/`.

The dated Markdown files record the initial functional comparisons, the
candidate corrections and their pull-request preparation. The build-log
subdirectories retain raw terminal evidence from the corresponding build
investigations:

- `ESP32_build/` — classic `BOARD=ESP32` build output;
- `IDF4_build/` — ESP32 IDF4 and ESP32-C3 IDF4 build failures;
- `IDF5_build/` — classic `BOARD=ESP32_IDF5` build failure.

The raw logs include checkout-specific paths because those paths are part of
the recorded build environment. They are evidence, not portable commands.
