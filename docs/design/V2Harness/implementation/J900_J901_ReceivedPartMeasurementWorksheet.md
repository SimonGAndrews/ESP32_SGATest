# J900/J901 Received-Part Measurement Worksheet

**Status:** Received-part geometry analysed; board-edge datums and two-bank trial remain open
**Parts:** Adafruit 1543 female right-angle socket and Adafruit 1541 male right-angle header
**Intended preparation:** Each 2x36 strip reduced to a 2x12 Target Interface connector

## 1. Purpose

Record measurements from the received connector samples before the J900/J901
harness and daughter-board footprints, board-edge datums and mating clearances
are accepted. Measurements in this worksheet are evidence inputs; the accepted
footprint dimensions shall subsequently be recorded in the footprint provenance
record and verified against a physical drill/mating trial.

The following bench photographs were taken on 16 August 2026:

* `../Parts/J900_901_pic01.jpeg` — prepared connector lengths beside a ruler
* `../Parts/J900_901_Pic02.JPG` and `../Parts/J900_901_Pic03.JPG` — initial right-angle
  connector profiles and prepared female PCB-tail arrangement
* `../Parts/J900_901_Pic04.JPG` through `../Parts/J900_901_Pic06.JPG` — prepared female
  connector end and oblique views
* `../Parts/J900_901_Pic07.JPG` and `../Parts/J900_901_Pic08.JPG` — comparative trial-board
  placement views
* `../Parts/J900_901_Pic09.JPG` and `../Parts/J900_901_Pic10.JPG` — female housing and
  PCB-tail side profiles
* `../Parts/J900_901_Pic11.JPG` and `../Parts/J900_901_Pic12.JPG` — male body, mating-pin
  and PCB-tail side profiles

## 2. Measurement Setup

| Field | Entry |
|---|---|
| Measurement date | 16 August 2026 |
| Measured by | Simon |
| Calliper make/model | |
| Calliper resolution | 0.01 mm |
| Calliper zero checked | Yes; zero datum applied and checked throughout measurement |
| Male sample preparation | Prepared 2x12 |
| Female sample preparation | Prepared 2x12 |
| Trial PCB thickness | 1.50 mm |
| Notes on burrs, dressing or damaged positions | |

Record dimensions in millimetres. Use the same sample orientation for repeated
readings. Where practical, take three readings and record the range rather than
implying greater accuracy than the part or the calliper supports.

For a practical calliper cross-check of pitch, measure from the outside edge of
position 1 to the outside edge of position 12. Subtract one measured pin width
to obtain the centre span, then divide by 11. The accepted nominal longitudinal
and row pitch is 2.54 mm because both received parts seat cleanly in the 0.1-inch
trial-board grid. Further repeated pitch measurements are not required.

Dimensions involving a pin or tail and another surface should use accessible
outside or inside edges. Record the raw edge-to-edge measurement; apply the
relevant half-pin-width correction later when a hole-centre datum is required.

## 3. Male Right-Angle Header — Adafruit 1541

| ID | Dimension | Measurement method | Reading 1 | Reading 2 | Reading 3 | Accepted/derived value | Footprint or clearance use |
|---|---|---|---:|---:|---:|---:|---|
| M01 | Square PCB-tail width across flats | Measure several undamaged solder tails | 0.63 | 0.65 | 0.62 | 0.64 mm nominal; observed 0.62-0.65 mm | Finished-hole selection |
| M02 | Position 1-to-12 span | Outside edge of position 1 to outside edge of position 12 | 28.47 | 28.55 | 28.47 | 27.94 mm nominal centre span; 2.54 mm pitch; trial-board fit verified | Longitudinal pad pitch |
| M03 | Row-to-row pitch | Accepted from clean fit of both rows in the 0.1-inch trial-board grid | N/A | N/A | N/A | 2.54 mm nominal | Pad-row spacing |
| M04 | Prepared 2x12 body length | Outside end face to outside end face after clean break/dressing | 30.4|30.2 |30.36 | 30.32 mm mean; 30.20-30.40 mm observed | Fabrication outline and courtyard |
| M05 | Plastic-body width in mating direction | Outside rear face to outside front face | 2.5|2.5 |2.5 | 2.50 mm | Body outline and edge clearance |
| M06 | Board-edge PCB-tail outside edge to mating-pin tip | Measure along the mating axis; retain raw edge-to-edge value |9.54 |10.24 |9.79 | 9.86 mm raw mean; 10.18 mm direct provisional centre-to-tip; corrected M10/M05/M07 chain gives 10.46 mm, which shall be used as the conservative drafting envelope pending physical fit | Derive daughter-board hole-centre/edge datum using M01 / 2 |
| M07 | Mating-pin projection from plastic body | Front body face to pin tip | 5.61| 5.79|5.97 | 5.79 mm mean; 5.61-5.97 mm observed | Engagement and collision check |
| M08 | PCB-tail length below trial PCB | Outside PCB-bottom surface to tail end, with part fully seated |1.34 |1.42 |1.37 | 1.38 mm mean; 1.34-1.42 mm observed | Solder and underside clearance |
| M09 | Plastic-body height above trial PCB | Outside PCB-top surface to highest body surface |5.02 |5.23 |5.06 | 5.10 mm mean; 5.02-5.23 mm observed | Rack and component clearance |
| M10 | Rear plastic-body face to inside edge of outer/farther PCB-tail row | Measure from the rear outside plastic-body face to the body-facing inside edge of the outer/farther PCB-tail row |4.3 |4.4 |4.46 | 4.39 mm raw mean; outer-row centre 4.71 mm and inner/nearer-row centre 2.17 mm from the rear body face | Add M01 / 2 for the outer-row centre, then subtract 2.54 mm for the inner/nearer-row centre; combine with M05 and M07 to cross-check M06 |

