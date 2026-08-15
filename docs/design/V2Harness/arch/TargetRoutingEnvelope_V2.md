# V2 Target Routing Envelope

**Status:** Accepted

**Version:** 0.3

**Last Updated:** 26 July 2026

## 1. Purpose

This document compares representative Espruino targets to derive the routing
capacity and connection properties required from the reusable V2 harness.

It provides the cross-target design input to the routing-fabric specification
and combined capability connection matrix. It is not a target wiring
specification and does not assign physical Target Interface contacts.

The assessment is intended to:

* establish the routing envelope needed by the most constrained useful target
* confirm that the resulting design remains practical for more generous targets
* validate the architecture against ESP32 and non-ESP32 MCU families
* include official Espruino boards early enough for design feedback
* distinguish design-basis requirements from later compatibility exercises

## 2. Scope And Exclusions

This document records:

* target GPIO and peripheral constraints relevant to routing
* fixed direct connections and candidate routing entries
* Test Block assignments that must operate simultaneously
* required target-resource reuse and capability exclusions
* console, recovery, routing-control and powered-off constraints
* the cross-target requirements derived for the routing fabric

It does not define:

* final daughter-board wiring
* physical Target Interface connector banks or contacts
* routing-switch or route-controller component selection
* the final Harness Supervisor design or host protocol
* the Target Profile schema or Target Support Module API

Detailed target allocations remain in target-specific studies under
`docs/design/V2Harness/targets/`.

## 3. Authority And Inputs

The assessment uses the following inputs in authority order:

1. `StandardTestBlocks_V2.md` for accepted Test Block signals, concurrency,
   safe states and routing-analysis requirements
2. `HarnessConceptualModel_V2.md`, `HybridHarnessArchitecture_V2.md` and
   `TestHarnessArchitecture_V2.md` for the accepted V2 architecture
3. the current Target Interface handoff and later accepted contract
4. target schematics, official pin documentation and curated KiCad target assets
5. target-specific V1 wiring, bench evidence and V2 allocation studies

Older allocation studies are evidence and design inputs. They do not override
the accepted V2 Test Block or architecture requirements.

## 4. Assessment Rules And Working Assumptions

Within this assessment, a **Host Test-Control Path** is the direct or
Harness-Supervisor-mediated connection through which the host runner controls
the target and receives test evidence. Subsequent references use
**test-control path** where the host context is clear.

### 4.1 Accepted Rules

The target assessments shall apply these accepted routing inputs:

* `TI_I2C_SDA` and `TI_I2C_SCL` remain direct and usable before route control
  is configured
* every signal required concurrently within a selected Test Block remains
  simultaneously available
* only the accepted cross-block concurrency is mandatory
* the two Block 5 feedback roles may exclusively reuse the two Block 1 input
  roles
* no other logical reuse is assumed without connection-matrix review
* essential console and recovery paths do not depend solely on a target-applied
  test route
* each target identifies its preferred hardware-debug method, physical access
  or Adapter Service, and any reduction in GPIO or Test Block availability while
  that method is active
* each target identifies its hardware-reset and optional boot-mode mapping,
  required daughter-board adaptation, target-pin cost and interaction with
  onboard reset or download circuitry
* routed paths have defined high-impedance reset states and prevent competing
  sources, back-power and unsafe loading
* unavailable or deliberately excluded capabilities are reported explicitly

### 4.2 Accepted Routing-Control Constraints

The target is the software owner of the direct routing-control I2C bus in every
powered Operating Mode. The host requests capabilities through the target's
Test Control endpoint; the Harness Supervisor neither owns this bus nor selects
arbitrary routes.

The routing design shall also provide an independent Hardware Clear action that
returns every controlled path to its safe inactive state without responsive
target firmware or access to the routing-control I2C bus. This preserves a
recovery path without making the first routing prototype dependent on completion
of the Harness Supervisor.

Routing-control and switching devices use an independently regulated harness
3.3 V supply and remain safe when target power is absent. The detailed switch
topology, state-readback mechanism and Hardware Clear circuit remain downstream
routing-design decisions.

## 5. Design-Basis Target Set

These targets influence the initial routing envelope.

| Target | MCU family | Assessment role | Stage |
|---|---|---|---|
| ESP32-C3-DevKitC-02 | ESP32-C3 | Constrained routing baseline | Initial design |
| ESP32 DevKitC V4 | ESP32 | V1 evidence and generous ESP32 validation | Initial design |
| ESP32-S3-DevKitC-1 | ESP32-S3 | Native USB, console and service validation | Initial design |
| Raspberry Pi Pico 1 family | RP2040 | Non-ESP32 architecture and port-development validation | Initial design |
| Raspberry Pi Pico 2 family | RP2350 | Generational compatibility and port-development validation | Initial design |
| Espruino Pico | STM32 | Official Espruino hardware and early design feedback | Initial design |
| MDBT42Q breakout | nRF52 | Compact official Espruino wireless hardware and early design feedback | Initial design |

## 6. Normalised Target Inventory

The completed summary uses one row per assessed target. Counts distinguish
exposed pins from pins that are safe and practically available for the harness.

| Target | Exposed GPIO | Fixed or reserved | Restricted pins | Safe general GPIO | Direct control and recovery paths | Candidate routing entries | Unallocated safe GPIO after Test Block mapping |
|---|---:|---|---|---:|---|---:|---:|
| ESP32-C3-DevKitC-02 / -02U | 15 | `D6`/`D7` direct I2C; `D8` onboard RGB/strap; `D9` boot; `D18`/`D19` native USB; `D20`/`D21` UART0 | `D2` strap; `D4`-`D7` external JTAG alternatives; `D8` strap/load; `D20`/`D21` onboard bridge | 8 plus `D2` conditionally | Direct I2C on `D6`/`D7`; normal USB-UART on `D20`/`D21`; native USB on `D18`/`D19`; boot on `D9` | 7 | 0 |
| ESP32 DevKitC V4 official module options | 32 header positions; WROOM-DA exposes 30 | `D21`/`D22` direct I2C; `D0` boot; `D1`/`D3` USB-UART; `D6`-`D11` module flash; `D12`-`D15` external JTAG configuration | `D2`, `D5`, `D12`, `D15` straps; `D34`/`D35`/`D36`/`D39` input-only; WROVER reserves `D16`/`D17`; WROOM-DA does not expose `D2`/`D25` | 19 WROOM/SOLO; 17 WROVER; 18 WROOM-DA | Direct I2C on `D21`/`D22`; onboard USB-UART; reset on `EN`; boot on `D0`; dedicated external JTAG group | 7, using the common C3 route topology | 6 WROOM/SOLO; 4 WROVER; 5 WROOM-DA; plus `D13`/`D14` reserved for JTAG |
| ESP32-S3-DevKitC-1 V1.1 N8R8 / 1U-N8R8 | 36 | `D10`/`D11` direct I2C; `D0` boot; `D19`/`D20` native USB; `D43`/`D44` USB-UART; `D35`-`D37` octal PSRAM; `D38` onboard RGB; `D39`-`D42` optional external JTAG | `D3`, `D45`, `D46` straps; module and board revision affect memory and RGB reservations | 24 | Onboard USB-UART; native USB Serial/JTAG/OTG; reset on `EN`; boot on `D0`; optional four-wire JTAG | 7, using the common C3 route topology | 9; plus `D39`-`D42` reserved for optional JTAG |
| ESP32-S3-DevKitC-1 V1.1 N32R16V | 36 | As N8R8, with `D35`-`D37` unavailable on WROOM-2 | `D3`, `D45`, `D46` straps; `D47`/`D48` are 1.8 V and unavailable to the 3.3 V Target Interface | 22 | Same control, USB, reset, boot and optional JTAG paths | 7, using the same common mapping | 7; plus `D39`-`D42` reserved for optional JTAG |
| Raspberry Pi Pico / Pico H / Pico W / Pico WH (RP2040) | 26 | USB and SWD use dedicated pins; `RUN` and `3V3_EN` are separate control pins; internal `D23`-`D25` and `D29` are not header GPIO | RP2040 hardware-peripheral mux; Pico W/WH antenna clearance and different SWD position | 26 | Native USB; dedicated SWD; reset on `RUN`; manual BOOTSEL; candidate power control on `3V3_EN` | 2 required for accepted Block 1/5 input reuse; ESP route bundles are not portable | 5 (`D2`, `D3`, `D14`, `D21`, `D27`) |
| Raspberry Pi Pico 2 / Pico 2 with headers / Pico 2 W / Pico 2 W with headers (RP2350A) | 26 | Same dedicated USB, SWD, `RUN`, `3V3_EN` and internal-GPIO treatment as Pico 1 | RP2350 build and processor-architecture selection; wireless antenna clearance and variant-specific SWD arrangement | 26 | Native USB; dedicated SWD; reset on `RUN`; manual BOOTSEL; candidate power control on `3V3_EN` | Same 2 accepted Block 1/5 input selections and direct logical mapping as Pico 1 | Same 5 (`D2`, `D3`, `D14`, `D21`, `D27`) |
| Espruino Pico | 22 | No exposed GPIO fixed; onboard USB, LEDs/button and SWD use separate MCU pins or debug pads | Peripheral alternate-function groupings; optional non-SWD debug functions require separate review | 22 | Onboard or daughter-board native USB; BOOT0 recovery pad; underside SWD pads | 2 required for accepted Block 1/5 input reuse | 1 (`A10`) |
| MDBT42Q breakout | 22 on 2.54 mm headers | `D6`/`D8` conditional wired console and Block 7 endpoint; onboard `D0` button and `D1`/`D2` LEDs are not header GPIOs | One hardware USART; optional `D9`/`D10` NFC pads and module-level reset/debug pads require Adapter Service review | 22, with `D6`/`D8` subject to console ownership | BLE console; conditional serial console on `D6`/`D8`; module SWD pads; onboard boot button; candidate controlled power-cycle recovery | 2 required for accepted Block 1/5 input reuse | 3 (`D7`, `D30`, `D31`) |

## 7. Individual Target Assessments

Each assessment identifies board-level constraints, fixed direct
assignments, safe routing candidates, required reuse, simultaneous Test Block
assignments, console and recovery arrangements, routing-controller feasibility,
powered-off behaviour, exclusions and Adapter Service requirements.

### 7.1 ESP32-C3-DevKitC-02

**Assessment status:** Accepted

#### C3 Routing-Envelope Contribution

The C3 establishes the accepted lower bound: seven independently usable
Test Block routing entries in addition to the direct SDA/SCL pair. All seven
are required concurrently for the accepted Block 2 plus Block 4 analogue
measurement, so the routing topology must preserve that exact seven-route set.

It must also provide:

* deterministic disconnection of `D2` throughout reset
* independent route selection for the two SPI chip selects
* simultaneous connection of both GPIO loopback pairs
* simultaneous connection of both 1-Wire feedback inputs
* conditional direct access to `D20`/`D21` without contention from the onboard
  USB-UART bridge
* target-owned routing-control I2C and an unpowered-target-safe state
* high-impedance switch defaults powered from the independent harness 3.3 V
  rail

Switch count, mux grouping, control-bit count and physical Interface contacts
remain downstream routing decisions.

#### Variant Applicability

This assessment applies to the official ESP32-C3-DevKitC-02 fitted with either
ESP32-C3-WROOM-02 or ESP32-C3-WROOM-02U. Both modules provide the same 4 MB
flash capacity and target GPIO/header contract. The `02U` changes the antenna
from an onboard PCB antenna to an external-antenna connector, so it adds only
daughter-board connector, cable and RF-clearance requirements; it does not
change the mapping or routing envelope.

Other C3 development-board families, including ESP32-C3-DevKitM variants, are
not implied by this assessment and require their own physical daughter-board
and pin-allocation review.

#### Board And GPIO Constraints

The C3 has seven candidate Test Block routing entries after reserving the
mandatory direct-I2C pair. It exposes 15 GPIOs, of which eight--`D0`, `D1`,
`D3`, `D4`, `D5`, `D6`, `D7` and `D10`--are practical harness resources
without using a strapping pin. Conditional use of `D2` increases this pool to
nine; assigning `D6` and `D7` to direct I2C then leaves seven routed entries,
one of which is the reset-sensitive `D2`.

Board schematic and V1 evidence establish the supporting constraints:

* `D18` and `D19` are the native USB Serial/JTAG pair and remain fixed to the
  corresponding control or Adapter Service connection
* `D20` and `D21` form UART0 and remain electrically connected to the onboard
  CP2102N USB-UART bridge
