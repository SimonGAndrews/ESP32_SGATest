

## The four commits that matter

| Working name | Commit | Meaning |
|---|---|---|
| **MaBecker handoff** | `ca6b3592…` on `MaBecker/Espruino:esp32_5` | MaBecker’s IDF5 port as handed over. It compiles in GitHub CI for classic ESP32, C3, and S3, but it is not fully functionally tested. |
| **Master snapshot** | `d16a5a92…` on official `espruino/Espruino:master` | The recent core Espruino source Gordon used when updating the IDF5 work. |
| **Gordon integration point** | `80d20f3…` on official `espruino/Espruino:IDF5` | Gordon’s first combined version: MaBecker’s port plus a snapshot of current core Espruino, with ESP32 conflicts manually reconciled. |
| **Gordon current candidate** | `391070be…` on official `espruino/Espruino:IDF5` | Today’s latest official candidate, containing the integration plus Gordon’s subsequent BLE, USB, serial, and ESP32 clean-up work. |

In simpler form:

```text
MaBecker handoff
ca6b3592
    │
    │ Gordon adds recent core Espruino and resolves overlaps
    ▼
Gordon integration point
80d20f3
    │
    │ Gordon makes further ESP32/USB/BLE/serial changes
    ▼
Gordon current candidate
391070be
```

## What the audit tells us about the starting point

The good news is that Gordon did start from the complete MaBecker handoff. No committed MaBecker work is missing from his branch.

That answers one of the most important initial questions: we do not need to reconstruct the port from two competing partial branches. Gordon’s official branch contains MaBecker’s committed IDF5 work and then moves forward from it.

It also retains the previously accepted `digitalPulse` changes unchanged.

Gordon then combined that port with recent core Espruino development. That direction is reasonable because the finished IDF5 port ultimately has to work with current Espruino, not an older frozen core.

The complication is that Gordon is doing two jobs at once:

1. Integrating the existing MaBecker IDF5 port into current Espruino.
2. Continuing to change core Espruino and the ESP32 implementation, particularly serial, USB, BLE, Wi-Fi, sleep, and event handling.

That makes the result harder to evaluate. A test difference between the MaBecker handoff and Gordon’s current candidate may come from:

- an IDF5 integration correction;
- a recent core Espruino change;
- a new ESP32-family behaviour change;
- the C3/S3 USB-console redesign;
- or an accidental conflict resolution.

The audit cannot decide which of those changes are correct. It tells us where the changes entered and therefore how to investigate them.

## Is Gordon’s approach logical and sound?

Broadly, yes: Gordon took the existing port, brought it onto current Espruino, and then started adapting the ESP32 implementation to fit newer core behaviour.

However, the current result is not yet a clean validation baseline.

There are two concerns.

First, the commit named “Merge master into IDF5” was not recorded as a normal Git merge. It is effectively one large imported snapshot. That does not make the resulting code wrong. It means Git cannot show us automatically:

- which master commit was merged;
- which files conflicted;
- how each conflict was resolved;
- or which upstream commits are already represented.

Our comparison reconstructed this: Gordon appears to have used master commit `d16a5a92…` and manually combined 25 overlapping files, mainly ESP32, networking, build, and provisioning files.

This chiefly hinders review and fault isolation. It does not itself prevent building or testing.

Second, Gordon’s current candidate does not presently pass its own GitHub builds for any of the three IDF5 ESP32 targets. Meanwhile, the MaBecker handoff does compile for all three.

That is the immediate practical blocker.

Importantly, this does not mean the MaBecker handoff is functionally better. It means:

- **MaBecker handoff:** known to compile, insufficiently tested.
- **Gordon current candidate:** more current and probably closer to the intended final architecture, but not currently compiling in official CI.

## How the audit helps the actual task

It gives us two controlled reference points.

### Reference A: MaBecker handoff

`ca6b3592…`

Use this to answer:

- Can we reproduce the last known compiling IDF5 port?
- What did the IDF5 implementation do before Gordon’s recent changes?
- Does it operate correctly on the classic ESP32 and C3 harnesses?
- Which problems already existed before Gordon’s integration?

This is a control build, not an authority or finished port.

### Reference B: Gordon current candidate

`391070be…`

Use this to answer:

- Does Gordon’s current official branch build locally?
- If not, what is the first concrete failure?
- Once it builds, what behaviour differs from the MaBecker handoff?
- Do Gordon’s newer USB, serial, BLE, Wi-Fi, and event changes improve or regress the port?

This is the intended forward-moving candidate, not yet a usable test image.

### Diagnostic waypoint: Gordon integration point

`80d20f3…`

This is useful only if we need to separate Gordon’s initial integration from his later changes.

For example:

```text
MaBecker works
    │
    ▼
Gordon integration fails
```

That points toward the core-master import or its manual conflict resolutions.

Whereas:

```text
MaBecker works
Gordon integration works
Gordon current candidate fails
```

