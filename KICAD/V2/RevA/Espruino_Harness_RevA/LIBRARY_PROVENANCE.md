# Rev-A Library Provenance

The Rev-A project uses one project-local symbol library and one project-local
footprint library:

- `Espruino_Harness_RevA.kicad_sym`
- `Espruino_Harness_RevA.pretty/`

Both are referenced through `${KIPRJMOD}`. Do not register the ignored
`KICAD/V2/upstream/` checkouts as production libraries.

The libraries intentionally begin empty. Copy or create an asset only when it
is required by an accepted Rev-A circuit. Record its source, licence, package,
datasheet and validation here before manufacture.

The exploratory libraries under
`KICAD/V2/Exploration/Espruino_Harness_V2/` are review inputs. They must not be
copied wholesale or mechanically regenerated over accepted Rev-A assets.
