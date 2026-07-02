# ESP32-DevKitC V4 Harness Wiring Spec

This document maps the common Espruino hardware-test blocks onto the Espressif
ESP32-DevKitC V4 using an ESP32-WROOM-32E/32UE module.

The current schematic PDFs are in:

```text
Hardware/ESP32_V1/
```

Related documents:

- [docs/design/common-harness-design-and-blocks.md](../../design/common-harness-design-and-blocks.md)
- [docs/design/harness-modes.md](../../design/harness-modes.md)

## Design Position

The classic ESP32 has enough exposed GPIO to keep the normal test blocks
connected simultaneously. Unlike the ESP32-C3 harness, the DevKitC V4 does not
need a general GPIO selector bank.

`D35` is shared between the MCP23008 interrupt input and UART1 RX. Two further
selectors allow the normal GPIO loopback inputs (`D33` and `D26`) to be used
instead as feedback inputs from a removable DS2413 OneWire GPIO breakout. A
separate default-open link completes the second side of the UART1/UART2
crosslink. UART0 remains dedicated to the board USB-UART REPL/flashing path.

Tests use Espruino `Dxx` names matching GPIO numbers.

## Reserved And Avoided Pins

| Pin | Rule |
|---:|---|
| `D0` | reserve for BOOT/download control |
| `D1`, `D3` | reserve for UART0 USB-UART REPL/flashing |
| `D2`, `D5`, `D12`, `D15` | leave free of fixed harness loads because they are strapping pins |
| `D6`-`D11` | module SPI-flash signals; do not use |
| `D34`-`D39` | input-only; use only for input roles |

`D34`-`D39` do not have internal pull-up/pull-down resistors. Their assigned
harness sources must provide a defined level where a test depends on one.

## Default Connectivity Wiring

The normal control path uses the DevKitC V4 board USB connector and its onboard
USB-UART bridge to UART0 on `D1` / `D3`.

| Board pin / signal | Harness connection | Notes |
|---|---|---|
| board Micro-USB | host USB | normal REPL/flashing/control path |
| `D1` / `D3` | reserved for UART0 | not used for peripheral harness wiring |
| EN / reset | automation header `RESET` | also keep manual reset accessible |
| BOOT / `D0` | automation header `BOOT` | reserved for boot/download control |
| `5V` rail | board USB by default; external 5V only through `JP_External_5V1` | keep `JP_External_5V1` open unless deliberate external power is wanted |

## Rationalised Fixed GPIO Allocation

| Harness node | ESP32 GPIO | Direction | Wiring |
|---|---:|---|---|
| `GPIO_LOOP_A_OUT` | `D32` | output | selected by `SEL_D33` |
| `GPIO_LOOP_A_IN` / `DS2413_PIOA_FB` | `D33` | input/watch | through 470R from `SEL_D33` common |
| `GPIO_LOOP_B_OUT` | `D25` | output | selected by `SEL_D26` |
| `GPIO_LOOP_B_IN` / `DS2413_PIOB_FB` | `D26` | input/watch | through 470R from `SEL_D26` common |
| `PWM_OUT` | `D27` | output/PWM | 10k to `ANALOG_FB` |
| `ADC_IN` | `D34` | ADC input-only | fixed to `ANALOG_FB` |
| `I2C_SDA` | `D21` | bidirectional | MCP23008 and Grove I2C |
| `I2C_SCL` | `D22` | bidirectional | MCP23008 and Grove I2C |
| `I2C_INT` / `UART1_RX` | `D35` | input-only | selected by `SEL_D35` |
| `I2C_FB` | `D39` | input-only | MCP23008 GP0 through 470R |
| `SPI_MISO` | `D19` | input | MCP3008/W25xxx data out |
| `SPI_MOSI` | `D23` | output | MCP3008/W25xxx data in |
| `SPI_SCK` | `D18` | output | shared SPI clock |
| `SPI_CS_ADC` | `D16` | output | MCP3008 CS |
| `SPI_CS_FLASH` | `D17` | output | optional W25xxx CS |
| `ONEWIRE_DQ` | `D13` | bidirectional | two powered DS18B20 devices, external connector and DS2413 breakout |
| `UART1_TX` | `D4` | output | crossed through 470R/link to `D36` |
| `UART1_RX` | `D35` | input-only | selected from `D14` through `SEL_D35` |
| `UART2_TX` | `D14` | output | crossed through 470R/`SEL_D35` to `D35` |
| `UART2_RX` | `D36` | input-only | crossed from `D4` through default-open link |