That points toward Gordon’s later USB, serial, BLE, or output-processing changes.

We should not automatically build every intermediate commit. The integration point is available as a diagnostic waypoint if the two main reference points disagree.

## What currently helps us

- Gordon’s branch contains the whole committed MaBecker handoff.
- Both branches use the same ESP-IDF version: `v5.5.3`.
- Both contain classic ESP32, C3, and S3 IDF5 board definitions.
- MaBecker’s handoff has successful compile evidence for all three targets.
- The `digitalPulse` work survived Gordon’s integration.
- We have completed classic ESP32 and C3 V1 harnesses for controlled comparison.
- The commits at which Gordon introduced the major new serial and USB behaviour are identifiable.
- Local experimental work is separate and has not contaminated either remote reference commit.

## What currently hinders us

- Gordon’s current candidate fails all three official IDF5 builds.
- The detailed CI errors are not publicly visible without GitHub authentication.
- The large master import has no normal merge history or recorded conflict list.
- Gordon’s subsequent changes alter important behaviour while the port is still being integrated.
- C3/S3 console handling has changed: native USB is now represented separately as `EV_USB`, while `Serial1` is intended to remain available. That affects how our C3 harness runner should connect.
- The build pulls an external mDNS dependency using a version range, so exact dependency resolution must be recorded.
- S3 can only receive source/build assessment because we do not have a completed S3 harness.

## Recommended plan

### 1. Resolve build readiness before hardware testing

The first action—after approval to build—should be to reproduce the two anchor states locally:

1. Build classic `ESP32_IDF5` from the **MaBecker handoff**, `ca6b3592…`.
2. Build classic `ESP32_IDF5` from the **Gordon current candidate**, `391070be…`.

Classic ESP32 should go first because its USB-UART console is straightforward and unaffected by the C3 native-USB console redesign.

If Gordon’s candidate fails, preserve the exact compiler error and determine whether it is:

- a common build-system failure;
- a core/ESP32 compile incompatibility;
- an external dependency problem;
- or target-specific source failure.

There is little value flashing or extending tests until this is understood.

### 2. Repeat the build comparison for C3

Once classic builds are understood:

3. Build `ESP32C3_IDF5` from the MaBecker handoff.
4. Build `ESP32C3_IDF5` from Gordon’s current candidate.

Before flashing Gordon’s C3 build, establish which physical connector carries the initial console and how `EV_USB` and `Serial1` are expected to behave.

### 3. Use the harnesses to compare functional behaviour

For each target, run the same shared logical tests against:

- MaBecker handoff;
- Gordon current candidate.

Initial order:

1. boot identity and build provenance;
2. console stability;
3. static GPIO;
4. `setWatch`;
5. `digitalPulse`;
6. PWM/ADC;
7. I2C and SPI;
8. OneWire;
9. UART crosslink;
10. Wi-Fi/BLE where required.

This will tell Gordon not merely whether the candidate builds, but which user-visible Espruino behaviours work or fail on real hardware.

### 4. Use intermediate commits only to isolate regressions

If a test differs between the two anchor builds, then test the **Gordon integration point**, `80d20f3…`, or one of his later change points.

That is where the Git audit becomes practically useful: it gives us a small number of meaningful stages instead of asking us to reason through hundreds of upstream commits.

## Bottom line

The starting point Gordon assembled is conceptually sensible:

```text
existing MaBecker IDF5 port
+ current Espruino core
+ Gordon’s ongoing ESP32 integration work
= intended official IDF5 branch
```

But it is not yet a validated starting point for bench testing because the current official candidate does not compile in its own CI.

Our job should therefore be:

1. Treat MaBecker `ca6b3592…` as the known-compiling handoff control.
2. Treat Gordon `391070be…` as the intended current candidate.
3. Reproduce and explain the official build failures.
4. Once buildable, compare both commits on classic ESP32 and C3 V1 harnesses.
5. Use Gordon’s integration and later commits only when we need to locate the source of a difference.

That approach supports Gordon’s chosen direction while giving him concrete build and hardware evidence, without assuming either his current code or MaBecker’s earlier port is automatically correct.


## Enabler - Created and verified two clean clones:

- MaBecker baseline checkout: `/home/simon/MaBecker/Espruino_IDF5_MaBecker_baseline`
  - Branch: `baseline/mabecker-ca6b3592`
  - HEAD: `ca6b3592ccab25d846417774c6b18d7d3c2fe17e`
  - Clean, with no upstream tracking branch.

- Gordon validation checkout: `/home/simon/MaBecker/Espruino_IDF5_Gordon_validation`
  - Branch: `candidate/gordon-2026-08-17-391070be`
  - HEAD: `391070be2b5ce37b782e858f5f3cfb505f048456`
  - Clean, with no upstream tracking branch.

Both clones have explicitly named `official` and `mabecker` remotes and contain both audited branch tips. Existing checkouts were untouched. No provisioning, build, or flash was performed.
