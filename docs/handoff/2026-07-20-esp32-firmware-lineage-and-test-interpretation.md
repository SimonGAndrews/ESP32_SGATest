# ESP32 Firmware Lineage And Test Interpretation

Date: 2026-07-20

## Conclusion

Treat every ESP32-family Espruino firmware line as a test subject. The mature
classic ESP32 legacy build is the strongest current comparator, but it is not
an infallible reference. C3 and S3 IDF4 builds have had less community use and
formal coverage, while all IDF 5.5.3 ports are work in progress. Attribute an
anomaly only after comparing the relevant target, IDF and peer-role matrix.

This guidance crosses two workstreams:

- V1 bench threads produce repeatable API and peer evidence.
- Firmware-investigation threads use that evidence to select source trees,
  comparators and guarded code paths.

V2 architecture threads may consume the resulting proven behaviour, but
should not turn a single firmware observation into a hardware requirement.

The current Wi-Fi firmware issue register and investigation entry point is
[`../investigations/wifi/README.md`](../investigations/wifi/README.md).

## Firmware Lineage

The ESP32-family port evolved by retaining shared ESP32 source files and using
IDF-version and target macro guards where Espressif APIs or target behaviour
differed. Much of this code is under `targets/esp32/`; networking also uses
shared code under `libs/network/esp32/`.

Common guards include:

- `ESP_IDF_VERSION_MAJOR`
- `CONFIG_IDF_TARGET_ESP32C3`
- `CONFIG_IDF_TARGET_ESP32S3`

The practical build lines are:

| Firmware line | Board file | ESP-IDF line | Project confidence context |
|---|---|---|---|
| Classic ESP32 legacy | `boards/ESP32.py` | original IDF 3.1 lineage | Longest community use and generally stable; occasional anomalies relative to Espruino core boards remain possible. |
| Classic ESP32 IDF4 | `boards/ESP32_IDF4.py` | IDF 4.4.8 | Classic target using the shared IDF4 adaptation paths; important control for separating C3-specific behaviour from common IDF4 behaviour. |
| ESP32-C3 IDF4 | `boards/ESP32C3_IDF4.py` | IDF 4.4.8 | Less community use and harness coverage; do not assume it is fully reliable. |
| ESP32-S3 IDF4 | `boards/ESP32S3_IDF4.py` | IDF 4.4.8 | Shares guarded ESP32 sources and appears lightly exercised in community reports. |
| Classic, C3 and S3 IDF5 | `boards/ESP32_IDF5.py`, `boards/ESP32C3_IDF5.py`, `boards/ESP32S3_IDF5.py` | IDF 5.5.3 | Active WIP in the MaBecker firmware line; comparison candidates, not stable baselines. |

Low issue or discussion volume is not proof of correctness when a target has
limited adoption. It reduces the amount of independent field evidence.

## Build Provenance Authority

Use `scripts/provision.sh` in the Espruino repo selected for the build as a
primary reference for the ESP-IDF toolchain. Current inspected scripts show:

- the IDF4 provision path clones Espressif IDF tag `v4.4.8`
- the active IDF5 provision path clones tag `v5.5.3`
- the legacy provision path and BuildTools history preserve the original
  ESP32 V3.1 lineage

Do not infer complete provenance from the board name alone. For every test
result intended for comparison, preserve:

- target board and board file
- Espruino version and firmware Git commit reported by the board
- source repo, remote, branch and commit used to build
- relevant `scripts/provision.sh` revision
- ESP-IDF version and, where material, the actual provisioned IDF commit
- build options or local patches
- serial path, harness mode, selectors and logical target/peer role

The current local-repository selection guide is
[`2026-07-05-espruino-repo-structure.md`](2026-07-05-espruino-repo-structure.md).
Local paths in that guide are environment-specific examples, not canonical
project paths.

## Comparator Rules

The following patterns are starting hypotheses for investigation, not automatic
root-cause conclusions:

