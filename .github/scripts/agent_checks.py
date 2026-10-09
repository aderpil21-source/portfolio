#!/usr/bin/env python3
"""Deterministic gates for PR-scoped, AI-produced edits; no external dependencies."""
import argparse
import json
import pathlib
import subprocess
import sys

MAX_FILES = 8
MAX_BYTES = 128 * 1024
MAX_TOTAL = 256 * 1024

def safe_path(raw):
    if not isinstance(raw, str) or not raw or len(raw) > 180 or "\\" in raw or "\x00" in raw:
        return False
    p = pathlib.PurePosixPath(raw)
    if p.is_absolute() or any(part in ("", ".", "..") or part.startswith(".") for part in p.parts):
        return False
    if raw.startswith(("node_modules/", "lead-api/", "vendor/", "dist/", "build/")):
        return False
    if raw in ("package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "index.html"):
        return False
    return p.suffix.lower() in {".html", ".css", ".js", ".ts", ".tsx", ".jsx", ".md", ".svg", ".json"}

def validate_task(task):
    if not isinstance(task, dict):
        raise ValueError("Task must be a JSON object")
    instructions = task.get("instructions")
    allowed = task.get("allowed_paths")
    if not isinstance(instructions, str) or not 5 <= len(instructions) <= 1200:
        raise ValueError("Invalid instructions length")
    if not isinstance(allowed, list) or not 1 <= len(allowed) <= MAX_FILES:
        raise ValueError("Task requires 1 to 8 allowed paths")
    if len(set(allowed)) != len(allowed) or not all(safe_path(p) for p in allowed):
        raise ValueError("Unsafe or duplicate task path")
    if task.get("apply_to_branch") is not True:
        raise ValueError("Explicit apply_to_branch=true required")
    attempts = task.get("max_attempts", 1)
    if type(attempts) is not int or attempts not in (1, 2):
        raise ValueError("max_attempts must be 1 or 2")
    return task

def git(*args):
    return subprocess.run(["git", *args], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout

def changed_paths():
    # Covers modified, deleted and untracked files without parsing porcelain rename records.
    items = git("ls-files", "-m", "-o", "-d", "--exclude-standard", "-z").decode("utf-8").split("\x00")
    return sorted(set(x for x in items if x))

def verify(root, task, patch_dest):
    allowed = set(task["allowed_paths"])
    changed = changed_paths()
    if not changed:
        raise ValueError("AI produced no file changes")
    if len(changed) > MAX_FILES or not set(changed).issubset(allowed):
        raise ValueError("AI changed paths outside task allowlist: " + repr(changed))
    total = 0
    for name in changed:
        p = (root / name)
        if not p.is_file() or p.is_symlink() or any(parent.is_symlink() for parent in p.parents if parent != root):
            raise ValueError("Deleted, symlinked or missing file: " + name)
        n = p.stat().st_size
        if n > MAX_BYTES:
            raise ValueError("File exceeds size limit: " + name)
        total += n
    if total > MAX_TOTAL:
        raise ValueError("Patch exceeds total size limit")
    # git add -N includes created files in diff without staging their contents.
    untracked = set(git("ls-files", "-o", "--exclude-standard", "-z").decode().split("\x00"))
    for name in changed:
        if name in untracked:
            git("add", "-N", "--", name)
    git("diff", "--check")
    for name in changed:
        suffix = pathlib.PurePosixPath(name).suffix.lower()
        if suffix in (".js",):
            subprocess.run(["node", "--check", name], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    patch = git("diff", "--binary", "--", *changed)
    if not patch.strip():
        raise ValueError("Git diff is empty")
    if len(patch) > MAX_TOTAL * 2:
        raise ValueError("Patch artifact too large")
    pathlib.Path(patch_dest).write_bytes(patch)
    evidence = {"decision": "VERIFY", "tests": "git diff --check; node --check for JS",
                "diff_paths": changed, "scope_verified": True, "patch_bytes": len(patch),
                "completion": "pending independent review; no claim that behavior is verified"}
    return evidence

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--task", required=True)
    ap.add_argument("--patch", required=True)
    ap.add_argument("--evidence", required=True)
    args = ap.parse_args()
    task = validate_task(json.loads(pathlib.Path(args.task).read_text()))
    root = pathlib.Path.cwd().resolve()
    evidence = verify(root, task, args.patch)
    pathlib.Path(args.evidence).write_text(json.dumps(evidence, indent=2) + "\n")
    print(json.dumps(evidence))

if __name__ == "__main__":
    main()