* `D9` is the BOOT/download pin and is not a Test Block routing entry
* `D8` is a strapping pin with a board pull-up and onboard addressable RGB LED;
  it is excluded from the ordinary V2 Test Block allocation
* `D2` is a strapping pin and is usable only through a route that is
  deterministically disconnected during reset
* `D4` through `D7` are also the ESP32-C3 external four-wire JTAG pins;
  assigning them to V2 Test Block and direct-I2C roles prevents simultaneous use
  of an external JTAG probe, while the separate native USB Serial/JTAG interface
  on `D18` and `D19` remains the preferred debug and alternate test-control path
* `D0` through `D5` are RTC-domain GPIOs that can provide an external
  deep-sleep wake input; the `TI_I2C_INT` mapping must use one of these pins so
  the design-basis C3 supports both light- and deep-sleep event-wake testing

#### Fixed Direct And Recovery Paths

| GPIO or board signal | Provisional fixed purpose | Qualification |
|---|---|---|
| `D6` | `TI_I2C_SCL` | Direct shared functional and routing-control bus; target-owned in every powered Operating Mode |
| `D7` | `TI_I2C_SDA` | Direct shared functional and routing-control bus; target-owned in every powered Operating Mode |
| `D18`/`D19` | Native USB Serial/JTAG | Direct daughter-board USB connector Adapter Service; independent test-control path for UART crosslink tests when supported by the loaded build |
| `D20`/`D21` | UART0 RX/TX | Normal onboard USB-UART console; conditionally become one endpoint of the UART Test Block |
| `D9` | Provisional `TI_BOOT_REQUEST` mapping | Reserved Control Service or Adapter Service path to the active-low BOOT/download function |
| `EN` | Provisional `TI_TARGET_RESET_N` mapping | Direct open-drain reset Control Service path outside the Test Block GPIO inventory |

The target controls routing over `D6` and `D7` in every powered Operating Mode.
The bus is available before any Test Block route is established. The Harness
Supervisor does not connect to this bus; recovery instead uses the independent
Hardware Clear action.

The harness I2C pull-ups and routing devices are powered from the selected
Routing Logic Supply Rail. The accepted fixed direct-I2C isolation disconnects
an unpowered target from SDA and SCL so that harness pull-ups cannot back-power
it. The daughter board shall expose the target I/O-domain reference required
to qualify that isolation.

#### Provisional Logical Role Mapping

The following mapping satisfies the accepted within-block concurrency and the
required Block 2/Block 4 analogue-observation dependency with seven routed
target GPIOs:

| GPIO | Candidate logical Test Block roles |
|---|---|
| `D0` | `TI_ANALOG_ADC_IN`; `TI_ONEWIRE_DQ` |
| `D1` | `TI_GPIO_LOOP_A_OUT`; `TI_SPI_MISO` |
| `D2` | `TI_GPIO_LOOP_A_IN`; `TI_I2C_FB`; `TI_SPI_CS_ADC`; `TI_ONEWIRE_GPIO_A_FB` |
| `D3` | `TI_GPIO_LOOP_B_OUT`; `TI_SPI_MOSI`; `TI_UART_A_TX` |
| `D4` | `TI_SPI_SCK`; `TI_UART_A_RX` |
| `D5` | `TI_GPIO_LOOP_B_IN`; `TI_I2C_INT`; `TI_SPI_CS_EXT`; `TI_ONEWIRE_GPIO_B_FB` |
| `D10` | `TI_ANALOG_PWM_OUT`; `TI_RGB_DATA` |
| `D6` | direct `TI_I2C_SCL` |
| `D7` | direct `TI_I2C_SDA` |
| `D20` | conditional direct `TI_UART_B_RX` |
| `D21` | conditional direct `TI_UART_B_TX` |

For cross-target routing analysis, the seven routed entries are provisionally
identified as R0=`D0`, R1=`D1`, R2=`D2`, R3=`D3`, R4=`D4`, R5=`D10` and
R6=`D5`. R0-R6 name common route-entry functions, not physical Target
Interface contacts or target GPIOs; their final contract names remain subject
to the routing and Target Interface specifications.

The required concurrent configurations are:

| Selected capability | Simultaneous C3 assignments |
|---|---|
| Block 1 GPIO loopback | `D1 -> D2` and `D3 -> D5` |
| Block 2 analogue feedback | `D10` PWM output and `D0` target ADC input |
| Block 3 I2C | direct `D6`/`D7`, `D2` feedback and `D5` interrupt |
| Block 4 SPI | `D4` SCK, `D3` MOSI, `D1` MISO, `D2` ADC CS and `D5` extension CS |
| Blocks 2 and 4 analogue observation | all seven routed entries: Block 2 assignments plus the five Block 4 assignments |
| Block 5 1-Wire and GPIO | `D0` DQ with simultaneous feedback on `D2` and `D5` |
| Block 7 UART crosslink | `D3` TX to `D20` RX and `D21` TX to `D4` RX |
| Block 9 addressable RGB | `D10` data output |

The Block 5 feedback mapping implements the accepted exclusive reuse of the
Block 1 input resources on `D2` and `D5`. The additional C3 reuse between
separately selected blocks is a proposed connection-matrix result, not a new
requirement for simultaneous block operation.

#### Changes From The Earlier C3 Study

The rebaselined mapping resolves the earlier analogue-observation conflict by
moving `TI_SPI_CS_ADC` to conditional strapping pin `D2`. PWM and
addressable-RGB output use `D10`; the earlier allocation assigned both PWM
output and the MCP3008 chip select to `D5`, which cannot generate the analogue
stimulus while reading the same `ANALOG_FB` node through MCP3008 CH0.

The rebaselined mapping also provides the second DS2413 feedback role and the
external addressable-RGB Test Block through simultaneous feedback assignments
on `D2`/`D5` and the routed RGB assignment on `D10`. The earlier study omitted
both capabilities.

Full Block 3 feedback/interrupt testing is not simultaneous with full Block 4
operation because `D2` and `D5` are reused as the two SPI chip selects. The
direct I2C bus remains electrically available, but combined functional
I2C-feedback/interrupt and two-device SPI testing is not an accepted cross-block
concurrency requirement.

The R5/R6 GPIO assignment was revised after accepting the Supervisor
sleep/wake service. R6 now maps `TI_I2C_INT` to RTC-domain `D5`, allowing the
MCP23017 interrupt path to wake the C3 from both light and deep sleep. R5 moves
the PWM and addressable-RGB roles to general output `D10`; the reusable
routing-fabric functions and seven-entry minimum are unchanged.

#### UART And Adapter-Service Qualification

UART crosslink testing uses native USB Serial/JTAG on `D18`/`D19` as the
independent test-control path. The board Micro-USB connection must not power or
drive the onboard CP2102N while its UART0 pins participate in the crosslink;
the target instead uses the explicitly selected harness power path.

This is a board-specific operating constraint. The later Control Service and
Adapter Service reviews must determine whether cable removal remains an
accepted precondition, whether USB VBUS should be sensed, or whether the C3
daughter board needs another isolation provision. A build without a usable
native USB Serial/JTAG test-control path requires an external peer or records the
crosslink capability as unavailable.

The preferred C3 hardware-debug path is native USB Serial/JTAG on `D18` and
`D19`, exposed through a target-specific USB connector on the daughter board.
It does not reduce the seven Test Block routing entries. External four-wire
JTAG on `D4` through `D7` is an optional diagnostic configuration that
temporarily makes the corresponding harness assignments unavailable. Native
USB VBUS handling shall follow the accepted Power Control Service;
target-specific isolation and prevention of competing sources remain Adapter
Service design decisions.

Hardware reset maps the provisional direct `TI_TARGET_RESET_N` service to the
board `EN`/reset circuit. Optional automatic download maps the provisional
`TI_BOOT_REQUEST` service to active-low `D9`. The daughter-board implementation
must coexist safely with the onboard CP2102N automatic-download circuit; exact
isolation remains an Adapter Service decision, and the Target Profile shall
define the reset/boot sequencing required by the accepted Control Service.

### 7.2 ESP32 DevKitC V4

**Assessment status:** Accepted

#### ESP32 DevKitC V4 Routing-Envelope Contribution

The classic ESP32 should use the same seven-entry routing topology and
functional route-selection model as the C3. It adds no destination, switch
type or simultaneous route set. The two daughter boards and Target Profiles
differ only in the physical GPIO mapped to each route entry and in their
target-specific console, reset, boot and debug constraints.

This shared approach keeps the complete `D12`-`D15` JTAG group available while
the probe is attached and limits input-only Test Block use to `D36`. It also
keeps route selection distinct from block-local connection switching: R3/R4
select the UART endpoint roles, while the Block 7 UART connection switches
establish the protected crosslinks.

#### Variant Applicability

One common mapping applies to the official ESP32-DevKitC V4 WROOM-32,
WROOM-32D/32U, WROOM-32E/32UE, WROVER-E/WROVER-IE, WROOM-DA and SOLO-1 module
options. The assessment uses the DevKitC V4 header contract, with the completed
WROOM-32E-class V1 harness as its evidence base.

The common mapping below deliberately avoids the module-dependent pins:

* WROVER-E and WROVER-IE reserve `D16` and `D17` for PSRAM
* WROOM-DA does not expose `D2` or `D25`, because the underlying GPIOs control
  its internal dual-antenna switch
* external-antenna `U`, `UE` and `IE` versions retain the electrical mapping but
  require connector and cable clearance
* SOLO-1 retains the electrical mapping but requires a single-core firmware
  build and corresponding build-specific API inventory

WROOM-DA is EOL, but retaining compatibility costs no additional route entry.
Exact module identity remains part of the Target Profile and test evidence.

The daughter-board physical review must accommodate the applicable module
overhang and antenna keepout and, for external-antenna versions, connector and
cable access. Electrical header compatibility does not remove that mechanical
qualification.

#### Board And GPIO Constraints

The proposed mapping remains valid for every listed module class and requires
only one input-only pin, `D36`. The WROOM/SOLO baseline provides 19 safe and
practical GPIOs, WROVER provides 17 after reserving `D16`/`D17`, and WROOM-DA
provides 18 after removing `D25` from the safe pool.

The board exposes 32 GPIO-related header pins. Six (`D6`-`D11`) connect to the
module flash and are unusable as harness resources. `D0` is reserved for
BOOT/download control, and `D1`/`D3` remain connected to the onboard USB-UART
bridge for the normal console and flashing path. `D2`, `D5`, `D12` and `D15`
are strapping pins and are excluded from fixed Test Block loads. Four common
pins--`D34`, `D35`, `D36` and `D39`--are input-only and lack internal pull-up
or pull-down resistors, but remain suitable for defined input roles.

#### Fixed Control, Recovery And Debug Paths

| Board facility | Purpose | Routing and GPIO impact |
|---|---|---|
| Onboard Micro-USB and USB-UART bridge | Normal Espruino console, flashing and independent test-control path for UART1/UART2 tests | Reserves UART0 `D1`/`D3`; no Test Block routing entries |
| `EN` | Provisional `TI_TARGET_RESET_N` mapping | Direct open-drain reset service outside the Test Block GPIO inventory |
| `D0` and onboard automatic-download circuit | Provisional active-low `TI_BOOT_REQUEST` mapping | Reserved Control or Adapter Service path; must coexist with the USB-UART bridge control circuit |
| `D12`-`D15` JTAG functions | Optional external ESP-Prog-class hardware debug | Dedicated daughter-board Adapter Service group; no Test Block pin conflict in the proposed V2 mapping |
| Target supply path | Normal USB power or one deliberately selected external supply | Follow the accepted Power Control Service; the Target Profile shall identify the selected source and any Adapter Service |

The preferred source-level debug method is an external ESP-Prog-class adapter
using OpenOCD on `D12` TDI, `D13` TCK, `D14` TMS and `D15` TDO. The daughter
board may provide a target-specific probe connector, but this remains an
Adapter Service coordinated by the host rather than hardware integrated into
the reusable harness board.

The proposed V2 mapping leaves all four JTAG pins free of Test Block loads, so
the probe can remain electrically connected while Test Blocks operate. The
Adapter Service must nevertheless preserve safe reset levels on the strapping
pins, particularly `D12`. Halting or single-stepping the processor can disturb
timing-sensitive UART, 1-Wire or RGB evidence; this is a test-method constraint
rather than a pin or routing conflict.

#### Provisional Logical Role Mapping