| Observed pattern | First source area to examine |
|---|---|
| C3 IDF4 only | C3 target configuration, C3-specific guards, or a C3/IDF4 interaction. |
| Classic IDF4 and C3 IDF4, but not classic legacy | Shared IDF4 compatibility path or changed IDF semantics. |
| C3 and S3 IDF4, but not classic IDF4 | Newer-target guarded paths or two target-specific implementations with the same symptom. |
| Classic legacy and later ESP32 builds | Longstanding shared ESP32-port behaviour or a common Espruino API assumption. |
| IDF5 builds only | Current IDF5 migration or changed IDF 5.5.3 semantics. |
| All tested ESP32-family lines | Shared ESP32 code, Espruino core interaction, test assumption or common external condition. |

An issue reproduced on C3 and classic ESP32 is not necessarily new: reproduce
it on both the legacy classic build and classic IDF4 build before deciding
whether it predates the IDF4 port. Conversely, a C3-only result raises the
priority of C3-specific and IDF4-target investigation, but still requires
hardware, runner and peer controls before firmware attribution.

## Required Investigation Method

Use this order for API anomalies:

1. Preserve the exact firmware and bench provenance.
2. Prove relevant wiring, selector state and simple static behaviour.
3. Reproduce with the common logical runner and unchanged API assertions.
4. Use reciprocal target/Supervisor Peer roles where the protocol permits.
5. Add an independent endpoint when a two-board directional result cannot
   identify sender versus receiver behaviour.
6. Compare the smallest useful firmware matrix: legacy classic, classic IDF4
   and the affected C3 or S3 IDF4 build.
7. Bring IDF5 builds into the matrix as WIP evidence, not as the reference that
   decides expected behaviour.
8. Inspect the shared source and its IDF/target guards only after the observed
   matrix is clear.

The stable classic build is valuable because it has more field exposure, not
because its output overrides contradictory electrical or peer evidence.

## Supervisor Peer Interpretation

A Supervisor Peer firmware build is also under test. Do not accept its local
status as ground truth merely because it is acting as the peer. Prefer
agreement among:

- host orchestration and timeouts
- target-side API state and events
- peer-side events
- a run-bound application payload and acknowledgement
- a third endpoint where directional network behaviour remains ambiguous

Application-layer challenge/response is the primary reachability proof because
it verifies the path and the intended service. ICMP remains useful additional
API coverage, but it may expose directional firmware or endpoint behaviour.

The reversed Wi-Fi role result demonstrates this rule: C3-to-classic-AP ping
failed while classic-AP-to-C3 ping and bidirectional UDP succeeded. That is a
real directional anomaly, but the two-board result does not yet identify the
C3 ping sender or classic AP echo responder as the cause. See
[`2026-07-20-wifi-supervisor-peer-reversed-roles.md`](../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-supervisor-peer-reversed-roles.md).

The target-hosted AP comparison supplies a second worked example. Both the C3
IDF4 and classic legacy builds applied a custom AP address successfully but
returned `"Failure"` through the `Wifi.setAPIP()` callback. This is evidence
for longstanding shared ESP32-port behaviour, not a C3-only regression. Keep
the callback-contract failure separate from the independently observed AP,
DHCP and UDP success. See
[`2026-07-20-wifi-target-ap-custom-ip.md`](../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-target-ap-custom-ip.md).

The station static-IP comparison exposes the complementary failure mode. On
both builds, `Wifi.setIP()` returned `null` as though successful while the
station retained its DHCP lease and the AP observed traffic from that DHCP
address. The exact source revisions matching both flashed commits stop the AP
DHCP-server API on the station interface rather than stopping the station DHCP
client, then map a nonzero result to `null`. This is a strong shared-source
explanation for the observed false success. See
[`2026-07-20-wifi-station-static-ip.md`](../../tests/Results/WIFI_BLE_Results/2026-07-20-wifi-station-static-ip.md).

## Codex Thread Guidance

For a new bench-comparison or firmware-investigation thread, Codex should:

1. state the primary workstream and any cross-workstream evidence dependency
2. read `AGENTS.md`, the current workstream handover, this note and the
   repository-selection guide
3. identify the exact firmware line before choosing a baseline
4. call the legacy classic build a mature comparator, not a golden reference
5. keep observations, hypotheses and source attribution visibly separate
6. record unexpected behaviour even when the broader Supervisor Peer mechanism
   succeeds
7. put firmware patches in the selected Espruino repo and keep test evidence in
   this harness repo
