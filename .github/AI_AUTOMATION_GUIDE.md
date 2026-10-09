# Safe AI coding orchestration — draft PR #8

This is a working **test-branch-only** setup, not a global automation on `main`.

## What works

- The exact user instructions are kept in `.github/AI_ORCHESTRATION.md`.
- A local router classifies tasks and guards `COMPLETE` behind deterministic tests **and separately verified requested behavior**.
- `.github/scripts/agent_cycle.py` runs Copilot CLI with `--model auto` (the actual available model; no fabricated Luna/Sol identity).
- Model tooling is restricted to view/search/edit/create/patch. No shell or external browsing tools.
- The agent can only modify exact paths listed in `.github/ai-task.json` (one to eight non-sensitive source/docs paths).
- After the agent proposes changes, deterministic gates check the diff, path scope, size, and JavaScript syntax. Hard failures abort.
- One attempt by default, at most two if explicitly specified in the task. A retry is allowed only for a deterministic syntax-check error, **never** for an unauthorized file edit.
- Changes are saved as a patch artifact. A **separate** job replays and re-verifies the exact patch with only `contents: write`, and pushes **only** to `automation/copilot-readonly-ai`.
- The PR remains a draft. No automatic merge and no `main` modifications.

## How a new task is started

1. A repository maintainer updates `.github/ai-task.json` in the test branch. Set `instructions`, explicit `allowed_paths`, `apply_to_branch: true`, and optionally `max_attempts: 1` or `2`.
2. A maintainer explicitly adds `[RUN_SCOPED_AI]` to the **PR #8 description**. The `pull_request: edited` event starts the workflow. Editing a file alone does **not** trigger an AI spend.
3. Once the workflow finishes, the marker must be removed. The saved patch is confined to the test PR branch.
4. Review the changed behavior before claiming `COMPLETE`. Passing CI proves syntax and scope, not product acceptance.

No scheduling, automatic retries beyond the declared cap, or PR merging.

## Jev / Luna / Sol availability

The local router uses the user's requested **logical lanes**: Luna low/medium/high and Sol high. With Copilot Free and GitHub's built-in token, the actual model is selected by **Copilot auto**; the requested separate Luna/Sol inference endpoints were **not confirmed accessible**. Logical labels are not proof of model identity.

`.github/scripts/decision_adapter.py` has an **offline default** and a prepared TypeSafe Jev decision API adapter. **Jev is separately billed** and intentionally blocked unless `ENABLE_EXTERNAL_DECISIONS=1`, `DECISION_PROVIDER=jev`, and `ALLOW_PAID_JEV_API=1` are all explicitly configured **in addition to** `TYPESAFE_API_KEY`. None of those are set in these workflows. Never put API keys in this repository or log them.

The alternative `DECISION_PROVIDER=openrouter-free` targets the free `inception/mercury-decide:free` model (OpenRouter Decisions API); it also requires an explicitly provisioned `OPENROUTER_API_KEY`. It is not configured or tested against the live service. No external API is called during CI.

In all cases, a model's decision **cannot override failed tests, unauthorized paths, or missing behavior acceptance**.

## Evidence

- Initial Copilot CLI read-only review succeeded through `GITHUB_TOKEN`.
- A scoped AI writing smoke test created `docs/ai-orchestrator-smoke.md`, passed scope and diff checks, then was automatically committed to the draft PR branch; see the GitHub Actions history for PR #8.
- Offline unit tests cover scope, completion gates, bounded retries, and decision-provider fail-closed behavior.

No claim of production deployment or confirmed real Jev/Luna/Sol switching is made.