The V2 mapping retains the proven pin-safety and peripheral conclusions from
V1 but deliberately reorganises the Test Block assignments onto the same seven
standard route entries required by the ESP32-C3. The permanent harness switch
wiring and its block-facing destinations therefore remain common; only the
daughter board maps different target GPIOs to route entries R0-R6.

| GPIO | Provisional logical Test Block role | Connection property |
|---|---|---|
| `D32` | R0: `TI_ANALOG_ADC_IN`; `TI_ONEWIRE_DQ` | Routed ADC1-capable bidirectional pin |
| `D19` | R1: `TI_GPIO_LOOP_A_OUT`; `TI_SPI_MISO` | Routed bidirectional pin common to all listed module classes |
| `D33` | R2: `TI_GPIO_LOOP_A_IN`; `TI_I2C_FB`; `TI_SPI_CS_ADC`; `TI_ONEWIRE_GPIO_A_FB` | Routed ADC1-capable bidirectional pin |
| `D23` | R3: `TI_GPIO_LOOP_B_OUT`; `TI_SPI_MOSI`; `TI_UART_A_TX` | Routed output-capable pin |
| `D18` | R4: `TI_SPI_SCK`; `TI_UART_A_RX` | Routed bidirectional pin |
| `D27` | R5: `TI_ANALOG_PWM_OUT`; `TI_RGB_DATA` | Routed protected PWM/RGB-capable output |
| `D26` | R6: `TI_GPIO_LOOP_B_IN`; `TI_I2C_INT`; `TI_SPI_CS_EXT`; `TI_ONEWIRE_GPIO_B_FB` | Routed bidirectional pin |
| `D21` | `TI_I2C_SDA` | Mandatory direct I2C SDA |
| `D22` | `TI_I2C_SCL` | Mandatory direct I2C SCL |
| `D4` | `TI_UART_B_TX` | Direct UART endpoint B TX |
| `D36` | `TI_UART_B_RX` | Direct input-only UART endpoint B RX |
| `D13`, `D14` | External JTAG TCK and TMS | Reserved Adapter Service pins, not Test Block or spare resources |
| `D16`, `D17`, `D25`, `D34`, `D35`, `D39` | Conditionally unallocated | Six on WROOM/SOLO; omit `D16`/`D17` on WROVER and omit `D25` on WROOM-DA |

The Test Blocks use seven routed GPIOs and four dedicated direct GPIOs. Six
safe GPIOs remain unallocated on WROOM/SOLO, four on WROVER and five on
WROOM-DA. `D13` and `D14` are deliberately reserved for the JTAG Adapter
Service rather than counted as spare capacity. Only one input-only pin, `D36`,
is required by the proposed Test Block mapping.

R1 uses `D19` so the same loopback and SPI roles remain available across every
assessed DevKitC V4 module option. The earlier draft used `D25`, which WROOM-DA
does not expose.

#### Required Simultaneous Configurations

Each capability uses the same route-entry destinations and switch selection as
its C3 counterpart. The Target Profile maps R0-R6 to this daughter board's
physical GPIOs, allowing the resolved test configuration to request a common
functional route set without embedding target-specific switch wiring or truth
tables.

| Selected capability | Simultaneous ESP32 assignments |
|---|---|
| Block 1 GPIO loopback | R1 `D19` to R2 `D33`, and R3 `D23` to R6 `D26` |
| Block 2 analogue feedback | R5 `D27` PWM and R0 `D32` ADC |
| Block 3 I2C | direct `D21`/`D22` bus, R2 `D33` feedback and R6 `D26` interrupt |
| Block 4 SPI | R4 `D18` SCK, R3 `D23` MOSI, R1 `D19` MISO, R2 `D33` ADC CS and R6 `D26` extension CS |
| Blocks 2 and 4 analogue observation | all seven route entries R0-R6 are assigned concurrently, matching the C3 design-basis case |
| Block 5 1-Wire and GPIO | R0 `D32` DQ with R2 `D33` and R6 `D26` feedback |
| Block 7 UART crosslink | R3 `D23` TX to direct endpoint-B RX `D36`; direct endpoint-B TX `D4` to R4 `D18` RX |
| Block 9 addressable RGB | R5 `D27` routed to the protected RGB output |

Target test setup establishes the common route set and verifies its safe state
through the direct routing-control I2C. Block 7 then uses its separate
UART connection switches to cross-connect the two protected UART endpoints or
connect a selected endpoint to an external peer, while isolating conflicting
drivers. UART0 on `D1`/`D3` remains the independent test-control path
throughout the UART test.

#### Power, USB And Routing-Control Qualifications

The target owns routing control over direct I2C pins `D21`/`D22` in every
powered Operating Mode. The Harness Supervisor does not access this bus;
recovery uses the independent Hardware Clear action. Harness-side pull-ups and
routing devices must not back-power an unpowered target.

The DevKitC documentation permits USB, 5 V-header or 3.3 V-header power as
mutually exclusive alternatives. The V1 harness normally uses the onboard USB
and leaves its external-5 V link open. A later controlled-power-cycle service
cannot remove target power while USB continues to supply the board, so the
Power Control and Adapter Service design must define USB-UART operation without
creating competing supply paths.

The daughter board must preserve usable access to the onboard Micro-USB
connector and manual EN/BOOT controls. Direct `TI_TARGET_RESET_N` and optional
`TI_BOOT_REQUEST` automation must coexist safely with the onboard CP2102N
automatic-download transistor circuit. Exact drive isolation, USB VBUS
handling and controlled-power-cycle behaviour remain service-design decisions.

### 7.3 ESP32-S3-DevKitC-1

**Assessment status:** Accepted

#### ESP32-S3-DevKitC-1 Routing-Envelope Contribution

The S3 should use the complete common R0-R6 topology without adding a
destination, switch type or simultaneous route set. Permanent harness switch
wiring and functional test setup therefore remain common across the three
ESP32 assessments, while the daughter board and Target Profile provide the
target-specific GPIO mapping.

Unlike the constrained C3, the S3 does not need this reuse for GPIO capacity.
The common topology instead provides architectural consistency, reduces
direct Interface contact demand and preserves both built-in USB Serial/JTAG
and optional external JTAG. The N32R16V restriction on `D47`/`D48` reduces
only unallocated capacity; it does not change the mapping or required
Interface contacts. Prototype verification must still prove the mapped S3
SPI, UART, 1-Wire, PWM and RGB behaviour.

#### Variant Applicability

One mapping applies without route changes to the current official
ESP32-S3-DevKitC-1 V1.1 ordering options:

* ESP32-S3-WROOM-1-N8R8
* ESP32-S3-WROOM-1U-N8R8
* ESP32-S3-WROOM-2-N32R16V

The WROOM-1U option changes only the antenna connection. The WROOM-2 option
retains every assigned Test Block and debug GPIO, but `D47` and `D48` operate
in its 1.8 V memory domain and must remain disconnected from the 3.3 V Target
Interface. Earlier officially documented N8, N8R2, N16R8V and N32R8V memory
options fall into the same two qualification classes: Octal memory can reserve
`D35`-`D37`, and a 1.8 V `VDD_SPI` variant also disqualifies `D47`/`D48`.

The initial board revision loads its RGB LED from `D48`, whereas V1.1 uses
`D38`. Neither GPIO is assigned to a Test Block or common route entry. The
exact board revision, module ordering code, memory interface and antenna type
must nevertheless be recorded in the Target Profile and test evidence.

#### Board And GPIO Constraints

The proposed Test Block allocation avoids every strapping, module-memory,
loaded RGB, 1.8 V and input-only pin. It leaves 24 safe and practical GPIOs on
N8R8 and 1U-N8R8 boards, and 22 on N32R16V because `D47`/`D48` are not 3.3 V
harness resources.

The detailed evidence base is the ESP32-S3-DevKitC-1 V1.1 fitted with the
ESP32-S3-WROOM-1-N8R8 module represented by the local schematic and curated V2
target assets. The board exposes 36 GPIOs on its two headers.

`D19`/`D20` are fixed to the native USB D-/D+ connector, while UART0
`D43`/`D44` remains connected to the independent onboard USB-UART bridge. `D0`
is the BOOT/download pin. `D3`, `D45` and `D46` are additional strapping pins
and are excluded from fixed Test Block loads. On the N8R8 module, `D35`-`D37`
are used by octal PSRAM and are unavailable. The V1.1 board addressable RGB LED
loads `D38`.

#### Fixed Control, Recovery And Debug Paths

| Board facility | Purpose | Routing and GPIO impact |
|---|---|---|
| USB-to-UART Micro-USB port and UART0 `D43`/`D44` | Normal Espruino console, flashing and independent test-control path | No Test Block routing cost; remains available during native USB and UART1/UART2 tests |
| Native USB connector on `D19`/`D20` | USB OTG/device testing, USB Serial/JTAG console, flashing and built-in JTAG | Fixed Adapter/Control Service path outside the Test Block routing fabric |
| `EN` | Provisional `TI_TARGET_RESET_N` mapping | Direct open-drain reset service outside the Test Block GPIO inventory |
| `D0` and onboard automatic-download circuit | Provisional active-low `TI_BOOT_REQUEST` mapping | Reserved Control or Adapter Service path; must coexist with onboard download control |
| `D39`-`D42` external JTAG functions | Optional four-wire ESP-Prog-class debug alternative | Deliberately free of Test Block loads; no ordinary Test Block conflict |
| Target supply path | Either or both onboard USB ports, or one deliberately selected external supply | Follow the accepted Power Control Service; the Target Profile shall identify the selected source and any required USB-power isolation |

The preferred source-level debug path is the built-in USB Serial/JTAG
controller on `D19`/`D20`, which needs no external probe and can provide JTAG
and serial operations together when supported by the loaded build. Optional
four-wire JTAG remains available on `D39` TCK, `D40` TDO, `D41` TDI and `D42`
TMS through a daughter-board Adapter Service.

When the native USB OTG/device peripheral itself is under test, the same
`D19`/`D20` path cannot be relied on as the test-control or debug path. The
onboard USB-UART then provides control, while optional four-wire JTAG remains
available for source-level debugging. Halting the processor can still
invalidate timing-sensitive evidence even though no electrical pin conflict
exists.

#### Provisional Logical Role Mapping

The S3 should use the common R0-R6 topology. Although it has enough GPIO for a
fully direct mapping, the common topology avoids another permanent switch
design and reduces Target Interface contact demand without consuming
constrained pins. The following allocation uses the same block-facing route
destinations and selections as the C3 and classic ESP32:

| GPIO | Provisional logical Test Block role | Connection property |
|---|---|---|
| `D1` | R0: `TI_ANALOG_ADC_IN`; `TI_ONEWIRE_DQ` | Routed ADC1-capable bidirectional pin |
| `D4` | R1: `TI_GPIO_LOOP_A_OUT`; `TI_SPI_MISO` | Routed bidirectional pin |
| `D5` | R2: `TI_GPIO_LOOP_A_IN`; `TI_I2C_FB`; `TI_SPI_CS_ADC`; `TI_ONEWIRE_GPIO_A_FB` | Routed ADC1-capable bidirectional pin |
| `D6` | R3: `TI_GPIO_LOOP_B_OUT`; `TI_SPI_MOSI`; `TI_UART_A_TX` | Routed output-capable pin |
| `D7` | R4: `TI_SPI_SCK`; `TI_UART_A_RX` | Routed bidirectional pin |
| `D8` | R5: `TI_ANALOG_PWM_OUT`; `TI_RGB_DATA` | Routed protected PWM/RGB-capable output |
| `D9` | R6: `TI_GPIO_LOOP_B_IN`; `TI_I2C_INT`; `TI_SPI_CS_EXT`; `TI_ONEWIRE_GPIO_B_FB` | Routed bidirectional pin |
| `D10` | `TI_I2C_SDA` | Mandatory direct I2C SDA |
| `D11` | `TI_I2C_SCL` | Mandatory direct I2C SCL |
| `D17` | `TI_UART_B_TX` | Direct UART endpoint B TX |
| `D18` | `TI_UART_B_RX` | Direct UART endpoint B RX |
| `D39`-`D42` | Optional external JTAG | Reserved Adapter Service pins, not Test Block or spare resources |
| `D2`, `D12`-`D16`, `D21` | Unallocated on all assessed V1.1 variants | Preserve for the combined Control Service, peer and connection-matrix review |
| `D47`, `D48` | Unallocated only on N8R8/1U-N8R8 | Must remain disconnected on N32R16V because they operate at 1.8 V |

