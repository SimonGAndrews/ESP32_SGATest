# KiCad Projects

All KiCad projects and component-development work live under this directory.
Libraries remain local to the project that uses them and use `${KIPRJMOD}` in
KiCad library tables.

## Directory map

```text
KICAD/
|-- V1/
|   |-- ESP32_C3_v1/       Completed ESP32-C3 V1 harness
|   `-- ESP32_V1/          Completed classic ESP32 V1 harness
`-- V2/
    |-- Exploration/
    |   `-- Espruino_Harness_V2/
    |-- ComponentDevelopment/
    |   `-- EspruinoPicoDirectMount/
    |-- RevA/
    `-- upstream/
```

`V2/Exploration/Espruino_Harness_V2/` preserves the earlier exploratory
schematic hierarchy, PCB placement work and curated target libraries. It is a
reference input to Rev A, not the Rev-A starting project.

`V2/ComponentDevelopment/EspruinoPicoDirectMount/` contains the useful
Espruino Pico direct-solder footprint and board-aperture development work. A
reviewed copy of the required footprint will be placed in the future Pico
daughter-board project's local library.

`V2/RevA/Espruino_Harness_RevA/` is the intended location for the fresh Rev-A
project. Create that project through KiCad rather than by copying the
exploratory schematic or PCB.

`V2/upstream/` contains local upstream source checkouts used for provenance and
comparison. It is ignored by Git and is not a production library.

KiCad local-state files, automatic backups, caches and lock files are ignored
by the repository-level `.gitignore`.
