# Firmware Archive

This directory stores curated flashable firmware bundles used for repeatable
bench reflashing and version control of test runs.

Each archived build should include:

- the application image
- the matching bootloader image
- the matching partition-table image
- the flash arguments or flash command
- enough build metadata to identify the exact Espruino and IDF version

The preferred way to populate this directory is with:

```bash
tools/common/archive_firmware.py /path/to/Espruino_source_repo
```

The archive tool creates one subdirectory per board build and versioned bundle.
