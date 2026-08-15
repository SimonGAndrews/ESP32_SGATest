# Reusable Harness Rev-A Critical Prototype Exercise

**Status:** Selected pre-manufacture workflow; detailed experiment design and
purchasing BOM deferred until the schematic baseline is complete

**Cost ceiling:** GBP 75, including adapters, construction materials, VAT and
delivery

## 1. Purpose And Recommendation

This workflow is the selected pre-manufacture risk-reduction step. It avoids
proceeding directly to an assembled Rev-A order without new circuit-level
proof in three areas where a good-quality prototype could expose a
consequential error:

1. target 5 V switching and two-range current measurement (`PC02`)
2. operating-mode 3.3 V source selection and Test Block power (`PC01`)
3. representative TMUX1511 routing, fixed-I2C isolation and Hardware Clear
   (`RC01`/`RC02`)

Use one reusable soldered prototype platform in three stages. It is not a
breadboard, second harness or reproduction of all 19 routes. Use through-hole
passives and 2.54 mm construction where practical, with unavoidable SMD devices
on adapters. Low-current logic may use good-quality wire-wrap; power, shunt,
decoupling and sensitive sense connections may not.

Complete the Rev-A schematic baseline before freezing these experiments or
placing the component order. The current circuit notes and parts worksheet are
planning inputs, not an order-ready design. Proceed to purchase only if the
complete basket remains below GBP 75 after a second comparison against the
finished experiment schematics.

This work does not change the accepted architecture. Any experiment
that indicates an architectural or circuit change must first update the
specification that owns that behaviour.

### 1.1 Workflow gates

1. Complete `TB07`, `TB09`, `TI01`, `BP01`, `EP01` and the final system
   integration review in the Rev-A design baseline.
2. Convert Experiments A-C into build-ready wiring or schematic records, with
   explicit supplies, net names, adapters, test points, limits and expected
   results.
3. Consolidate every active device, passive, adapter, connector, fuse,
   construction item, spare and rework consumable into one purchasing BOM.
4. Perform a same-day Mouser stock and price audit. Prefer one consolidated
   Mouser order; use another supplier only for a justified unavailable item.
5. Independently compare the final basket with every experiment design, save a
   dated basket snapshot and confirm the total remains within GBP 75 before
   ordering.

Availability observations in this document are planning snapshots rather than
approved substitutions. The production schematic retains its accepted exact
MPNs unless its owning specification is changed.

## 2. Construction Standard

If built, the prototype shall be a good-quality reusable engineering assembly:

- soldered prototype board, not a solderless breadboard
- secured IC adapters and labelled 2.54 mm connection points
- through-hole 1% resistors and suitable through-hole capacitors by default
- each 100 nF bypass mounted at the corresponding adapter supply pins with
  short leads
- wire-wrap limited to low-current digital control and observation signals
- soldered heavier wire or copper strip for the PC01 and PC02 power paths
- separate twisted Kelvin-sense pairs taken directly from the PC02 shunt lands
- current-limited supplies, a local PC02 fuse and accessible test points
- continuity, short-circuit, polarity and mechanical inspection before power

Use exact Rev-A active devices except where the BOM explicitly selects a
through-hole package of the same device. Package substitution can prove
behaviour but not the Rev-A footprint or assembly.

## 3. Risk Selection

| Priority | Circuit | Why physical proof is valuable | Prototype decision |
|---:|---|---|---|
| 1 | `PC02` target 5 V switching and dual-range monitor | Combines a high-current exposed-pad switch, two shunts, two monitor ranges, range switching, alerts and partial-power behaviour. The low-current end is sensitive to leakage and construction. | Build the available measurement and range-control subset. Treat TPS2559 protection behaviour as residual risk unless the exact device and a suitable carrier become available within budget. |
| 2 | `RC01`/`RC02` representative routing and safe state | TMUX1511 is new to V2. Powered-off protection, supervisor thresholds, control defaults and Hardware Clear have not been proved together on the bench. | Build a representative path and isolation boundary, not the complete fabric. |
| 3 | `PC01` operating-mode power selection | The data-sheet analysis is strong, but the complete manual-mode truth table, true OFF state, back-power behaviour and controlled Test Block rise have not been physically exercised together. | Build on the same platform. |

Rack Control, external modules and V1-derived Test Blocks remain subject to
their normal reviews but do not justify separate prototype expenditure. The
manufactured Rev-A board remains the complete routing-fabric prototype.

## 4. Experiment A - Representative Routing And Hardware Clear

### Circuit notes

Build one representative bidirectional routed signal pair and one fixed-I2C
isolation boundary:

- use one TMUX1511 for the representative UART or static digital route
- use a second TMUX1511 as the two-channel SDA/SCL isolation switch
- drive the route controls from an MCP23017
- use one TPS3808 to qualify the isolated I2C enable and a second TPS3808 to
  generate the controller Hardware Clear/reset release
- reproduce the 10 kOhm/100 kOhm supervisor-output bias and the DMG2302UKQ-7
  Hardware Clear request stage
- pull every externally driven TMUX control to its safe disabled state
- use two independent 3.3 V sources, or independently switched sources, so
  missing-supply and partial-power states can be exercised

The MCP23017-E/SP through-hole package may be used here to reduce SMD work. The
Rev-A board remains MCP23017-E/SO; its package mapping is verified separately.

### Minimum BOM

| Quantity | Part |
|---:|---|
| 2 | `TMUX1511PWR`, TSSOP-14 |
| 1 | `MCP23017-E/SP`, DIP-28 functional prototype package |
| 2 | `TPS3808G30DBVR`, SOT-23-6 |
| 1 | `DMG2302UKQ-7`, SOT-23 |
| 5 | 100 nF through-hole ceramic capacitor |
| 2 | 4.7 nF C0G/NP0 through-hole capacitor |
| 4 | 4.7 kOhm, 1%, through-hole resistor |
| 3 | 10 kOhm, 1%, through-hole resistor |
| 4 | 100 kOhm, 1%, through-hole resistor |
| 4 | 470 Ohm, 1%, through-hole resistor |
| 2 | TSSOP-14 to 2.54 mm adapter |
| 2 | SOT-23-6 to 2.54 mm adapter |
| 1 | SOT-23 to 2.54 mm adapter |

### Test and expected risk reduction

Exercise cold start, slow ramp, brownout, power-down and missing-supply states.
Confirm that:

- all signal paths start and remain open until deliberately enabled
- controller reset is held while `ROUTING_LOGIC_3V3` is invalid
- the isolated SDA/SCL pair is not back-powered through an unpowered TMUX1511
- Hardware Clear overrides firmware and returns the path to its safe state
- static levels and representative UART traffic pass bidirectionally
- TPS3808 asserted-low and released-high levels retain useful margin

A pass reduces the risk of an enabled startup route, I2C back-power or failed
Hardware Clear. It does not prove all route mappings, PCB parasitics or final
I2C rise time.

## 5. Experiment B - Operating-Mode Power Selection

### Circuit notes

Reproduce the accepted `PC01` circuit around the two 3.3 V inputs:

- TPS2116 in the accepted manual `MODE`/`PR1` arrangement
- the five BAT54C decode stages and DMN2024UQ-7 pull-down
- TPS22917 switching `ROUTING_LOGIC_3V3` to `TEST_BLOCK_3V3`
- 2.2 nF `CT`, QOD tied to the switched output and the four local 1 uF
  capacitors
- the four-row Operating Mode selector and a switchable 22-50 uF Test Block
  load

Use soldered low-resistance wiring for the power rails. Wire-wrap is acceptable
only for the static mode-control nodes.

### Minimum BOM

| Quantity | Part |
|---:|---|
| 1 | `TPS2116DRLR`, SOT-5X3-8 |
| 1 | `TPS22917DBVT`, SOT-23-6 experiment procurement option |
| 1 | `DMN2024UQ-7`, SOT-23 |
| 5 | `BAT54C-E3-08`, SOT-23 |
| 4 | 100 kOhm, 1%, through-hole resistor |
| 1 | 10 kOhm, 1%, through-hole resistor |
| 4 | 1 uF through-hole multilayer ceramic capacitor |
| 1 | 2.2 nF C0G/NP0 through-hole capacitor |
| 1 | 2x4 2.54 mm header and four shunts |
| 1 | Switchable approximately 22-50 uF test load |
| 1 | SOT-5X3-8/DRL adapter |
| 1 | SOT-23-6 adapter |
| 6 | SOT-23 adapters, or one combined soldered carrier |

`TPS22917DBVT` is the cut-tape/carrier alternative currently considered for
the experiment. It uses the same TPS22917 device and DBV package as
`TPS22917DBVR`; the production design retains its accepted `DBVR` MPN. Confirm
this equivalence and live availability again before ordering.

### Test and expected risk reduction

Measure both input rails, `MODE`, `PR1`, `ROUTING_LOGIC_3V3` and
`TEST_BLOCK_3V3` in every accepted mode, with each source missing and with slow
ramps. Confirm:

- the selected source alone powers `ROUTING_LOGIC_3V3`
- OFF leaves the routing rail high impedance
- no unselected source is materially back-powered
- Test Block power follows the accepted standalone/supervised rules
- QOD discharges the Test Block rail when disabled
- the selected `CT` produces a controlled rise with 22 uF and 50 uF loads

A pass reduces the risk of a wrong truth table, incomplete OFF state,
back-power or excessive charging surge. It does not replace completed-board
resistance, transient or load-capacitance measurements.

## 6. Experiment C - Target 5 V Measurement And Range-Control Subset

### Circuit notes

Build the available measurement and range-control subset of `PC02`:

- use the exact 50 mOhm Rev-A shunt with an INA226 high-current-range device
- use Adafruit `ADA5832` as the INA228 carrier; retain its original 15 mOhm
  shunt and temporarily adapt the module to the exact 1 Ohm Rev-A shunt
- use an AO3401A bypass around the 1 Ohm low-current shunt
- use `TXU0101DCKR` on an SC70-6 adapter as an experiment-only package
  substitute for the production `TXU0101DBVR`
- include the SN74LVC2G08 range-control/partial-power logic and the accepted
  alert and safe-state biasing
- feed the measurement path from a current-limited 5 V bench supply through a
  local fuse; this supply does not emulate the TPS2559 protection stage

Use short soldered heavy wire or copper strip for the force path. Take
four-wire sense connections directly from the shunt lands wherever the
prototype construction permits. The experiment cannot reproduce the final PCB
Kelvin geometry, but it can still expose polarity, range-control, calibration
and partial-power defects.

### Minimum BOM

| Quantity | Part |
|---:|---|
| 1 | `INA226AIDGSR`, VSSOP-10 |
| 1 | Adafruit `ADA5832` INA228 module with original shunt retained |
| 1 | `TXU0101DCKR`, SC70-6 experiment package |
| 1 | `SN74LVC2G08DCUR`, VSSOP-8 |
| 1 | `AO3401A`, SOT-23 |
| 1 | `PE2512FKF7W0R05L`, 50 mOhm, 1%, 2 W shunt |
| 1 | `CHP2512-FX-1R00ELF`, 1 Ohm, 1%, 3 W shunt |
| 5 | 100 kOhm, 1%, through-hole resistor |
| 3 | 10 kOhm, 1%, through-hole resistor |
| 2 | 4.7 kOhm, 1%, through-hole I2C pull-up |
| 1 | 1 uF through-hole ceramic capacitor |
| 6 | 100 nF through-hole ceramic capacitor |
| 1 | VSSOP-10 to 2.54 mm adapter |
| 1 | VSSOP-8 to 2.54 mm adapter |
| 1 | SC70-6 to 2.54 mm adapter |
| 1 | SOT-23 adapter |
| 2 | 2512 shunt carriers supporting force and Kelvin connections |

The prototype must use the accepted 2512 shunts for range and calibration
work. A through-hole substitute could demonstrate only coarse monitor
operation; it cannot validate the Rev-A range boundary, measurement
calibration, leakage or heating.

### Test and expected risk reduction

Use a current-limited 5 V source and increase load in controlled steps. Confirm:

- both monitors enumerate and report the expected bus and shunt polarity
- the bypass MOSFET selects the intended measurement range without an unsafe
  intermediate state
- safe alerts and range control under partial power
- agreement with a reference DMM across representative low and high currents,
  including whether the 100 uA objective appears plausible
- the voltage drop and heating of the measurement path remain explainable at
  the safe load limit established for the prototype construction

A pass gives useful confidence in both monitors, shunt polarity, range control,
bypass operation and the associated partial-power logic. Prototype leakage and
thermal EMF may dominate at the lowest currents, so failure to prove 100 uA
here does not alone reject Rev A. A polarity, saturation, partial-power or
sequencing failure does stop release.

`TPS2559QWDRCRQ1` was not available from the preferred consolidated supplier
at the planning checkpoint. Unless a genuine exact device and suitable
PowerPAD carrier become economically available before the order is frozen,
this experiment does **not** validate enable, overload, short-circuit,
current-limit, fault timing or TPS2559 thermal behaviour. Those functions
remain explicit Rev-A residual risk. The experiment also does not replace the
PCB's Kelvin routing, copper-area, connector-drop and thermal verification.

## 7. Cost Control

This planning allowance assumes existing bench instruments, loads, soldering
tools and ordinary hookup stock. Recheck the complete basket before ordering.

| Cost group | Planning allowance |
|---|---:|
| Reusable soldered prototype board, headers, wire, labels and adapter assortment | GBP 12 |
| Experiment A active parts and dedicated passives | GBP 10 |
| Experiment B active parts and dedicated passives | GBP 7 |
| Experiment C active parts, exact shunts and special carriers | GBP 20 |
| Spare fine-pitch devices and rework consumables | GBP 6 |
| VAT, consolidated delivery and price contingency | GBP 15 |
| **Planned total** | **GBP 70** |
| **Hard stop** | **GBP 75** |

