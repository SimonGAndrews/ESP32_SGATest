# V2 Target Daughter-Board Matrix

**Status:** Accepted architecture direction; target implementation assessment in progress
**Version:** 0.1
**Last Updated:** 17 August 2026

## 1. Accepted Direction

V2 shall use three principal manufactured target daughter-board designs:

1. `DB-ESPRUINO-CORE-GRID`
2. `DB-ESP32-FAMILY`
3. `DB-PICO-XIAO-GRID`

Each design combines fully routed target placements with the maximum useful
generic 2.54 mm construction grid that remains after target pads, routing,
mechanical clearances and electrical keepouts are satisfied. Board dimensions
are not fixed by this document. Placement and routing proof of the most complex
board shall establish the practical daughter-board envelope before the other
two layouts are committed.

Every target variant entered in the matrix is required to fit its allocated
daughter board and provide its declared connectivity implementation. The
matrix does not use implementation priority to make an identified target
optional.

## 2. Scope And Authority

This document owns:

* the daughter-board set and allocation of exact target variants
* target mounting and physical-template groupings
* shared-footprint electrical-compatibility status
* daughter-board population and generic-grid rules
* the order and acceptance gates for daughter-board implementation
* open actions required before a target placement is accepted

It does not repeat target GPIO assignments. `TargetRoutingEnvelope_V2.md`
owns the accepted logical mapping, target restrictions and routing-envelope
assessment. `StandardControlServices_V2.md` owns target power, reset, boot and
recovery behaviour. `TargetInterfaceContract_V2.md` owns the fixed electrical
boundary. `ReusableHarnessPrototypeStrategy_V2.md` owns the joined-panel,
separation and manufacturing strategy. Target symbols and footprints remain
controlled by their project libraries and provenance records, while the KiCad
project is the authority for implemented placement and copper.

## 3. Daughter-Board Set

| Daughter board | Primary target groups | Construction provision |
|---|---|---|
| `DB-ESPRUINO-CORE-GRID` | Espruino Pico, MDBT42Q breakout and classic ESP32 DevKitC V4 | Maximum practical generic grid |
| `DB-ESP32-FAMILY` | Espressif C3 and S3 DevKits, owned Olimex S3 boards and XIAO ESP32 targets | Grid where practical after the denser target placements are proved |
| `DB-PICO-XIAO-GRID` | Wireless Raspberry Pi Pico RP2040/RP2350 variants and XIAO RP-family targets | Maximum practical generic grid |

The grouping is led by target-family use, Espruino testing and business value,
provided that each board remains electrically and mechanically implementable.
Targets grouped on one daughter-board PCB do not need the same GPIO mapping;
separate footprints may connect different target pins to the same fixed Target
Interface roles.

## 4. Design Invariants

1. Only one target shall be electrically installed on a daughter board at a
   time.
2. The matrix shall contain one row per exact target variant. Combined variant
   rows are not permitted.
3. Every listed target variant must physically fit and provide the connectivity
   declared in its row.
4. Different target footprints may share Target Interface nets because only
   one target is fitted, but no branch may create an unsafe unpowered path or a
   cross-net connection.
5. Variants may share fixed footprint copper only after pad geometry, pin
   identity and pad-to-Target-Interface mapping have been proved compatible.
6. A common outline or pin count alone is not evidence of shared-footprint
   electrical compatibility.
7. Direct-mount, socketed and generic construction positions may occupy the
   same conceptual placement field. Any physical overlap and its permitted
   population combinations must be explicit.
8. The generic grid shall retain every useful position that does not conflict
   with target pads, routed copper, vias, board-edge access, antenna keepouts,
   debug access or the Target Interface separation zone.
9. USB connectors, buttons, antennas and required debug or recovery points
   shall remain usable in the fitted configuration.
10. Target connectors are manually fitted after PCB manufacture unless a later
    accepted assembly decision states otherwise.
11. A joined harness/daughter panel may use hard wiring across the separation
    zone, while a separated pair uses the accepted Target Interface connectors.
    Both forms must implement the same electrical contract.

## 5. Matrix Field Definitions

| Field | Meaning |
|---|---|
| Target ID | Stable short identifier for the exact row |
| Exact target variant | Complete board and fitted-module identity covered by the row |
| Daughter-board group | One of the three accepted daughter-board designs |
| Validation role | Why the variant is retained, such as reference, supported variant, owned validation target or compatibility target; it does not make the row optional |
| Mounting method | Direct, socketed, hybrid or generic-grid attachment |
| Physical template | Footprint compatibility-group identifier; several rows may intentionally repeat it |
| Connectivity implementation | Degree and method of target-to-Interface implementation |
| Shared-footprint electrical compatibility | Whether variants using the same physical template can use identical fixed copper |
| Special constraints | USB, antenna, power, debug, overhang or other physical/electrical qualifications |
| Evidence status | Existing specification, CAD, physical or test evidence |
| Open action | Next unresolved task for the row |
| Acceptance status | Matrix maturity: proposed, allocated, mechanically proved, routed or accepted |

