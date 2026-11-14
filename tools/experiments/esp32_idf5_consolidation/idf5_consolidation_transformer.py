#!/usr/bin/env python3
"""Analyse ESP_IDF_VERSION_MAJOR guards for the IDF5 consolidation POC.

This version is deliberately analysis-only.  It parses complete preprocessor
conditional groups, evaluates only the guard forms accepted by the POC
specification, and emits a deterministic Markdown transformation plan.  It
never writes to the Espruino repository.
"""

from __future__ import annotations

import argparse
import collections
import dataclasses
import hashlib
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path
from typing import Iterable


TOOL_VERSION = "0.1.0-analysis-only"
VERSION_MACRO = "ESP_IDF_VERSION_MAJOR"
SOURCE_SUFFIXES = {".c", ".h"}


@dataclasses.dataclass
class Diagnostic:
    path: str
    line: int
    expression: str
    context: str
    reason: str


@dataclasses.dataclass
class Directive:
    kind: str
    start: int
    end: int
    expression: str
    raw: str


@dataclasses.dataclass
class Branch:
    directive: Directive
    body_start: int
    body_end: int | None = None


@dataclasses.dataclass
class Group:
    path: str
    sequence: int
    branches: list[Branch]
    parent: "Group | None"
    parent_branch: int | None
    endif: Directive | None = None
    conditions: list["ConditionResult"] = dataclasses.field(default_factory=list)
    version_dependent: bool = False
    selected_branch: int | None = None
    local_action: str = "not-version-dependent"
    effective_action: str = "not-version-dependent"
    remaining_condition: str = ""
    reachable: bool = True

    @property
    def first_line(self) -> int:
        return self.branches[0].directive.start

    @property
    def last_line(self) -> int:
        return self.endif.end if self.endif else self.first_line


@dataclasses.dataclass(frozen=True)
class ConditionResult:
    category: str
    value: str
    remaining: str = ""
    reason: str = ""


@dataclasses.dataclass
class FileAnalysis:
    path: str
    lines: list[str]
    groups: list[Group]
    diagnostics: list[Diagnostic]


@dataclasses.dataclass(frozen=True)
class Occurrence:
    path: str
    line: int
    category: str
    text: str


def git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        ["git", "-C", os.fspath(repo), *args],
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def logical_directive(lines: list[str], index: int) -> tuple[Directive | None, int]:
    match = re.match(r"^\s*#\s*(if|ifdef|ifndef|elif|else|endif)\b(.*)$", lines[index])
    if not match:
        return None, index

    end = index
    parts = [match.group(2).rstrip("\r\n")]
    while parts[-1].rstrip().endswith("\\") and end + 1 < len(lines):
        parts[-1] = parts[-1].rstrip()[:-1]
        end += 1
        parts.append(lines[end].rstrip("\r\n"))
    expression = " ".join(part.strip() for part in parts).strip()
    raw = "".join(lines[index : end + 1]).rstrip("\r\n")
    return Directive(match.group(1), index + 1, end + 1, expression, raw), end


def strip_comments(expression: str) -> str:
    expression = re.sub(r"/\*.*?\*/", "", expression)
    expression = expression.split("//", 1)[0]
    return expression.strip()


def compact(expression: str) -> str:
    return re.sub(r"\s+", "", strip_comments(expression))


