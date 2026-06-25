# Portable REPL Tests

This directory is reserved for community-shareable Espruino JavaScript tests.

The intended split is:

- `tests/repl/`: plain Espruino JS that can be pasted into a REPL or uploaded
  with the Espruino Web IDE
- `tools/`: Python automation and diagnostics that send those tests to a board,
  inject target configuration, and parse `PASS` / `FAIL` output

Target-specific pin choices should live in target maps or a small `CFG` block,
not deep inside the test logic. That keeps the same logical tests usable on the
ESP32-C3 harness, the classic ESP32 DevKitC V4 harness, and future ESP32-family
targets.
