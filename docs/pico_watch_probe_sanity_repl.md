# Pico Watch Probe Sanity REPL

Use this short REPL snippet to confirm the analyser probes are really on the
 intended Pico pins before relying on the stressed watch/debounce traces.

Expected waveform:

- `B5`: short trigger pulse first
- `B3`: one short pulse later
- `B4`: same short pulse as `B3` through the loopback
- `B5`: one longer high window after that

REPL snippet:

```js
echo(false);
pinMode(B3,"output");
pinMode(B4,"input");
pinMode(B5,"output");
digitalWrite(B3,0);
digitalWrite(B5,0);

setTimeout(()=>digitalWrite(B5,1), 5);
setTimeout(()=>digitalWrite(B5,0), 10);

setTimeout(()=>digitalWrite(B3,1), 20);
setTimeout(()=>digitalWrite(B3,0), 40);

setTimeout(()=>digitalWrite(B5,1), 80);
setTimeout(()=>digitalWrite(B5,0), 200);
```

Interpretation:

- if the short pulse and the long window are not both on `B5`, the marker probe
  is not where we think it is
- if the short `B3` pulse is not mirrored on `B4`, either the loopback link or
  the `B4` probe is wrong
