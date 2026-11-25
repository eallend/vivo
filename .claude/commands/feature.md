---
description: Start the gated planning process for a new feature or product (analysis → scope → design → critique → plan)
argument-hint: <what you want to build>
---
Task: $ARGUMENTS

Run the process below. Use the superpowers skills for brainstorming, writing plans and execution; where they differ from this file, this file wins. No autonomous work before the plan is approved. Brainstorming's "just dive in" offer and its question opt-out do not apply here.

Checkpoints are stops, not questions. At each of the four checkpoints end your turn and show the material, even when you can predict the answer. A blanket reply from the user — "decide yourself", "fix everything", "continue" — settles only what they have already been shown; it never covers a later checkpoint, and it never lets you apply review findings they have not seen. If the user wants fewer stops, they say so by changing the level, and you tell them what they will no longer see.

## Step 0 — size check and gate
- If this is a small change (one sitting, no new data model, public API or dependency, easy to revert), say so and suggest skipping this process. Continue only if the user wants it.
- If `.planning/active` exists and names this same feature, resume from the last finished checkpoint.
- Otherwise write `.planning/active` (Write tool) with a one-line feature name. This closes the gate: a hook blocks every change outside docs/ until the user approves the plan. Writing it also cancels any approval left from a previous feature.

## Step 1 — participation level
Propose a level and wait for confirmation:
- L1: decisions that are hard to reverse (data model, public API, contracts, security, money). Every question and decision is confirmed one at a time; critique uses three lenses.
- L2: everything else. Checkpoints between phases; independent closed questions may be batched (max 3 per message — this overrides brainstorming's one-at-a-time); critique is one combined pass.
You may propose raising the level later. Only the user may lower it.

## Phase 1 — inputs (superpowers brainstorming)
Find the real goal first — ask why and for whom unless the user already said — then implicit requirements, gaps and contradictions in what the user gave you. Keep a register and show it at the checkpoint:
- Assumptions A-1… (believed, not verified)
- Unknowns U-1… (open questions)
- Contradictions in the inputs
CHECKPOINT 1 — the user confirms the understanding and the register.

## Phase 2 — approach and scope (before any design is written)
- 2–3 approaches with trade-offs, your recommendation, and the strongest honest argument for the one you would not pick.
- Core value in one sentence, MVP boundary, explicit Non-goals. Cut first: anything not needed for the core value is a Non-goal or "later".
- A spike the user agrees to lives in `.superpowers/spike/` and is thrown away; the gate blocks it anywhere else.
CHECKPOINT 2 — the user picks the approach and confirms the scope.

## Phase 3 — design doc
Write the superpowers design doc (docs/superpowers/specs/…) and make sure it also has the sections below. Keep it short: about two pages. Sections: Goal and core value · Requirements R-1… each with an acceptance criterion · Non-goals · Approach and rejected alternatives · Assumptions and Unknowns · Risks · Hard-to-reverse decisions · Definition of Done.
Definition of Done has three parts: (a) every acceptance criterion written so an agent can check it — a command or an observable behaviour plus the expected result, no words like "works correctly" or "fast"; (b) project gates with the exact commands from this repo (tests, typecheck, lint, build); (c) what must not change (Non-goals, existing behaviour).
Every statement about existing code, data or external systems carries `[verified: file:line]` or `[unverified]`. Verify while writing; do not guess.

## Phase 4 — critique
Follow `.claude/commands/critique.md` on the design doc. Do it at the point where brainstorming runs its builder check: dispatch the builder check and the critic in the same message, and bring the user ONE combined round — the builder's questions plus the critic's findings. Commit the review file together with the design doc.
CHECKPOINT 3 — the user decides on the findings and approves the design.

## Phase 5 — plan (superpowers writing-plans)
Copy the Definition of Done gates (exact commands) and the must-not-change items verbatim into the plan's `Global Constraints` section: superpowers hands that section to every task reviewer. Every acceptance criterion must be pinned by a test in the task that owns the code. Do not add a separate verification task.
Whatever language the plan is in, task headings stay `### Task N: …` with the English word Task — superpowers' scripts cannot find tasks otherwise.
Then follow `.claude/commands/plan-check.md` before the writing-plans handoff message, and ask for the execution method (subagent-driven or inline) in the same checkpoint.
CHECKPOINT 4 — the user decides on the findings, then approves by sending the chat message `approve plan` (or `одобряю план`) on its own. Only that exact message opens the gate; if the user approves in other words, tell them to send it.

## Phase 6 — implementation
Superpowers execution (subagent-driven or inline), autonomous; its own per-task and final reviews apply unchanged.
After the final whole-branch review and before finishing-a-development-branch:
- write docs/reviews/<design-doc-file-name>-dod.md (the design doc's name without `.md`): every Definition of Done item → command run → output → pass / fail / not verified. Anything you could not check is "not verified", never "done".
- in the final message show that table and the full "Rulings I made" list, copied verbatim from the superpowers ledger (every line containing `Ruling`) — every decision taken without the user while they were away.

At every checkpoint show: what was decided, what is still open, and the path to the document or review file.

<!-- planning-framework -->
