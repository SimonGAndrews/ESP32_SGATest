# Initial REPL Runs During Development

This note checks that the new shared test structure and developed JavaScript
tests can be executed directly in the Espruino Web IDE.

The JS test scripts were pasted directly into the Web IDE right-side editor
panel and uploaded to RAM on the MCU. Execution started immediately after
upload.

The following results are from the initial four `gpio_block1` tests. Sample run results from both developed harnesses follow:

## board=ESP32_IDF4

TEST=gpio_readwrite_basic
TARGET=ESP32_V1
INFO board=ESP32_IDF4
INFO api=pinMode,digitalWrite,digitalRead
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
PASS gpio_loop_a_low got=0 expected=0
PASS gpio_loop_a_high got=1 expected=1
PASS gpio_loop_b_low got=0 expected=0
PASS gpio_loop_b_high got=1 expected=1
METRIC checks_total=4
METRIC checks_passed=4
METRIC checks_failed=0
METRIC loop_pairs_tested=2
DONE=gpio_readwrite_basic


TEST=gpio_watch_edges
TARGET=ESP32_V1
INFO board=ESP32_IDF4
INFO api=setWatch,clearWatch,pinMode,digitalWrite
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
METRIC gpio_watch_loop_a_callbacks=3
PASS gpio_watch_loop_a_both_states got=[1,0,1] expected=[1,0,1]
PASS gpio_watch_loop_a_clear got=3 expected=3
METRIC gpio_watch_loop_b_rising_callbacks=2
PASS gpio_watch_loop_b_rising_states got=[1,1] expected=[1,1]
METRIC gpio_watch_loop_b_falling_callbacks=2
PASS gpio_watch_loop_b_falling_states got=[0,0] expected=[0,0]
METRIC checks_total=4
METRIC checks_passed=4
METRIC checks_failed=0
DONE=gpio_watch_edges

TEST=gpio_pulse
TARGET=ESP32_V1
INFO board=ESP32_IDF4
INFO api=digitalPulse,setWatch,clearWatch,pinMode,digitalWrite
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
METRIC gpio_pulse_write_callbacks=2
PASS gpio_pulse_write_states got=[1,0] expected=[1,0]
METRIC gpio_pulse_callbacks=4
PASS gpio_pulse_states got=[1,0,1,0] expected=[1,0,1,0]
PASS gpio_pulse_final_low got=0 expected=0
METRIC checks_total=3
METRIC checks_passed=3
METRIC checks_failed=0
DONE=gpio_pulse

TEST=gpio_shiftout
TARGET=ESP32_V1
INFO board=ESP32_IDF4
INFO api=shiftOut,setWatch,clearWatch,pinMode,digitalRead
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
METRIC gpio_shiftout_clock_edges=8
METRIC gpio_shiftout_bits_seen=[1,0,1,0,0,1,0,1]
PASS gpio_shiftout_clock_count got=8 expected=8
PASS gpio_shiftout_bits got=[1,0,1,0,0,1,0,1] expected=[1,0,1,0,0,1,0,1]
PASS gpio_shiftout_data_final got=1 expected=1
METRIC checks_total=3
METRIC checks_passed=3
METRIC checks_failed=0
DONE=gpio_shiftout

### Forced Failure By Removing Selector Links D33 And D26

This run intentionally removed the physical `SEL_D33` and `SEL_D26` loopback
links in order to demonstrate the failure shape.

The structured output still prints the nominal expected selector setting from
the test configuration, so the mismatch here is deliberate and part of the
bench experiment.

TEST=gpio_readwrite_basic
TARGET=ESP32_V1
INFO board=ESP32_IDF4
INFO api=pinMode,digitalWrite,digitalRead
INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness
INFO mode=ESP32_BASELINE_HARDWARE
INFO console=UART0 via board USB-UART on D1/D3
INFO selectors=SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open
PASS gpio_loop_a_low got=0 expected=0
FAIL gpio_loop_a_high got=0 expected=1
PASS gpio_loop_b_low got=0 expected=0
FAIL gpio_loop_b_high got=0 expected=1
METRIC checks_total=4
METRIC checks_passed=2
METRIC checks_failed=2
METRIC loop_pairs_tested=2
DONE=gpio_readwrite_basic

## board=ESP32C3_IDF4

TEST=gpio_readwrite_basic
TARGET=ESP32_C3
INFO board=ESP32C3_IDF4
INFO api=pinMode,digitalWrite,digitalRead
INFO harness=ESP32-C3-DevKitC-02 harness
INFO mode=C3_BASELINE_GPIO
INFO console=UART0 via board USB-UART on D20/D21
INFO selectors=SEL_D1=a2-b2 SEL_D2=a2-b2 SEL_D3=a2-b2 SEL_D4=a2-b2 J10=open SEL_D08=open SEL_D0=open
PASS gpio_loop_a_low got=0 expected=0
PASS gpio_loop_a_high got=1 expected=1
PASS gpio_loop_b_low got=0 expected=0
PASS gpio_loop_b_high got=1 expected=1
METRIC checks_total=4
METRIC checks_passed=4
METRIC checks_failed=0
METRIC loop_pairs_tested=2
DONE=gpio_readwrite_basic
