# V2 Combined Capability Connection Matrix

**Status:** Accepted

**Version:** 1.0

**Last Updated:** 27 July 2026

## 1. Conclusion

The accepted V2 capabilities require:

* 19 software-controlled route-selection paths
* four software-controlled UART block-local paths
* two mandatory direct I2C signals
* two additional direct UART-B signals for the common two-UART form
* four fixed, power-qualified I2C-isolation paths
* two fixed, protected Supervisor event-handshake paths

The 23 software-controlled paths fit six four-channel `TMUX1511` packages with
one spare channel. The four fixed I2C-isolation paths use one additional
four-channel `TMUX1511`. The Supervisor event-handshake paths are fixed
low-speed connections and do not consume routing switches or routing-controller
outputs. No further software-controlled signal path is identified by the
current Test Block, Control Service or target-envelope requirements.

This matrix confirms the logical connection inventory, required simultaneous
configurations, conflicts, safe states and recovery dependencies. It is the
implementation input to the routing schematic and physical Target Interface
contract; it does not redefine the behaviour owned by the source
specifications.

## 2. Scope And Authority

This matrix integrates requirements from:

* `StandardTestBlocks_V2.md`
* `StandardControlServices_V2.md`
* `TargetRoutingEnvelope_V2.md`
* `I2CControlledRouting_V2.md`
* `HybridHarnessArchitecture_V2.md`

It does not assign:

* physical Target Interface contacts
* target-specific GPIOs
* final MCP23017 bit positions
* PCB reference designators
* exact protection, pull-up or switch-enable component values

Those assignments shall preserve the stable logical path IDs in this document.

## 3. Matrix Terms

`R0` through `R6` are the seven common Target Interface route-entry signals.
A target with constrained GPIO maps seven target pins to these entries.

The `TI_*` names in the route matrix identify logical Test Block endpoints. A
target can reach such an endpoint either:

1. through one accepted R0-R6 route-selection path, or
2. through a reviewed direct Target Interface mapping where its GPIO budget
   permits

A direct mapping and its alternative routed source shall never be active
together. The route switch provides the normal electrical isolation; the
Target Profile and Resolved Test Configuration prohibit selection of that
route while the direct mapping is present.

**Target role** describes the signal direction at the target. All
route-selection switches are electrically bidirectional even where the normal
role has one direction.

## 4. Route-Selection Connection Matrix

Every path in this table defaults open. Within each route-entry group, at most
one path may be closed.

| Path ID | Route entry | Test Block endpoint | Block | Target role | Exclusive group |
|---|---|---|---:|---|---|
| `RP01` | R0 | `TI_ANALOG_ADC_IN` | 2 | Analogue input | R0 |
| `RP02` | R0 | `TI_ONEWIRE_DQ` | 5 | Bidirectional open-drain | R0 |
| `RP03` | R1 | `TI_GPIO_LOOP_A_OUT` | 1 | Output | R1 |
| `RP04` | R1 | `TI_SPI_MISO` | 4 | Input | R1 |
| `RP05` | R2 | `TI_GPIO_LOOP_A_IN` | 1 | Input | R2 |
| `RP06` | R2 | `TI_I2C_FB` | 3 | Input | R2 |
| `RP07` | R2 | `TI_SPI_CS_ADC` | 4 | Output | R2 |
| `RP08` | R2 | `TI_ONEWIRE_GPIO_A_FB` | 5 | Input | R2 |
| `RP09` | R3 | `TI_GPIO_LOOP_B_OUT` | 1 | Output | R3 |
| `RP10` | R3 | `TI_SPI_MOSI` | 4 | Output | R3 |
| `RP11` | R3 | `TI_UART_A_TX` | 7 | Output | R3 |
| `RP12` | R4 | `TI_SPI_SCK` | 4 | Output | R4 |
| `RP13` | R4 | `TI_UART_A_RX` | 7 | Input | R4 |
| `RP14` | R5 | `TI_ANALOG_PWM_OUT` | 2 | Output | R5 |
| `RP15` | R5 | `TI_RGB_DATA` | 9 | Output | R5 |
| `RP16` | R6 | `TI_GPIO_LOOP_B_IN` | 1 | Input | R6 |
| `RP17` | R6 | `TI_I2C_INT` | 3 | Input | R6 |
| `RP18` | R6 | `TI_SPI_CS_EXT` | 4 | Output | R6 |
| `RP19` | R6 | `TI_ONEWIRE_GPIO_B_FB` | 5 | Input | R6 |

