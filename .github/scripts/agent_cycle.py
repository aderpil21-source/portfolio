#!/usr/bin/env python3
"""Bounded Copilot coding cycle: implement -> deterministic verify -> decide.

Default: one Copilot request, no external paid APIs, no git push, no auto-merge.
The separate GitHub job is the only process allowed to push verified patches.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess

from agent_checks import validate_task, verify
from ai_router import classify, decide, guarded_jev
from decision_adapter import request_decision

def prompt_for(task, policy, *, error=""):
    allowed = ", ".join(task["allowed_paths"])
    return (
        "Implement the authorized task by editing files.\n"
        "You may ONLY change these paths: " + allowed + "\n"
        "Never use shell, network, credential files, git commands, or other paths. "
        "Do not claim Jev, Luna, or Sol APIs were used: Copilot auto is the actual model selector. "
        "The verifier checks file scope, syntax, and the diff independently.\n"
        "User task: " + task["instructions"] + "\n"
        + ("Prior deterministic check failure (fix within allowed paths): " + error[:450] + "\n" if error else "")
        + "Orchestration policy:\n" + policy
    )

def default_generate(prompt, attempt, output_dir):
    output = Path(output_dir) / ("copilot-" + str(attempt) + ".txt")
    argv = [
        "copilot", "-p", prompt, "--model", "auto", "--no-ask-user",
        "--available-tools=view,glob,grep,edit,create,apply_patch",
        "--allow-tool=read", "--allow-tool=write",
        "--deny-tool=shell", "--deny-tool=url",
    ]
    with output.open("w") as target:
        subprocess.run(argv, check=True, stdout=target)

def execute(task, policy, output_dir, *, generator=default_generate, verifier=None,
            judge=request_decision):
    validate_task(task)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    lane = classify(task["instructions"])
    max_attempts = task.get("max_attempts", 1)
    last_error = ""
    for attempt in range(1, max_attempts + 1):
        generator(prompt_for(task, policy, error=last_error), attempt, output_dir)
        try:
            evidence = verifier(attempt) if verifier else verify(Path.cwd().resolve(), task, output_dir / "changes.patch")
        except subprocess.CalledProcessError as error:
            last_error = (error.stderr or b"").decode(errors="replace")[:450] if isinstance(error.stderr, bytes) else str(error)[:450]
            if attempt == max_attempts:
                raise RuntimeError("Verification failed after bounded attempts") from None
            continue
        # Scope violations and missing edits are fail-closed ValueErrors, not AI-retry triggers.
        state = json.dumps({"lane": lane, "attempt": attempt, "checks": evidence.get("tests"),
                            "paths": evidence.get("diff_paths"), "completion": "behavior not independently accepted"})
        status = decide(checks_passed=True, scope_verified=True, behavior_verified=False,
                        attempts=attempt - 1)
        provider = "offline"
        try:
            decision = judge(state)
            provider = decision.get("provider", "offline")
            if decision.get("choice"):
                status = guarded_jev(decision["choice"], decision["confidence"],
                                     checks_passed=True, scope_verified=True,
                                     behavior_verified=False, attempts=attempt - 1)
        except (ValueError, RuntimeError):
            # Fail safely to deterministic evidence, without leaking API payloads/keys.
            provider = "unavailable (offline fallback)"
        result = {"lane": lane, "actual_model_selector": "copilot-auto",
                  "attempts": attempt, "decision": status, "decision_provider": provider,
                  "behavior_verified": False, "evidence": evidence}
        (output_dir / "cycle.json").write_text(json.dumps(result, indent=2) + "\n")
        return result
    raise RuntimeError("No verified change obtained")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--task", required=True)
    ap.add_argument("--policy", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    task = validate_task(json.loads(Path(args.task).read_text()))
    policy = Path(args.policy).read_text()
    result = execute(task, policy, args.output)
    print(json.dumps({k: v for k,v in result.items() if k != "evidence"}))

if __name__ == "__main__":
    main()