### 5.1 Connectivity Implementation Values

| Value | Meaning |
|---|---|
| Fully routed | All accepted target roles are connected through PCB copper |
| Fully routed, qualified | All required roles are routed, with documented mode or target restrictions |
| Partially routed | Identified common services are routed and remaining functions require added wiring |
| Configurable routing | Links or selectors are required to choose between incompatible mappings |
| Generic grid | No dedicated mapping; the target connection is constructed manually |

### 5.2 Shared-Footprint Compatibility Values

| Value | Meaning |
|---|---|
| Unique | No other accepted row currently uses this physical template |
| Confirmed common | Geometry, pin identity and fixed pad-to-Interface mapping are common |
| Conditional | Common copper is valid only with explicit variant restrictions |
| Assessment required | Geometry appears common but electrical compatibility is not yet proved |
| Incompatible | The variants cannot use one fixed pad-to-Interface mapping |

## 6. Initial Exact-Variant Matrix

The following rows capture the exact variants already identified during the
initial allocation discussion. Allocation accepts the target as a required
member of the named daughter-board set; it does not claim that footprint,
placement or routing proof is complete.

| Target ID | Exact target variant | Daughter-board group | Validation role | Mounting method | Physical template | Connectivity implementation | Shared-footprint electrical compatibility | Special constraints | Evidence status | Open action | Acceptance status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `ESPRUINO-PICO-1V4` | Espruino Pico revision 1v4 | `DB-ESPRUINO-CORE-GRID` | Official Espruino STM32 reference | Direct/hybrid | `ESPRUINO-PICO-1V4` | Fully routed, qualified | Unique | USB edge access; underside SWD and recovery access | Routing assessment and derived CAD exist | Complete 1:1 footprint and physical-fit proof | Allocated |
| `ESPRUINO-MDBT42Q-BREAKOUT` | Official Espruino MDBT42Q breakout | `DB-ESPRUINO-CORE-GRID` | Official Espruino nRF52/BLE reference | Socketed | `MDBT42Q-BREAKOUT-27` | Fully routed, qualified | Unique | Antenna keepout; UART/console ownership; debug and recovery access | Routing assessment and derived CAD exist | Complete physical-fit and antenna-clearance proof | Allocated |
| `ESP32-DEVKITC-V4-WROOM-32E` | Espressif ESP32-DevKitC V4 with ESP32-WROOM-32E | `DB-ESPRUINO-CORE-GRID` | Classic ESP32 reference and primary non-Espruino business target | Socketed | `ESP32-DEVKITC-V4-2X19` | Fully routed, qualified | Unique pending exact-variant expansion | Micro-USB, EN/BOOT and antenna access; male-header target required | Accepted routing assessment, V1 evidence and curated CAD exist | Prove outer socket placement with the two Espruino targets and grid | Allocated |
| `ESP32-C3-DEVKITC-02-WROOM-02` | Espressif ESP32-C3-DevKitC-02 with ESP32-C3-WROOM-02 | `DB-ESP32-FAMILY` | C3 gold-standard reference | Socketed | `ESP32-C3-DEVKITC-02-2X15` | Fully routed, qualified | Confirmed common | Micro-USB and PCB-antenna clearance | Accepted routing assessment and V1 evidence exist | Validate authoritative footprint and placement | Allocated |
| `ESP32-C3-DEVKITC-02-WROOM-02U` | Espressif ESP32-C3-DevKitC-02 with ESP32-C3-WROOM-02U | `DB-ESP32-FAMILY` | Supported external-antenna variant | Socketed | `ESP32-C3-DEVKITC-02-2X15` | Fully routed, qualified | Confirmed common | External antenna connector and cable clearance | Common mapping accepted | Validate antenna-cable placement | Allocated |
| `ESP32-C3-DEVKITM-1-MINI-1` | Espressif ESP32-C3-DevKitM-1 with ESP32-C3-MINI-1 | `DB-ESP32-FAMILY` | Official compact C3 compatibility target | Socketed | `ESP32-C3-DEVKITM-1-2X15` | Fully routed, qualified | Confirmed common | Micro-USB and PCB-antenna clearance | Compatibility exercise accepted | Create or validate authoritative footprint | Allocated |
| `ESP32-C3-DEVKITM-1-MINI-1U` | Espressif ESP32-C3-DevKitM-1 with ESP32-C3-MINI-1U | `DB-ESP32-FAMILY` | Supported compact external-antenna variant | Socketed | `ESP32-C3-DEVKITM-1-2X15` | Fully routed, qualified | Confirmed common | External antenna connector and cable clearance | Common mapping accepted | Create or validate authoritative footprint | Allocated |
| `ESP32-S3-DEVKITC-1-V1.1-N8R8` | Espressif ESP32-S3-DevKitC-1 V1.1 with ESP32-S3-WROOM-1-N8R8 | `DB-ESP32-FAMILY` | S3 gold-standard reference | Socketed | `ESP32-S3-DEVKITC-1-V1.1-2X22` | Fully routed, qualified | Confirmed common | Dual USB access; PCB antenna; memory and loaded-RGB qualifications | Accepted routing assessment and curated CAD exist | Validate placement and connector population | Allocated |
| `ESP32-S3-DEVKITC-1-V1.1-1U-N8R8` | Espressif ESP32-S3-DevKitC-1 V1.1 with ESP32-S3-WROOM-1U-N8R8 | `DB-ESP32-FAMILY` | Supported external-antenna S3 variant | Socketed | `ESP32-S3-DEVKITC-1-V1.1-2X22` | Fully routed, qualified | Confirmed common | Dual USB and external antenna cable access | Common mapping accepted | Validate antenna-cable placement | Allocated |
| `ESP32-S3-DEVKITC-1-V1.1-N32R16V` | Espressif ESP32-S3-DevKitC-1 V1.1 with ESP32-S3-WROOM-2-N32R16V | `DB-ESP32-FAMILY` | Supported high-memory S3 variant | Socketed | `ESP32-S3-DEVKITC-1-V1.1-2X22` | Fully routed, qualified | Conditional | `D47`/`D48` are excluded from the 3.3 V Interface; dual USB access | Qualified common mapping accepted | Verify footprint outline and module overhang | Allocated |
| `OLIMEX-ESP32-S3-DEVKIT-LIPO-EA-REV-B-N8R8` | Olimex ESP32-S3-DevKit-LiPo-EA hardware revision B, N8R8 configuration | `DB-ESP32-FAMILY` | Owned Olimex S3 validation target | Socketed | `OLIMEX-ESP32-S3-DEVKIT-LIPO-EA-REV-B-2X22` | Fully routed, qualified | Unique | Dual USB-C access; U.FL connector and external-antenna cable clearance; LiPo, battery/external-power sensing and competing-power-source control | Accepted routing assessment, official Rev-B references and curated 44-pad target CAD exist; exact owned variant confirmed | Implement the accepted mapping, verify the fitted module marking and prove physical placement | Allocated |
| `XIAO-ESP32-C3` | Seeed Studio XIAO ESP32-C3 | `DB-ESP32-FAMILY` | Compact ESP32 compatibility target | Direct | `XIAO-ESP-14` | Fully routed target | Assessment required | Native USB; reset-safe strapping-pin treatment; antenna edge | Physical family identified; full target mapping not yet accepted | Prove common fixed mapping with XIAO ESP32-S3 | Allocated |
| `XIAO-ESP32-S3` | Base Seeed Studio XIAO ESP32-S3 | `DB-ESP32-FAMILY` | Compact S3 compatibility target | Direct | `XIAO-ESP-14` | Fully routed, qualified | Assessment required | Native USB; reset-safe `D2` route; antenna edge; Sense and Plus excluded | Compatibility exercise accepted | Prove common fixed mapping with XIAO ESP32-C3 | Allocated |
| `PICO-W` | Raspberry Pi Pico W | `DB-PICO-XIAO-GRID` | RP2040 wireless reference | Direct/hybrid | `PICO-W-40` | Fully routed, qualified | Confirmed common | Micro-USB, antenna and castellated SWD access | Accepted family routing assessment and curated CAD exist | Validate common carrier footprint and antenna edge | Allocated |
| `PICO-WH` | Raspberry Pi Pico WH | `DB-PICO-XIAO-GRID` | Supported headered RP2040 variant | Socketed | `PICO-W-40` | Fully routed, qualified | Confirmed common | Micro-USB, antenna and keyed SWD access | Common pinout and board layout documented | Validate socket height and debug clearance | Allocated |
| `PICO-2-W` | Raspberry Pi Pico 2 W | `DB-PICO-XIAO-GRID` | RP2350 wireless reference | Direct/hybrid | `PICO-W-40` | Fully routed, qualified | Confirmed common | Micro-USB, antenna and castellated SWD access; separate RP2350 firmware identity | Accepted peer qualification exists | Validate common carrier footprint and antenna edge | Allocated |
| `PICO-2-W-H` | Raspberry Pi Pico 2 W with headers | `DB-PICO-XIAO-GRID` | Supported headered RP2350 variant | Socketed | `PICO-W-40` | Fully routed, qualified | Confirmed common | Micro-USB, antenna and keyed SWD access; separate RP2350 firmware identity | Common pinout and board layout documented | Validate socket height and debug clearance | Allocated |
| `XIAO-RP2040` | Seeed Studio XIAO RP2040 | `DB-PICO-XIAO-GRID` | Compact RP compatibility target | Direct | `XIAO-RP-14` | Fully routed target | Assessment required | Native USB; RP2040 peripheral mux; board-edge access | Physical family identified; target mapping not yet assessed | Complete routing-envelope and common-template assessment | Allocated |