The inventory contains exactly 19 route-selection paths. `TI_I2C_SDA` and
`TI_I2C_SCL` are deliberately absent because the routing-control bus cannot
depend on a route that it must first configure.

## 5. UART Block-Local Connection Matrix

These four paths change the internal connection arrangement of Block 7. They
are not R0-R6 route selections, but they share the routing-control MCP23017s
and safe-state rules.

| Path ID | Source | Destination | Active configuration | Default |
|---|---|---|---|---|
| `UP01` | `TI_UART_A_TX` | `TI_UART_B_RX` | UART crosslink | Open |
| `UP02` | `TI_UART_B_TX` | `TI_UART_A_RX` | UART crosslink | Open |
| `UP03` | `TI_UART_A_TX` | External peer RX at endpoint-A peer header | UART external peer | Open |
| `UP04` | External peer TX at endpoint-A peer header | `TI_UART_A_RX` | UART external peer | Open |

`UP01` and `UP02` operate as one full-duplex crosslink state. `UP03` and
`UP04` operate as one external-peer state. The two states are mutually
exclusive:

* the crosslink state leaves the external peer isolated
* the external-peer state leaves UART B isolated
* the inactive state leaves all four paths open

No configuration may connect the external-peer TX and `TI_UART_B_TX` to
`TI_UART_A_RX` together.

Rev-A external-peer operation therefore uses logical endpoint A. The separate
endpoint-A peer header carries only the switched, 470 Ohm protected paths and
ground. The endpoint-B header is a direct high-impedance diagnostic provision;
external equipment shall not drive either of its signal contacts. A target
with only one usable UART maps that UART to endpoint A.

CTS and RTS are not accepted Target Interface or Block 7 requirements in the
current inventory. A justified target-specific test may expose them through a
daughter-board Adapter Service without changing this standard matrix. Adding
them to the reusable harness later would require an upstream Test Block
requirement and a revised connection matrix.

## 6. Fixed Direct And Infrastructure Paths

### 6.1 Target-Facing Direct Paths

| Direct ID | Signal or service | Requirement | Routing relationship |
|---|---|---|---|
| `DP01` | `TI_I2C_SDA` | Mandatory direct, bidirectional open-drain | Never software routed |
| `DP02` | `TI_I2C_SCL` | Mandatory direct, bidirectional open-drain | Never software routed |
| `DP03` | `TI_UART_B_TX` | Direct in the common two-UART form | Used by `UP02`; may be unavailable for an accepted external-peer-only target |
| `DP04` | `TI_UART_B_RX` | Direct in the common two-UART form | Used by `UP01`; may be unavailable for an accepted external-peer-only target |
| `DP05` | `TI_TARGET_3V3` | Target output and bounded I/O-domain reference | Direct power/reference service; never a route |
| `DP06` | `TI_SWITCHED_TARGET_5V` | Harness output to the daughter-board target-power mapping | Direct power service; never a route |
| `DP07` | `TI_TARGET_RESET_N` | Active-low open-drain reset request | Direct Control Service; never depends on target I2C |
| `DP08` | `TI_BOOT_REQUEST` | Optional active-low open-drain boot request | Direct Control Service; never depends on target I2C |

The selected host-facing Test Control endpoint is also direct or
target-specific and shall remain independent of the route under test. It does
not imply another common Target Interface signal: for the current development
boards it is normally the target's onboard USB or documented UART/debug
Adapter Service.

Hardware Clear is harness infrastructure. It resets the routing-control
devices without adding a target-facing signal and without using `DP01` or
`DP02`.

### 6.2 Fixed I2C Power-Domain Isolation

The following paths are fixed, power-qualified infrastructure rather than
software route selections:

