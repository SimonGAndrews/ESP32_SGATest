# ESP32-Family IDF5 Port Investigation Tracker

## Purpose

Use this document to track build, boot and initial REPL investigations for the
MaBecker IDF5 handoff and Gordon Williams' current official IDF5 candidate.
Record the ESP-IDF version returned by provisioning once in the relevant
session notes rather than repeating it for every build.

## Source Anchors

| Source | Repository state | Commit |
|---|---|---|
| MB Baseline | MaBecker IDF5 handoff | `ca6b3592ccab25d846417774c6b18d7d3c2fe17e` |
| GW Validation | Gordon Williams official IDF5 candidate under test | `25dc06c17` |

## Relevant Commits

| Working name | Commit | Meaning |
|---|---|---|
| **MaBecker handoff** | `ca6b3592…` on `MaBecker/Espruino:esp32_5` | MaBecker’s IDF5 port as handed over. It compiles in GitHub CI for classic ESP32, C3, and S3, but it is not fully functionally tested. |
| **Master snapshot** | `d16a5a92…` on official `espruino/Espruino:master` | The recent core Espruino source Gordon used when updating the IDF5 work. |
| **Gordon integration point** | `80d20f3…` on official `espruino/Espruino:IDF5` | Gordon’s first combined version: MaBecker’s port plus a snapshot of current core Espruino, with ESP32 conflicts manually reconciled. |
| **Gordon initial audited candidate** | `391070be…` on official `espruino/Espruino:IDF5` | The official candidate at the initial audit, containing the integration plus Gordon’s subsequent BLE, USB, serial, and ESP32 clean-up work. |
| **Gordon first bench candidate** | `ec3a8230…` on official `espruino/Espruino:IDF5` | The candidate used for the first V1 harness runs before Gordon's next group of build and BLE fixes. |
| **Gordon current test candidate** | `25dc06c17` on official `espruino/Espruino:IDF5` | The candidate currently flashed on the classic ESP32 V1 harness and covered by the 19 August regression record. |

## Build And Boot Results

| Date | Source / commit | Board file | Target board | Make command | Build completed Y/N | Build error notes | `process.env.BOARD` | `process.version` | Console connection | Boot / Web IDE Y/N |
|---|---|---|---|---|---|---|---|---|---|---|
|  | MB / `ca6b3592` | `ESP32` | Olimex ESP32-DevKit-LiPo Rev.D |  |  |  |  |  | Board USB-UART |  |
|  | MB / `ca6b3592` | `ESP32_IDF4` | Olimex ESP32-DevKit-LiPo Rev.D |  |  |  |  |  | Board USB-UART |  |
|  | MB / `ca6b3592` | `ESP32_IDF5` | Olimex ESP32-DevKit-LiPo Rev.D |  |  |  |  |  | Board USB-UART |  |
|  | MB / `ca6b3592` | `ESP32C3_IDF4` | ESP32-C3-DevKitC-02 |  |  |  |  |  |  |  |
|  | MB / `ca6b3592` | `ESP32C3_IDF5` | ESP32-C3-DevKitC-02 |  |  |  |  |  |  |  |
|  | GW / `391070be` | `ESP32` | Olimex ESP32-DevKit-LiPo Rev.D |  |  |  |  |  | Board USB-UART |  |
|  | GW / `391070be` | `ESP32_IDF4` | Olimex ESP32-DevKit-LiPo Rev.D |  |  |  |  |  | Board USB-UART |  |
|  | GW / `391070be` | `ESP32_IDF5` | Olimex ESP32-DevKit-LiPo Rev.D |  |  |  |  |  | Board USB-UART |  |
|  | GW / `391070be` | `ESP32C3_IDF4` | ESP32-C3-DevKitC-02 |  |  |  |  |  |  |  |
|  | GW / `391070be` | `ESP32C3_IDF5` | ESP32-C3-DevKitC-02 |  |  |  |  |  |  |  |

For C3 results, state `Board USB-UART` or `Native USB` in the console column.
Use `N/A` for runtime fields when a successful build has not been flashed.

## Investigation Notes

Add concise dated notes here when a build or boot result needs explanation.
Keep functional harness-test results separate from this initial build and boot
matrix.