### 6.1 Exact-Variant Inventory Gaps

The following agreed target groups require exact identity before matrix rows
can be added without violating the one-row-per-variant rule:

* any additional classic ESP32-DevKitC V4 fitted-module variants that are to be
  mandatory rather than merely electrically compatible
* any XIAO RP2350 or other RP-family board proposed for the Pico/XIAO board

These are required inventory actions, not permission to replace an exact row
with a family-level row.

## 7. Daughter-Board Requirements

### 7.1 `DB-ESPRUINO-CORE-GRID`

This board groups the official Espruino Pico and MDBT42Q breakout with the
commercially important classic ESP32 reference target. The Pico and MDBT42Q
placements should be non-overlapping where the available envelope permits.
The ESP32 uses outer female socket rows and may project over the inner target
field; when it is fitted, overlapping inner positions remain unpopulated.

The layout shall preserve Pico USB and underside debug access, MDBT42Q antenna
clearance, ESP32 Micro-USB and EN/BOOT access, and the maximum practical
generic construction grid. A directly soldered inner target makes that
particular daughter-board assembly target-specific even though the same bare
PCB supports other population choices.

### 7.2 `DB-ESP32-FAMILY`

This is the highest-complexity board and shall be proved first. It combines
several socket geometries, Espressif and Olimex board outlines, multiple USB
and antenna-edge requirements and the shared XIAO ESP direct-mount template.
Socket rows and target bodies may overlap only where the population exclusion
is explicit and all controls, connectors and antennas remain usable.