This allocation intentionally keeps VSPI on its conventional `D18`/`D19`/`D23`
pins. Chip selects use `D16` and `D17`, avoiding the usual `D5` strapping-pin
chip select.

## Common Test Blocks

### GPIO loopbacks and DS2413 feedback selectors

Normal GPIO-loop mode:

- `D32 -> SEL_D33 pin 1 -> common pin 2 -> 470R -> D33`
- `D25 -> SEL_D26 pin 1 -> common pin 2 -> 470R -> D26`

DS2413 feedback mode:

- `DS2413_PIOA -> SEL_D33 pin 3 -> common pin 2 -> 470R -> D33`
- `DS2413_PIOB -> SEL_D26 pin 3 -> common pin 2 -> 470R -> D26`

Fit only one shunt on each three-pin selector. The 470 Ω resistors are in the
common paths, so they protect the ESP32 inputs in either selected mode.

### Analog/PWM feedback

- `D27 -> 10k -> ANALOG_FB`
- `ANALOG_FB -> 100nF -> GND`
- `ANALOG_FB -> D34`
- `ANALOG_FB -> MCP3008 CH0`

`D34` is ADC1-capable, so ADC tests remain usable while Wi-Fi is active.

### I2C

- `D21` SDA
- `D22` SCL
- MCP23008 address `0x20` with A0/A1/A2 low
- MCP23008 GP0 through 470R to `D39`
- MCP23008 GP1 through 470R to GP2
- MCP23008 INT to `SEL_D35`
- `SEL_D35` common to `D35`

Provide removable or DNP 4.7k pull-ups on SDA and SCL so the bare MCP23008
block is self-contained without forcing duplicate pull-ups when a Grove module
already provides them.

For I2C interrupt tests, fit `SEL_D35` between `I2C_INT` and
`D35_UART1_RX`. Do not select the UART-crosslink position at the same time.

#### External Grove I2C

`J_Grove_I2C1` is a Grove-standard four-pin connector on the same I2C bus as
the MCP23008. It allows one or more external I2C devices to share `D21`/`D22`,
using a Grove hub or daisy-chain arrangement where supported.

| `J_Grove_I2C1` pin | Signal |
|---:|---|
| 1 | GND |
| 2 | 3.3V |
| 3 | `D21_I2C_SDA` |
| 4 | `D22_I2C_SCL` |

The connector supplies 3.3V, not 5V. Check the total bus pull-up resistance
when external modules are attached, because multiple Grove devices may each
include SDA/SCL pull-ups.

### SPI

- shared `D18` SCK, `D19` MISO, `D23` MOSI
- MCP3008 CS on `D16`
- optional W25xxx CS on `D17`
- MCP3008 CH0 on `ANALOG_FB`

### OneWire

- `D13` to two powered DS18B20 devices
- one nominal 2.2k pull-up from `ONEWIRE_DQ` to 3.3V

For this wirewrap build, fitting 2.0k for `R6` is acceptable in place of
2.2k. It gives a slightly stronger pull-up on the short harness OneWire bus
without materially changing the test intent.

This is an intentional target-specific deviation from the family baseline
4.7k pull-up used in the generic common-block note.

`J_ONEWIRE1`, labelled **External OneWire** on the schematic, exposes the
same powered OneWire bus for additional external devices:

| External OneWire pin | Signal |
|---:|---|
| 1 | 3.3V |
| 2 | `D13_ONEWIRE_DQ` |
| 3 | GND |

External devices share the existing bus pull-up, nominally 2.2k and acceptable
as 2.0k for this build. Do not add another strong pull-up without checking the
combined resistance and bus loading.
The connector is for powered-mode devices; parasite-power operation is not the
baseline harness configuration.

#### Removable DS2413 GPIO breakout

`J_DS2413` is a vertical 1x04, 2.54 mm female socket for a removable DS2413
two-channel open-drain GPIO breakout. Fit downward-facing male pins to the
breakout so that it plugs into the harness only when required.

| `J_DS2413` pin | Signal | Breakout function |
|---:|---|---|
| 1 | `DS2413_PIOB` | PIOB open-drain I/O |
| 2 | `DS2413_PIOA` | PIOA open-drain I/O |
| 3 | `D13_ONEWIRE_DQ` | OneWire IO and parasite power |
| 4 | GND | Ground |

Each PIO signal has a 4.7 kΩ pull-up to 3.3 V:

- `DS2413_PIOA -> 4.7k -> 3.3V`
- `DS2413_PIOB -> 4.7k -> 3.3V`

The DS2413 is parasite-powered from the OneWire bus; there is no separate VDD
connection. Its PIO outputs are open-drain and are observed by selecting:

| Feedback test | Selector position | ESP32 input |
|---|---|---:|
| PIOA | `SEL_D33` pins 2-3 | `D33` through 470R |
| PIOB | `SEL_D26` pins 2-3 | `D26` through 470R |

This permits software to discover the DS2413, command each PIO low or released,
and verify the resulting level at the corresponding ESP32 input. Return both
selectors to pins 1-2 for the normal `D32`/`D33` and `D25`/`D26` GPIO
loopbacks.

### UART

The full UART test crosses the two non-console hardware UARTs while UART0
remains the runner/control connection:

```text
UART1 TX D4  -> R_UART2 470R -> JP_UART_LOOP2 -> D36 UART2 RX
UART2 TX D14 -> R_UART1 470R -> SEL_D35       -> D35 UART1 RX
```

Logical Espruino setup:

| Espruino object | ESP32 UART | TX | RX |
|---|---|---:|---:|
| `Serial1` | UART0 | `D1` | `D3` |
| `Serial2` | UART1 | `D4` | `D35` |
| `Serial3` | UART2 | `D14` | `D36` |

`Serial1`/UART0 stays on the board USB-UART path. `Serial2` and `Serial3`
provide a bidirectional crosslink test:

- `Serial2` transmits on `D4`; `Serial3` receives on `D36`.
- `Serial3` transmits on `D14`; `Serial2` receives on `D35`.

UART crosslink state:

| Link | Required state |
|---|---|
| `SEL_D35` | select `R_UART1`/`D14_UART2_TX` to `D35_UART1_RX` |
| `JP_UART_LOOP2` | closed to connect `D4_UART1_TX` to `D36_UART2_RX` |

I2C interrupt and UART1 RX are mutually exclusive because they share `D35`.

`J_UART2` exposes:

| Pin | Signal |
|---:|---|
| 1 | `D14_UART2_TX` |
| 2 | `D35_UART1_RX` |
| 3 | GND |

This header supports external observation or a UART peer. It does not expose
the complete four-signal internal crosslink.

## Automation Header

Expose:

| Header signal | DevKitC V4 signal |
|---|---|
| GND | GND |
| RESET | EN |
| BOOT | `D0` |

This is a provision for an external open-drain reset/boot controller. It must
not add fixed levels that interfere with normal boot.

## Prototype Board And Construction Guide

The first ESP32 DevKitC V4 harness build uses the same style of 90 mm x 70 mm
wirewrap/prototype board as the ESP32-C3 harness. The KiCad PCB is used as a
placement and silkscreen print guide rather than as a routed copper PCB.

