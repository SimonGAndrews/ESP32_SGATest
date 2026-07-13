# Espruino Pico Target Reference

## Current V2 assets

- Symbol: `V2_Targets:Espruino-Pico-1v4`
- Footprint: `V2_Targets:Espruino-Pico-1v4-Wirewrap`

The footprint represents a physical Pico revision 1v4 fitted with pins for wirewrapping. It is distinct from the upstream surface-mount adapter footprint retained as `Espruino-Pico-Official-Adapter`.

## Provenance

- Upstream: `https://github.com/espruino/EspruinoBoard`
- Checked revision: `3c0f25d0f67890fd0117e88633a455beb10eaebd`
- Board source: `Pico/eagle/pico_1v4.brd`
- Schematic source: `Pico/eagle/pico_1v4.sch`
- Licence: Creative Commons Attribution-ShareAlike 3.0 Unported

Local references:

- `resources/schematic_1v3.pdf`
- `resources/espruino_pico_pinout.jpg`

The local schematic is revision 1v3. The V2 footprint geometry is derived from the upstream revision 1v4 Eagle board, so revision-specific differences must remain explicit.

## Verified 11 July 2026

- Symbol placement and schematic-to-PCB propagation work in KiCad 9.
- PCB Editor measurement agrees with the published approximately 33 mm by 15 mm envelope.
- The two nine-pin long-edge rows use 2.54 mm pitch and 1.016 mm drills.
- The eight-pin end row uses 1.27 mm pitch and approximately 0.650 mm drills.
- The additional three-pin power group uses 1.27 mm pitch.
- Pin names and order agree with the local pinout image and official Pico documentation.
- J6 geometry is common to the checked 1v3 and 1v4 Eagle boards.
- J6 is on `B.Fab`, matching the documented bottom-side SWD connections.
- Bottom text reads normally in PCB Editor flipped/backside view.

J6 remains graphical target geometry, not carrier copper. A separate transfer header is required for `VDD`, `SWCLK`, `GND`, `SWDIO`, `NRST` and `SWO`.

## Still required

- Print at 1:1 and compare every hole and the stepped outline with a physical Pico 1v4.
- Confirm the selected wirewrap pins fit both drill sizes.
- Define the J6 transfer header and its target-adaptation wiring.
- Decide whether Pico 1v3 needs a distinct footprint.
