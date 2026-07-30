# V2 Reusable Harness Rev-A Prototype Strategy

**Status:** Agreed Prototype Direction

**Version:** 0.2

**Last Updated:** 27 July 2026

## 1. Conclusion

The first manufactured reusable V2 harness shall be a functionally complete,
diagnostically accessible **Rev-A Engineering Validation Board**. It shall be
designed in KiCad and manufactured and assembled in a small prototype quantity
by AISLER.

Rev A is intended to prove the reusable architecture, electrical interfaces,
routing fabric, Standard Test Blocks, Control Services and expected test
coverage. It is not the final size-, cost- or manufacture-optimised harness.

Target-specific mapping shall initially use a mechanically representative
wire-wrap daughter board. This preserves flexibility while the fixed reusable
harness and Target Interface are proved.

The complete reusable routing fabric will not be constructed as a separate
breadboard prototype. The assembled Rev-A harness is the routing-fabric and
system prototype.

## 2. Prototype System

The prototype system consists of:

1. the manufactured reusable Rev-A harness board
2. a flexible wire-wrap target daughter board
3. the existing Ubuntu test host and target USB connections
4. the Harness Supervisor and Rack Control Backplane interfaces where required
5. removable functional devices, peer modules and external test accessories

The Rev-A harness shall implement:

* all accepted Standard Test Blocks
* the complete controlled routing fabric
* all accepted Standard Control Services
* the Operating Mode and power-domain model
* target power switching and measurement
* reset, boot and Hardware Clear
* the fixed Target Interface connector banks
* the Supervisor and Rack Control Backplane interfaces
* the required diagnostic, observation and external-peer connections

It shall facilitate every expected baseline test even where some coverage is
proved incrementally during bring-up.

## 3. Manufacturing And Assembly

AISLER is the selected prototype board manufacturer and assembly service:

* <https://aisler.net/en/products/assembly>

The workflow shall use AISLER's native KiCad import, BOM and component-selection
facilities, price and availability review, and rendered placement and polarity
validation.

AISLER shall normally assemble:

* all fixed SMD integrated circuits
* SMD resistors, capacitors and protection components
* routing switches and routing-control devices
* power switches, measurement devices and power-domain isolation
* reset, boot and level-shifting circuitry

The prototype shall use visible-lead SOIC packages where available and TSSOP
where required. QFN, BGA and unnecessarily small passives shall be avoided.
0805 passives are preferred where placement and electrical requirements allow.

Through-hole parts may be fitted by hand where alignment, removal or later
substitution is useful. These include:

* Target Interface and Rack Control Backplane connectors
* screw terminals and Grove connectors
* shunt headers and individual test pins
* right-angle and mechanically sensitive connectors
* connectors for removable Test Block and peer modules

Actual mating boards, modules and backplane parts should be used as alignment
references when the corresponding connectors are hand fitted.

## 4. SMD And Removability Policy

All fixed harness ICs shall use SMD packages for Rev A, including:

* the functional MCP23017
* both routing-control MCP23017 devices
* the Rack Control MCP23008
* the MCP3008
* the TMUX1511 routing switches

The purchased through-hole parts remain useful for independent bench,
firmware and device-level experiments, but do not determine the Rev-A PCB
package choices.

Socket-based diagnosis shall be replaced by explicit electrical isolation:

* grouped zero-ohm links or solder jumpers on device power and shared buses
* removable links on important cross-domain signals
* test points on both sides of important isolation boundaries
* labelled address, reset, interrupt and control provisions
* DNP footprints for credible circuit alternatives

Zero-ohm resistors with accessible pads are preferred where routine inspection,
measurement and reversible removal are useful.

Devices and modules whose physical substitution remains part of normal
testing shall remain removable. This includes:

* both DS18B20 sensors
* the DS2413 module
* the microSD breakout
* the addressable-RGB Pixel Shifter
* the Grove I2C branch
* the external UART peer
* the target daughter board

## 5. PCB Layer Strategy

Rev A shall begin as a two-layer PCB.

The design shall use:

* predominantly top-side component placement and signal routing
* a substantially continuous bottom-side ground pour
* short bottom-side signal crossovers only where necessary
* wide traces or copper regions for power distribution
* ground stitching near connectors and functional boundaries
* short, direct analogue, SPI, I2C, 1-Wire and RGB paths

The board outline may be enlarged rather than sacrificing ground continuity,
test access or clear functional placement.

The design shall move to four layers before manufacture only if preliminary
placement and routing show that:

* the bottom ground plane is materially fragmented
* critical signal return paths cross ground gaps or narrow necks
* power and signal routing cannot be separated cleanly
* the required routes demand excessive crossings, vias or convoluted paths
* analogue or timing-sensitive layout cannot be kept short and well referenced

