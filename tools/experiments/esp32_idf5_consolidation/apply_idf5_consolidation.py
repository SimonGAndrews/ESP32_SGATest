#!/usr/bin/env python3
"""Apply an accepted ESP32 IDF5 consolidation dry-run plan.

The application is deliberately gated by the SHA-256 of the accepted Markdown
plan.  Before writing source, it reruns the analysis and requires the newly
generated report to be byte-for-byte identical to that accepted plan.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path

import idf5_consolidation_transformer as analyser


TOOL_VERSION = "0.1.0"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def extract_dry_run_invocation(plan: str) -> str:
    match = re.search(
        r"Exact invocation from the harness repository root:\n\n```bash\n(.+?)\n```",
        plan,
        flags=re.DOTALL,
    )
    if not match:
        raise ValueError("accepted plan does not contain its canonical dry-run invocation")
    return match.group(1)


def scan_repository(
    repo: Path, major: int
) -> tuple[list[str], list[analyser.FileAnalysis], list[analyser.Occurrence]]:
    tracked_raw = analyser.git(repo, "ls-files", "-z").stdout
    tracked = sorted(item.decode() for item in tracked_raw.split(b"\0") if item)
    analyses: list[analyser.FileAnalysis] = []
    occurrences: list[analyser.Occurrence] = []

    for relative in tracked:
        path = repo / relative
        data = path.read_bytes()
        if analyser.VERSION_MACRO.encode() not in data:
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            occurrences.extend(
                analyser.Occurrence(relative, 0, "non-source reference", "binary occurrence")
                for _ in range(data.count(analyser.VERSION_MACRO.encode()))
            )
            continue

        analysis = None
        if path.suffix in analyser.SOURCE_SUFFIXES:
            analysis = analyser.parse_source(relative, text, major)
            analyses.append(analysis)
        occurrences.extend(analyser.classify_occurrences(relative, text, analysis))

    return tracked, analyses, occurrences


class SourceRenderer:
    """Render one parsed file while changing only version-dependent groups."""

    def __init__(self, analysis: analyser.FileAnalysis):
        self.analysis = analysis
        self.lines = analysis.lines
        self.children: dict[tuple[int | None, int | None], list[analyser.Group]] = (
            collections.defaultdict(list)
        )
        for group in analysis.groups:
            parent_id = id(group.parent) if group.parent else None
            self.children[(parent_id, group.parent_branch)].append(group)
        for children in self.children.values():
            children.sort(key=lambda group: group.first_line)

    def raw(self, start: int, end: int) -> str:
        if start > end:
            return ""
        return "".join(self.lines[start - 1 : end])

    def render_range(
        self,
        start: int,
        end: int,
        parent: analyser.Group | None,
        branch_index: int | None,
    ) -> str:
        if start > end:
            return ""
        parent_id = id(parent) if parent else None
        cursor = start
        output: list[str] = []
        for child in self.children.get((parent_id, branch_index), []):
            if child.first_line < start or child.last_line > end:
                raise ValueError(
                    f"{self.analysis.path}:{child.first_line}: child conditional is outside its parent body"
                )
            rendered_child = self.render_group(child)
            prefix_end = child.first_line - 1
            if (
                not rendered_child
                and child.last_line == end
                and prefix_end >= cursor
                and not self.lines[prefix_end - 1].strip()
            ):
                # Removing a final group can strand its separating blank line
                # at the end of a file or retained branch. Section 4.5 permits
                # deletion of that newly redundant blank line.
                prefix_end -= 1
            output.append(self.raw(cursor, prefix_end))
            output.append(rendered_child)
            cursor = child.last_line + 1
        output.append(self.raw(cursor, end))
        return "".join(output)

    def render_branch(self, group: analyser.Group, branch_index: int) -> str:
        branch = group.branches[branch_index]
        if branch.body_end is None:
            raise ValueError(f"{group.path}:{group.first_line}: branch has no closing boundary")
        return self.render_range(
            branch.body_start,
            branch.body_end,
            group,
            branch_index,
        )

    def simplified_directive(self, group: analyser.Group) -> str:
        directive = group.branches[0].directive
        if directive.start != directive.end:
            raise ValueError(
                f"{group.path}:{directive.start}: multiline mixed directive is not supported for application"
            )
        original = self.lines[directive.start - 1]
        if original.endswith("\r\n"):
            ending = "\r\n"
            body = original[:-2]
        elif original.endswith("\n") or original.endswith("\r"):
            ending = original[-1]
            body = original[:-1]
        else:
            ending = ""
            body = original
        match = re.match(r"^(\s*#\s*if\s+).*$", body)
        if not match:
            raise ValueError(
                f"{group.path}:{directive.start}: cannot preserve mixed-directive prefix"
            )
        return f"{match.group(1)}{group.remaining_condition}{ending}"

    def render_group(self, group: analyser.Group) -> str:
        if not group.endif:
            raise ValueError(f"{group.path}:{group.first_line}: conditional has no #endif")

        if group.version_dependent:
            if group.local_action == "unsupported":
                raise ValueError(f"{group.path}:{group.first_line}: unsupported planned action")
            if group.local_action == "remove-group":
                return ""
            if group.local_action == "unwrap-selected-branch":
                if group.selected_branch is None:
                    raise ValueError(f"{group.path}:{group.first_line}: no selected branch")
                return self.render_branch(group, group.selected_branch)
            if group.local_action == "simplify-guard":
                return (
                    self.simplified_directive(group)
                    + self.render_branch(group, 0)
                    + self.raw(group.endif.start, group.endif.end)
                )
            raise ValueError(
                f"{group.path}:{group.first_line}: unknown planned action {group.local_action}"
            )

        output: list[str] = []
        for branch_index, branch in enumerate(group.branches):
            output.append(self.raw(branch.directive.start, branch.directive.end))
            output.append(self.render_branch(group, branch_index))
        output.append(self.raw(group.endif.start, group.endif.end))
        return "".join(output)

    def render(self) -> str:
        return self.render_range(1, len(self.lines), None, None)


def prepare_transformations(
    repo: Path, analyses: list[analyser.FileAnalysis]
) -> tuple[dict[str, bytes], dict[str, bytes], list[analyser.Group]]:
    version_groups = [
        group for analysis in analyses for group in analysis.groups if group.version_dependent
    ]
    diagnostics = [diagnostic for analysis in analyses for diagnostic in analysis.diagnostics]
    if diagnostics:
        raise ValueError(f"analysis produced {len(diagnostics)} diagnostics")
    unsupported = [group for group in version_groups if group.local_action == "unsupported"]
    if unsupported:
        raise ValueError(f"analysis produced {len(unsupported)} unsupported groups")

    originals: dict[str, bytes] = {}
    transformed: dict[str, bytes] = {}
    for analysis in analyses:
        file_groups = [group for group in analysis.groups if group.version_dependent]
        if not file_groups:
            continue
        path = repo / analysis.path
        original = path.read_bytes()
        rendered = SourceRenderer(analysis).render().encode("utf-8")
        if rendered == original:
            raise ValueError(f"{analysis.path}: planned source file would not change")
        if analyser.VERSION_MACRO.encode() in rendered:
            raise ValueError(f"{analysis.path}: transformed source still contains version macro")
        reparsed = analyser.parse_source(analysis.path, rendered.decode("utf-8"), 5)
        if reparsed.diagnostics:
            raise ValueError(f"{analysis.path}: transformed preprocessor structure is unbalanced")
        originals[analysis.path] = original
        transformed[analysis.path] = rendered

    return originals, transformed, version_groups


def restore_files(repo: Path, originals: dict[str, bytes]) -> None:
    for relative, data in originals.items():
        (repo / relative).write_bytes(data)


def make_audit(
    baseline: str,
    branch: str,
    plan_path: Path,
    plan_hash: str,
    analyser_hash: str,
    applier_hash: str,
    invocation: str,
    originals: dict[str, bytes],
    transformed: dict[str, bytes],
    version_groups: list[analyser.Group],
    diff_hash: str,
    diff_size: int,
) -> str:
    effective = collections.Counter(group.effective_action for group in version_groups)
    output = [
        "# ESP32 IDF5 Consolidation POC Automated Application Audit",
        "",
        "**Outcome: PASS.** The accepted Section 7.3 plan was reproduced exactly and its planned source "
        "transformation was applied without manual correction.",
        "",
        "## Authority and fixed inputs",
        "",
        "- Simon authorized progression to Section 7.4 after reviewing the dry-run report in the Codex thread.",
        f"- Espruino branch: `{branch}`",
        f"- Baseline commit: `{baseline}`",
        f"- Accepted plan: `{plan_path.as_posix()}`",
        f"- Accepted plan SHA-256: `{plan_hash}`",
        f"- Analysis transformer SHA-256: `{analyser_hash}`",
        f"- Application tool version: `{TOOL_VERSION}`",
        f"- Application tool SHA-256: `{applier_hash}`",
        "- Application gate: a fresh analysis report matched the accepted plan byte for byte before any source write.",
        "",
        "Exact invocation from the harness repository root:",
        "",
        "```bash",
        invocation,
        "```",
        "",
        "## Applied result",
        "",
        "| Measure | Result |",
        "|---|---:|",
        f"| Files changed | {len(transformed)} |",
        f"| Version-dependent groups accounted for | {len(version_groups)} |",
        f"| Effective selected branches unwrapped | {effective['unwrap-selected-branch']} |",
        f"| Effective false groups removed | {effective['remove-group']} |",
        f"| Effective mixed guards simplified | {effective['simplify-guard']} |",
        f"| Nested groups removed with an enclosing branch | {effective['removed-with-enclosing-branch']} |",
        f"| Remaining `ESP_IDF_VERSION_MAJOR` occurrences in C/header source | 0 |",
        f"| Unchanged makefile definitions | 2 |",
        f"| Generated diff size | {diff_size} bytes |",
        f"| Generated diff SHA-256 | `{diff_hash}` |",
        "| Manual source corrections | 0 |",
        "",
        "## Changed files",
        "",
        "| File | Before SHA-256 | After SHA-256 |",
        "|---|---|---|",
    ]
    for relative in sorted(transformed):
        output.append(
            f"| `{relative}` | `{sha256_bytes(originals[relative])}` | "
            f"`{sha256_bytes(transformed[relative])}` |"
        )
    output.extend(
        [
            "",
            "## Separation boundary",
            "",
            "The Espruino worktree contains only the automated output represented by the retained diff. No manual "
            "firmware-source edit has been made. Any later correction must follow Section 4.8 and Section 7.5 of "
            "the specification.",
            "",
        ]
    )
    return "\n".join(output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--expected-branch", required=True)
    parser.add_argument("--expected-commit", required=True)
    parser.add_argument("--major", type=int, default=5)
    parser.add_argument("--accepted-plan", required=True, type=Path)
    parser.add_argument("--accepted-plan-sha256", required=True)
    parser.add_argument("--audit-output", required=True, type=Path)
    parser.add_argument("--diff-output", required=True, type=Path)
    parser.add_argument("--invocation", help="canonical invocation to record in the audit")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo = args.repo.resolve()
    if args.major != 5:
        print("error: this POC application accepts only --major 5", file=sys.stderr)
        return 2

    head = analyser.git(repo, "rev-parse", "HEAD").stdout.decode().strip()
    branch = analyser.git(repo, "branch", "--show-current").stdout.decode().strip()
    status_before = analyser.git(
        repo, "status", "--porcelain=v1", "--untracked-files=all"
    ).stdout.decode().strip()
    if head != args.expected_commit:
        print(f"error: HEAD {head} does not match expected baseline {args.expected_commit}", file=sys.stderr)
        return 2
    if branch != args.expected_branch:
        print(f"error: branch {branch} does not match expected branch {args.expected_branch}", file=sys.stderr)
        return 2
    if status_before:
        print("error: Espruino worktree is not clean; refusing application", file=sys.stderr)
        return 2

    plan_bytes = args.accepted_plan.read_bytes()
    plan_hash = sha256_bytes(plan_bytes)
    if plan_hash != args.accepted_plan_sha256:
        print(
            f"error: accepted plan SHA-256 {plan_hash} does not match supplied gate "
            f"{args.accepted_plan_sha256}",
            file=sys.stderr,
        )
        return 2
    plan_text = plan_bytes.decode("utf-8")
    dry_run_invocation = extract_dry_run_invocation(plan_text)
    analyser_path = Path(analyser.__file__).resolve()
    analyser_hash = sha256_bytes(analyser_path.read_bytes())

    tracked, analyses, occurrences = scan_repository(repo, args.major)
    reproduced = analyser.make_report(
        head,
        branch,
        len(tracked),
        args.major,
        dry_run_invocation,
        analyses,
        occurrences,
        status_before,
        status_before,
        analyser_hash,
    ).encode("utf-8")
    if reproduced != plan_bytes:
        print(
            "error: fresh analysis does not reproduce the accepted plan byte for byte; refusing application",
            file=sys.stderr,
        )
        return 2

    try:
        originals, transformed, version_groups = prepare_transformations(repo, analyses)
    except ValueError as error:
        print(f"error: {error}; refusing application", file=sys.stderr)
        return 2

    expected_paths = sorted(transformed)
    try:
        for relative in expected_paths:
            (repo / relative).write_bytes(transformed[relative])

        changed_raw = analyser.git(repo, "diff", "--name-only", "-z").stdout
        changed_paths = sorted(item.decode() for item in changed_raw.split(b"\0") if item)
        if changed_paths != expected_paths:
            raise RuntimeError(
                f"changed paths do not match plan: expected {expected_paths}, found {changed_paths}"
            )
        diff_check = analyser.git(repo, "diff", "--check", check=False)
        if diff_check.returncode:
            raise RuntimeError(diff_check.stdout.decode() or diff_check.stderr.decode())

        _, post_analyses, post_occurrences = scan_repository(repo, args.major)
        remaining_source = [
            item for item in post_occurrences if item.category != "non-source reference"
        ]
        remaining_non_source = [
            item for item in post_occurrences if item.category == "non-source reference"
        ]
        if remaining_source:
            raise RuntimeError(f"{len(remaining_source)} source version-macro occurrences remain")
        if len(remaining_non_source) != 2:
            raise RuntimeError(
                f"expected two retained non-source definitions, found {len(remaining_non_source)}"
            )
        post_diagnostics = [
            diagnostic for analysis in post_analyses for diagnostic in analysis.diagnostics
        ]
        if post_diagnostics:
            raise RuntimeError("transformed source contains an unbalanced conditional structure")

        diff_bytes = analyser.git(repo, "diff", "--binary", "--no-ext-diff").stdout
        if not diff_bytes:
            raise RuntimeError("application produced an empty source diff")
    except Exception as error:
        restore_files(repo, originals)
        print(f"error: application rolled back: {error}", file=sys.stderr)
        return 2

    if args.invocation:
        invocation = args.invocation
    else:
        invocation_parts = [
            "python3",
            os.fspath(Path(__file__).resolve()),
            "--repo",
            os.fspath(args.repo),
            "--expected-branch",
            args.expected_branch,
            "--expected-commit",
            args.expected_commit,
            "--major",
            str(args.major),
            "--accepted-plan",
            os.fspath(args.accepted_plan),
            "--accepted-plan-sha256",
            args.accepted_plan_sha256,
            "--audit-output",
            os.fspath(args.audit_output),
            "--diff-output",
            os.fspath(args.diff_output),
        ]
        invocation = " ".join(shlex.quote(part) for part in invocation_parts)

    applier_hash = sha256_bytes(Path(__file__).resolve().read_bytes())
    diff_hash = sha256_bytes(diff_bytes)
    audit = make_audit(
        head,
        branch,
        args.accepted_plan,
        plan_hash,
        analyser_hash,
        applier_hash,
        invocation,
        originals,
        transformed,
        version_groups,
        diff_hash,
        len(diff_bytes),
    )
    args.diff_output.parent.mkdir(parents=True, exist_ok=True)
    args.audit_output.parent.mkdir(parents=True, exist_ok=True)
    args.diff_output.write_bytes(diff_bytes)
    args.audit_output.write_text(audit, encoding="utf-8", newline="\n")
    print(
        f"applied {len(version_groups)} planned groups across {len(transformed)} files; "
        f"diff SHA-256 {diff_hash}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
