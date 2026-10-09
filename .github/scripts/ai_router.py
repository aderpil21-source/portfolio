#!/usr/bin/env python3
"""Safe local routing decisions. No API calls, credentials, or model impersonation."""
import argparse
import json
import re
import sys

LANES = ("LUNA_LOW", "LUNA_MEDIUM", "LUNA_HIGH", "SOL_HIGH")
ACTIONS = ("CONTINUE", "RETRY", "VERIFY", "ESCALATE", "COMPLETE")

def classify(task):
    text = task.lower()
    if re.search(r"security|authentication|authorization|architecture|migration|секрет|безопасност|архитектур|авторизац", text):
        return "LUNA_HIGH"
    if re.search(r"test|bug|fix|component|layout|css|тест|ошиб|исправ|верст|компонент", text):
        return "LUNA_MEDIUM"
    return "LUNA_LOW"

def decide(*, checks_passed, scope_verified, attempts, security_sensitive=False, unresolved=False):
    """Never ask an LLM to overrule failing deterministic checks."""
    if checks_passed and scope_verified and not unresolved:
        return "COMPLETE"
    if security_sensitive or attempts >= 2:
        return "ESCALATE"
    if not checks_passed:
        return "RETRY"
    return "VERIFY"

def validate_jev(choice, confidence, allowed=ACTIONS, threshold=0.75):
    """Validate a Jev response *if* an authorized external integration supplies one."""
    if choice not in allowed or not isinstance(confidence, (float, int)) or isinstance(confidence, bool):
        return "VERIFY"
    if not 0 <= confidence <= 1 or confidence < threshold:
        return "VERIFY"
    return choice

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", default="")
    parser.add_argument("--checks-passed", action="store_true")
    parser.add_argument("--scope-verified", action="store_true")
    parser.add_argument("--attempts", type=int, default=0)
    parser.add_argument("--security-sensitive", action="store_true")
    parser.add_argument("--unresolved", action="store_true")
    args = parser.parse_args()
    if args.attempts < 0:
        parser.error("attempts cannot be negative")
    lane = classify(args.task)
    action = decide(checks_passed=args.checks_passed, scope_verified=args.scope_verified,
                    attempts=args.attempts, security_sensitive=args.security_sensitive,
                    unresolved=args.unresolved)
    print(json.dumps({"lane": lane, "action": action,
                      "model": "copilot-default-only",
                      "jev": "not-connected", "reasoning_level": "advisory-only"}))

if __name__ == "__main__":
    main()
