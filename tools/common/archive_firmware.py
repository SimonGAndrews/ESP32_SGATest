#!/usr/bin/env python3
"""Archive a flashable Espruino firmware bundle into this repo's firmware/ area."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path


REQUIRED_BUILD_FILES = (
    "bin/build/espruino.bin",
    "bin/build/bootloader/bootloader.bin",
    "bin/build/partition_table/partition-table.bin",
    "bin/build/flasher_args.json",
    "bin/build/flash_args",
    "bin/sdkconfig",
    "bin/build/project_description.json",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Copy the current Espruino build output from a source repo into "
            "this repo's firmware archive."
        )
    )
    parser.add_argument(
        "source_repo",
        help="Path to the Espruino source repo root, or its bin/ directory",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace an existing archive directory if it already exists",
    )
    return parser.parse_args()


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def resolve_source_root(raw_path: str) -> Path:
    path = Path(raw_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"Source path does not exist: {path}")

    if (path / "bin" / "build").is_dir() and (path / "gen").is_dir():
        return path
    if path.name == "bin" and (path / "build").is_dir() and (path.parent / "gen").is_dir():
        return path.parent

    raise FileNotFoundError(
        "Could not find an Espruino repo root. Expected either a repo with "
        "'bin/build' and 'gen/', or the repo's 'bin/' directory."
    )


def require_file(path: Path) -> Path:
    if not path.is_file():
        raise FileNotFoundError(f"Required file is missing: {path}")
    return path


def read_json(path: Path) -> dict:
    return json.loads(path.read_text())


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def parse_current_board(gen_dir: Path) -> str:
    current_board = require_file(gen_dir / "CURRENT_BOARD.make")
    for line in current_board.read_text().splitlines():
        if line.startswith("BOARD="):
            return line.split("=", 1)[1].strip()
    raise ValueError(f"Could not find BOARD= in {current_board}")


def parse_platform_family(gen_dir: Path) -> str:
    platform_config = require_file(gen_dir / "platform_config.h")
    for line in platform_config.read_text().splitlines():
        m = re.match(r'#define\s+PC_BOARD_CHIP_FAMILY\s+"([^"]+)"', line)
        if m:
            return m.group(1)
    raise ValueError(f"Could not find PC_BOARD_CHIP_FAMILY in {platform_config}")


def normalize_version(project_version: str) -> tuple[str, str]:
    version_match = re.search(
        r"RELEASE_(.+?)(?:-g[0-9a-f]{7,40})?(?:-dirty)?$",
        project_version,
        re.IGNORECASE,
    )
    if version_match:
        release_token = version_match.group(1)
    else:
        release_token = project_version

    release_token = release_token.replace("-", ".").lower()
    if not re.match(r"^\d+v\d", release_token) and re.match(r"^\d", release_token):
        release_token = "v" + release_token

    commit_match = re.search(r"-g([0-9a-f]{7,40})", project_version, re.IGNORECASE)
    commit = commit_match.group(1) if commit_match else "unknown"
    dirty = "-dirty" in project_version.lower()

    unique_suffix = commit
    if dirty:
        unique_suffix += "_dirty"
    return release_token, unique_suffix


def copy_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def build_flash_command(metadata: dict, flash_args: dict) -> str:
    chip = metadata["target"]
    settings = flash_args["flash_settings"]
    files = flash_args["flash_files"]

    ordered_offsets = sorted(files.keys(), key=lambda item: int(item, 16))
    lines = [
        f'esptool.py -p /dev/ttyUSB0 -b 460800 --before default_reset --after hard_reset \\',
        f"  --chip {chip} write_flash \\",
        (
            f'  --flash_mode {settings["flash_mode"]} '
            f'--flash_size {settings["flash_size"]} '
            f'--flash_freq {settings["flash_freq"]} \\'
        ),
    ]

    for index, offset in enumerate(ordered_offsets):
        suffix = " \\" if index < len(ordered_offsets) - 1 else ""
        lines.append(f"  {offset} {Path(files[offset]).name}{suffix}")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    dest_root = repo_root() / "firmware"
    source_root = resolve_source_root(args.source_repo)
    bin_dir = source_root / "bin"
    build_dir = bin_dir / "build"
    gen_dir = source_root / "gen"

    for relative in REQUIRED_BUILD_FILES:
        require_file(source_root / relative)

    project_description_path = build_dir / "project_description.json"
    flasher_args_path = build_dir / "flasher_args.json"
    sdkconfig_path = bin_dir / "sdkconfig"

    project_description = read_json(project_description_path)
    flasher_args = read_json(flasher_args_path)

    board_id = parse_current_board(gen_dir)
    family = parse_platform_family(gen_dir)
    release_token, unique_suffix = normalize_version(project_description["project_version"])
    archive_parent = dest_root / board_id
    archive_dir = archive_parent / release_token

    if archive_dir.exists():
        if args.force:
            shutil.rmtree(archive_dir)
        else:
            manifest_path = archive_dir / "manifest.json"
            if manifest_path.is_file():
                existing_manifest = read_json(manifest_path)
                if existing_manifest.get("project_version") == project_description["project_version"]:
                    raise FileExistsError(
                        f"Archive directory already exists for the same build: {archive_dir}\n"
                        "Use --force to replace it."
                    )
            archive_dir = archive_parent / f"{release_token}_{unique_suffix}"
            if archive_dir.exists():
                if not args.force:
                    raise FileExistsError(
                        f"Archive directory already exists: {archive_dir}\n"
                        "Use --force to replace it."
                    )
                shutil.rmtree(archive_dir)

    archive_dir.mkdir(parents=True, exist_ok=True)

    copied_files = {
        "bootloader.bin": build_dir / "bootloader" / "bootloader.bin",
        "partition-table.bin": build_dir / "partition_table" / "partition-table.bin",
        "espruino.bin": build_dir / "espruino.bin",
        "flasher_args.json": flasher_args_path,
        "flash_args": build_dir / "flash_args",
        "project_description.json": project_description_path,
        "sdkconfig": sdkconfig_path,
    }

    optional_files: dict[str, Path] = {}
    top_level_release_bin = bin_dir / f"espruino_{release_token}_{project_description['target']}.bin"
    if top_level_release_bin.is_file():
        optional_files[top_level_release_bin.name] = top_level_release_bin

    for dest_name, src_path in copied_files.items():
        copy_file(src_path, archive_dir / dest_name)
    for dest_name, src_path in optional_files.items():
        copy_file(src_path, archive_dir / dest_name)

    flash_command = build_flash_command(project_description, flasher_args)
    manifest = {
        "board_id": board_id,
        "board_family": family,
        "target": project_description["target"],
        "project_version": project_description["project_version"],
        "release_token": release_token,
        "archive_version": archive_dir.name,
        "idf_version": project_description["git_revision"],
        "source_repo": str(source_root),
        "source_bin_dir": str(bin_dir),
        "archive_dir": str(archive_dir),
        "flash_command": flash_command,
        "files": [],
    }

    for path in sorted(archive_dir.iterdir()):
        if path.is_file():
            manifest["files"].append(
                {
                    "name": path.name,
                    "size": path.stat().st_size,
                    "sha256": sha256_file(path),
                }
            )

    manifest_path = archive_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

    readme_lines = [
        f"Espruino firmware archive for {board_id}",
        "=" * (31 + len(board_id)),
        "",
        f"Board ID: {board_id}",
        f"Board family: {family}",
        f"Target: {project_description['target']}",
        f"Project version: {project_description['project_version']}",
        f"Release token: {release_token}",
        f"IDF version: {project_description['git_revision']}",
        f"Source repo: {source_root}",
        "",
        "Flash command:",
        "",
        "```bash",
        flash_command,
        "```",
        "",
        "Included files:",
        "",
    ]
    for item in manifest["files"]:
        readme_lines.append(
            f"- {item['name']} ({item['size']} bytes, sha256 {item['sha256']})"
        )
    (archive_dir / "README_flash.txt").write_text("\n".join(readme_lines) + "\n")

    print(f"Archived firmware bundle to {archive_dir}")
    print(f"Board ID: {board_id}")
    print(f"Project version: {project_description['project_version']}")
    print(f"IDF version: {project_description['git_revision']}")
    print()
    print(flash_command)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
