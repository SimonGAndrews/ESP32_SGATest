# ESP32-Family IDF5 Port Investigation Tracker

## Purpose

This tracker records the completed expedited investigation from the MaBecker
handoff through Gordon Williams' merge of IDF5 into official master. The only
remaining project-level action is the same-source post-merge sanity run. Later
defects belong to normal Espruino-master investigation.

## Source Anchors

| Source | Repository state | Commit |
|---|---|---|
| MB baseline | MaBecker IDF5 handoff | `ca6b3592ccab25d846417774c6b18d7d3c2fe17e` |
| GW validation | Gordon Williams candidate used for initial bench tests | `25dc06c17` |
| Corrected local validation | official base plus all candidates, including held OneWire timing | `354fa95fb` |
| Upstream IDF5 tip | final parent merged into master | `955305fd29e1c3e38380ff72b23106cf4b3c441b` |
| Upstream merge | previous master plus final IDF5 tip | `5d79af2185f33020a02e315c6318dab81e27dfde` |

## Relevant Commits

| Working name | Commit | Meaning |
|---|---|---|
| **MaBecker handoff** | `ca6b3592…` on `MaBecker/Espruino:esp32_5` | Compiling IDF5 handoff used as the initial control. |
| **Master snapshot** | `d16a5a92…` on official master | Core source Gordon used when updating the port. |
| **Gordon integration point** | `80d20f3…` on official `IDF5` | MaBecker port plus the selected master snapshot and manual conflict resolution. |
| **Initial audited candidate** | `391070be…` on official `IDF5` | First official candidate audited in this workstream. |
| **First bench candidate** | `ec3a8230…` on official `IDF5` | Candidate used before Gordon's next build and BLE corrections. |
| **Main initial test candidate** | `25dc06c17` on official `IDF5` | Candidate covered by the 19 August regression records. |
| **Corrected local candidate** | `354fa95fb` | Final pre-merge bench image, including the deliberately held OneWire experiment. |
| **Final upstream IDF5 tip** | `955305fd…` | All submitted corrections plus Gordon's follow-up changes. |
| **Master merge** | `5d79af218` | True two-parent merge of previous master `c5ff787b1` and IDF5 tip `955305fd2`. |

## Upstream Outcome

| Internal record | Upstream result | Master status |
|---|---|---|
| PR 1, Wi-Fi debug build | PR `#2733`, merge `6ad8b4c71` | included |
| PR 2, I2C configuration | PR `#2734`, merge `25f81a8e1` | included |
| PR 3, ADC | PR `#2735`, merge `149ccda22` | included |
| PR 4, GPIO matrix | PR `#2736`, merge `4ba8157c9` | included |
| PR 5, PWM/DAC | PR `#2737`, reapplied as `919ac70f1`, `176614e08`, `b0fa32b4b` | included, followed by metadata cleanup `43fb9e08d` |
| PR 6, OneWire timing | held locally; not submitted | not included |
| PR 7, undefined pin state | PR `#2738`, merge `c1c95ae69` | included |

The three reapplied PWM/DAC commits have the same stable patch IDs as the
bench-tested PR `#2737` commits. Gordon's later `43fb9e08d` change removes
hard-coded DAC GPIO numbers, so its behaviour still needs the requested
post-merge hardware rerun.

## Retained Build and Boot Results

| Date | Source | Board | Build/runtime result |
|---|---|---|---|
| 19 August 2026 | `25dc06c17` | `ESP32_IDF5` | release build and boot pass; `2v29.58` |
| 19 August 2026 | `25dc06c17` plus documented console configuration | `ESP32C3_IDF5` | release build and boot pass; `2v29.58` |
| 31 August 2026 | `c5ff787b1` | `ESP32` | release build and boot pass; `2v29.277` |
| 31 August 2026 | `354fa95fb` | `ESP32_IDF5` | corrected release build and boot pass; `2v29.75` |
| pending | one recorded post-merge master commit | `ESP32` and `ESP32_IDF5` | build, flash and full sanity suite |

## Return Point

The detailed results remain in their dated investigation and test-result
records. Add the post-merge run as a new result rather than extending the
pre-merge reports. Once it is complete, use the normal Wi-Fi, OneWire, BLE or
other investigation area for subsequent master defects.
