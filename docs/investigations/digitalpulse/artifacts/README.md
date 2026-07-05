# DigitalPulse Artifacts

This folder holds artifact-level preservation files from the earlier
`digitalPulse` investigation period.

These are not all clean fix patches.

## Files

### `old-espruino-sandbox-debug-snapshot.patch`

This file is a raw snapshot of the uncommitted working-tree diff that existed
in the older mixed local repo:

```text
/home/simon/MaBecker/Espruino
```

It is not the authoritative ESP32 IDF5 `digitalPulse` fix patch.

It was preserved only as forensic/debug archive material because that old repo
contained scratch investigation code that had never been committed cleanly.

The snapshot includes mixed material such as:

- the local `src/jsinteractive.c` candidate debounce/watch fix
- temporary `jstimer` debug instrumentation
- temporary ESP32 pin/timer debug wrappers in `jswrap_esp32.*`
- scratch changes in `targets/esp32/jshardware.c`
- scratch changes in `targets/esp32/rtosutil.c`

So this patch should be treated as:

- a raw sandbox debug snapshot
- useful for exact reconstruction if ever needed
- not something to apply blindly as a clean fix

For the actual preserved ESP32 IDF5 `digitalPulse` fix line, use:

- [MaBecker/Espruino#4](https://github.com/MaBecker/Espruino/pull/4)
- [conclusion-2026-07-05.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/digitalpulse/conclusion-2026-07-05.md)
- [artifact-index-2026-07-old-espruino-sandbox.md](/home/simon/MaBecker/ESP32_SGATest/docs/investigations/artifact-index-2026-07-old-espruino-sandbox.md)