| Isolation ID | Connection | Conductive condition | Default |
|---|---|---|---|
| `IP01` | Target SDA to Routing Control Service SDA | Target I/O domain and Routing Logic Supply Rail valid | Open |
| `IP02` | Target SCL to Routing Control Service SCL | Target I/O domain and Routing Logic Supply Rail valid | Open |
| `IP03` | Routing Control Service SDA to Standard Test Blocks SDA | Routing Logic and Test Block Supply Rails valid | Open |
| `IP04` | Routing Control Service SCL to Standard Test Blocks SCL | Routing Logic and Test Block Supply Rails valid | Open |

Separate pull-ups belong to the target, routing-control and Test Block bus
segments. These four paths occupy the seventh `TMUX1511` and do not consume
routing-controller outputs.

### 6.3 Supervisor Event-Handshake Paths

These fixed protected paths connect the Supervisor-owned Rack Control Endpoint
to the target-programmable MCP23017 in Standard Test Block 3. They belong to
the separate Supervisor Interface and do not add Target Interface contacts.

| Supervisor path ID | Connection | Direction | Safe inactive state |
|---|---|---|---|
| `SP01` | Rack Control Endpoint `SUP_EVENT_OUT` to one protected Test Block 3 MCP23017 input | Supervisor to harness | Defined inactive level at the MCP23017 input when the Supervisor is absent or unpowered |
| `SP02` | One target-controlled Test Block 3 MCP23017 output to Rack Control Endpoint `SUP_EVENT_IN` | Harness to Supervisor | Harmless at the Rack Control Endpoint when either side is absent or unpowered |

The Test Block 3 input selected for `SP01` shall be input-capable. The exact
Port B GPIO assignments and protection circuits remain schematic decisions.
Neither path consumes a `TMUX1511`, an R0-R6 route-selection channel or a
routing-control MCP23017 output.

## 7. Required Simultaneous Configurations

Each row is a complete legal configuration for the common R0-R6 form. An
accepted direct or selectively routed target shall provide the equivalent
logical endpoints and concurrency.

| Configuration | Active route paths | Required direct or block-local paths | Principal conflict rule |
|---|---|---|---|
| GPIO loopback | `RP03`, `RP05`, `RP09`, `RP16` | None | Both pairs operate together; never connect two target outputs |
| Analogue feedback | `RP01`, `RP14` | MCP3008 CH0 observes the same internal `ANALOG_FB` node | External stimulus requires the target PWM path to be isolated first |
| I2C functional device | `RP06`, `RP17` | `DP01`, `DP02`, `IP01`-`IP04` | Routing-control bus remains established; functional device and Grove addresses must not conflict |
| SPI | `RP04`, `RP07`, `RP10`, `RP12`, `RP18` | None | Both chip selects are routed and default inactive; only the selected device is asserted |
| Analogue plus SPI observation | `RP01`, `RP04`, `RP07`, `RP10`, `RP12`, `RP14`, `RP18` | MCP3008 CH0 observes `ANALOG_FB` | Uses all R0-R6 entries; no additional route may be selected |
| 1-Wire and GPIO | `RP02`, `RP08`, `RP19` | None | Both feedback inputs operate together; Block 1 input uses are excluded |
| UART crosslink | `RP11`, `RP13` | `DP03`, `DP04`, `UP01`, `UP02` | External peer isolated; independent Test Control endpoint required |
| UART external peer | `RP11`, `RP13` | `UP03`, `UP04` | UART B and any other RX driver isolated; independent Test Control endpoint required |
| Addressable RGB | `RP15` | Protected 3.3 V observation node before local level translation | No simultaneous R5 analogue-PWM route |
| Supervisor event wake | `RP17` for the common routed form | `DP01`, `DP02`, `IP01`-`IP04`, `SP01`, `SP02` | Other R6 destinations excluded; `SUP_EVENT_OUT` remains inactive until the target has configured the MCP23017 interrupt and entered the requested sleep state |

Arbitrary simultaneous operation of all Test Blocks is not required.
Configurations not represented here, or not explicitly accepted by a later
revision, shall be rejected before any switch state changes.