A four-layer transition is therefore a layout-driven risk-control decision, not
a baseline architectural requirement.

### 5.1 Board Envelope

The Rev-A harness shall use the intended future board height so that its
relationship with the Rack Control Backplane and associated connectors is
proved mechanically. The current target height is **100 mm**.

If additional PCB area is required during placement or routing, the board shall
grow in length rather than height. Rev-A placement will determine the required
prototype length and provide evidence for the later production-size review.

The mechanical drawing shall identify the height and length axes unambiguously,
including the backplane reference edge, connector datum and mounting-hole
positions. The 100 mm target shall be reviewed only for a demonstrated
backplane, clearance or manufacturing constraint, not merely to simplify
routing.

The board shall preserve the connector datum and mechanical space required by
the Rev-A harness-side backplane allocation defined in
`StandardControlServices_V2.md`, Section 8.3. The candidate parts remain
subject to mating, rating, footprint and physical-sample verification.

## 6. Combined Panel And Breakaway Links

The longer-term manufacturing vision is to fabricate the reusable harness and
its target daughter board as two separable boards in one PCB panel. Rev A shall
exercise this approach by including the reusable harness and flexible wire-wrap
daughter board in one manufacturable panel.

**Breakaway Links** are short copper tracks routed across the narrow PCB
bridges between the reusable harness and daughter board. While the boards
remain joined, these links carry every Target Interface electrical net and the
Target Interface connectors may remain unpopulated. Separating the boards cuts
the links; the connector banks then provide the Target Interface.

This allows the combined assembly to operate and be tested without incurring
connector cost where separation and target exchange are not required.

The same PCB design shall therefore support two configurations:

1. **Joined-board configuration** — the Breakaway Links provide the Target
   Interface and the two 2×12 connector banks may remain unpopulated.
2. **Separated-board configuration** — the Breakaway Links are broken and
   the populated two-bank connector system provides the Target Interface.

The Breakaway Links are a physical implementation of the accepted Target
Interface contract, not a second interface. Each link shall use the same
logical net name and electrical behaviour as its corresponding connector
contact. The links must cover every distinct Target Interface net, but need not
reproduce every duplicated power or ground contact individually. Power and
ground shall instead use sufficient trace width or parallel links for their
maximum joined-board current.

AISLER's prototype service does not provide V-scoring in its prototype pool.
The panel shall instead use routed slots and narrow breakaway bridges, following
the approach described in:

* <https://community.aisler.net/t/how-to-design-a-pcb-break-away/3590>

The preliminary design should use AISLER's preferred 1.8 mm or 2.4 mm routing
tool diameters and confirm the final geometry through the uploaded-board
validation or with AISLER before manufacture.

The breakaway design shall:

* retain both boards securely through manufacture, assembly and handling
* distribute the links across several narrow bridges rather than one broad,
  difficult-to-separate bridge
* keep components, vias, pads and connector loads clear of the fracture regions
* keep copper planes clear of the fracture regions except for the deliberate
  Breakaway Link traces
* place no via or layer transition within a breakaway bridge
* neck down wider power and ground traces locally where needed to preserve
  breakability
* place bridges where the separated edges can be dressed without damaging a
  functional or mating surface
* provide accessible continuity points on both sides of the separation
* preserve the required 100 mm harness height and backplane connector datum
* verify the daughter-board outline, Target Interface alignment and mounting
  relationship before separation
* remain compatible with AISLER's assembly rendering and component clearances

The preliminary layout should group the non-power signals into several
similarly loaded signal bridges and carry the power services with local ground
returns on dedicated bridges. Exact bridge count, track allocation and
neck-down geometry are PCB-layout decisions subject to current-capacity,
breakability and AISLER manufacturing review.

The Breakaway Links shall not be relied upon after separation. The separated
edges shall be dressed and inspected, and continuity and isolation checks shall
confirm that no copper remnant shorts adjacent nets before power is applied.
The Target Interface shall not be mated or unmated while either board is
powered.

The separated Rev-A daughter board remains a wire-wrap prototype. Testing the
combined panel does not freeze its later target-specific routing or final board
outline.

## 7. Wire-Wrap Daughter Board

The prototype daughter board shall reproduce the intended Target Interface
connector locations and mechanical relationship while providing a flexible
2.54 mm wiring grid for target-specific mapping.

It should provide:

* clearly labelled Target Interface signals
* distributed ground and target-power positions
* ground positions near I2C, SPI, UART and routed signals
* flexible mounting for the assessed development boards
* space for target-specific power, USB, reset and boot adaptation
* short wiring regions for timing-sensitive signals
* unambiguous separation of target 3.3 V reference/output and switched target
  5 V input