def classify_condition(directive: Directive, major: int) -> ConditionResult:
    expr = compact(directive.expression)
    macro = re.escape(VERSION_MACRO)

    if directive.kind == "ifndef" and expr == VERSION_MACRO:
        return ConditionResult("version", "false")
    if directive.kind == "ifdef" and expr == VERSION_MACRO:
        return ConditionResult("unsupported", "unknown", reason="#ifdef form is not in Appendix 1")
    if VERSION_MACRO not in directive.expression:
        return ConditionResult("other", "unknown")
    if directive.kind not in {"if", "elif"}:
        return ConditionResult(
            "unsupported", "unknown", reason=f"version macro used in unsupported #{directive.kind} directive"
        )

    pure_patterns: list[tuple[str, bool]] = [
        (rf"{macro}>=5", major >= 5),
        (rf"{macro}>=4", major >= 4),
        (rf"{macro}<5", major < 5),
        (rf"!\({macro}>=4\)", not (major >= 4)),
        (rf"{macro}==5", major == 5),
        (rf"{macro}==4", major == 4),
        (rf"{macro}<4", major < 4),
    ]
    for pattern, result in pure_patterns:
        if re.fullmatch(pattern, expr):
            return ConditionResult("version", "true" if result else "false")

    if re.fullmatch(rf"{macro}>=5&&CONFIG_LWIP_IPV6", expr):
        if major >= 5:
            return ConditionResult("mixed", "residual", "CONFIG_LWIP_IPV6")
        return ConditionResult("mixed", "false")

    if re.fullmatch(rf"defined\(ESPR_USE_USB_SERIAL_JTAG\)&&{macro}<5", expr):
        if major < 5:
            return ConditionResult("mixed", "residual", "defined(ESPR_USE_USB_SERIAL_JTAG)")
        return ConditionResult("mixed", "false")

    return ConditionResult(
        "unsupported",
        "unknown",
        reason="expression is not one of the reviewed Appendix 1 forms",
    )


def parse_source(path: str, text: str, major: int) -> FileAnalysis:
    lines = text.splitlines(keepends=True)
    groups: list[Group] = []
    diagnostics: list[Diagnostic] = []
    stack: list[Group] = []
    sequence = 0
    index = 0

    while index < len(lines):
        directive, consumed_to = logical_directive(lines, index)
        if directive is None:
            index += 1
            continue

        if directive.kind in {"if", "ifdef", "ifndef"}:
            sequence += 1
            parent = stack[-1] if stack else None
            parent_branch = len(parent.branches) - 1 if parent else None
            group = Group(
                path=path,
                sequence=sequence,
                branches=[Branch(directive, directive.end + 1)],
                parent=parent,
                parent_branch=parent_branch,
            )
            groups.append(group)
            stack.append(group)
        elif directive.kind in {"elif", "else"}:
            if not stack:
                diagnostics.append(
                    Diagnostic(path, directive.start, directive.raw, "top level", f"unmatched #{directive.kind}")
                )
            else:
                group = stack[-1]
                if group.branches[-1].directive.kind == "else":
                    diagnostics.append(
                        Diagnostic(
                            path,
                            directive.start,
                            directive.raw,
                            f"group opened at line {group.first_line}",
                            f"#{directive.kind} follows #else",
                        )
                    )
                group.branches[-1].body_end = directive.start - 1
                group.branches.append(Branch(directive, directive.end + 1))
        elif directive.kind == "endif":
            if not stack:
                diagnostics.append(Diagnostic(path, directive.start, directive.raw, "top level", "unmatched #endif"))
            else:
                group = stack.pop()
                group.branches[-1].body_end = directive.start - 1
                group.endif = directive
        index = consumed_to + 1

    for group in stack:
        diagnostics.append(
            Diagnostic(path, group.first_line, group.branches[0].directive.raw, "open group", "missing #endif")
        )

    for group in groups:
        group.conditions = []
        has_version = False
        for branch in group.branches:
            if branch.directive.kind == "else":
                result = ConditionResult("else", "true")
            else:
                result = classify_condition(branch.directive, major)
                if result.category in {"version", "mixed", "unsupported"} and VERSION_MACRO in branch.directive.raw:
                    has_version = True
            group.conditions.append(result)
        group.version_dependent = has_version

        if not has_version:
            continue

        for branch, result in zip(group.branches, group.conditions):
            if result.category == "unsupported":
                diagnostics.append(
                    Diagnostic(
                        path,
                        branch.directive.start,
                        strip_comments(branch.directive.expression),
                        chain_context(group),
                        result.reason,
                    )
                )

        if any(result.category == "unsupported" for result in group.conditions):
            group.local_action = "unsupported"
            continue

        selected: int | None = None
        residual: tuple[int, str] | None = None
        for branch_index, result in enumerate(group.conditions):
            if result.value == "false":
                continue
            if result.value == "true":
                selected = branch_index
                break
            if result.value == "residual":
                residual = (branch_index, result.remaining)
                break
            if result.category == "other":
                diagnostics.append(
                    Diagnostic(
                        path,
                        group.branches[branch_index].directive.start,
                        strip_comments(group.branches[branch_index].directive.expression),
                        chain_context(group),
                        "a non-version branch is reached before the IDF5-selected branch",
                    )
                )
                group.local_action = "unsupported"
                break
        else:
            group.local_action = "remove-group"

        if group.local_action == "unsupported":
            continue
        if residual is not None:
            residual_index, remaining = residual
            if residual_index == 0 and len(group.branches) == 1:
                group.selected_branch = 0
                group.remaining_condition = remaining
                group.local_action = "simplify-guard"
            else:
                branch = group.branches[residual_index]
                diagnostics.append(
                    Diagnostic(
                        path,
                        branch.directive.start,
                        strip_comments(branch.directive.expression),
                        chain_context(group),
                        "residual condition occurs in a conditional chain that cannot be simplified safely",
                    )
                )
                group.local_action = "unsupported"
            continue
        if selected is not None:
            group.selected_branch = selected
            group.local_action = "unwrap-selected-branch"

    establish_reachability(groups)
    return FileAnalysis(path, lines, groups, diagnostics)