## 8. Direct, Routed And Shared-Resource Conflicts

| Conflict | Required resolution | Enforcement |
|---|---|---|
| More than one destination selected from one R0-R6 entry | Prohibited | Complete-state validation and one-hot routing controls |
| Direct and routed source connected to the same Test Block endpoint | Only one implementation active; no hard parallel path | Daughter-board mapping, explicit isolation and Target Profile |
| Block 1 input and Block 5 feedback reuse on R2 or R6 | Mutually exclusive configurations | `RP05` versus `RP08`; `RP16` versus `RP19` |
| Block 2 PWM and Block 9 RGB reuse on R5 | Mutually exclusive configurations | `RP14` versus `RP15` |
| Block 3 feedback and Block 4 ADC chip select reuse on R2 | Mutually exclusive configurations | `RP06` versus `RP07` |
| Block 3 interrupt and Block 4 extension chip select reuse on R6 | Mutually exclusive configurations | `RP17` versus `RP18` |
| Block 3 feedback/interrupt and Block 5 feedback reuse on R2/R6 | Mutually exclusive configurations | R2 and R6 one-hot rules |
| Block 1 loopback outputs and SPI/UART outputs reuse on R1/R3 | Mutually exclusive configurations | R1 and R3 one-hot rules |
| SPI SCK and UART A RX reuse on R4 | Mutually exclusive configurations | `RP12` versus `RP13` |
| UART crosslink and external peer | Mutually exclusive complete states | `UP01`/`UP02` versus `UP03`/`UP04` |
| Multiple sources driving one UART RX | Prohibited | Block-local switch state and target-specific onboard-bridge isolation |
| Both SPI chip selects asserted simultaneously | Prohibited during ordinary tests, although both paths remain routed | Target driver state and inactive pull-ups |
| Functional I2C test disrupts the shared control bus | Permitted only after routes are latched; state verified again after recovery | Target Support Module sequence |
| Supervisor event wake reuses the Block 3 interrupt path | Uses the same `TI_I2C_INT` endpoint and therefore excludes every other R6 destination in the common routed form | `RP17`, R6 one-hot rule and Resolved Test Configuration |
| Test Control endpoint shares pins with a Test Block | Selected endpoint must remain independent and the alternative path isolated | Target Profile and Resolved Test Configuration |
| Reset or Boot Request depends on a routed or target-I2C path | Prohibited | Direct Control Service mapping |

## 9. Safe State And Recovery Matrix

| Condition or action | Required connection state |
|---|---|
| Routing Logic Supply Rail absent or invalid | All `RP*`, `UP*` and `IP*` paths open |
| Target I/O domain absent | `IP01` and `IP02` open; no harness pull-up back-powers the target |
| Test Block Supply Rail absent | `IP03` and `IP04` open; no direct-I2C back-power into Test Blocks |
| Routing-controller reset or `ROUTE_CLEAR_N` asserted | All `RP*` and `UP*` paths open |
| Routing-controller outputs unconfigured | External pull-downs hold all `RP*` and `UP*` switches open |
| Target reset or startup | Routes remain open until target firmware applies and verifies a legal complete state |
| Route change | Target and peer drivers inactive; old paths clear and verified before new paths close |
| Test complete or failed configuration | Drivers inactive, then all selected `UP*` and `RP*` paths cleared and verified |
| Supervisor loss | Direct reset, boot and Hardware Clear controls return to their inactive hardware defaults |
| Supervisor absent or either event-handshake endpoint unpowered | `SUP_EVENT_OUT` remains inactive at the Test Block 3 MCP23017; `SUP_EVENT_IN` is harmless and neither path back-powers the other endpoint |

Hardware Clear establishes the safe inactive state; it does not create a
functional route. It remains independent of target firmware and the
target-owned direct I2C bus.

## 10. Count And Package Closure

| Class | Used paths | Four-channel packages | Spare channels |
|---|---:|---:|---:|
| Route selection, `RP01`-`RP19` | 19 | Included below | — |
| UART block-local, `UP01`-`UP04` | 4 | Included below | — |
| Software-controlled total | 23 | 6 | 1 |
| Fixed I2C isolation, `IP01`-`IP04` | 4 | 1 | 0 |
| Overall TMUX1511 total | 27 | 7 | 1 |