Measured board/grid details used in `KICAD/ESP32_V1/ESP32_V1.kicad_pcb`:

| Item | Value |
|---|---:|
| Board outline | 90 mm x 70 mm |
| KiCad outline coordinates | `(70,45)` to `(160,115)` |
| Main matrix | 31 columns x 26 rows |
| Main matrix pitch | 2.54 mm |
| First main matrix hole centre | `(78.5,48.25)` |
| Last main matrix hole centre | `(154.7,111.75)` |
| First hole offset from left edge | 8.5 mm |
| Mounting-hole drill | 1 mm NPTH |

The main matrix is vertically centred in the board height. The physical board
has vertical side pad columns, but these are deliberately not included in the
KiCad guide because they are not used for the planned component placement.

For manual placement in KiCad, set the PCB editor grid to 2.54 mm and place the
grid origin at `(78.5,48.25)`, the top-left hole of the main matrix. Any matrix
hole can then be addressed as:

```text
X = 78.5  + column * 2.54
Y = 48.25 + row    * 2.54
```

where column 0, row 0 is the top-left main matrix hole.

When printing construction guides, use actual-size / 100% scaling. A test print
that produced about 91 mm for the nominal 90 mm board width caused visible
cumulative drift towards the lower-right corner, even though the KiCad geometry
was correct.

## Wirewrap Power Distribution

`J1` (`3v3 Dist`) and `J2` (`GND Dist`) provide local 3.3V and GND distribution
points to simplify power wiring and fanout during wirewrap construction. Both
pins of each header are connected to its named rail. These are construction
distribution points, not separate external power inputs.

## External 5V Power

`J_External_PWR1` provides an optional external 5V input:

| `J_External_PWR1` pin | Signal |
|---:|---|
| 1 | external 5V, through `JP_External_5V1` to the harness `5V` rail |
| 2 | GND |

`JP_External_5V1` is a default-open isolation shunt. Leave it open when the
DevKitC is powered from its USB connector. Fit it only when deliberately
powering the harness/DevKitC 5V rail from `J_External_PWR1`.

Do not connect competing USB and external 5V sources through a closed shunt
unless their power-sharing arrangement has been explicitly reviewed.

## Harness Test Modes

The following sections define the manual harness modes used by the test
runner. Each mode lists the required selector positions or link states and any
conflicting positions that must not be fitted.

### Connectivity Mode

Mode name:

- `ESP32_CONNECTIVITY`

Purpose:

- prove the normal UART0 REPL and flashing path
- prove reset and reconnect behaviour with the harness attached

Runner/control path:

- board USB-UART through the board Micro-USB connector on `D1` / `D3`

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| board USB-UART path | left untouched |
| `SEL_D35` | I2C interrupt position |
| `JP_UART_LOOP2` | open |
| `JP_External_5V1` | open unless deliberate external power is being tested |
| BOOT and RESET access | available for flashing and reset tests |

Open/conflicting positions:

| Selector group | Required state |
|---|---|
| `SEL_D35` UART position | not fitted |
| `JP_UART_LOOP2` | open |

Enabled coverage:

- REPL attach over UART0
- reset and reconnect
- flashing with the harness attached

### Baseline Hardware Mode

Mode name:

- `ESP32_BASELINE_HARDWARE`

Purpose:

- run the standard always-wired hardware regression pack on the classic harness

Runner/control path:

- board USB-UART through the board Micro-USB connector on `D1` / `D3`

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| `SEL_D33` | pins 1-2 for `D32` to `D33` loopback |
| `SEL_D26` | pins 1-2 for `D25` to `D26` loopback |
| `SEL_D35` | I2C interrupt position |
| `JP_UART_LOOP2` | open |
| optional I2C pull-up links | fitted only if no attached module supplies pull-ups |
| `JP_External_5V1` | open unless deliberate external power is being used |

