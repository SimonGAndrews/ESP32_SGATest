# V2 Target Interface Footprint Library Provenance

## Scope

`V2_Target_Interface.pretty` contains the measured connector footprints for the
fixed V2 Target Interface boundary. It is shared by the reusable harness and
the three Rev-A daughter-board projects.

## Accepted Parts

| Footprint | Physical part | Evidence |
|---|---|---|
| `TargetInterface_2x12_P2.54mm_RA_Female_Adafruit1543_Harness` | Adafruit Product 1543, 2x36 right-angle female socket cut and dressed to 2x12 | Adafruit product page and P1543 drawing; received-part worksheet and bench photographs |
| `TargetInterface_2x12_P2.54mm_RA_Male_Adafruit1541_Daughter` | Adafruit Product 1541, 2x36 right-angle male breakaway header broken to 2x12 | Adafruit product page; received-part worksheet and bench photographs |

The controlled measurement record is:

* `docs/design/V2Harness/implementation/J900_J901_ReceivedPartMeasurementWorksheet.md`

Local received-part photographs are held under `docs/design/V2Harness/Parts/`
as `J900_901_pic01.jpeg` and `J900_901_Pic02.JPG` through
`J900_901_Pic12.JPG`.

## Geometry Decisions

* pad and row pitch: 2.54 mm
* pads: 1.70 mm, with rectangular pad 1
* finished holes: 1.00 mm, pending physical manufactured drill trial
* odd-numbered contacts: outer tail row
* even-numbered contacts: inner/mating-side tail row
* nominal fully mated board-edge gap: 0.50 mm
* harness female inner-row centre to board edge: 10.43 mm
* daughter male inner-row centre to board edge: 4.42 mm
* female maximum measured prepared housing length: 30.65 mm
* male maximum measured prepared body length: 30.40 mm

The `Dwgs.User` line in each footprint marks the nominal PCB edge. It is a
placement aid and shall not be converted into an `Edge.Cuts` feature inside the
footprint. The fabrication outline represents the received connector envelope;
the courtyard includes a provisional 0.50 mm clearance.

## Open Verification

Before PCB release:

1. place both connector banks using the recorded board-edge datums
2. verify simultaneous A/B engagement and the intended asymmetric keying
3. perform a physical drill and solder-fit trial
4. verify current capacity for the Target Interface power limits
5. compare fabricated footprint plots at 1:1 scale with the received parts