The Test Blocks use seven routed GPIOs and four dedicated direct GPIOs. Nine
safe GPIOs remain unallocated on N8R8/1U-N8R8 and seven on N32R16V. Four more
safe GPIOs are deliberately reserved for optional external JTAG rather than
counted as spare capacity.

#### Required Simultaneous Configurations

The S3 uses the same functional route selections as the C3 and classic ESP32.
The Target Profile defines the S3 GPIO-to-R0-R6 mapping and the availability of
its two USB test-control paths, allowing the resolved test configuration to
request the common route sets. Block 7 then uses its separate UART connection
switches to establish protected crosslinks or external-peer operation.

| Selected capability | Simultaneous S3 assignments |
|---|---|
| Block 1 GPIO loopback | R1 `D4` to R2 `D5`, and R3 `D6` to R6 `D9` |
| Block 2 analogue feedback | R5 `D8` PWM and R0 `D1` ADC |
| Block 3 I2C | direct `D10`/`D11` bus, R2 `D5` feedback and R6 `D9` interrupt |
| Block 4 SPI | R4 `D7` SCK, R3 `D6` MOSI, R1 `D4` MISO, R2 `D5` ADC CS and R6 `D9` extension CS |
| Blocks 2 and 4 analogue observation | all seven route entries R0-R6 are assigned concurrently, matching the C3 design-basis case |
| Block 5 1-Wire and GPIO | R0 `D1` DQ with R2 `D5` and R6 `D9` feedback |
| Block 7 UART crosslink | R3 `D6` TX to direct endpoint-B RX `D18`; direct endpoint-B TX `D17` to R4 `D7` RX |
| Block 9 addressable RGB | R5 `D8` routed to the protected RGB output |

UART1/UART2 testing retains two potential test-control paths: the onboard
USB-UART connection on UART0, and native USB Serial/JTAG where the loaded build
supports it. Native USB testing instead uses USB-UART as the test-control path.
Wi-Fi and Bluetooth functional testing requires no additional Test Block
hardware and uses the host or future Harness Supervisor as the external
wireless peer.

#### Power, USB And Routing-Control Qualifications

The target owns routing control over direct I2C pins `D10`/`D11` in every
powered Operating Mode. The Harness Supervisor does not access this bus;
recovery uses the independent Hardware Clear action. Independently powered
pull-ups, routing devices, USB connections and peers must not back-power an
unpowered target.

A controlled target-power-cycle service must account for both USB VBUS paths
and any external supply. The board permits its two USB ports to supply it
individually or together, with an external 5 V- or 3.3 V-header supply as an
alternative. Switching only the external harness supply cannot remove target
power while either USB connector continues to power the board.

The daughter board must preserve usable access to both Micro-USB connectors
and the manual EN/BOOT controls. Direct `TI_TARGET_RESET_N` and optional
`TI_BOOT_REQUEST` automation must coexist safely with the onboard automatic
download circuit. USB VBUS ownership, controlled cycling and competing-supply
protection remain Power Control and Adapter Service decisions.

### 7.4 Raspberry Pi Pico Families

**Assessment status:** Accepted -- port-development targets

#### Assessment Basis And Variant Scope

The Pico families are included so the harness can support development of
ports that implement and validate the applicable Espruino API on RP2040 and
RP2350. No official port currently exists for either MCU. This assessment
therefore defines the hardware routing and service envelope needed for that
development. Each Target Profile, runtime API inventory and executable
coverage set will be completed progressively as its port becomes operational.

The primary mapping basis is the original RP2040 Raspberry Pi Pico and Pico H.
Pico W and Pico WH are included as pin-compatible qualifications because they
retain the 40-pin main interface. The RP2350 Pico 2 variants are assessed as a
peer qualification after the RP2040 mapping.

The four assessed RP2040 boards expose 26 multifunction GPIOs: `D0`-`D22` and
`D26`-`D28`. The RP2040 peripheral fabric provides two hardware UARTs, two SPI
controllers, two I2C controllers, PWM on every exposed GPIO and three exposed
ADC inputs. None of the 26 header GPIOs is an input-only pin.

`D23`, `D24`, `D25` and `D29` support internal target-board functions and are
not available for harness GPIO allocation. Their internal uses differ between
the wireless and non-wireless boards. The Pico W/WH wireless subsystem does
not reduce the 26 exposed GPIOs, but its antenna keepout must be preserved.

#### Fixed Control, Recovery And Debug Paths

| Board facility | Purpose | Routing and GPIO impact |
|---|---|---|
| Native USB | RP2040 ROM firmware loading; intended future Espruino console and USB functional testing | Dedicated USB pins; no exposed-GPIO or routing-entry cost |
| `RUN` | Provisional `TI_TARGET_RESET_N` mapping | Direct open-drain reset service; no GPIO cost |
| BOOTSEL button | ROM USB mass-storage boot entry | Manual recovery on the target; automatic BOOTSEL access is not assumed |
| Dedicated SWD | Firmware loading and source-level debugging | Raspberry Pi Debug Probe (preferred) or compatible CMSIS-DAP/OpenOCD probe through a daughter-board Adapter Service; no exposed-GPIO cost |
| `3V3_EN` | Candidate controlled regulator-disable input | Retain for target-specific power and recovery evaluation; do not treat it as proven full source isolation |

Pico and Pico W expose SWD through three castellated pads. Pico H and Pico WH
add a keyed three-pin debug connector. The debug position also differs between
the non-wireless and wireless layouts. The daughter board must therefore
provide the transfer geometry appropriate to the fitted variant, or define
separate daughter-board variants. The official three-wire SWD connection does
not supply target power; the target must be powered separately and share
ground with the probe.

During early port development, the Raspberry Pi Debug Probe is the preferred
host interface. Its two target-side connections provide SWD (`SWDIO`, `SWCLK`
and ground) for firmware loading, debug and recovery, and a 3.3 V UART (`TX`,
`RX` and ground) for the console and host test-control path once the serial
runtime is operational. BOOTSEL USB firmware loading remains an independent
recovery option. The probe does not power the target.

Native USB is the intended normal test-control path once the port supports it
because it leaves both UARTs available to Block 7. When native USB itself is
tested, the host must instead use the probe's wired-UART test-control path.
SWD remains a debug and recovery path rather than being treated as an Espruino
test runner. These arrangements do not consume additional Test Block GPIOs.

Power may arrive through USB VBUS or the board supply pins. A controlled power
cycle must account for every connected source; switching an external harness
supply alone cannot depower a USB-powered target. `3V3_EN` may offer a useful
target-specific control action, but its exact semantics belong in the Target
Profile and Adapter Service design.

#### Provisional Logical Role Mapping

The following mapping uses native RP2040 hardware peripherals and keeps every
role required within a selected Test Block concurrently available. It consumes
21 of the 26 exposed GPIOs and uses only the accepted exclusive reuse of the
two Block 1 inputs by the two Block 5 feedback roles.

| GPIO | Provisional logical Test Block role | Connection property |
|---|---|---|
| `D10` | `TI_GPIO_LOOP_A_OUT` | Direct digital output |
| `D11` | `TI_GPIO_LOOP_A_IN`; `TI_ONEWIRE_GPIO_A_FB` | Block-local selection between accepted exclusive roles |
| `D12` | `TI_GPIO_LOOP_B_OUT` | Direct digital output |
| `D13` | `TI_GPIO_LOOP_B_IN`; `TI_ONEWIRE_GPIO_B_FB` | Block-local selection between accepted exclusive roles |
| `D15` | `TI_ANALOG_PWM_OUT` | Direct PWM-capable output |
| `D26` | `TI_ANALOG_ADC_IN` | Direct ADC0 input |
| `D4` | `TI_I2C_SDA` | Mandatory direct I2C0 SDA |
| `D5` | `TI_I2C_SCL` | Mandatory direct I2C0 SCL |
| `D6` | `TI_I2C_FB` | Direct input |
| `D7` | `TI_I2C_INT` | Direct input |
| `D18` | `TI_SPI_SCK` | Direct hardware SPI0 SCK |
| `D19` | `TI_SPI_MOSI` | Direct hardware SPI0 TX |
| `D16` | `TI_SPI_MISO` | Direct hardware SPI0 RX |
| `D17` | `TI_SPI_CS_ADC` | Direct output |
| `D20` | `TI_SPI_CS_EXT` | Direct output |
| `D28` | `TI_ONEWIRE_DQ` | Direct bidirectional digital path |
| `D0` | `TI_UART_A_TX` | Direct hardware UART0 TX |
| `D1` | `TI_UART_A_RX` | Direct hardware UART0 RX |
| `D8` | `TI_UART_B_TX` | Direct hardware UART1 TX |
| `D9` | `TI_UART_B_RX` | Direct hardware UART1 RX |
| `D22` | `TI_RGB_DATA` | Direct protected digital output |
| `D2`, `D3`, `D14`, `D21`, `D27` | Unallocated | Preserve for the combined Control Service, peer and connection-matrix review |

#### Required Simultaneous Configurations

| Selected capability | Simultaneous RP2040 assignments |
|---|---|
| Block 1 GPIO loopback | `D10` to selected input `D11`, and `D12` to selected input `D13` |
| Block 2 analogue feedback | `D15` PWM and `D26` ADC |
| Block 3 I2C | direct `D4`/`D5` bus with `D6` feedback and `D7` interrupt |
| Block 4 SPI | `D18` SCK, `D19` MOSI, `D16` MISO and `D17`/`D20` chip selects |
| Blocks 2 and 4 analogue observation | all seven assigned Block 2 and Block 4 GPIOs remain available concurrently |
| Block 5 1-Wire and GPIO | `D28` DQ with selected feedback on `D11` and `D13` |
| Block 7 UART crosslink | UART0 `D0`/`D1` and UART1 `D8`/`D9`, with Block 7 UART connection switches establishing the protected crosslinks |
| Block 9 addressable RGB | `D22` routed to the protected RGB output |

#### RP2040 Routing-Envelope Contribution

The RP2040 should use direct target-to-Interface mapping: each assigned GPIO
maps to its independent logical Interface signal. At the target-mapping level,
only the two accepted Block 1/Block 5 input selections are required. The
standard Block 7 UART connection switches remain part of the harness Test
Block. The routing specification must allow each target to use a GPIO mapping
compatible with its hardware peripherals, rather than impose the ESP-derived
R0-R6 role bundles.

This approach uses 21 exposed GPIOs with the native RP2040 hardware
peripherals, leaves five safe GPIOs unallocated and adds no GPIO cost for USB,
reset or SWD. When supported by the future port, Pico W/WH wireless testing
requires no further Test Block hardware; the host or future Harness Supervisor
provides the external Wi-Fi/Bluetooth peer.

The supporting constraint is the RP2040 hardware-peripheral pin mux. A native
SPI MOSI pin cannot also be a native UART TX pin, and a native SPI SCK pin
cannot also be a native UART RX pin. The C3-derived R3 and R4 role bundles
therefore cannot be copied to this target while still testing the RP2040
hardware SPI and UART APIs.

PIO or software emulation is not an acceptable workaround because it would
test an emulated bus rather than the hardware peripheral capability.
Target-specific daughter-board switching should likewise not be introduced
merely to reproduce the ESP grouping.

#### Pico 2 / RP2350 Peer Qualification

The Pico 2 family should use the same direct target-to-Interface mapping as the
RP2040 Pico family. The Test Block GPIO assignments listed above remain legal
native RP2350 hardware-peripheral mappings, so Pico 2 adds no Interface
signal, route selection or simultaneous configuration to the routing envelope.

This qualification covers Pico 2, Pico 2 with headers, Pico 2 W and Pico 2 W
with headers. All expose the same 26 main-interface GPIOs used by the RP2040
mapping. `D23`, `D24`, `D25` and `D29` remain internal target-board resources;
their non-wireless and wireless uses are not part of the harness allocation.
Native USB, BOOTSEL, dedicated SWD, `RUN`, `3V3_EN` and the target power paths
retain the same service roles established above.

The differences are port and variant qualifications rather than routing
changes. RP2350 provides Arm Cortex-M33 and Hazard3 RISC-V processor options,
additional memory and additional PWM and PIO resources. It requires an
RP2350-compatible firmware image and its own future Espruino port, Target
Profile and runtime API inventory. These differences must not be collapsed
into the RP2040 firmware identity merely because the GPIO mapping is shared.

The daughter-board implementation must still preserve the fitted variant's
USB, BOOTSEL and RUN access, SWD connector or pad geometry and, for Pico 2 W,
the antenna keepout. These physical qualifications do not alter the common
logical mapping.

