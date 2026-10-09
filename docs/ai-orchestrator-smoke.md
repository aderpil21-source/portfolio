# AI orchestrator smoke checks

The orchestrator’s verification is deterministic and does not require model APIs:

- `orchestrator-checks.yml` runs the router unit tests, validates the task allowlist, compiles the Python router/check scripts, checks the diff for whitespace errors, and exercises routing examples locally.
- `agent_checks.py` rejects changes outside the task allowlist, enforces file and patch size limits, runs `git diff --check` and `node --check` for changed JavaScript, and records the verified paths and patch. The scoped implementation workflow repeats these checks after applying the patch and confirms the staged paths match the verified paths.
- The router classifies and selects an action locally; its output identifies Jev as not connected. These checks verify scope and syntax, not application behavior, and do not establish that Jev, Luna, or Sol APIs were called.