The estimate assumes self-assembly and one consolidated Mouser order wherever
practical. The `ADA5832` module may require one justified separate Pi Hut
order. Rebuild the allowance from the completed experiment BOM because split
delivery can determine whether the GBP 75 limit is still achievable.

Do not buy the approximately USD 67 TPS2559EVM-624 for this exercise: that one
item would consume most of the budget. Do not improvise a high-current
exposed-pad assembly merely to expand the experiment. The untested TPS2559
functions are recorded as residual risk unless the exact device and a sound
carrier solution become available before the basket is frozen.

Cost references checked 14 August 2026:

- [TMUX1511PWR, Mouser UK](https://www.mouser.co.uk/ProductDetail/Texas-Instruments/TMUX1511PWR)
- [Adafruit ADA5832 INA228 module, Pi Hut](https://thepihut.com/products/adafruit-ina228-i2c-85v-20-bit-high-or-low-side-power-monitor-stemma-qt-qwiic)
- [low-cost UK adapter examples](https://fluxworkshop.com/collections/prototyping-breakout-boards-ic)
- [TPS2559EVM-624 price reference](https://www.digikey.com/en/products/detail/texas-instruments/TPS2559EVM-624/5005236)

### 7.1 Procurement snapshot - 14 August 2026

This snapshot preserves the research direction; it is not authority to order.
Supplier stock and carrier suffixes shall be checked again in the live basket.

- Mouser showed a practical single-supplier route for Experiment A using
  `DMG2302UKQ-7`, `MCP23017-E/SP`, `TMUX1511PWR` and
  `TPS3808G30DBVR`.
- Mouser showed `BAT54C-E3-08`, `DMN2024UQ-7` and `TPS2116DRLR` for
  Experiment B. `TPS22917DBVT` is the current experiment procurement option
  where `TPS22917DBVR` is unavailable; production remains `DBVR`.
- Mouser showed `TXU0101DCKR` for the reduced Experiment C. It provides the
  required TXU0101 function in SC70-6 for an adapter-built experiment;
  production remains `TXU0101DBVR`.
- The Adafruit `ADA5832` INA228 module is the preferred practical low-range
  monitor carrier and was identified from Pi Hut. Its original 15 mOhm shunt
  shall be retained for restoration while the exact Rev-A 1 Ohm shunt is
  adapted for this experiment.
- `TPS2559QWDRCRQ1` was not available from Mouser at the checkpoint; the live
  indication deferred stock until 3 December 2026. Do not substitute a
  different current-limit switch and claim that the result validates PC02.

The provisional purchasing worksheet is
[`Experimental parts.csv`](Experimental%20parts.csv). Its quantities and
supplier cells are working data until the experiment designs and consolidated
BOM pass the workflow gates in Section 1.1.

The 15 August 2026 worksheet revision reconciles the selected carrier and
package alternatives with this document. Passive quantities, adapter choices,
spares and supplier entries remain provisional and shall not be used to order
until the build-ready experiment designs are complete.

## 8. Build Order And Decision Points

Establish the assembly method before attempting the measurement circuit:

1. build and test Experiment A
2. reuse the platform and build Experiment B
3. proceed with the reduced Experiment C only after the shunt, force-path and
   sense wiring has passed an unpowered inspection

After each stage record `Pass`, `Correct and repeat`, `Design stop`, or `Cost
stop`. A design stop updates the owning specification before KiCad; a cost stop
compares the residual risk directly with ordering Rev A.

Retain an annotated wiring note, actual BOM, photographs, supply/current limits,
results, deviations and a short proceed/change decision. Commercial production
traceability is outside scope.

## 9. Release Interpretation

Successful experiments reduce device-integration and state-control risk but do
not approve the board for manufacture. Rev-A release still requires the
accepted schematic baseline, deterministic connectivity contracts, complete
ERC, PCB DRC, package review, physical layout actions, mechanical checks and
AISLER BOM/rendering review.

The AISLER planning comparison observed on 14 August 2026 was EUR 90.07 for
one assembled board, EUR 221.53 for five and EUR 361.99 for ten. After
successful experiments and completion of all release checks, the preferred
initial manufacture is five boards rather than ten. A later corrected or
repeat five-board batch would cost more than ordering ten at once, but retains
an opportunity to correct the design before committing the larger quantity.
This is a planning decision, not manufacturing approval or a fixed quotation.