### 7.5 Espruino Pico

**Assessment status:** Accepted

#### Board And GPIO Constraints

The Espruino Pico 1v4 exposes 22 GPIOs across its two 2.54 mm edge rows and
1.27 mm end row:

```text
A0-A8, A10
B1, B3-B10, B13-B15
```

The official board documentation records nine analogue inputs, PWM on 21
exposed GPIOs, two hardware serial interfaces, three SPI interfaces and three
I2C interfaces. The onboard USB connection uses non-header MCU pins `A11` and
`A12`; the onboard LEDs and button also use non-header pins. These loads do not
reduce the 22-GPIO Test Block pool.

The local reference schematic is revision 1v3, while the curated V2 symbol and
wirewrap footprint represent revision 1v4. The reviewed pin order and J6 debug
geometry are common to the checked revisions. Revision-specific power,
protection and mechanical details must nevertheless be confirmed against the
physical 1v4 target before daughter-board implementation.

#### Fixed Control, Recovery And Debug Paths

| Board facility | Purpose | Routing and GPIO impact |
|---|---|---|
| Native USB | Normal Espruino console, firmware upload and USB recovery path | Use the onboard Type-A plug or a daughter-board USB socket wired to the official alternate USB pads; dedicated `A11`/`A12` impose no exposed-GPIO or routing-entry cost |
| BOOT0 recovery pad | Provisional `TI_BOOT_REQUEST` mapping for STM32 ROM bootloader entry | Target-specific daughter-board adaptation or operating instruction; active-high target function with no exposed-GPIO cost |
| J6 underside SWD pads | Firmware upload and source-level interpreter debugging | Preferred external ST-Link-class probe through a daughter-board Adapter Service; no exposed-GPIO cost for basic SWD |
| NRST | Provisional `TI_TARGET_RESET_N` mapping for reset and debug recovery | Direct open-drain service transferred through the J6 daughter-board Adapter Service |

The J6 pads are on the underside of the target and are represented as target
geometry rather than carrier copper in the curated footprint. The likely
prototype method is a daughter-board PCB aperture below J6, providing access
for short soldered transfer wires from the Pico pads to a serviceable probe
connector. The aperture requires an explicit board cutout, copper keepout,
tool-access clearance and strain-relief review. Spring contacts or another
compact removable pad adapter remain later alternatives. The basic SWD path
uses target reference, ground, SWCLK and SWDIO; NRST and SWO may also be
transferred where useful.

The preferred debug method does not consume any of the 22 exposed GPIOs.
Optional full-JTAG or trace configurations are not part of the design-basis
allocation and must declare any exposed-pin conflicts if later required.

The daughter board maps the provisional `TI_TARGET_RESET_N` service directly
to `NRST` through the J6 transfer arrangement. Optional automatic ROM-loader
entry maps `TI_BOOT_REQUEST` to the active-high BOOT0 function, requiring the
daughter board to implement the eventual standard request semantics safely.
Automatic BOOT0 control and reset/boot sequencing remain subject to the Control
Service review; manual BOOT0 access remains an acceptable prototype fallback.

#### Provisional Logical Role Mapping

The Pico can dedicate GPIOs to all Test Block roles except for the accepted
exclusive reuse of the two Block 1 inputs by the two Block 5 feedback roles.
This leaves `A10` unallocated for the later combined Control Service and peer
review.

| GPIO | Provisional logical Test Block role | Connection property |
|---|---|---|
| `B3` | `TI_GPIO_LOOP_A_OUT` | Direct |
| `B4` | `TI_GPIO_LOOP_A_IN`; `TI_ONEWIRE_GPIO_A_FB` | Routed exclusive selection between the two accepted roles |
| `B5` | `TI_GPIO_LOOP_B_OUT` | Direct |
| `A4` | `TI_GPIO_LOOP_B_IN`; `TI_ONEWIRE_GPIO_B_FB` | Routed exclusive selection between the two accepted roles |
| `A1` | `TI_ANALOG_PWM_OUT` | Direct PWM-capable output |
| `A0` | `TI_ANALOG_ADC_IN` | Direct ADC input |
| `B9` | `TI_I2C_SDA` | Mandatory direct I2C1 SDA |
| `B8` | `TI_I2C_SCL` | Mandatory direct I2C1 SCL |
| `B10` | `TI_I2C_FB` | Direct input |
| `B1` | `TI_I2C_INT` | Direct input |
| `B13` | `TI_SPI_SCK` | Direct SPI2 SCK |
| `B15` | `TI_SPI_MOSI` | Direct SPI2 MOSI |
| `B14` | `TI_SPI_MISO` | Direct SPI2 MISO |
| `A6` | `TI_SPI_CS_ADC` | Direct output; defaults inactive |
| `A7` | `TI_SPI_CS_EXT` | Direct output; defaults inactive |
| `A8` | `TI_ONEWIRE_DQ` | Direct bidirectional open-drain role |
| `B6` | `TI_UART_A_TX` | Direct USART1 TX |
| `B7` | `TI_UART_A_RX` | Direct USART1 RX |
| `A2` | `TI_UART_B_TX` | Direct USART2 TX |
| `A3` | `TI_UART_B_RX` | Direct USART2 RX |
| `A5` | `TI_RGB_DATA` | Direct protected 3.3 V output |
| `A10` | Unallocated | Preserve for the combined Control Service, peer and connection-matrix review |

The UART Test Block uses two independent hardware serial peripherals while the
onboard USB remains the console and recovery connection. The selected I2C and
SPI groups follow the alternate-function groupings shown by the official Pico
pinout rather than depending on software-only buses.

The direct UART assignments connect the Pico GPIOs directly to the four
protected Block 7 endpoint nodes; they do not make the endpoint-A-to-endpoint-B
crosslink permanent. Common Block 7 UART connection switches enable both
protected crosslink directions for full-duplex target testing and open them
before an external peer drives endpoint-A RX. The separate endpoint-B
diagnostic header remains a high-impedance observation point while the
crosslink is active and shall not be externally driven. The endpoint-A peer
header carries the switched, protected external-peer paths. These block-local
switches are not Pico route-selection entries.

#### Required Simultaneous Configurations

| Selected capability | Simultaneous Pico assignments |
|---|---|
| Block 1 GPIO loopback | direct outputs `B3`/`B5`; routed inputs `B4`/`A4` selected to the two loopback nodes |
| Block 2 analogue feedback | direct `A1` PWM and `A0` ADC |
| Block 3 I2C | direct `B9`/`B8` bus with direct `B10` feedback and `B1` interrupt |
| Block 4 SPI | direct `B13`/`B15`/`B14` bus and direct `A6`/`A7` chip selects |
| Blocks 2 and 4 analogue observation | all Block 2 and Block 4 direct assignments remain available together |
| Block 5 1-Wire and GPIO | direct `A8` DQ; `B4`/`A4` routed to both feedback nodes |
| Block 7 UART crosslink | direct USART1 `B6`/`B7` and USART2 `A2`/`A3`, with USB console independent |
| Block 9 addressable RGB | direct `A5` data output |

Only the two accepted Block 1/Block 5 input reuses require routing-fabric
selection. Their loopback and 1-Wire feedback destinations are mutually
exclusive and default disconnected until the selected Test Block configuration
is established.

#### Power And Physical Qualifications

The Pico operates in the 3.3 V logic domain and includes its own regulator. The
daughter-board design must select a supported target power input and prevent
competing supply paths when the onboard USB connection and harness power are
both present. Exact VBAT, 5 V, VDD and USB-power handling belongs to the power
Control Service and daughter-board implementation review.

The target owns routing control over the direct `B8`/`B9` I2C bus in every
powered Operating Mode. The Harness Supervisor does not access this bus;
recovery uses the independent Hardware Clear action. Harness-side pull-ups and
always-powered routing devices must not back-power an unpowered Pico through
either bus signal.

The daughter board shall either preserve usable access to the onboard Type-A
USB plug or provide a target-specific USB socket connected to the Pico 1v4
alternate USB pads on the rear of the target. The daughter-board socket is the
preferred option where it improves target placement and service access. The
prototype may use short soldered connections through a compatible underside
aperture; D+ and D- must remain short and paired, with appropriate connector-side
ESD protection.

The Pico 1v4 provides the alternate Mini-B footprint beneath rear silkscreen;
its copper must be deliberately exposed and its exact geometry confirmed from
the authoritative board source. USB VBUS ownership and prevention of
simultaneous use of the onboard and daughter-board connectors remain power and
Adapter Service design requirements. The USB and J6 access apertures may be
combined only if the physical review preserves clearance, copper keepouts and
independent soldering access for both pad groups.

The existing curated wirewrap footprint still requires a 1:1 physical print
and pin-fit check against a Pico 1v4 before it becomes an implementation
authority.

#### Pico Routing-Envelope Contribution

The Espruino Pico requires only two target routing entries for the accepted
Block 1/Block 5 input reuse. The other 19 assigned GPIOs can use dedicated
direct Test Block connections, subject to the eventual physical Target
Interface contact budget. `A10` remains deliberately unallocated rather than
being treated as a guaranteed spare connector. The unallocated safe-GPIO count
after the proposed Test Block mapping is therefore one.

This target therefore tests whether the V2 architecture can combine extensive
direct access with selective use of the standard routing fabric. It does not
increase the C3-derived seven-entry minimum, but it requires the Target
Interface and daughter-board mapping to support clean direct bypass of unused
routing channels.

### 7.6 MDBT42Q Breakout

**Assessment status:** Accepted

#### Board And GPIO Constraints

This assessment covers the official Espruino MDBT42Q breakout, not the bare
Raytac module. The breakout exposes 22 GPIOs on its 2.54 mm headers:

```text
D3-D8, D11, D14-D20, D22, D25-D31
```

Seven of these (`D3`-`D5` and `D28`-`D31`) are ADC inputs. All header GPIOs can
provide ordinary digital I/O and PWM. The nRF52832 port provides one available
hardware I2C, SPI and USART, with the peripheral signals assignable to suitable
GPIOs. Software I2C and SPI do not replace the hardware peripherals in the
design-basis mapping.

The onboard button on `D0` and LEDs on `D1`/`D2` are not part of the 22-pin
header inventory. The optional `D9`/`D10` NFC connections are also outside the
ordinary 2.54 mm connector rows and are not required for the Test Block
allocation. Any later NFC test connection is a target-specific Adapter Service
and compatibility review rather than a routing-envelope input.

#### Fixed Control, Recovery And Debug Paths

| Board facility | Purpose | Routing and GPIO impact |
|---|---|---|
| BLE console | Normal wireless Espruino console and firmware-update path | No header-GPIO cost; cannot be the only test-control path while BLE itself is under test |
| `D6`/`D8` (`TX`/`RX`) | Conditional 3.3 V wired Espruino console and Block 7 target UART endpoint | One physical UART has two mutually exclusive uses; the available uses and startup constraints must be defined in the Target Profile, and the selected use in the test configuration |
| Module SWDIO/SWDCLK | Firmware recovery and source-level interpreter debugging | External nRF52-compatible SWD probe through a daughter-board Adapter Service; no 2.54 mm header-GPIO cost |
| Onboard `D0` button circuit | Bootloader entry and boot without saved code | Provisional active-high `TI_BOOT_REQUEST` adaptation to the button/D0 node; manual button remains the prototype fallback |
| Target power path | Candidate fallback recovery when no dedicated reset input is available | Uses the accepted controlled target-power service; suitability as this target's recovery mechanism requires Target Profile verification |

An nRF52832 development kit or compatible CMSIS-DAP/SWD probe may be used for
debug and recovery. The daughter board must provide a reviewed transfer method
to SWDIO, SWDCLK, target reference and ground--for example short soldered
connections or a compact spring-contact arrangement. Debug remains coordinated
at the host level and is not integrated into the reusable harness board.

The breakout does not expose a dedicated reset input on its ordinary headers.
Mapping `TI_TARGET_RESET_N` to the nRF52832 configurable reset function on
module pin `D21` would require both verified physical access and matching
firmware/UICR configuration. It is therefore an optional Adapter Service study,
not an accepted prototype dependency. The accepted target-power service can
provide a controlled power cycle, but its suitability as MDBT42Q recovery still
requires Target Profile verification; it is not yet an accepted MDBT42Q reset
implementation. Automatic boot request through the onboard `D0` button node
likewise requires a non-header daughter-board connection and electrical review
before implementation.

#### Provisional Logical Role Mapping