The spare software-controlled channel does not authorise another route. A new
path requires an accepted Test Block, Control Service or peer requirement and
a revised matrix.

`SP01` and `SP02` are fixed protected low-speed paths and do not alter the
`TMUX1511` or routing-control-output counts.

The provisional two-MCP23017 control allocation supplies 32 GPIO controls:
23 are assigned by this matrix and nine remain reserved. The connection-matrix
review therefore identifies no additional routing controller.

## 11. Downstream Decisions

This matrix closes the logical path-count and conflict review. The following
implementation decisions remain:

1. assign physical Target Interface connector banks and contacts
2. define the direct-contact population or isolation method used by generous
   target mappings
3. freeze MCP23017 addresses, bit positions and switch reference designators
4. select I2C pull-ups and power-valid thresholds
5. verify switch resistance, leakage, capacitance and supported bus rates
6. record each target's direct, routed, unavailable and conflicting mappings in
   its Target Profile
7. assign the two Test Block 3 Port B event-handshake GPIO and define the
   `SUP_EVENT_OUT` and `SUP_EVENT_IN` protection circuits

The schematic shall include the path IDs from this matrix in net labels,
hierarchical labels, fields or an adjacent implementation table so that every
physical switch channel remains traceable.

## Appendix A: Provisional Target Interface Contact Count

### A.1 Working Assumption

The working assumption is a **40-contact Target Interface** comprising 34
named functional contacts and six distributed ground contacts.

This is a planning input for connector-bank selection and mechanical layout.
It is not yet the accepted physical Target Interface contract.

### A.2 Functional Contact Count

| Contact class | Contacts | Basis |
|---|---:|---|
| Common route entries R0-R6 | 7 | One contact for each constrained-target route entry |
| Logical Test Block signals | 23 | Complete inventory from `StandardTestBlocks_V2.md`, including direct I2C and UART A/B |
| Target power and reference | 2 | `TI_TARGET_3V3` and `TI_SWITCHED_TARGET_5V` |
| Direct reset and boot controls | 2 | `TI_TARGET_RESET_N` and optional `TI_BOOT_REQUEST` |
| Functional-contact total | **34** | Excludes duplicated ground or power contacts |

Providing all 23 logical Test Block contacts preserves the accepted hybrid
architecture:

* constrained targets use R0-R6 for GPIO reuse
* targets with sufficient GPIO may use reviewed direct Test Block mappings
* a daughter board may use an accepted combination of direct and routed paths

A smaller constrained-target-only interface would require 15 non-ground
contacts: seven route entries, direct I2C SDA/SCL, direct UART-B TX/RX and four
power/control contacts. That form is not the working baseline because it would
force more generous targets through the routing fabric and remove the general
direct-mapping option.

### A.3 Provisional Ground Allocation

Six ground contacts are provisionally allowed, distributed near:

* target power
* target 3.3 V reference and direct I2C
* analogue signals
* SPI signals
* UART signals
* route-entry and general digital signals

The physical contact table may adjust their exact grouping, but it shall
provide adequate return paths and shall not concentrate all grounds at one end
of the connector arrangement.

### A.4 Validation Before Acceptance

The 40-contact assumption shall be checked against:

1. peak switched-target 5 V current and the selected connector's per-contact
   rating, resistance and temperature rise
2. maximum target-supplied 3.3 V current in `STANDALONE`
3. ground-return and signal-integrity requirements for analogue, SPI, I2C,
   UART and routed signals
4. connector availability, keying, orientation and daughter-board alignment
5. whether duplicated 5 V or 3.3 V contacts are required
6. whether the frozen architecture requires deliberately reserved contacts

If either power rail requires a duplicate contact, or if reserved contacts are
accepted, a provisional **44-contact** arrangement shall be compared with the
40-contact baseline. The physical Target Interface specification shall record
the final bank count, contact numbering and every duplicated or reserved
position.