## 4. Female Right-Angle Socket — Adafruit 1543

| ID | Dimension | Measurement method | Reading 1 | Reading 2 | Reading 3 | Accepted/derived value | Footprint or clearance use |
|---|---|---|---:|---:|---:|---:|---|
| F01 | PCB-tail maximum width/thickness | Measure outside-to-outside across several undamaged tails at the hole-entry region |0.61 |0.61 |0.62 | 0.61 mm mean; 0.61-0.62 mm observed | Finished-hole selection |
| F02 | Position 1-to-12 span | No further measurement required; clean 0.1-inch trial-board fit verifies the nominal grid | N/A | N/A | N/A | 27.94 mm nominal centre span; 2.54 mm pitch | Longitudinal pad pitch |
| F03 | Row-to-row pitch | Accepted from clean fit of both rows in the 0.1-inch trial-board grid | N/A | N/A | N/A | 2.54 mm nominal | Pad-row spacing |
| F04 | Prepared 2x12 housing length | Outside dressed end face to outside dressed end face |30.52 |30.63 |30.65 | 30.60 mm mean; 30.52-30.65 mm observed | Fabrication outline and courtyard |
| F05 | Housing depth in mating direction | Outside rear housing face to outside mating face |8.45 |8.51 |8.47 | 8.48 mm mean; 8.45-8.51 mm observed | Harness-board edge datum |
| F06 | Board-edge PCB-tail outside edge to mating face | Measure along the mating axis; retain raw edge-to-edge value |12.52 |12.49 |12.52 | 12.51 mm raw mean; retained as a lower-confidence direct cross-check because the measured tail edge was not unambiguously identified; do not use as the controlling footprint datum | Corroborative check only; F05/F10 and side photographs control the footprint geometry |
| F07 | Socket-contact depth | Mating face to internal stop, where measurable without damage |6.15 |6.08 |6.08 | 6.10 mm mean; 6.08-6.15 mm observed | Engagement assessment |
| F08 | PCB-tail length below trial PCB | Outside PCB-bottom surface to tail end, with part fully seated | 1.28|1.5 |1.56 | 1.45 mm mean; 1.28-1.56 mm observed | Solder and underside clearance |
| F09 | Housing height above trial PCB | Outside PCB-top surface to highest housing surface |4.7 |5.10 |5.30 | 5.03 mm mean; 4.70-5.30 mm observed; use 5.30 mm measured maximum for clearance | Rack and component clearance |
| F10 | Rear housing face to inside edge of outer/farther PCB-tail row | Measure from the rear outside housing face to the housing-facing inside edge of the outer/farther tail row |4.35 |4.53|4.43 | 4.44 mm raw mean; outer-row centre 4.74 mm and inner/nearer-row centre 2.20 mm from the rear housing face; side-view photographs confirm the row identity | Add F01 / 2 for the outer-row centre, then subtract 2.54 mm for the inner/nearer-row centre; with F05 this gives 13.22 mm outer-row-centre to mating face and 10.68 mm inner-row-centre to mating face |

## 5. Fully Mated Pair On Trial PCBs

Fit prepared 2x12 samples to two representative 2.54 mm trial PCBs. Seat and
mate the connectors fully without powering either board.

| ID | Dimension or check | Measurement method | Reading 1 | Reading 2 | Reading 3 | Accepted/derived value | Design use |
|---|---|---|---:|---:|---:|---:|---|
| P01 | PCB-edge-to-PCB-edge gap | Outside face of one opposing dressed PCB edge to the other |0.6 |0.4 |0.5 | 0.50 mm mean; trial-board-edge specific and not accepted as the production edge datum | Separation and rack geometry |
| P02 | PCB top-surface vertical offset | Place both boards on one flat reference; measure each top-surface height and subtract |0 |0 |0 | 0 mm; coplanar trial passed | Required connector footprint offset |
| P03 | PCB bottom-surface vertical offset | Check both bottom surfaces against one flat reference; measure any step |0 |0 |0 | 0 mm; coplanar trial passed | Confirms coplanarity with known thicknesses |
| P04 | Residual exposed male pin | Female mating face to male plastic body when fully seated |0 |0 |0 | 0 mm; full seating observed | Engagement margin |
| P05 | Connector end alignment | Outside end face of one prepared body to the corresponding outside end face of the other |0.9 |1.4 |1.47 | 1.26 mm mean; affected by manual preparation/placement and not an electrical pitch constraint | A/B placement tolerance |
| P06 | Fully mated overall height | Outside lowest assembly point to outside highest assembly point | 5.41|5.39 |5.3 | 5.37 mm observed mean; not accepted because it is inconsistent with the recorded 1.50 mm PCB, tail-below-PCB and housing-above-PCB dimensions; measurement endpoints require clarification | Rack envelope |
| P07 | Both banks can engage simultaneously | Trial or fixture observation | later | | | Pending | Connector-spacing proof |
| P08 | Deliberate A/B offset prevents reversal | Trial or fixture observation | later | | | Pending | Keying/orientation proof |