The single hardware USART means that the MDBT42Q uses the accepted external-peer
form of Block 7. It therefore needs two target UART roles rather than the four
roles used by a two-UART crosslink target. The following mapping assigns 19
unique GPIOs and leaves three unallocated:

| GPIO | Provisional logical Test Block role | Connection property |
|---|---|---|
| `D25` | `TI_GPIO_LOOP_A_OUT` | Direct |
| `D26` | `TI_GPIO_LOOP_A_IN`; `TI_ONEWIRE_GPIO_A_FB` | Routed exclusive selection between the two accepted roles |
| `D27` | `TI_GPIO_LOOP_B_OUT` | Direct |
| `D28` | `TI_GPIO_LOOP_B_IN`; `TI_ONEWIRE_GPIO_B_FB` | Routed exclusive selection between the two accepted roles |
| `D4` | `TI_ANALOG_PWM_OUT` | Direct PWM-capable output |
| `D3` | `TI_ANALOG_ADC_IN` | Direct ADC input |
| `D15` | `TI_I2C_SDA` | Mandatory direct hardware-I2C SDA |
| `D14` | `TI_I2C_SCL` | Mandatory direct hardware-I2C SCL |
| `D16` | `TI_I2C_FB` | Direct input |
| `D17` | `TI_I2C_INT` | Direct input |
| `D18` | `TI_SPI_SCK` | Direct hardware-SPI clock |
| `D19` | `TI_SPI_MOSI` | Direct hardware-SPI output |
| `D20` | `TI_SPI_MISO` | Direct hardware-SPI input |
| `D22` | `TI_SPI_CS_ADC` | Direct output; defaults inactive |
| `D11` | `TI_SPI_CS_EXT` | Direct output; defaults inactive |
| `D29` | `TI_ONEWIRE_DQ` | Direct bidirectional open-drain role |
| `D6` | `TI_UART_A_TX` | Direct hardware-USART TX; shared with conditional serial-console use |
| `D8` | `TI_UART_A_RX` | Direct hardware-USART RX; shared with conditional serial-console use |
| `D5` | `TI_RGB_DATA` | Direct protected 3.3 V output |
| `D7`, `D30`, `D31` | Unallocated | Preserve for the combined Control Service, peer and connection-matrix review |

#### Required Simultaneous Configurations

| Selected capability | Simultaneous MDBT42Q assignments |
|---|---|
| Block 1 GPIO loopback | direct outputs `D25`/`D27`; routed inputs `D26`/`D28` selected to the two loopback nodes |
| Block 2 analogue feedback | direct `D4` PWM and `D3` ADC |
| Block 3 I2C | direct `D15`/`D14` bus with direct `D16` feedback and `D17` interrupt |
| Block 4 SPI | direct `D18`/`D19`/`D20` bus and direct `D22`/`D11` chip selects |
| Blocks 2 and 4 analogue observation | all Block 2 and Block 4 direct assignments remain available together |
| Block 5 1-Wire and GPIO | direct `D29` DQ; `D26`/`D28` routed to both feedback nodes |
| Block 7 external peer | direct USART `D6`/`D8` connected to the protected peer endpoint; BLE or another independent service provides the test-control path |
| Block 9 addressable RGB | direct `D5` data output |

Only the two accepted Block 1/Block 5 input reuses require target
routing-fabric selection. The loopback and 1-Wire feedback destinations are
mutually exclusive and default disconnected until the selected Test Block
configuration is established.

#### Console, Wireless And Peer Qualification

The MDBT42Q is primarily operated through its wireless BLE console. During a
UART test, however, its only hardware UART is the device under test and cannot
simultaneously carry the Espruino console. BLE therefore provides the normal
test-control path while Block 7 uses `D6`/`D8`.

The external peer receives and independently validates target transmissions,
sends known replies and can exercise UART configuration and timing behaviour.
This provides stronger evidence than a simple target TX-to-RX loopback. The
initial peer may be a host-controlled 3.3 V USB-UART adapter; the later Harness
Supervisor may perform the same role and coordinate its evidence directly with
the host runner.

At power-up the MDBT42Q detects an attached serial adapter on `D8` and can put
the console on `D8` RX and `D6` TX at 9600 baud. Block 7 therefore needs
block-local UART connection switching as well as target route selection: the
peer TX must remain isolated during startup, then connect only after BLE
control is established and the UART test is selected. The Target Profile must
declare whether `D6`/`D8` are owned by the wired console or Block 7 and prevent
both uses at once.

When BLE itself is under test, `D6`/`D8` may instead carry the wired Espruino
console while the host or Harness Supervisor becomes the BLE test peer. UART
and BLE testing are separate configurations: BLE controls the target while the
UART is tested, and the wired UART can control the target while BLE is tested.
If neither test-control path is available, the affected functional test remains
unavailable until a separate test-control path is established. No
dedicated RF Test Block hardware is required, and formal RF performance or
compliance testing remains out of scope.

#### Power, Routing Control And Physical Qualifications

The breakout accepts 2.5 V to 16 V at `Vin` and exposes regulated 3.3 V. A
controlled 5 V target supply can therefore feed `Vin`, while all Target
Interface logic remains 3.3 V. Source switching, competing-supply protection
and debugger reference-power behaviour shall follow the accepted Power Control
Service and the target-specific Adapter Service design.

The target owns routing control over direct I2C pins `D14`/`D15` in every
powered Operating Mode. The Harness Supervisor does not access this bus;
recovery uses the independent Hardware Clear action. Independently powered
harness pull-ups and routing devices must not back-power an unpowered target
through I2C, UART, SWD or any routed Test Block signal.

The daughter-board placement must preserve the MDBT42Q antenna keepout and
avoid copper, ground planes, connectors and wiring that materially obstruct the
radio end of the module. The curated wirewrap footprint still requires a 1:1
physical print, pin-fit check and antenna-clearance review before it becomes an
implementation authority.

#### MDBT42Q Routing-Envelope Contribution

The MDBT42Q requires two target routing entries for the accepted Block 1/Block
5 input reuse. The other 17 assigned GPIOs can use dedicated direct Test Block
connections, subject to the physical Target Interface contact budget. `D7`,
`D30` and `D31` remain deliberately unallocated rather than guaranteed spare
contacts.

The target does not increase the C3-derived seven-entry routing minimum. It
does, however, establish that the standard UART capability must support a
single-UART external-peer target, and that wireless-console convenience does
not remove the need for independent wired debug, recovery and reset methods.

## 8. Test Block Routing Demand

This table consolidates the accepted logical roles. Each target assessment
classifies its implementation as `direct`, `routed`, `reused`, `unavailable`
or `adapter` and records qualifications where necessary.

| Test Block | Concurrent target-facing roles | C3 | ESP32 | S3 | Pico 1/2 families | Espruino Pico | MDBT42Q | Routing consequence |
|---|---:|---|---|---|---|---|---|---|
| 1. Digital loopback | 4 | Routed: `D1`, `D2`, `D3`, `D5` | Common routes R1 `D19`, R2 `D33`, R3 `D23`, R6 `D26` | Common routes R1 `D4`, R2 `D5`, R3 `D6`, R6 `D9` | Direct outputs `D10`/`D12`; selected inputs `D11`/`D13` | Direct outputs `B3`/`B5`; routed inputs `B4`/`A4` | Direct outputs `D25`/`D27`; routed inputs `D26`/`D28` | Four roles concurrent; reusable inputs require selection |
| 2. Analogue feedback | 2 | Routed: `D10`, `D0` | Common routes R5 `D27` PWM and R0 `D32` ADC | Common routes R5 `D8` PWM and R0 `D1` ADC | Direct `D15`/`D26` | Direct `A1`/`A0` | Direct `D4`/`D3` | Concurrent with all five Block 4 roles |
| 3. I2C | 4, including 2 mandatory direct | Direct `D6`/`D7`; routed `D2`/`D5` | Direct `D21`/`D22`; common routes R2 `D33` feedback and R6 `D26` interrupt | Direct `D10`/`D11`; common routes R2 `D5` feedback and R6 `D9` interrupt | Direct `D4`/`D5` bus and `D6`/`D7` inputs | Direct `B9`/`B8` bus and `B10`/`B1` inputs | Direct `D15`/`D14` bus and `D16`/`D17` inputs | Mandatory direct bus retained |
| 4. SPI | 5 | Routed: `D4`, `D3`, `D1`, `D2`, `D5` | Common routes R4 `D18`, R3 `D23`, R1 `D19`, R2 `D33`, R6 `D26` | Common routes R4 `D7`, R3 `D6`, R1 `D4`, R2 `D5`, R6 `D9` | Direct `D18`/`D19`/`D16` and `D17`/`D20` | Direct `B13`/`B15`/`B14` and `A6`/`A7` | Direct `D18`/`D19`/`D20` and `D22`/`D11` | Five roles concurrent; two independent CS roles |
| 5. 1-Wire and GPIO | 3 | Routed: `D0`, `D2`, `D5`; feedback roles reuse Block 1 inputs | Common routes R0 `D32` DQ and R2 `D33`/R6 `D26` feedback | Common routes R0 `D1` DQ and R2 `D5`/R6 `D9` feedback | Direct `D28`; selected feedback on `D11`/`D13` | Direct `A8`; routed feedback on `B4`/`A4` | Direct `D29`; routed feedback on `D26`/`D28` | Three roles concurrent; accepted exclusive reuse |
| 7. UART | 4, or 2 with external peer | Routed `D3`/`D4`; conditional direct `D20`/`D21` | Common routes R3 `D23`/R4 `D18`; direct endpoint B `D4`/`D36`, with UART0 control | Common routes R3 `D6`/R4 `D7`; direct endpoint B `D17`/`D18`, with UART0 or native USB control | Direct UART0 `D0`/`D1` and UART1 `D8`/`D9`, with native USB control | Direct USART1 `B6`/`B7` and USART2 `A2`/`A3` | Direct single USART `D6`/`D8` in external-peer form | Four roles for crosslink targets; two for an accepted external-peer target |
| 9. Addressable RGB | 1 | Routed: `D10` | Common route R5 `D27` | Common route R5 `D8` | Direct `D22` | Direct `A5` | Direct `D5` | No Block 2/Block 9 concurrency required |

The table represents 23 logical Test Block roles for a two-UART crosslink
target before accepted exclusive reuse. An accepted external-peer UART target
requires 21 roles before reuse. Harness power, ground, Control Service and
programmable-peer signals are assessed separately and do not silently consume
these roles.

The Pico 1/2 column uses the shared GPIO mapping validated against both the
RP2040 and RP2350 hardware-peripheral muxes. Firmware availability and API
coverage remain separate for the two future Espruino ports.

## 9. Derived Routing Envelope

### 9.1 Accepted Envelope

The reusable harness shall provide a minimum of seven independently selectable
Test Block route entries, identified in this document as R0-R6. All seven shall
remain simultaneously usable. This is the minimum route-selection capacity
required by the constrained ESP32-C3 and is also suitable for the accepted
common ESP32 and ESP32-S3 mappings.

The seven-entry minimum applies to target-to-Test-Block route selection. It
does not include:

* the mandatory direct I2C SDA/SCL pair
* direct Test Block connections used by more generous or
  peripheral-constrained targets
* Block 7 UART crosslink and peer-selection switches
* other block-local connection switches
* reset, boot, power, console or debug Control and Adapter Services
* programmable-peer stimulus and capture paths

Those additional connections may increase the final switch, control-output and
Target Interface contact counts without changing the accepted seven-entry Test
Block routing minimum.

### 9.2 Common Route-Entry Functions

R0-R6 identify reusable route-entry functions, not physical Target Interface
contacts or target GPIOs. A target daughter board and Target Profile map a
suitable target GPIO to each used entry. The routing fabric then connects that
entry to one legal Test Block destination for the selected test
configuration.

