# Draft: Espruino Core Issue For `jsinteractive.c`

## Suggested Title

`setWatch(..., {debounce:...}) can merge pending edges if a debounce timeout is already overdue`

## Draft Body

While debugging an ESP32 IDF5 `digitalPulse` regression, I ended up with one
remaining issue that appears to sit in Espruino Core rather than in the ESP32
target.

This looks to be in the debounced watch handling in `src/jsinteractive.c`, not
in the IDF5 timer code itself.

The simplest way I can describe it is:

- one pin drives another through a resistor
- `setWatch(..., {repeat:true, edge:"both", debounce:20})` watches the input
- `digitalPulse(..., [20,20,20])` creates a short four-edge pulse train
- in a normal run, JavaScript sees all four transitions: `[1,0,1,0]`
- in a stressed run, using the same pulse train but forcing JavaScript to stay
  busy during part of it, JavaScript only sees: `[1,0]`

I now have a direct REPL/Web IDE version of this Pico repro, so it does not
need to be understood through the Python helper first.

I reproduced this on an Espruino Pico using:

- `B3` as output
- `B4` as watched input
- `B3 -> 470R -> B4`

The logic-analyser captures for the control and stressed runs both show the
physical pulse train on the watched input pin, so the interesting difference is
not that the input stopped changing. The difference is that JavaScript only
reports part of the edge sequence in the stressed case.

The direct Pico REPL results are:

- control: `SEEN=[1,0,1,0]`
- stressed: `SEEN=[1,0]`

The behaviour appears to be:

- a watch has `debounce` enabled
- one edge has already created a pending debounce timeout
- that timeout becomes overdue before Espruino Core processes it
- a second edge then arrives
- instead of first flushing the overdue edge and then handling the new one, the
  pending state can be updated in place

This seems to happen in `src/jsinteractive.c` in the debounced watch handling
inside `jsiIdle()`, where an existing `timeout` is updated when a new edge
arrives.

This only seems to show up in a fairly specific timing window, which may
explain why it has not been obvious before. It was exposed during the IDF5
`digitalPulse` work because once the target-side timer path was repaired, the
resulting edges were arriving in a way that exercised this path.

I have a candidate fix locally in `src/jsinteractive.c` which changes the
debounce flow so that if a pending timeout is already overdue, that edge is
flushed first, and the current edge is then re-added as a fresh timeout if
needed.

Before turning that into a separate Core PR, I wanted to sanity-check the
diagnosis and approach.

Related background only:

- the user-visible regression that led to this was ESP32 IDF5 `digitalPulse`
- this does not seem to be the same issue as discussion #5114, which was about
  very short pulse generation limits
- discussion #4004 looks adjacent in that it also touches watch timing /
  delayed edge observation, but not this exact overdue-timeout case

If useful, I can follow up with a minimal repro and the candidate patch.
