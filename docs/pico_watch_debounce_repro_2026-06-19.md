# Pico Debounced Watch Repro

Date: 2026-06-19

## Purpose

This note records the first stand-alone Espruino Pico repro for the suspected
 `src/jsinteractive.c` debounced watch issue.

The aim was to demonstrate the behaviour on a Core-oriented Espruino target,
 without involving the ESP32 IDF5 target code.

## Wiring

Pico wiring used on the bench:

- `B3` as driven output
- `B4` as watched input
- `B5` as optional marker/debug pin
- Pico `GND` as common ground

Loopback link:

- `B3` -> `470R` -> `B4`

Logic-analyser connections:

- `CH0` -> `B3`
- `CH1` -> `B4`
- `CH2` -> `B5`
- analyser `GND` -> Pico `GND`

## Tool

Script:

- [espruino_pico_watch_debounce_check.py](/home/simon/MaBecker/ESP32_SGATest/tools/espruino_pico_watch_debounce_check.py)

Current bench serial port when this note was written:

- `/dev/ttyACM0`

## Working Repro Shape

The working comparison uses:

- `setWatch(..., {repeat:true, edge:"both", debounce:20})`
- `digitalPulse(B3, 1, [20,20,20])`

Two cases are compared:

- control case: no forced busy window
- stressed case: a forced busy window starting at `35ms` and lasting `120ms`

The stressed case also drives `B5` high during the busy window so the analyser
 can mark the period where normal processing is being delayed.

## Control Run

Command:

```bash
python3 tools/espruino_pico_watch_debounce_check.py \
  --port /dev/ttyACM0 \
  --mode control \
  --pulse-seq-ms 20,20,20
```

Observed output:

```text
Board: PICO_R1_3
Version: 2v29
Mode: control
Pins: out=B3 in=B4 marker=B5
Timing: debounce=20ms pulse=[20,20,20] start=20ms busy_start=30ms busy=120ms
PULSE_START
EDGE_1={"state":1,"time":...}
EDGE_2={"state":0,"time":...,"lastTime":...}
EDGE_3={"state":1,"time":...,"lastTime":...}
EDGE_4={"state":0,"time":...,"lastTime":...}
EDGE_COUNT=4
SEEN=[1,0,1,0]
FINAL=0
DONE PICO_WATCH
Summary: edge_count=4 seen=[1,0,1,0]
```

Interpretation:

- the Pico sees and reports all four pulse-train transitions in the normal
  case
- this gives a clean reference result for the same wiring and pulse pattern

## Stressed Run

Command:

```bash
python3 tools/espruino_pico_watch_debounce_check.py \
  --port /dev/ttyACM0 \
  --mode stressed \
  --pulse-seq-ms 20,20,20 \
  --busy-start-ms 35
```

Observed output:

```text
Board: PICO_R1_3
Version: 2v29
Mode: stressed
Pins: out=B3 in=B4 marker=B5
Timing: debounce=20ms pulse=[20,20,20] start=20ms busy_start=35ms busy=120ms
PULSE_START
BUSY_ON
BUSY_OFF
EDGE_1={"state":1,"time":...}
EDGE_2={"state":0,"time":...,"lastTime":...}
EDGE_COUNT=2
SEEN=[1,0]
FINAL=0
DONE PICO_WATCH
Summary: edge_count=2 seen=[1,0]
```

Interpretation:

- with the forced busy window, the same pulse train is no longer reported as
  four transitions
- the callback output collapses to two transitions
- this is the first stand-alone Pico result that looks consistent with the
  suspected debounced watch edge-loss / edge-merge behaviour

## Why This Matters

This is useful because it separates the issue from the ESP32 IDF5 target work.

The repro now shows:

- a normal control case on Pico
- a stressed case on Pico
- a different callback result using the same physical wiring and the same
  pulse-train request

That is enough to justify the next evidence steps on the Pico side.

## Next Evidence Steps

1. Capture logic-analyser traces for both the control and stressed runs.
2. Confirm that the physical edge pattern on `B3`/`B4` remains present in the
   stressed case even though the callback result changes.
3. If needed, add minimal temporary instrumentation in `src/jsinteractive.c`
   inside the Pico/Core investigation worktree to confirm whether the failing
   run is hitting the overdue-timeout path.
