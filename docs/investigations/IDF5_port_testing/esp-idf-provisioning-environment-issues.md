# ESP-IDF Provisioning Environment Issues

## Conclusion

The current Espruino `scripts/provision.sh` flow is adequate for creating a
new ESP-IDF checkout, but it does not establish that an existing shared
Espressif tool environment is complete, compatible or uncontaminated.

This caused two repeatable failures during the August 2026 ESP32-family
validation:

1. the shared IDF4 Python environment imported an incompatible IDF5 Kconfig
   package, so IDF4 configuration generation failed;
2. the shared IDF5.5 Python environment retained a prerelease `esptool` that
   no longer satisfied the refreshed IDF5.5 constraints, so provisioning
   could not activate the environment.

The immediate operating rule is:

> Open a new VS Code terminal before provisioning, and use that terminal for
> one Espruino checkout and one ESP-IDF family only. Continue the build in the
> same terminal after provisioning.

Longer term, `scripts/provision.sh` should validate and, when explicitly
requested, repair an existing ESP-IDF installation rather than treating the
presence of an `esp-idf-*` directory as proof that the environment is healthy.

## Scope

This note covers the shared Espressif tools and Python environments used by
Espruino provisioning on Ubuntu. It records the failures, their causes, the
safe short-term procedure and proposed provisioning-script improvements.

A separate build-state issue was also found: changing board targets in one
checkout without running `make clean` allowed stale C3 generated headers to be
used in a classic ESP32 build. That issue is summarised here because it affects
the working procedure, but it is not caused by ESP-IDF provisioning.

## How Espressif State Is Shared

The ESP-IDF source checkout is stored inside each Espruino repository, for
example:

```text
Espruino_master/esp-idf-4/esp-idf
Espruino_IDF5_Gordon_validation/esp-idf-5/esp-idf
```

Compiler tools and Python environments are stored separately under the user
profile and are shared by all compatible checkouts:

```text
All IDF 4.4 checkouts
    -> ~/.espressif/python_env/idf4.4_py3.12_env

All IDF 5.5 checkouts
    -> ~/.espressif/python_env/idf5.5_py3.12_env

Compiler and debugger versions
    -> ~/.espressif/tools/
```

Consequences:

- deleting one repository's `esp-idf-4` or `esp-idf-5` directory does not
  delete or reconstruct its shared Python environment;
- provisioning or package changes made from one checkout can affect other
  checkouts using the same IDF version;
- changing Espruino branch does not isolate the ESP-IDF Python environment;
- an optional Espressif tool cleanup performed for IDF5 can remove versions
  still required for later IDF4 builds.

## Current Provisioning Logic

For IDF4 and IDF5, the relevant current logic is effectively:

```text
Select the requested board family.

If the corresponding esp-idf directory does not exist:
    create its parent directory;
    clone the selected Espressif IDF tag recursively;
    run esp-idf/install.sh.

Source esp-idf/export.sh into the current shell.
```

The significant condition is that `install.sh` is only called when the local
IDF source directory is first created. If the directory already exists, the
script proceeds directly to `export.sh`.

The script therefore does not currently establish that:

- every required compiler tool is still installed;
- Python requirements still satisfy the current constraint file;
- the shared Python environment contains no conflicting packages;
- the active shell was previously provisioned for a different IDF family;
- the selected compiler, Python environment and IDF commit are the intended
  ones.

## Observed Issue 1: IDF4 Kconfig Namespace Collision

### Symptom

An `ESP32C3_IDF4` build failed while generating the IDF configuration:

```text
AttributeError: module 'kconfiglib' has no attribute 'BOOL'
```

The same failure occurred on current and earlier Espruino branches.

### Verified cause

The shared environment contained both:

```text
kconfiglib==13.7.1
esp-idf-kconfig==2.5.4
```

IDF 4.4.8 requires the standalone module:

```text
site-packages/kconfiglib.py
```

The later Espressif package installed a directory with the same import name:

```text
site-packages/kconfiglib/__init__.py
```

Python selected the package directory first. That implementation did not
provide the IDF4 API constants `BOOL` and `TRISTATE` expected by
`confgen.py`.

The unwanted `esp-idf-kconfig` package version matched the IDF5.5 environment.
The exact command that installed it into the IDF4 environment was not retained,
but the evidence is consistent with an IDF5 package operation being performed
while the IDF4 environment was active. This is an inference, not a proven shell
history.