| Route entry | Legal logical Test Block roles | Target direction across the legal roles | Required connection class |
|---|---|---|---|
| R0 | `TI_ANALOG_ADC_IN`; `TI_ONEWIRE_DQ` | Analogue input or bidirectional open-drain | Bidirectional analogue-capable path with low leakage; preserves the 0 V to 3.3 V analogue range and 1-Wire timing |
| R1 | `TI_GPIO_LOOP_A_OUT`; `TI_SPI_MISO` | Output or input | Bidirectional digital path; preserves GPIO edge and SPI input behaviour |
| R2 | `TI_GPIO_LOOP_A_IN`; `TI_I2C_FB`; `TI_SPI_CS_ADC`; `TI_ONEWIRE_GPIO_A_FB` | Input or output | Bidirectional digital path; protected input roles and inactive-safe chip-select output |
| R3 | `TI_GPIO_LOOP_B_OUT`; `TI_SPI_MOSI`; `TI_UART_A_TX` | Output | Digital output path suitable for GPIO pulses, SPI and UART timing |
| R4 | `TI_SPI_SCK`; `TI_UART_A_RX` | Output or input | Bidirectional digital path suitable for SPI clock and UART receive timing |
| R5 | `TI_ANALOG_PWM_OUT`; `TI_RGB_DATA` | Output | Digital waveform path with loading and bandwidth suitable for PWM and addressable-RGB data |
| R6 | `TI_GPIO_LOOP_B_IN`; `TI_I2C_INT`; `TI_SPI_CS_EXT`; `TI_ONEWIRE_GPIO_B_FB` | Input or output | Bidirectional digital path; preserves interrupt mode, protected input roles and inactive-safe chip-select output |

The switch family and circuit used for an entry shall satisfy the most
demanding role assigned to that entry. Prototype verification shall
characterise on-resistance, leakage, capacitance, propagation delay, bandwidth
and powered-off behaviour where they can affect analogue accuracy, SPI,
1-Wire, UART, PWM or addressable-RGB evidence.

### 9.3 Mandatory Direct And Alternative Paths

`TI_I2C_SDA` and `TI_I2C_SCL` shall remain direct, bidirectional open-drain
connections. They shall be available before any test route is configured so
that the shared functional and routing-control bus cannot depend on the
routing fabric for its own establishment or recovery.

A two-UART crosslink target requires `TI_UART_B_TX` and `TI_UART_B_RX` in
addition to endpoint A, which uses R3/R4 in the common routed form. The
endpoint-B signals may be direct where the target mapping permits. A target
with only one usable hardware UART may instead use the accepted external-peer
form of Block 7 and requires only the endpoint-A pair.

The routing fabric shall not force every target to use the ESP-derived R0-R6
role bundles. A target whose hardware-peripheral mux or GPIO budget favours
independent assignments may map suitable GPIOs directly to logical Test Block
Interface signals and use routing only for demonstrated reuse. The Raspberry
Pi Pico families, Espruino Pico and MDBT42Q assessments establish this direct
or selectively routed form.

The eventual Target Interface and connection matrix shall therefore support
both:

* the common seven-entry routed form used by the assessed ESP targets
* independent direct Test Block entry points with selective routing or clean
  bypass of unused route entries

Direct and routed access to the same Test Block node shall never be active
without explicit, reviewable isolation. The Target Profile shall declare the
legal mapping form, direct paths, routed paths, exclusions and control rules
for each target.

### 9.4 Required Simultaneous Route Sets

The following table defines the required selections for the common R0-R6
routed form. Every entry shown within one row is required concurrently. A
direct or selectively routed target mapping shall provide the equivalent
logical Interface signals and concurrency without being required to consume
the corresponding R0-R6 entries.

| Selected capability | Required routed and direct assignments |
|---|---|
| Block 1 GPIO loopback | R1 to loopback A output, R2 to loopback A input, R3 to loopback B output and R6 to loopback B input |
| Block 2 analogue feedback | R5 to PWM output and R0 to target ADC input |
| Block 3 I2C | Direct SDA/SCL, R2 to I2C feedback and R6 to I2C interrupt |
| Block 4 SPI | R4 to SCK, R3 to MOSI, R1 to MISO, R2 to ADC CS and R6 to extension CS |
| Blocks 2 and 4 analogue observation | All seven entries R0-R6, with direct SDA/SCL and routing control remaining available |
| Block 5 1-Wire and GPIO | R0 to 1-Wire DQ, R2 to feedback A and R6 to feedback B |
| Block 7 two-UART crosslink | R3/R4 as endpoint A together with endpoint-B TX/RX and the Block 7 connection switches |
| Block 7 external peer | R3/R4 as the target UART endpoint together with the selected protected peer connection |
| Block 9 addressable RGB | R5 to the protected RGB data output |

The two Block 5 feedback roles may exclusively reuse the two Block 1 input
resources. The common ESP mappings also assign several separately selected
Test Block roles to each route entry. Within one route entry these destinations
are mutually exclusive unless a later connection-matrix requirement explicitly
states otherwise.

Arbitrary simultaneous operation of all Test Blocks is not required. The
routing specification shall implement the simultaneous sets above and reject
or safely resolve prohibited combinations. The two SPI chip-select roles use
separate entries and shall both remain available during one SPI test, although
only the selected device is asserted at a time.

### 9.5 Control, Reset And Powered-Off Safety

The target controls routing over the direct I2C bus in every powered Operating
Mode. The host requests a capability through the target's Test Control
endpoint, and target firmware establishes and verifies the resolved route
configuration. The Harness Supervisor neither owns nor accesses this bus.

The direct bus shall use fixed, power-qualified isolation between the target,
Routing Control Service and switchable Standard Test Block domains as defined
by `I2CControlledRouting_V2.md`. This isolation is not a route selection and
shall not consume target GPIO beyond the mandatory SDA/SCL pair.

Hardware Clear shall remain possible without responsive target firmware or
access to the routing-control I2C bus. It returns every controlled path to its
safe inactive state but does not establish a functional route. The target's
commanded configuration and readback, together with the Hardware Clear action
and its completion indication where fitted, shall be available as test
evidence. The exact switch topology, register map, readback mechanism and
Hardware Clear circuit belong to the routing specification.

All route-selection and block-local switches shall default to a defined
high-impedance or otherwise electrically safe state before target or
Supervisor software runs. In particular:

* a target output shall never be connected to another active output
* no target input shall have more than one active source
* both SPI chip selects shall default inactive
* peer outputs shall default high impedance
* direct and routed sources shall remain isolated until the selected
  configuration is established and verified
* a route connected to a target strapping pin shall remain harmless throughout
  reset; the C3-derived R2 mapping specifically requires deterministic
  disconnection of `D2`
* independently powered pull-ups, routing devices, peers and debug connections
  shall not back-power an unpowered target

Routing and switch logic shall use the independent harness 3.3 V domain. Any
candidate device shall be assessed for powered-off isolation, signal injection
through protection structures and safe behaviour when harness and target power
sequence independently.

### 9.6 Downstream Design Boundary

This envelope fixes the minimum Test Block route-selection capacity, legal
common route functions, direct-path requirements, simultaneous sets and safety
constraints. `I2CControlledRouting_V2.md` and
`CombinedCapabilityConnectionMatrix_V2.md` apply those requirements to the
switch topology, path count, block-local switching, direct/routed conflicts,
control allocation and reserved capacity.

The remaining downstream work assigns physical Target Interface contacts and
implements the accepted paths in the schematic. It may refine physical
placement and bit allocation but shall not reduce the accepted seven-entry
Test Block minimum or violate the direct, simultaneous-use and safe-state
requirements above.

## 10. Routing-Envelope Validation Cases

These are downstream acceptance requirements for the routing-fabric design and
prototype. They do not need to be executed before this analysis document is
accepted, but they shall be satisfied before the physical routing topology and
Target Interface are frozen.

Any candidate routing topology shall demonstrate at least:

1. all four ESP32-C3 GPIO-loopback roles operating concurrently
2. ESP32-C3 SPI operation with both chip-select roles available
3. ESP32-C3 UART crosslink operation with an independent console/recovery path
4. ESP32-C3 1-Wire operation with both feedback inputs available
5. analogue feedback observed concurrently by the target ADC and MCP3008 CH0
6. target-controlled route establishment and verification
7. Hardware Clear returning every controlled path to its safe inactive state
   without target-I2C activity
8. a generous target using appropriate direct paths without topology changes
9. a non-ESP32 target mapping without changes to the reusable routing fabric
10. ESP32-C3 Supervisor-event wake from both light and deep sleep through
    `TI_I2C_INT` on R6

## 11. Post-Design Compatibility Exercises

These exercises challenge the derived routing specification after the
design-basis analysis. They do not automatically expand the routing envelope.

The two completed exercises support the derived routing envelope as a working
cross-target specification. Both compact targets are compatible through target
daughter boards without adding a route, destination or reusable harness
capability. No further post-design compatibility exercise is required at this
stage.

The base Seeed Studio XIAO ESP32-S3 full two-UART mapping uses the existing
seven-entry routing topology and all 11 exposed GPIOs. It therefore validates
the lower boundary of the accepted envelope. The ESP32-C3-DevKitM-1 accepts the
same complete logical mapping and qualifications as the design-basis
ESP32-C3-DevKitC-02, confirming transfer across another official compact C3
development-board family.

The XIAO compatibility result is subject to reset-safe isolation of the
`D2`/`GPIO3` strapping-pin route, target-specific reset and boot adaptation,
and reviewed power and mechanical arrangements. An accepted external-peer UART
mapping can instead avoid the strapping pin and retain two exposed GPIOs.
Appendix C summarises the assessment and provisional mappings.

The DevKitM-1 retains the C3 baseline's reset-safe `D2` route, direct I2C,
conditional UART0 crosslink and native-USB test-control arrangement. Appendix D
summarises the assessment and physical-board qualifications.

| Challenge target | Exercise status | Conclusion |
|---|---|---|
| Seeed Studio XIAO ESP32-S3 | Completed | Compatible through a daughter board; no reusable routing-fabric change |
| Espressif ESP32-C3-DevKitM-1 | Completed | Compatible through a daughter board using the accepted C3 mapping; no reusable routing-fabric change |

The completed exercises used the following classification scheme:

* fully compatible through a target daughter board
* compatible with documented capability exclusions
* compatible with a target-specific Adapter Service
* incompatible with the accepted routing envelope
* evidence of a broadly applicable design omission requiring review

Each exercise mapped exposed pins to logical Interface roles, tested the
required simultaneous configurations, identified console, reset, boot and
power constraints, and determined whether reusable harness changes were
required. Any later compatibility exercise shall reuse this method unless a
subsequent accepted specification changes the assessment boundary.

## 12. Open Decisions And Downstream Ownership

| Decision | Owner |
|---|---|
| Physical switch topology, total channel count and additional Control Service or peer routes beyond the accepted seven-entry Test Block minimum | Routing specification and combined connection matrix |
| Switch family and control-component selection | Routing specification and prototype verification |
| Hardware Clear circuit and recovery implementation | Routing specification |
| Detailed routing 3.3 V distribution, power sequencing and powered-off isolation | Harness schematic and routing specification, constrained by `StandardControlServices_V2.md` |
| Detailed Harness Supervisor hardware, firmware and host protocol | Supervisor implementation specification, constrained by `StandardControlServices_V2.md` |
| Physical Target Interface contacts | Target Interface contract |
| Per-target GPIO assignment and exclusions | Target studies and Target Profiles |
| Signal-integrity and timing acceptance | Prototype verification |

## Appendix A: Target Assessment Template

Each future target assessment should record:

1. target identity and source references
2. exposed GPIO inventory
3. fixed, reserved and electrically restricted pins
4. safe general-purpose and peripheral-capable pins
5. direct control, console and recovery paths
6. preferred hardware-debug path, Adapter Service and GPIO or concurrency impact
7. reset, boot and recovery mapping, including Adapter Service and onboard-circuit conflicts
8. candidate routing entries
9. Test Block role mapping and simultaneous-use cases
10. routing reuse, conflicts and exclusions
11. routing control, Hardware Clear and powered-off behaviour
12. other Adapter Service requirements
13. resulting routing-envelope implications

## Appendix B: Source Register

This register records the revisioned local material and official references
used to derive the design-basis target inventory. Sources used only for the two
post-design compatibility exercises are recorded in Appendices C.5 and D.5.

ESP32-C3-DevKitC-02 sources:

* `docs/targets/esp32-c3-devkitc-02/Resources/SCH_ESP32-C3-DEVKITC-02_V1_1_20210126A.pdf`
* `docs/targets/esp32-c3-devkitc-02/wiring.md`
* `docs/targets/esp32-c3-devkitc-02/bringup.md`
* `docs/design/V2Harness/targets/esp32-c3-devkitc-02/gpio-allocation-and-routing-design.md`
* official board guide covering WROOM-02 and WROOM-02U:
  `https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32c3/esp32-c3-devkitc-02/user_guide.html`
* official ESP32-C3 sleep-mode and GPIO-wakeup requirements:
  `https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-reference/system/sleep_modes.html`

ESP32 DevKitC V4 sources:

