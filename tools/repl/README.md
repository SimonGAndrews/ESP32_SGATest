# Shared REPL Runner

This directory contains Python runners for the shared functional REPL tests in
`tests/repl/`.

Current scope:

- single-test execution
- Python-owned metadata capture and result parsing
- direct serial transport
- optional EspruinoTools CLI transport

Primary entry point:

- `run_test.py`

Typical direct-serial usage:

```bash
python tools/repl/run_test.py tests/repl/gpio_block1/gpio_readwrite_basic.js \
  --port /dev/ttyUSB0
```

Typical EspruinoTools transport usage:

```bash
python tools/repl/run_test.py tests/repl/gpio_block1/gpio_readwrite_basic.js \
  --port /dev/ttyUSB0 \
  --transport cli \
  --cli-path /path/to/EspruinoTools/bin/espruino-cli.js
```

Notes:

- Python remains the runner architecture. Transport is an implementation detail.
- The CLI path must be explicit, either with `--cli-path` or
  `ESPRUINO_CLI_PATH`.
- The runner filters output down to the agreed structured lines plus runner
  metadata.
