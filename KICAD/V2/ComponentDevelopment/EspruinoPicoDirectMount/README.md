# Espruino Pico Direct-Mount Footprint Work

This directory contains KiCad work for mounting an Espruino Pico directly onto
a daughter board, including the required PCB aperture.

The working footprint is:

```text
SMDFootprint/w550io.pretty/ESPRUINO_PICO_SMD.kicad_mod
```

The directory also contains imported source and experimental project files
used while developing the footprint. They are preserved for review and
provenance; their presence does not make every file a production asset.

Before the Pico daughter-board schematic and PCB are manufactured:

1. Check the pad numbers, dimensions and aperture against the physical Pico
   and authoritative mechanical information.
2. Confirm paste, solder-mask, courtyard and assembly clearances.
3. Copy the accepted footprint into that daughter-board project's local
   footprint library.
4. Record the source and validation in the daughter-board project.
