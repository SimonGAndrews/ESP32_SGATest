# Pico Debounced Watch Simple Repro

Date: 2026-06-19

## Purpose

This note explains the Pico repro in the simplest possible terms, without
 depending on the Python runner to understand what is happening.

The purpose of the repro is to show that:

- the watched input pin really does see the pulse train
- in a normal run, JavaScript sees all of the transitions
- in a stressed run, JavaScript only sees part of them

This is intended as a simpler way to explain the suspected
 `src/jsinteractive.c` debounce/watch issue.

It is important to be clear that this is a deliberate stress case, not a claim
 that ordinary `digitalPulse` use is broadly broken on Pico or on every
 Espruino target.

## Wiring

Use a Pico with:

- `B3` as output
- `B4` as watched input
- `B3 -> 470R -> B4`
- common `GND`

Optional logic-analyser connections:

- `B3`
- `B4`
- `B5` as marker pin
- `GND`

## What The Test Does

At a JavaScript level, the test is simple:

1. use `digitalPulse(B3, 1, [20,20,20])` to create a short pulse train
2. watch `B4` with:

```js
setWatch(fn, B4, {repeat:true, edge:"both", debounce:20})
```

The `debounce` option is included on purpose, because the suspected issue is in
 the debounced watch path rather than in raw undebounced edge delivery.

That pulse request creates four physical transitions on the linked input:

- high
- low
- high
- low

In a normal run, JavaScript should therefore see:

```js
[1,0,1,0]
```

The easiest way to demonstrate this is now the direct REPL/Web IDE script:

- [pico_watch_debounce_repl.js](/home/simon/MaBecker/ESP32_SGATest/tools/pico_watch_debounce_repl.js)

That script supports both the control and stressed runs by changing one flag:

- `STRESSED = false` for the control run
- `STRESSED = true` for the stressed run

## Control Run

The control run does only that:

- create the pulse train
- record what `setWatch` sees

Observed result:

```text
PULSE_START
EDGE_1={"state":1,...}
EDGE_2={"state":0,...}
EDGE_3={"state":1,...}
EDGE_4={"state":0,...}
EDGE_COUNT=4
SEEN=[1,0,1,0]
FINAL=0
DONE PICO_WATCH
```

Meaning:

- the input pin saw the pulse train
- JavaScript also saw all four transitions

## Stressed Run

The stressed run uses the same pulse train, but also forces JavaScript to stay
 busy during part of the sequence.

That is the only important change.

So this is intentionally a timing edge case:

- short pulse train
- watched on both edges
- with debounce enabled
- while JavaScript/Core is forced busy at the wrong moment

Observed result:

```text
PULSE_START
BUSY_ON
EDGE_1={"state":1,...}
BUSY_OFF
EDGE_2={"state":0,...}
EDGE_COUNT=2
SEEN=[1,0]
FINAL=0
DONE PICO_WATCH
```

Meaning:

- JavaScript no longer reported all four transitions

## Why The Logic Analyser Matters

The logic analyser is not the repro by itself. It is only there to answer one
 question:

Did the input pin still receive the pulse train physically in the stressed
 case?

The captures taken on the bench show:

- control case:
  `B3` and `B4` both show the pulse train
- stressed case:
  `B3` and `B4` still both show the pulse train

So the important difference between the two runs is not the physical signal on
 the watched pin.

The important difference is that JavaScript reports:

- all four transitions in the control run
- only two transitions in the stressed run

So the simplest combined evidence is now:

- direct REPL/Web IDE repro script
- control REPL output showing `[1,0,1,0]`
- stressed REPL output showing `[1,0]`
- analyser traces showing the watched pin still receives the pulse train in
  both cases

## Practical Conclusion

In simple terms:

- the Pico input pin still receives the pulse train
- but when JavaScript is forced busy at the wrong time, the debounced watch
  callback only reports part of what happened

That is why this looks like a Core watch/debounce issue rather than an ESP32
 IDF5-only target issue.

It should be read as:

- a valid stress-case repro for a watch/debounce timing issue

and not as:

- a claim that all normal `digitalPulse` use is generally broken