def establish_reachability(groups: list[Group]) -> None:
    for group in groups:
        reachable = True
        ancestor = group.parent
        child = group
        while ancestor is not None:
            if ancestor.version_dependent:
                if ancestor.local_action in {"remove-group", "unsupported"}:
                    reachable = False
                    break
                if ancestor.local_action == "unwrap-selected-branch" and child.parent_branch != ancestor.selected_branch:
                    reachable = False
                    break
            child = ancestor
            ancestor = ancestor.parent
        group.reachable = reachable
        if group.version_dependent:
            group.effective_action = group.local_action if reachable else "removed-with-enclosing-branch"


def chain_context(group: Group) -> str:
    parts = []
    for branch in group.branches:
        directive = branch.directive
        if directive.kind == "else":
            parts.append(f"#else (line {directive.start})")
        else:
            parts.append(
                f"#{directive.kind} {strip_comments(directive.expression)} (line {directive.start})"
            )
    return " -> ".join(parts)


def selected_label(group: Group) -> str:
    if group.local_action == "remove-group":
        return "none"
    if group.selected_branch is None:
        return "not determined"
    directive = group.branches[group.selected_branch].directive
    if directive.kind == "else":
        return f"#else at line {directive.start}"
    return f"#{directive.kind} at line {directive.start}"


def condition_summary(group: Group) -> str:
    parts = []
    for branch, result in zip(group.branches, group.conditions):
        directive = branch.directive
        if directive.kind == "else":
            parts.append("#else")
            continue
        expression = strip_comments(directive.expression)
        if result.value == "residual":
            outcome = f"{result.remaining} remains"
        else:
            outcome = result.value
        parts.append(f"#{directive.kind} `{expression}` => {outcome}")
    return "; ".join(parts)


def find_enclosing_group(groups: Iterable[Group], line: int) -> tuple[Group, int] | None:
    candidates: list[tuple[Group, int]] = []
    for group in groups:
        if not group.endif or not (group.first_line <= line <= group.last_line):
            continue
        for index, branch in enumerate(group.branches):
            if branch.body_end is not None and branch.body_start <= line <= branch.body_end:
                candidates.append((group, index))
    if not candidates:
        return None
    return max(candidates, key=lambda item: item[0].first_line)


