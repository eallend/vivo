---
description: Break-test an implementation plan against the repo and check requirement → task → test coverage
argument-hint: <path-to-plan>
---
Target: $ARGUMENTS (if empty, the current plan)

1. Launch the `plan-breaker` subagent with ONLY: "Plan: <path>. Design doc: <path>."
2. Meanwhile build the coverage table yourself: each requirement R-n and its acceptance criterion → plan task(s) → test(s) that would fail if the criterion were not met. A requirement without a task or test is a finding. So is a Definition of Done item covered neither by a task's test nor by the plan's Global Constraints. A task that serves no requirement is a finding (scope creep).
3. Save findings to docs/reviews/<plan-name>-plan-review.md and triage them as in critique.md steps 3–5: the user sees the findings before the plan is changed.
4. When every Critical and High finding has a decision, end your message with exactly this line so the user cannot miss it:
   To start implementation, send: approve plan
   Code changes stay blocked until the user sends that message on its own (`approve plan` or `одобряю план`). "ok", "looks good" and similar do not open the gate — repeat the line. Never create `.planning/approved` or suggest a way around it.

<!-- planning-framework -->
