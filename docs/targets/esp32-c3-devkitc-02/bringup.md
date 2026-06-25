# ESP32-C3 REPL Bring-Up Checks

This document is a manual, REPL-driven bring-up sequence for the
ESP32-C3-DevKitC-02 harness.

It assumes:

- board under test is the ESP32-C3-DevKitC-02
- Espruino firmware on the board is known-good
- initial control path is the board USB-UART REPL
- tests use Espruino `Dxx` names

Run one hardware block at a time. Change selectors only for the active mode.

## Block 1: Baseline GPIO Loopbacks

Mode:

- `C3_BASELINE_GPIO`

Required selector state:

| Selector or wiring | Position |
|---|---|
| `SEL_D1` | `a2-b2` |
| `SEL_D2` | `a2-b2` |
| `SEL_D3` | `a2-b2` |
| `SEL_D4` | `a2-b2` |

Required wiring:

- loop A: `D1 -> R5 470R -> D2`
- loop B: `D3 -> R7 470R -> D4`

Must be open / not selected:

- `SEL_D0`
- `SEL_D08`
- `SEL_D10`
- `SEL_D3` UART and SPI positions
- `SEL_D4` UART and I2C positions
- `J10` signal shunts

### REPL Sanity Check

Enter:

```js
process.env.BOARD
process.version
```

Expected:

- board identifies as the expected ESP32-C3 Espruino target
- version reports the flashed build, for example `2v29`

### Helper Functions

Paste once:

```js
function report(name, ok, extra) {
  console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " " + extra : ""));
}

function expectEq(name, actual, expected) {
  report(name, actual === expected, "got=" + actual + " expected=" + expected);
}

function clearWatchSafe(id) {
  if (id !== undefined) clearWatch(id);
}
```

### Loop A Static Readback

Paste:

```js
pinMode(D1, "output");
pinMode(D2, "input");

digitalWrite(D1, 0);
expectEq("LoopA low", digitalRead(D2), 0);

digitalWrite(D1, 1);
expectEq("LoopA high", digitalRead(D2), 1);
```

Expected:

- both checks pass

If `LoopA low` fails, suspect wrong selector position, missing loop A wire, bad
`R5` path, or D2 not actually on the loop input position.

If `LoopA high` fails, suspect open circuit, swapped selector, or D1 not
driving the intended node.

### Loop B Static Readback

Paste:

```js
pinMode(D3, "output");
pinMode(D4, "input");

digitalWrite(D3, 0);
expectEq("LoopB low", digitalRead(D4), 0);

digitalWrite(D3, 1);
expectEq("LoopB high", digitalRead(D4), 1);
```

Expected:

- both checks pass

### Loop A Edge Detection

Paste:

```js
var wa;
var edgesA = [];
pinMode(D1, "output");
pinMode(D2, "input");
digitalWrite(D1, 0);

wa = setWatch(function(e) {
  edgesA.push({state:digitalRead(D2), time:e.time, last:e.lastTime});
}, D2, {repeat:true, edge:"both", debounce:1});

digitalWrite(D1, 1);
digitalWrite(D1, 0);
digitalWrite(D1, 1);

setTimeout(function() {
  clearWatchSafe(wa);
  console.log(edgesA);
  report("LoopA edge count", edgesA.length >= 2, "count=" + edgesA.length);
}, 50);
```

Expected:

- edge array prints transitions
- edge count passes

The exact count can vary slightly if the REPL re-runs code or previous state
was left high, but you should clearly see both high and low transitions.

### Loop B Pulse Test

Paste:

```js
var wb;
var seenB = 0;
pinMode(D3, "output");
pinMode(D4, "input");
digitalWrite(D3, 0);

wb = setWatch(function() {
  seenB++;
}, D4, {repeat:true, edge:"rising", debounce:1});

digitalPulse(D3, 1, [20, 20, 20]);

setTimeout(function() {
  clearWatchSafe(wb);
  report("LoopB pulse/watch", seenB >= 2, "count=" + seenB);
}, 150);
```

Expected:

- at least two rising edges seen

## Pass Criteria For Block 1

Treat the baseline digital loopback block as good if:

- REPL is stable on board USB-UART
- `D1 -> D2` reads back low and high correctly
- `D3 -> D4` reads back low and high correctly
- watches on `D2` and `D4` see real transitions from local drive
- no unexpected reset or boot instability appears while using these pins after boot

## Suggested Next Block

After this block passes, move to:

- `C3_ANALOG_PWM`

That validates:

- `D8` PWM path through the 10k link
- `ANALOG_FB`
- `D0` ADC input selection

## Block 2: Analog Feedback

Mode:

- `C3_ANALOG_PWM`

Required selector state:

| Selector or wiring | Position |
|---|---|
| `SEL_D0` | `ADC_IN` |
| `SEL_D08` | fitted / closed |

Allowed to remain in place:

- `SEL_D1`, `SEL_D2`, `SEL_D3`, `SEL_D4` in default baseline positions

Must be open / not selected:

- `SEL_D0` must not be on `ONEWIRE_DQ`
- `J10` signal shunts

Purpose:

- prove `PWM_OUT` on `D8` reaches `ANALOG_FB`
- prove `ADC_IN` on `D0` sees that analog node
- prove PWM duty changes produce monotonic ADC changes

Host-side script:

```bash
python3 tools/targets/esp32_c3/analog_block2.py --port /dev/ttyUSB0
```

Pass criteria:

- forcing `D8` low gives a low `analogRead(D0)` result
- forcing `D8` high gives a high `analogRead(D0)` result
- PWM sweep values rise monotonically from low duty to high duty
- no reset or REPL instability occurs during the block

## Block 3: Combined SPI And I2C

Mode:

- `C3_BUS_SPI_I2C`

Required selector state:

| Selector or wiring | Position |
|---|---|
| `SEL_D0` | `ADC_IN` |
| `SEL_D1` | `I2C_A_SDA` |
| `SEL_D2` | `I2C_A_FB` |
| `SEL_D3` | `SPI_MISO` |
| `SEL_D4` | `I2C_A_SCL` |
| `SEL_D08` | fitted / closed |
| `SEL_D10` | `I2C_INT` |

Must be open / not selected:

- `SEL_D0` must not be on `ONEWIRE_DQ`
- `SEL_D10` must not be on `SPI_CS_FLASH`
- `J10` signal shunts

Purpose:

- prove Espruino I2C access to the MCP23008 at `0x20`
- prove MCP23008 output feedback from `GP0` into `I2C_A_FB`
- prove MCP23008 interrupt assertion and clear on `I2C_INT`
- prove Espruino SPI access to MCP3008 `CH0`
- compare MCP3008 `CH0` against target `ADC_IN` on the shared `ANALOG_FB` node

Host-side script:

```bash
python3 tools/targets/esp32_c3/bus_spi_i2c_block3.py --port /dev/ttyUSB0
```

Pass criteria:

- MCP23008 register write/read succeeds at `0x20`
- driving expander `GP0` low/high drives `I2C_A_FB` low/high
- interrupt line on `I2C_INT` asserts low when expected and returns high after clear
- MCP3008 `CH0` reads the analog feedback node correctly
- target `ADC_IN` and MCP3008 `CH0` track the same low/mid/high analog levels

## Block 4: OneWire

Mode:

- `C3_ONEWIRE`

Required selector state:

| Selector or wiring | Position |
|---|---|
| `SEL_D0` | `ONEWIRE_DQ` |
| `SEL_D08` | open |

Allowed to remain in place:

- `SEL_D1`, `SEL_D2`, `SEL_D3`, `SEL_D4`, and `SEL_D10`

Must be open / not selected:

- `SEL_D0` must not be on `ADC_IN`
- `J10` signal shunts

Purpose:

- prove OneWire bus presence on `D0`
- prove two-device DS18B20 discovery on the shared `ONEWIRE_DQ` bus
- prove addressed scratchpad reads for both sensors
- prove both devices return distinct ROMs and plausible temperatures

Host-side script:

```bash
python3 tools/targets/esp32_c3/onewire_block4.py --port /dev/ttyUSB0
```

Pass criteria:

- `OneWire.reset()` succeeds
- search returns exactly two ROMs
- both ROMs start with family code `28`
- both scratchpads read valid non-`FF` data with valid CRC
- both decoded temperatures are plausible and the two ROMs are distinct