Wire-wrap mapping can correct or revise target GPIO assignments. It cannot
correct a missing reusable Interface function, an unsafe power boundary or an
incorrect harness-side connector contact. The logical and physical Target
Interface contract shall therefore be reviewed before the Rev-A harness is
released.

The wire-wrap daughter board proves logical mapping and practical target
attachment. It is not necessarily representative of the final daughter-board
signal integrity, density or manufacture.

## 8. Rev-A Diagnostic Design

Rev A shall favour diagnosis and rework over compactness.

It shall provide:

* labelled test points for every supply rail and ground domain
* access to direct I2C, Hardware Clear, reset, boot and power controls
* observation of representative route controls and switched signal paths
* current-limited and independently testable power inputs
* isolation at important device, Test Block and power-domain boundaries
* accessible SMD pads suitable for rework
* clear pin-1, polarity, connector and Operating Mode markings
* spare controller outputs held safe and observable where useful
* space for bodge wires and alternative components around unresolved or
  high-risk circuits

Diagnostic provisions shall not create parallel active paths or weaken the
normal safe state.

## 9. Pre-Manufacture Validation

Paper, schematic and layout validation shall minimise the known Rev-A risks
before an order is placed.

The release review shall include:

1. an accepted combined connection matrix
2. an accepted Target Interface signal and contact table
3. a complete power-state and back-power matrix
4. the accepted direct-I2C powered-off isolation implementation and its
   power-valid thresholds
5. selected target and Test Block power-switch circuits
6. the selected target-power monitor, shunt and measurement range
7. worst-case switch resistance, leakage and capacitance checks
8. I2C and 1-Wire pull-up, capacitance and rise-time checks
9. SPI, UART, RGB and analogue path-budget checks
10. clean KiCad ERC with every exception documented
11. clean PCB DRC
12. pin-by-pin symbol verification against authoritative data sheets
13. pin-by-pin footprint and package verification
14. KiCad 3D and printed 1:1 mechanical review
15. BOM availability and exact-part review through AISLER
16. AISLER rendering, orientation and polarity review
17. breakaway-panel geometry and manufacturing review
18. requirement-to-circuit and test-to-hardware coverage review

Passing this review cannot replace physical testing. It reduces avoidable
logical, package, connectivity and assembly errors before Rev A is used to
measure the remaining electrical and practical behaviour.

## 10. Mechanical Validation

Rev A shall prove:

* harness and daughter-board connector engagement
* target-module and daughter-board clearances
* access to USB, microSD, sensors and external peers
* removal of functional modules
* probe and isolation-link access with the target fitted
* backplane connector position and orientation
* mounting-hole and rack clearances
* that no board or module obscures an essential control or test point
* the fixed 100 mm harness height and selected Rev-A length
* combined-panel handling, clean separation and usable separated edges

Connector positions intended for later boards shall be production-representative
even where the connectors are hand assembled.

## 11. Bring-Up And Evidence

Initial bring-up shall proceed in bounded stages:

1. visual inspection and passive resistance checks
2. current-limited application of each power domain independently
3. verification of inactive power switches and Hardware Clear
4. I2C address, reset and isolation checks
5. continuity and isolation testing of every TMUX1511 channel
6. powered-off leakage and back-power testing
7. individual Standard Test Block bring-up
8. Target Interface continuity using the unpopulated daughter board
9. first-target connection and fixed-function testing
10. complete route-configuration testing
11. Supervisor and Rack Control Backplane testing
12. repeated power sequencing, reset and recovery testing

Evidence shall retain the released KiCad revision, manufacturing BOM, AISLER
part selections and substitutions, board rendering, DNP configuration, bring-up
results, modifications and identified Rev-B changes.

The board shall be marked clearly as:

```text
ESP32_SGATest V2
Reusable Harness
REV A - ENGINEERING VALIDATION
```

## 12. Prototype Quantity

The preferred initial quantity is three assembled Rev-A boards:

1. primary bring-up and rework
2. comparison and regression
3. spare or second-target system

Two assembled boards are the practical minimum if cost requires it. Additional
bare boards may be retained for mechanical checks, alternative population or
later manual assembly.

## 13. Rev-A Completion

Rev A is successful when it:

* implements and exercises the accepted routing and Control Service behaviour
* supports every expected baseline Test Block test
* proves safe startup, shutdown, isolation and recovery
* demonstrates target-controlled routing and independent Hardware Clear
* proves the Target Interface and daughter-board boundary with representative
  targets
* proves the Supervisor and Rack Control Backplane interfaces
* records measured limits, defects, rework and the changes required for Rev B

Rev A does not become the final design merely because it passes. Its evidence
shall drive the later review of board size, package density, connector
provision, production cost and retained diagnostic features.
