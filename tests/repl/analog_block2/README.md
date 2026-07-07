# Analog Block 2 Functional Tests

This directory groups shared functional REPL tests that use the analog/PWM
feedback hardware context of harness block 2.

The block provides a filtered feedback node driven by a target output and read
back through a target ADC input.

Intended test set:

- `analog_read_levels.js`
- `analog_pwm_feedback.js`

These tests should stay split by API scope so failures remain easy to isolate
between basic ADC path problems and PWM-generation behaviour.
