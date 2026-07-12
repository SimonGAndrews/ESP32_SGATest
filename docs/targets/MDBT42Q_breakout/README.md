# Espruino MDBT42Q Breakout Target Reference

## Current V2 assets

- Symbol: `V2_Targets:Espruino-MDBT42Q-Breakout`
- Footprint: `V2_Targets:Espruino-MDBT42Q-Breakout-Wirewrap`

This target is the Espruino MDBT42Q breakout board, not the bare Raytac MDBT42Q module.

## Provenance

- Upstream: `https://github.com/espruino/EspruinoBoard`
- Checked revision: `3c0f25d0f67890fd0117e88633a455beb10eaebd`
- Board source: `MDBT42/eagle/mdbt42q_breakout.brd`
- Schematic source: `MDBT42/eagle/mdbt42q_breakout.sch`
- Eagle library: `MDBT42/mdbt42.lbr`
- Licence: Creative Commons Attribution-ShareAlike 3.0 Unported

Local references:

- `resources/mdbt42q_breakout_sch.pdf`
- `resources/connector_pins.jpg`

## Verified 11 July 2026

- Symbol placement and schematic-to-PCB propagation work in KiCad 9.
- PCB Editor dimensions agree with the approximately 17.76 mm by 28.245 mm official envelope.
- J1 and J2 are 1x11 rows on 2.54 mm pitch with 15.24 mm row spacing.
- J3 is a five-pin end row on 2.54 mm pitch.
- The footprint contains the expected 27 physical holes.
- Pin names and order agree with the official schematic and local connector image.
- Duplicate `VIN` and `GND` footprint pad identifiers are intentional electrically common physical holes.
- Bottom-side construction labels display in PCB Editor.

## Still required

- Replace the maximum rectangular outline with the exact small corner arcs from the Eagle board.
- Print at 1:1 and compare every hole and outline feature with a physical breakout.
- Confirm the selected wirewrap pins fit the 1.016 mm drills.
- Review antenna clearance when placing the target in the V2 adaptation area.