### Why reprovisioning did not fix it

The IDF4 source directory was deleted and cloned again, but the shared
environment remained at:

```text
~/.espressif/python_env/idf4.4_py3.12_env
```

Running the installer adds or updates required packages; it does not generally
remove unexpected packages. The conflicting package therefore remained.

### Applied repair

Only the incompatible package was removed from the IDF4 environment:

```bash
/home/simon/.espressif/python_env/idf4.4_py3.12_env/bin/python \
  -m pip uninstall esp-idf-kconfig
```

Verification then showed:

```text
module=.../site-packages/kconfiglib.py
BOOL=3
TRISTATE=48
```

The C3 IDF4 build subsequently progressed past configuration generation.

## Observed Issue 2: Stale IDF5 `esptool`

### Symptom

IDF5 provisioning failed during environment activation:

```text
Requirement 'esptool~=4.12' was not met. Installed version: 4.12.dev3
```

### Verified cause

The shared IDF5.5 environment contained:

```text
esptool==4.12.dev3
```

That package had been installed on 5 July 2026. The global IDF5.5 constraint
file was refreshed on 18 August 2026 and required:

```text
esptool~=4.12
```

The prerelease `4.12.dev3` does not satisfy the stable-version requirement.
Stable `4.12.0` was available, but provisioning reused the existing Python
environment rather than updating it before activation.

### Applied repair

The exact stable version was installed into the IDF5.5 environment:

```bash
/home/simon/.espressif/python_env/idf5.5_py3.12_env/bin/python \
  -m pip install --upgrade "esptool==4.12.0"
```

After this change, provisioning reported:

```text
Checking python dependencies ... OK
Establishing a new ESP-IDF environment ... OK
```

## Related Issue: Optional Tool Cleanup Removed IDF4 Tools

After successful IDF5 activation, Espressif printed an informational message
offering to remove tool versions not used by the active IDF5.5 installation.
Running:

```bash
python path/to/idf_tools.py uninstall --remove-archives
```

removed older compiler, debugger and support-tool versions. The command then
failed while processing archives with:

```text
UnboundLocalError: cannot access local variable 'archive_version'
```

Post-command checks established:

- the active IDF5.5 tool set was complete;
- the IDF4.4 tool check failed because its older compiler versions had been
  removed;
- repositories and already-flashed boards were unaffected.

The IDF4 tools can be restored later with:

```bash
cd /home/simon/MaBecker/Espruino_master
./esp-idf-4/esp-idf/install.sh
```

This cleanup command should not be used during mixed IDF4/IDF5 validation.
"Not used by the active IDF version" does not mean "not used by any local
workstream."

## Immediate Best-Practice Procedure

### One terminal, one checkout, one IDF family

Open a new VS Code terminal before every provisioning session. In that
terminal:

1. change to the intended Espruino checkout;
2. select the intended Git branch;
3. source the provisioning script for one board family;
4. build only that IDF family in that terminal;
5. close the terminal before provisioning another IDF family or repository.

Example:

```bash
cd /home/simon/MaBecker/Espruino_IDF5_Gordon_validation
git switch candidate/gordon-2026-08-18-25dc06c1
source ./scripts/provision.sh ESP32_IDF5

echo "$ESP_IDF_VERSION"
echo "$IDF_PYTHON_ENV_PATH"
which python

make BOARD=ESP32_IDF5 clean
make BOARD=ESP32_IDF5 RELEASE=1
```

Do not open a new terminal between `source provision.sh` and `make`; the
exported environment belongs to the current shell and would be lost.

### Avoid ambiguous Python package commands

After provisioning, an unqualified command such as:

```bash
pip install ...
```

may operate on whichever Python environment is first in `PATH`. For diagnosis
or repair, use the complete expected interpreter path:

```bash
~/.espressif/python_env/idf5.5_py3.12_env/bin/python -m pip ...
```

Do not modify the Ubuntu system `pip` or system `esptool` to repair an
ESP-IDF virtual environment.

### Do not perform optional Espressif cleanup during mixed-version work

Older tools are expected when both IDF4 and IDF5 builds are in scope. Leave
them installed until the workstream no longer requires either family.

### Clean whenever the board target changes