Compatible extensions:

| Extension | Allowed state |
|---|---|
| `J_Grove_I2C1` external I2C device | allowed if total bus pull-up loading is reviewed |
| `J_ONEWIRE1` external powered OneWire device | allowed if combined pull-up and bus loading are reviewed |
| optional W25xxx on `SPI_CS_FLASH` / `D17` | allowed when the flash device is fitted for shared-bus tests |

Open/conflicting positions:

| Selector group | Required state |
|---|---|
| `SEL_D33` / `SEL_D26` DS2413 feedback positions | not fitted unless the DS2413 feedback extension is under test |
| `SEL_D35` UART position | not fitted |
| `JP_UART_LOOP2` | open |

Enabled coverage:

- GPIO loopbacks
- analog/PWM feedback
- MCP23008 I2C
- MCP3008 SPI ADC
- OneWire DS18B20
- optional shared-bus SPI flash

Baseline extensions:

- DS2413 feedback extension:
  move `SEL_D33` and/or `SEL_D26` from pins 1-2 to pins 2-3 to route DS2413
  PIO feedback into `D33` and `D26` when DS2413 validation is being run
- Grove I2C extension:
  attach external I2C devices to `J_Grove_I2C1` with no selector change
- external OneWire extension:
  attach powered OneWire devices to `J_ONEWIRE1` with no selector change

### Serial Crosslink Mode

Mode name:

- `ESP32_SERIAL_UART1_UART2_CROSSLINK`

Purpose:

- prove non-console `Serial` behaviour using the two non-console hardware UARTs
- keep UART0 available as the runner/control path

Runner/control path:

- board USB-UART through the board Micro-USB connector on `D1` / `D3`

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| `SEL_D35` | UART position, selecting `D14_UART2_TX` to `D35_UART1_RX` |
| `JP_UART_LOOP2` | closed to connect `D4_UART1_TX` to `D36_UART2_RX` |

Open/conflicting positions:

| Selector group | Required state |
|---|---|
| `SEL_D35` I2C interrupt position | not fitted |

Enabled coverage:

- `Serial.setup`
- TX/RX transfer across the UART1/UART2 crosslink
- `Serial.read`
- `Serial.on("data")`
- reconfiguration

After the test, reopen `JP_UART_LOOP2` and return `SEL_D35` to the I2C
interrupt position.

### Power Reset Mode

Mode name:

- `ESP32_POWER_RESET`

Purpose:

- prove reset, bootloader entry, watchdog reset, and later controlled power
  behaviour on the classic harness

Runner/control path:

- board USB-UART through the board Micro-USB connector on `D1` / `D3`

Required selector positions / wiring:

| Selector or wiring | Position |
|---|---|
| automation header | connected or manually accessible for RESET and BOOT control |
| board USB-UART path | left untouched for reconnect and flashing checks |
| `JP_External_5V1` | open unless a deliberate external-power test is being run |

Open/conflicting positions:

| Selector group | Required state |
|---|---|
| UART crosslink state | optional, but leave `JP_UART_LOOP2` open and `SEL_D35` in I2C interrupt position unless deliberately combining with serial tests |

Enabled coverage:

- reset reconnect
- bootloader entry and flashing
- watchdog reset recovery

## Default State

- `SEL_D33` pins 1-2 fitted for the normal `D32` to `D33` loopback
- `SEL_D26` pins 1-2 fitted for the normal `D25` to `D26` loopback
- `SEL_D35` fitted in the I2C interrupt position
- `JP_UART_LOOP2` open, leaving the UART1/UART2 crosslink incomplete
- `JP_External_5V1` open, isolating the external 5V connector
- optional I2C pull-up links fitted only if no attached module supplies them
- UART0 and BOOT path untouched
- no fixed harness loads on `D2`, `D5`, `D12`, or `D15`