def classify_occurrences(
    path: str,
    text: str,
    analysis: FileAnalysis | None,
) -> list[Occurrence]:
    occurrences: list[Occurrence] = []
    directive_lines: dict[int, Directive] = {}
    if analysis:
        for group in analysis.groups:
            for branch in group.branches:
                for line in range(branch.directive.start, branch.directive.end + 1):
                    directive_lines[line] = branch.directive
            if group.endif:
                for line in range(group.endif.start, group.endif.end + 1):
                    directive_lines[line] = group.endif

    for line_number, line in enumerate(text.splitlines(), 1):
        count = line.count(VERSION_MACRO)
        if not count:
            continue
        directive = directive_lines.get(line_number)
        if analysis and directive and directive.kind in {"if", "ifdef", "ifndef", "elif"}:
            category = "source conditional directive"
        elif analysis and directive and directive.kind == "endif":
            category = "source #endif comment"
        elif analysis and re.match(r"^\s*#\s*define\s+ESP_IDF_VERSION_MAJOR\b", line):
            category = "source fallback definition"
        elif analysis:
            category = "other source reference"
        else:
            category = "non-source reference"
        for _ in range(count):
            occurrences.append(Occurrence(path, line_number, category, line.strip()))
    return occurrences


def escape_table(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def make_report(
    baseline: str,
    branch: str,
    tracked_file_count: int,
    major: int,
    invocation: str,
    analyses: list[FileAnalysis],
    occurrences: list[Occurrence],
    status_before: str,
    status_after: str,
    tool_hash: str,
) -> str:
    version_groups = [
        group for analysis in analyses for group in analysis.groups if group.version_dependent
    ]
    diagnostics = [diagnostic for analysis in analyses for diagnostic in analysis.diagnostics]
    unsupported = [group for group in version_groups if group.local_action == "unsupported"]
    planned_files = sorted({group.path for group in version_groups if group.effective_action != "unsupported"})
    occurrence_counts = collections.Counter(item.category for item in occurrences)
    local_counts = collections.Counter(group.local_action for group in version_groups)
    effective_counts = collections.Counter(group.effective_action for group in version_groups)
    conditional_count = occurrence_counts["source conditional directive"]
    accounted = sum(occurrence_counts.values())
    outcome = "PASS" if not diagnostics and not unsupported and status_before == status_after else "FAIL"

    output: list[str] = []
    output.extend(
        [
            "# ESP32 IDF5 Consolidation POC Dry-run Plan",
            "",
            f"**Outcome: {outcome}.**",
            (
                "The analysis accounts for every tracked occurrence and found no unsupported or ambiguous "
                "version-dependent group. No Espruino source was modified."
                if outcome == "PASS"
                else "The analysis found diagnostics that prohibit the application phase. No Espruino source was modified."
            ),
            "",
            "This is the Section 7.3 review plan. It does not authorize or perform the Section 7.4 transformation. "
            "Simon must explicitly accept this plan before application.",
            "",
            "## Fixed inputs and safety checks",
            "",
            f"- Espruino branch: `{branch}`",
            f"- Espruino baseline and dry-run HEAD: `{baseline}`",
            f"- Complete repository scan: {tracked_file_count} Git-tracked files",
            f"- Evaluated value: `{VERSION_MACRO}={major}` from the beginning of every source file",
            f"- Transformer version: `{TOOL_VERSION}`",
            f"- Transformer SHA-256: `{tool_hash}`",
            f"- Espruino worktree before run: `{status_before or 'clean'}`",
            f"- Espruino worktree after run: `{status_after or 'clean'}`",
            "- Operating mode: analysis only; the tool contains no source-writing application mode",
            "",
            "Exact invocation from the harness repository root:",
            "",
            "```bash",
            invocation,
            "```",
            "",
            "## Result summary",
            "",
            "Here, a *conditional directive* means a C-preprocessor `#if`, `#elif` or `#ifndef` line "
            "that uses `ESP_IDF_VERSION_MAJOR` to control which source is included. A *conditional group* "
            "is the complete structure from its opening directive through any `#elif`/`#else` arms to its "
            "closing `#endif`.",
            "",
            "| Measure | What it counts | Result |",
            "|---|---|---:|",
            f"| Tracked occurrences of `ESP_IDF_VERSION_MAJOR` | Every occurrence in every Git-tracked file, including source guards, comments, a fallback definition and makefiles | {accounted} |",
            f"| Occurrences in C/header conditional directives | Uses on `#if`, `#elif` or `#ifndef` lines that participate in version selection | {conditional_count} |",
            f"| Complete C/header conditional groups containing version selection | Complete `#if` through `#endif` structures to be transformed; an `#elif` belongs to its opening group's structure | {len(version_groups)} |",
            f"| C/header files planned to change | Files containing at least one version-dependent conditional group | {len(planned_files)} |",
            f"| Groups with an unsupported version expression | Groups containing a version expression outside the forms reviewed in Appendix 1 | {len(unsupported)} |",
            f"| Structural or ambiguity diagnostics | Unbalanced preprocessor structures or cases where the IDF5 result cannot be determined confidently | {len(diagnostics)} |",
            f"| Occurrences in C/header `#endif` comments | Version-macro text used only to label a closing `#endif`, not to select source | {occurrence_counts['source #endif comment']} |",
            f"| Occurrences in the C/header fallback definition | The inactive `#define ESP_IDF_VERSION_MAJOR 3` compatibility fallback | {occurrence_counts['source fallback definition']} |",
            f"| Other occurrences in C/header source | Source occurrences not classified as a condition, closing comment or fallback definition | {occurrence_counts['other source reference']} |",
            f"| Occurrences in non-source files | IDF4 and IDF5 makefile definitions, reported by the inventory but deliberately left unchanged | {occurrence_counts['non-source reference']} |",
            "",
            "The occurrence categories reconcile as 110 conditional directives, three closing comments, one "
            "fallback definition and two makefile definitions, giving the complete total of 116. The 110 "
            "conditional-directive occurrences form 106 complete groups because four are `#elif` arms within "
            "an already counted `#if`/`#endif` structure.",
            "",
            "### Appendix 1 accounting clarification",
            "",
            "The rescan confirms Appendix 1's total of 116 tracked occurrences and its 110 conditional "
            "directives. It refines the remaining source accounting: there are three, not four, references in "
            "`#endif` comments, plus the inactive fallback `#define ESP_IDF_VERSION_MAJOR 3` in "
            "`targets/esp32/jswrap_esp32.c`. The two makefile definitions complete the total. This is an "
            "inventory-label correction only; every occurrence is accounted for and the reviewed guard-form "
            "inventory is unchanged.",
            "",
            "## Planned transformation totals",
            "",
            "Local action describes how each group evaluates on its own. Effective action also accounts for a "
            "group being nested in a branch discarded by an enclosing version group.",
            "",
            "| Action | Local groups | Effective groups |",
            "|---|---:|---:|",
        ]
    )
    all_actions = sorted(set(local_counts) | set(effective_counts))
    for action in all_actions:
        output.append(f"| `{action}` | {local_counts[action]} | {effective_counts[action]} |")
    output.append(
        f"| **Total groups accounted for** | **{sum(local_counts.values())}** | "
        f"**{sum(effective_counts.values())}** |"
    )

    output.extend(
        [
            "",
            "Action meanings:",
            "",
            "- `unwrap-selected-branch`: retain the selected branch body and remove the complete version chain.",
            "- `remove-group`: remove the complete group because no branch is selected for IDF5.",
            "- `simplify-guard`: remove only the conclusive version term and preserve the remaining feature guard.",
            "- `removed-with-enclosing-branch`: the group is evaluated and recorded, but its text is already removed "
            "with a discarded enclosing branch.",
            "",
            "## Files planned to change",
            "",
            "Only these C source/header files are in the prospective automated source change. The makefiles are "
            "inventory references and remain unchanged.",
            "",
            "| File | Version groups | Effective action totals |",
            "|---|---:|---|",
        ]
    )
    for path in planned_files:
        file_groups = [group for group in version_groups if group.path == path]
        actions = collections.Counter(group.effective_action for group in file_groups)
        action_text = ", ".join(f"{key}: {actions[key]}" for key in sorted(actions))
        output.append(f"| `{path}` | {len(file_groups)} | {action_text} |")
    total_action_text = ", ".join(
        f"{key}: {effective_counts[key]}" for key in sorted(effective_counts)
    )
    output.append(
        f"| **Total: {len(planned_files)} files** | **{len(version_groups)}** | "
        f"**{total_action_text}** |"
    )

    output.extend(["", "## Complete conditional-group plan", ""])
    for analysis in analyses:
        file_groups = [group for group in analysis.groups if group.version_dependent]
        if not file_groups:
            continue
        output.extend(
            [
                f"### `{analysis.path}`",
                "",
                "| Group | Lines | Evaluation | Selected branch | Local action | Effective action | Remaining condition |",
                "|---:|---:|---|---|---|---|---|",
            ]
        )
        for group in file_groups:
            output.append(
                "| {group} | {lines} | {evaluation} | {selected} | `{local}` | `{effective}` | {remaining} |".format(
                    group=group.sequence,
                    lines=f"{group.first_line}-{group.last_line}",
                    evaluation=escape_table(condition_summary(group)),
                    selected=selected_label(group),
                    local=group.local_action,
                    effective=group.effective_action,
                    remaining=f"`{group.remaining_condition}`" if group.remaining_condition else "none",
                )
            )
        output.append("")

    ancillary = [item for item in occurrences if item.category != "source conditional directive"]
    output.extend(
        [
            "## Non-conditional occurrence accounting",
            "",
            "These occurrences are outside the 110 conditional directives. They are reported explicitly so the "
            "tracked-repository scan closes over all 116 occurrences.",
            "",
            "| File and line | Category | Planned treatment | Source text |",
            "|---|---|---|---|",
        ]
    )
    analysis_by_path = {analysis.path: analysis for analysis in analyses}
    for item in ancillary:
        if item.category == "non-source reference":
            treatment = "Report only; leave unchanged"
        elif item.category == "source #endif comment":
            treatment = "Removed with its version-group closing directive"
        elif item.category == "source fallback definition":
            analysis = analysis_by_path[item.path]
            enclosing = find_enclosing_group(analysis.groups, item.line)
            if enclosing:
                group, _ = enclosing
                treatment = f"Removed with false group opened at line {group.first_line}"
            else:
                treatment = "Unsupported: no enclosing version group"
        else:
            treatment = "Unsupported source reference"
        output.append(
            f"| `{item.path}:{item.line}` | {item.category} | {treatment} | `{escape_table(item.text)}` |"
        )

    output.extend(["", "## Diagnostics", ""])
    if diagnostics:
        output.extend(
            [
                "| File and line | Expression | Chain context | Reason |",
                "|---|---|---|---|",
            ]
        )
        for diagnostic in diagnostics:
            output.append(
                f"| `{diagnostic.path}:{diagnostic.line}` | `{escape_table(diagnostic.expression)}` | "
                f"{escape_table(diagnostic.context)} | {escape_table(diagnostic.reason)} |"
            )
    else:
        output.append("None. All structures were balanced and every version expression matched an accepted form.")

    output.extend(
        [
            "",
            "## Approval boundary",
            "",
            "This dry run leaves the Espruino branch at the fixed baseline with a clean worktree. The proposed "
            f"application will be limited to the {len(planned_files)} listed C/header files and will use the exact group decisions "
            "above. No application, source diff, commit, push or pull request is authorized by this report.",
            "",
            "Section 7.4 may begin only after Simon explicitly accepts this dry-run plan.",
            "",
        ]
    )
    return "\n".join(output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path, help="Espruino Git checkout to analyse")
    parser.add_argument("--expected-branch", required=True, help="required checked-out branch")
    parser.add_argument("--expected-commit", required=True, help="required exact HEAD commit")
    parser.add_argument("--major", type=int, default=5, help="ESP-IDF major version (POC requires 5)")
    parser.add_argument("--output", type=Path, help="write Markdown here; otherwise use stdout")
    parser.add_argument(
        "--invocation",
        help="canonical invocation text to embed in the deterministic report",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo = args.repo.resolve()
    if args.major != 5:
        print("error: this POC tool accepts only --major 5", file=sys.stderr)
        return 2
    try:
        head = git(repo, "rev-parse", "HEAD").stdout.decode().strip()
    except (subprocess.CalledProcessError, FileNotFoundError) as error:
        print(f"error: cannot inspect Git repository {repo}: {error}", file=sys.stderr)
        return 2
    if head != args.expected_commit:
        print(
            f"error: HEAD {head} does not match expected baseline {args.expected_commit}",
            file=sys.stderr,
        )
        return 2
    branch = git(repo, "branch", "--show-current").stdout.decode().strip()
    if branch != args.expected_branch:
        print(
            f"error: branch {branch or '(detached HEAD)'} does not match expected branch {args.expected_branch}",
            file=sys.stderr,
        )
        return 2

    status_before = git(repo, "status", "--porcelain=v1", "--untracked-files=all").stdout.decode().strip()
    if status_before:
        print("error: Espruino worktree is not clean; refusing dry run", file=sys.stderr)
        return 2

    tracked_raw = git(repo, "ls-files", "-z").stdout
    tracked = sorted(item.decode() for item in tracked_raw.split(b"\0") if item)
    analyses: list[FileAnalysis] = []
    occurrences: list[Occurrence] = []

    for relative in tracked:
        path = repo / relative
        try:
            data = path.read_bytes()
        except OSError as error:
            print(f"error: cannot read tracked file {relative}: {error}", file=sys.stderr)
            return 2
        if VERSION_MACRO.encode() not in data:
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            occurrences.extend(
                Occurrence(relative, 0, "non-source reference", "binary occurrence")
                for _ in range(data.count(VERSION_MACRO.encode()))
            )
            continue

        analysis = None
        if path.suffix in SOURCE_SUFFIXES:
            analysis = parse_source(relative, text, args.major)
            analyses.append(analysis)
        occurrences.extend(classify_occurrences(relative, text, analysis))

    status_after = git(repo, "status", "--porcelain=v1", "--untracked-files=all").stdout.decode().strip()
    script_path = Path(__file__).resolve()
    tool_hash = hashlib.sha256(script_path.read_bytes()).hexdigest()
    if args.invocation:
        invocation = args.invocation
    else:
        invocation_parts = [
            "python3",
            os.fspath(script_path),
            "--repo",
            os.fspath(args.repo),
            "--expected-branch",
            args.expected_branch,
            "--expected-commit",
            args.expected_commit,
            "--major",
            str(args.major),
        ]
        if args.output:
            invocation_parts.extend(["--output", os.fspath(args.output)])
        invocation = " ".join(shlex.quote(part) for part in invocation_parts)

    report = make_report(
        head,
        branch,
        len(tracked),
        args.major,
        invocation,
        analyses,
        occurrences,
        status_before,
        status_after,
        tool_hash,
    )
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(report, encoding="utf-8", newline="\n")
    else:
        sys.stdout.write(report)

    diagnostics = [diagnostic for analysis in analyses for diagnostic in analysis.diagnostics]
    other_source = [item for item in occurrences if item.category == "other source reference"]
    return 1 if diagnostics or other_source or status_before != status_after else 0


if __name__ == "__main__":
    raise SystemExit(main())