This is separate from provisioning but is required for reliable builds:

```bash
make BOARD=<new-board> clean
make BOARD=<new-board> RELEASE=1
```

Before flashing, verify the generated board identity:

```bash
rg 'for board|PC_BOARD_ID|JSH_PIN_COUNT' \
  gen/platform_config.h gen/jspininfo.h
```

For classic `ESP32_IDF5`, the generated inputs must identify `ESP32_IDF5` and
must report `JSH_PIN_COUNT 40`.

## Proposed Long-Term Provisioning Changes

### 1. Detect a conflicting active environment

Before installing or exporting, inspect at least:

```text
IDF_PATH
IDF_PYTHON_ENV_PATH
ESP_IDF_VERSION
PATH
```

If another IDF family is active, stop with a concise message telling the user
to open a fresh terminal. Re-running provisioning for the same expected
environment may remain allowed.

### 2. Separate checkout creation from environment validation

The existence of `esp-idf-4` or `esp-idf-5` should only answer whether a clone
is needed. It must not skip environment validation.

Suggested structure:

```text
ensure_idf_checkout
ensure_required_tools
ensure_python_environment
activate_environment
verify_environment
report_provenance
```

### 3. Install missing tools even when the IDF checkout exists

Run the appropriate Espressif installer unconditionally, or first run
`idf_tools.py check` and invoke `install.sh` when required tools are missing.
Espressif installers are intended to reuse valid downloads and install missing
versions.

This would have restored the tools removed by the IDF5 cleanup without forcing
the IDF source checkout to be deleted and cloned again.

### 4. Validate Python dependencies on every provision

Activation should fail early if current constraints are not satisfied. The
script should report:

- expected environment path;
- Python executable actually used;
- unmet requirement and installed version;
- a safe repair command scoped to that environment.

This would have identified and repaired stale `esptool` before a build was
attempted.

### 5. Add IDF-family compatibility smoke checks

Generic version checks are insufficient when two packages use the same import
name. For IDF4, add a small compatibility test such as:

```python
import kconfiglib
assert hasattr(kconfiglib, "BOOL")
assert hasattr(kconfiglib, "TRISTATE")
```

If it fails, report the imported module path and installed distributions. Do
not silently uninstall packages from a shared environment.

### 6. Add an explicit repair mode

Normal provisioning should validate and stop safely. A separately requested
repair mode could reconstruct only the selected Python environment using the
Espressif-supported command:

```text
idf_tools.py install-python-env --reinstall
```

Both the locally selected IDF 4.4 and IDF 5.5 tools support `--reinstall`.
Because this discards and recreates a shared virtual environment, the script
should state the exact target and require explicit intent, for example:

```bash
source scripts/provision.sh ESP32_IDF5 --repair-python-env
```

It must not remove compiler versions for other IDF families.

### 7. Print a concise provenance summary

Successful provisioning should end with machine-readable or consistently
formatted values for:

```text
BOARD
Espruino checkout and HEAD
IDF_PATH
IDF tag and commit
ESP_IDF_VERSION
IDF_PYTHON_ENV_PATH
Python executable and version
compiler executable and version
```

This would make build records and later diagnosis substantially clearer.

### 8. Return non-zero without leaving a partially selected environment

If validation fails, the script should return a failure code and explain what
was and was not changed. It should avoid leaving a shell that appears
provisioned but points partly at another IDF environment.

## Suggested Validation Cases for a Script Change

Any provisioning change should be tested against:

1. no IDF checkout and no Python environment;
2. existing healthy checkout and environment;
3. existing checkout with a required compiler removed;
4. existing IDF5 environment with an outdated constrained package;
5. existing IDF4 environment with the conflicting `esp-idf-kconfig` package;
6. an IDF4 shell attempting to provision IDF5;
7. an IDF5 shell attempting to provision IDF4;
8. repeated provisioning of the same board in the same shell;
9. two repositories using the same IDF version;
10. network unavailable with a previously complete local installation.

## Recommended Return Point

Finish the current IDF5 firmware validation before changing provisioning.
Then create a dedicated Espruino branch for the script work, implement the
validation-first flow, and test it against both the current IDF4 and IDF5
checkouts. Firmware-source changes belong in the selected Espruino repository;
this harness repository should retain the investigation, proposed behaviour
and validation evidence.