## 6. Physical-Fit And Preparation Checks

| Check | Result | Notes |
|---|---|---|
| Male strip breaks cleanly to 2x12 | Pass | |
| Female strip can be cut and dressed without damage to retained contacts | Pass | |
| Prepared male retains all 24 straight contacts | Pass | |
| Prepared female accepts all 24 contacts without abnormal force | Pass | |
| Both parts seat squarely on the 0.1-inch trial PCBs | Pass | Reported clean fit; verifies 2.54 mm longitudinal and row pitch |
| No housing or solder-tail interference occurs when fully mated | Pass | |
| Pin 1 can be marked unambiguously on both PCBs | Pass | |
| Unpowered insertion and removal are practical in the intended rack direction | Pass | |

### 6.1 Measurement Analysis

The received parts support a common 2.54 mm 2x12 pad grid, 1.00 mm finished
holes and 1.70 mm copper pads. The hole and pad dimensions match KiCad 9's
standard horizontal 2x12 pin-header and pin-socket footprints and are
consistent with the measured tails and successful trial-board fit. They remain
subject to a physical drill trial using the manufactured footprint.

The single-bank trial proves clean mating, full insertion and coplanar boards.
It does not yet prove the final board-edge datums, simultaneous engagement of
both banks or the asymmetric A/B placement. M10 is confirmed as referencing
the outer/farther tail row. Its corrected chain gives approximately 10.46 mm
from the inner/nearer row centre to the mating-pin tip, compared with the
10.18 mm provisional direct M06 result. The approximately 0.28 mm difference
is within the spread of the M06 and M07 pin-tip measurements, so the male
geometry is suitable for footprint drafting followed by a physical fit check.
Pics 09-10 confirm that F10 references the outer/farther female tail row. The
F05/F10 chain therefore controls the female footprint: the rear housing face
is 4.74 mm toward the mating direction from the outer-row centre and 2.20 mm
from the inner/nearer-row centre. With the 8.48 mm housing depth, the outer and
inner row centres are respectively 13.22 mm and 10.68 mm from the mating face.
F06 remains documented as a lower-confidence direct cross-check because its
specific tail edge was not recorded. It is not used to place the fabrication
outline.

P01 depends on the arbitrary edges of the trial PCBs. P05 includes manual
connector preparation and trial placement. P06 cannot yet be accepted: with a
1.50 mm trial PCB, the recorded tail-below-PCB and housing-above-PCB dimensions
imply an overall envelope of approximately 7.9 mm, so the 5.37 mm result did
not use the stated lowest-tail and highest-housing endpoints.

## 7. Footprint Decisions After Measurement

Complete this table during footprint review, not during raw measurement.

| Decision | Harness female J900/J901 | Daughter male J900/J901 |
|---|---:|---:|
| Nominal pad pitch | 2.54 mm | 2.54 mm |
| Nominal row pitch | 2.54 mm | 2.54 mm |
| Finished-hole diameter | 1.00 mm provisional; physical drill trial required | 1.00 mm provisional; physical drill trial required |
| Copper-pad diameter/size | 1.70 mm; pin 1 rectangular | 1.70 mm; pin 1 rectangular |
| Hole-row-to-board-edge datum | 10.43 mm from inner/nearer row centre to board edge; 0.25 mm mating-face overhang | 4.42 mm from inner/nearer row centre to board edge; 0.25 mm mating-face overhang |
| Fabrication outline clearance | Use maximum received housing envelope located from the accepted F05/F10 datum chain | Use maximum received body envelope located from the accepted M05/M10 datum chain |
| Courtyard clearance | 0.50 mm provisional around maximum envelope; permit only reviewed mating/edge overhang | 0.50 mm provisional around maximum envelope; permit only reviewed mating/edge overhang |
| Pin-1 position and marking | Square/rectangular pad 1 plus visible A/B and pin-1 silkscreen marks | Square/rectangular pad 1 plus visible A/B and pin-1 silkscreen marks |
| Accepted 2x12 prepared-part length | 30.60 mm measured mean; 30.52-30.65 mm observed | 30.32 mm measured mean; 30.20-30.40 mm observed |
| Physical trial result | Single-bank fit and 0.50 mm gap passed; P07/P08 pending | Single-bank fit and 0.50 mm gap passed; P07/P08 pending |

Final acceptance also requires confirmation of adequate contact and copper
current capacity for the Target Interface power limits. Dimensional fit alone
does not close that action.