* `docs/targets/esp32-devkitc-v4/wiring.md`
* `docs/targets/esp32-devkitc-v4/Resources/esp32_devkitC_v4_pinlayout.png`
* `docs/handoff/2026-06-25-esp32-family-tests.md`
* official board guide:
  `https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html`
* official board schematic:
  `https://dl.espressif.com/dl/schematics/esp32_devkitc_v4_sch.pdf`
* official ESP32-WROOM-32E/32UE datasheet:
  `https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.pdf`
* official ESP32-WROVER-E/IE datasheet:
  `https://www.espressif.com/sites/default/files/documentation/esp32-wrover-e_esp32-wrover-ie_datasheet_en.pdf`
* official ESP32-WROOM-DA datasheet:
  `https://www.espressif.com/sites/default/files/documentation/esp32-wroom-da_datasheet_en.pdf`
* official ESP32 JTAG and OpenOCD guide:
  `https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/jtag-debugging/index.html`

ESP32-S3-DevKitC-1 sources:

* `docs/targets/ESP32-S3-DevKitC-1_V1.1/Resources/Connectors_ESP32-S3-DevKitC-1_V1.1_20220429.png`
* `docs/targets/ESP32-S3-DevKitC-1_V1.1/Resources/SCH_ESP32-S3-DevKitC-1_V1.1_20221130.pdf`
* `docs/targets/ESP32-S3-DevKitC-1_V1.1/Resources/PCB_ESP32-S3-DevKitC-1_V1.1_20220429.pdf`
* `KICAD/V2/Exploration/Espruino_Harness_V2/TARGET_LIBRARY_PROVENANCE.md`
* official V1.1 board guide:
  `https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html`
* earlier official V1.1 ordering table retained in ESP-IDF v5.0 documentation:
  `https://docs.espressif.com/projects/esp-idf/en/v5.0/esp32s3/hw-reference/esp32s3/user-guide-devkitc-1.html`
* official V1.1 board schematic:
  `https://dl.espressif.com/dl/schematics/SCH_ESP32-S3-DevKitC-1_V1.1_20221130.pdf`
* official ESP32-S3-WROOM-1/1U datasheet:
  `https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf`
* official ESP32-S3-WROOM-2 datasheet:
  `https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-2_datasheet_en.pdf`
* official ESP32-S3 GPIO restrictions:
  `https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/gpio.html`
* official built-in JTAG and USB Serial/JTAG guides:
  `https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-guides/jtag-debugging/configure-builtin-jtag.html`
  and
  `https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-guides/usb-serial-jtag-console.html`

Raspberry Pi Pico-family sources:

* `docs/targets/Raspberry-Pi-Pico-Family/Resources/picow-pinout.svg`
* `KICAD/V2/Exploration/Espruino_Harness_V2/TARGET_LIBRARY_PROVENANCE.md`
* official Pico-series board documentation and family comparison:
  `https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html`
* official Raspberry Pi Pico datasheet:
  `https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf`
* official Raspberry Pi Pico W datasheet:
  `https://datasheets.raspberrypi.com/picow/pico-w-datasheet.pdf`
* official RP2040 datasheet and GPIO function table:
  `https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf`
* official Raspberry Pi Pico 2 datasheet:
  `https://datasheets.raspberrypi.com/pico/pico-2-datasheet.pdf`
* official Raspberry Pi Pico 2 W datasheet:
  `https://datasheets.raspberrypi.com/picow/pico-2-w-datasheet.pdf`
* official RP2350 datasheet and GPIO function table:
  `https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf`
* official Raspberry Pi Debug Probe documentation:
  `https://www.raspberrypi.com/documentation/microcontrollers/debug-probe.html`

Espruino Pico sources:

* `docs/targets/espruino_pico/README.md`
* `docs/targets/espruino_pico/resources/espruino_pico_pinout.jpg`
* `docs/targets/espruino_pico/resources/schematic_1v3.pdf`
* official rendered board documentation: `https://www.espruino.com/Pico`
* authoritative board-documentation source:
  `https://github.com/espruino/EspruinoDocs/blob/master/boards/Pico.md`
* revisioned schematic and PCB authority: checked `Pico/eagle/pico_1v4.sch`
  and `Pico/eagle/pico_1v4.brd` sources from
  `https://github.com/espruino/EspruinoBoard`
* `https://www.espruino.com/AdvancedDebug`

MDBT42Q breakout sources:

* `docs/targets/MDBT42Q_breakout/README.md`
* `docs/targets/MDBT42Q_breakout/resources/connector_pins.jpg`
* `docs/targets/MDBT42Q_breakout/resources/mdbt42q_breakout_sch.pdf`
* official rendered board documentation: `https://www.espruino.com/MDBT42Q`
* authoritative board-documentation source:
  `https://github.com/espruino/EspruinoDocs/blob/master/boards/MDBT42Q.md`
* revisioned schematic and PCB authority: checked
  `MDBT42/eagle/mdbt42q_breakout.sch` and
  `MDBT42/eagle/mdbt42q_breakout.brd` at commit
  `3c0f25d0f67890fd0117e88633a455beb10eaebd` from
  `https://github.com/espruino/EspruinoBoard`
* `https://www.espruino.com/AdvancedDebug`

## Appendix C: XIAO ESP32-S3 Compatibility Exercise

### C.1 Scope And Conclusion

This exercise covers the base Seeed Studio XIAO ESP32-S3. The base target fits
the accepted routing envelope through a target daughter board and does not
require a change to the reusable routing fabric.

The full mapping is a boundary case: it consumes all 11 exposed GPIOs and uses
`D2`/`GPIO3`, a reset-latched strapping pin. The route connected to this pin
must remain disconnected or electrically harmless throughout reset. This is
the same routing property already required by the ESP32-C3 design basis.

### C.2 Provisional Full Mapping

| Harness allocation | XIAO pin | GPIO | Principal Test Block roles |
|---|---:|---:|---|
| R0 | `D0` | 1 | Analogue input and 1-Wire DQ |
| R1 | `D9` | 8 | Loopback A output and SPI MISO |
| R2 | `D1` | 2 | Loopback A input, I2C feedback, ADC CS and 1-Wire feedback A |
| R3 | `D10` | 9 | Loopback B output, SPI MOSI and UART A TX |
| R4 | `D8` | 7 | SPI SCK and UART A RX |
| R5 | `D3` | 4 | PWM and addressable-RGB output |
| R6 | `D2` | 3 | Loopback B input, I2C interrupt, external SPI CS and 1-Wire feedback B |
| Direct I2C SDA | `D4` | 5 | I2C SDA |
| Direct I2C SCL | `D5` | 6 | I2C SCL |
| Direct UART B TX | `D6` | 43 | UART B TX |
| Direct UART B RX | `D7` | 44 | UART B RX |

The ESP32-S3 GPIO matrix permits these peripheral assignments. Native USB uses
dedicated internal connections to the onboard USB-C connector and does not
consume one of the 11 exposed GPIOs. It provides the preferred test-control
and USB Serial/JTAG path while the two UART endpoints are under test. If the
loaded firmware initially assigns its console to `D6`/`D7`, the Target Profile
must move the console to native USB before selecting the UART crosslink test.

### C.3 Lower-Pin Alternative

The accepted external-peer form of Block 7 requires seven routed entries and
the two direct I2C signals, but not the direct UART B pair. It can therefore use
nine exposed GPIOs, avoid `D2`/`GPIO3`, and retain two exposed GPIOs. Its UART
evidence must be supplied by a host-controlled 3.3 V USB-UART adapter or the
future Harness Supervisor rather than a complete two-UART target crosslink.

The full mapping preserves greater target UART coverage. Selection between the
two forms belongs to the detailed daughter-board and Target Profile review; it
does not change the reusable routing envelope.

### C.4 Adapter, Power And Mechanical Qualifications

* reset and optional boot automation should use a daughter-board Adapter
  Service connected to the relevant button or test-pad nodes rather than
  consuming one of the mapped GPIOs
* the daughter board must preserve access and clearance for the USB-C connector
  and U.FL antenna connection
* target power must use a reviewed USB/VBUS, protected 5 V or battery
  arrangement; the exposed 3.3 V rail must not be assumed to be the target
  power input
* powered-off routing, UART, reset and boot connections must not back-power the
  target

The XIAO ESP32-S3 Sense expansion is not covered by this result. Its microSD
and other expansion functions use pins included in the provisional mapping, so
a fitted Sense expansion requires its own Target Profile, isolation assessment
and compatibility exercise. The XIAO ESP32-S3 Plus is also a separate physical
target.

### C.5 Sources

* official Seeed Studio XIAO ESP32-S3 series guide and pin definitions:
  `https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/`
* official Seeed Studio schematic linked from the series guide:
  `https://files.seeedstudio.com/wiki/SeeedStudio-XIAO-ESP32S3/new-res/202003751_XIAO%20ESP32S3_v1.4_SCH_260226.pdf.pdf`

## Appendix D: ESP32-C3-DevKitM-1 Compatibility Exercise

### D.1 Scope And Conclusion

This exercise covers the official ESP32-C3-DevKitM-1 fitted with an
ESP32-C3-MINI-1 or ESP32-C3-MINI-1U module. It is fully compatible through a
target daughter board and does not require a change to the reusable routing
fabric.

The board exposes the same relevant GPIO set and accepts the same complete
logical mapping as the design-basis ESP32-C3-DevKitC-02. The `MINI-1U` external
antenna changes only the daughter-board connector, cable and RF-clearance
requirements.

### D.2 Provisional Mapping

| Harness allocation | DevKitM GPIO | Principal Test Block roles |
|---|---:|---|
| R0 | `D0` | Analogue input and 1-Wire DQ |
| R1 | `D1` | Loopback A output and SPI MISO |
| R2 | `D2` | Loopback A input, I2C feedback, ADC CS and 1-Wire feedback A |
| R3 | `D3` | Loopback B output, SPI MOSI and UART A TX |
| R4 | `D4` | SPI SCK and UART A RX |
| R5 | `D10` | PWM and addressable-RGB output |
| R6 | `D5` | Loopback B input, I2C interrupt, external SPI CS and 1-Wire feedback B |
| Direct I2C SCL | `D6` | I2C SCL |
| Direct I2C SDA | `D7` | I2C SDA |
| Direct UART B RX | `D20` | UART0 RX |
| Direct UART B TX | `D21` | UART0 TX |

`D2` is the conditional strapping-pin route and must remain disconnected or
electrically harmless throughout reset. `D8` remains excluded because it is a
strapping pin connected to the onboard addressable RGB LED, while `D9` remains
reserved for BOOT/download control. R6 uses RTC-domain `D5` so
`TI_I2C_INT` supports both light- and deep-sleep event wake.

The complete mapping leaves no unallocated safe GPIO. This matches the C3
design-basis lower bound and introduces no new simultaneous-use requirement.

### D.3 Console, Debug And Recovery Qualifications

Block 7 uses the accepted C3 crosslink:

```text
D3 TX  -> D20 RX
D21 TX -> D4 RX
```

Native USB Serial/JTAG on `D18`/`D19`, exposed through a daughter-board USB
Adapter Service, provides the independent test-control and preferred debug
path. The onboard Micro-USB connector instead operates through the CP2102N
USB-UART bridge connected to `D20`/`D21`. It must not power or drive that bridge
while UART0 participates in the crosslink.

Hardware reset maps the direct `TI_TARGET_RESET_N` service to `RST`/`CHIP_PU`.
Optional automatic download maps `TI_BOOT_REQUEST` to active-low `D9`. The
daughter-board implementation must coexist safely with the onboard reset, boot
and automatic-download circuitry.

### D.4 Power And Mechanical Qualifications

* Micro-USB, 5 V header and 3.3 V header supplies are mutually exclusive; the
  daughter-board power arrangement must prevent competing supplies
* independently powered harness routing, UART, reset and boot connections must
  not back-power an unpowered target
* target placement must preserve access to the board headers and the required
  daughter-board native-USB connection
* the `MINI-1` PCB-antenna keepout or `MINI-1U` external-antenna connector and
  cable clearance must be preserved as applicable

### D.5 Sources

* official Espressif ESP32-C3-DevKitM-1 user guide and header definitions:
  `https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32c3/esp32-c3-devkitm-1/user_guide.html`
* official Espressif ESP32-C3-DevKitM-1 schematic:
  `https://dl.espressif.com/dl/schematics/SCH_ESP32-C3-DEVKITM-1_V1_20200915A.pdf`