The XIAO ESP32-C3 and ESP32-S3 rows may share fixed copper only after a
pad-by-pad peripheral and Target Interface role comparison. Physical XIAO
compatibility alone is insufficient.

### 7.3 `DB-PICO-XIAO-GRID`

One `PICO-W-40` placement shall support all four current official wireless
Pico variants while preserving the distinction between RP2040 and RP2350
firmware and evidence. The carrier should support an unheadered castellated
target or the corresponding headered target without changing the fixed
pad-to-Interface mapping.

The XIAO RP placement is a separate electrical template from `XIAO-ESP-14`
until an explicit assessment proves otherwise. Reusing the mechanical XIAO
outline on two daughter boards does not require identical copper. The
remaining board area should provide a generous generic construction grid.

## 8. Complex-Board-First Verification

The implementation order is:

1. `DB-ESP32-FAMILY`
2. `DB-ESPRUINO-CORE-GRID`
3. `DB-PICO-XIAO-GRID`

The first board is an architecture proof. Failure at a gate shall trigger an
explicit daughter-board-set review before detailed work proceeds on the two
simpler boards.

### Gate 1: Exact Variant Inventory

Identify every required board revision, fitted module, antenna option and
header population. Add one matrix row for each exact variant.

### Gate 2: Shared-Template Electrical Proof

For every repeated physical template, compare pad geometry, pin identity,
electrical restrictions and fixed pad-to-Interface mapping. Classify the result
as confirmed common, conditional or incompatible.

### Gate 3: Mechanical Feasibility

Use authoritative footprints and body outlines to place the Target Interface,
separation zone, sockets, direct targets, USB access, buttons, debug access,
antenna keepouts and candidate board edges. Validate dimensions with official
sources and 1:1 physical checks where boards are available.

### Gate 4: Routing Feasibility

Demonstrate complete target-to-Interface routing on the intended layer count,
including power, reset, boot and I2C-control paths. Check that unpopulated
branches create neither cross-net shorts nor unsafe power paths and that the
remaining generic grid is useful rather than merely nominal.

### Gate 5: Architecture Acceptance

Accept the board as proposed, increase the common envelope, remove a target to
generic construction, split the target group, restrict a shared footprint or
perform another recorded rerationalisation. Only then should the other two
daughter-board layouts be completed.

## 9. Open Decisions

* complete the exact-variant inventory gaps in Section 6.1
* prove the XIAO ESP32-C3/S3 common fixed mapping
* assess the XIAO RP2040 and any proposed XIAO RP2350 mapping
* conclude the common or per-design daughter-board dimensions
* define permitted body and footprint overlaps for each population choice
* define the minimum useful generic-grid provision
* complete panelisation and breakaway geometry with the harness PCB
* confirm final socket/header types, target header population and assembly
* produce deterministic connectivity contracts for every routed target variant
