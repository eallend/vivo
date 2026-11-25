---
name: optimize-it
description: Use when a job is about to dispatch several subagents, execute a written multi-step plan or spec (e.g. a Superpowers-style plan), run work in waves or in parallel, or span many files in one feature, refactor or migration — and whenever the user raises cost, token usage, usage limits, or asks for the work to be split into milestones. Not for one-off single-file fixes or quick questions.
---

# optimize-it

**Quality at the project's level is fixed; tokens are what you optimise.** A saving that drops quality below that level is not a saving. Use only tools you already have and your own judgment in plain words. Never present a computed score or formula.

**Tick these as you go; the detail for each is below.** 1 several agents, a written plan, or waves — otherwise stop · L project level: read it, ask once, or infer and say so · 2 scale heads-up before the first dispatch; fresh session if designed here · 3 milestones · 4 model per dispatch: what it guards, then how mechanical it is · 5 verification per level, and run it for real · 6 dispatch = task path, rules path, orientation, return contract · 7 report to a file, fifteen lines back, never open a transcript · 8 fix by area, resume only while small, pathspec commits · 9 delete the scaffolding · 10 one backlog · 11 commits and changelog, opt-in.

## 1. Does this apply?
Yes if the job involves several subagents, a written multi-step plan, or wave-based execution. For a small self-contained request, stop here: change nothing and don't mention this skill.

## Project level
**experiment** — throwaway, a bug costs nothing. **standard** — a real project, bugs are recoverable. **production** — live users, money, or data you can't get back.

Find it in this order: a line `optimize-it level: <level>` in the project's CLAUDE.md; else ask once, in the heads-up, and write the answer there; else — the user is away or said not to ask — infer it from what you can see (deploy config, who depends on it, what it stores), say what you assumed and why, don't save it. Mixed signals: take the higher.

A **guard** is a dispatch where a mistake does damage silently: the review gate, the task that writes stored data or moves money, a fixer touching either. A foundation others build on is not a guard — a wrong name breaks loudly. The plan won't label guards; you do.

| | experiment | standard | production |
|---|---|---|---|
| Guards run on | same tier as the rest | review gate on the top tier | every guard on the top tier |
| Everything else | cheap tier; middle for the one task the experiment is about | item 4 | item 4 |
| Review | none — run it once for real | one review, after a live run | plus a light review of the fix round's diff |
| "Done" means | it ran; caveats noted | live run passed, findings fixed | live run covered the main consumer's path; critical fixes re-checked live; no known correctness finding open |

At every level, near-free:
- Check reality before you write against it: open the files a spec or plan names, probe the outside system it assumes.
- A reviewer may read outside the diff, and gets your live-run results as claims to attack, not as facts.
- Compare cost across models in money or share of the limit, never in token counts. A note that a cheaper tier "was no cheaper" counted tokens: as many requests at a lower price still cost less.

## 2. Heads-up before diving in
Before the **first implementation dispatch** — not during design, where the job still looks small — give one or two plain sentences: the level, rough scale (tasks/waves) and, if it looks heavy, that it could eat a meaningful chunk of the week's usage.

> Heads-up (level: production — it's deployed and holds payment data; say if that's wrong): a fairly large job — about 14 tasks in 3 waves, each with review — so it may take a noticeable bite out of this week's usage. I'd split it into 3 milestones (below). Okay, or run it straight through?

Don't narrate this checklist. This is a heads-up, not a gate. Told to work without asking? Adopt the split yourself and continue.

**Designed in this session?** Add that building from a fresh one is cheaper: the plan is on disk, and the design context would ride on every orchestrator turn — 1M tokens in one run.

**Approval doesn't scale with the job.** If the work grows well past the size you announced, say so in one line at the next milestone — even under "go, no stops".

## 3. Milestones for large jobs
Group tasks into a few milestones along feature/dependency boundaries, blocking work first. Each ends where things work and can be committed, so an interrupted run loses at most one milestone. Present a short list: name, contents, stopping point. On a long run, say where the spend stands at each boundary, and what you are counting. A completion notice's per-agent figure is not throughput; with no reliable source, say so rather than quote a number that only looks measured.

## 4. Model per dispatch
Subagents inherit the session's model unless you pick one, so pick per dispatch. One choice for the whole job, or last milestone's choice, is not a decision. Three tiers: top (usually the session's), middle, cheap. Ask two questions, in order. **What does it guard?** A guard gets the tier the level table gives it, however easy it looks. **How mechanical is it?** Everything else: middle tier for design, cheap tier for transcription. A model policy in CLAUDE.md or agent definitions wins.

**"Mechanical" is a property of the plan, not of the task.** Transcription means the plan already holds the code or an exact spec, the task moves code with the existing suite as its oracle, or it writes docs from your brief. If the plan is prose and signatures, the implementer is doing design — tier up, however mechanical the task sounds.

The cheapest way to make a task transcription is to build the template first: have the strong agent ship one complete worked slice — module, test, fixture, registration — and give the cheap tier "copy this N times".

**A task stops being mechanical the moment the agent has to explain something.** If a task ends in an analysis — why these numbers disagree, why that test fails, what caused this — either tier up, or treat the conclusion as unverified until you have checked it yourself.

## 5. Verification depth
How much review, and what "done" means, come from the level table. Don't re-review unchanged code — but a fix round's diff is new code nobody has reviewed.

Tests: routine work runs only the tests relevant to what changed; full suite at milestone checkpoints and before merging. Tell agents that failures in files they don't own are **reported, not fixed**.

**A green suite is not evidence the thing works.** Code review and actually running the software find largely disjoint bug classes, so before the final review, execute it against reality and feed those findings into the review dispatch. Name the risks you want examined: a reviewer won't look for concurrency, crash-safety, or retention problems unless you say so.

## 6. What a dispatch contains
A dispatch has four parts, in this order, and nothing else:

1. **The task** — a path to its own extracted section: `briefs/task-07.md`.
2. **The rules** — paths to files written once and reused across every dispatch: `constraints.md`, `implementer-rules.md`.
3. **Orientation** — two or three sentences of your own: what already exists that this agent will build on, and what it must not touch. This is the only prose in the dispatch, and it is where anything you were tempted to explain belongs.
4. **The return contract** — item 7, verbatim.

**An agent costs roughly its number of requests multiplied by its context size**: every tool call re-reads everything it carries. So a short dispatch matters more than it looks, and the other lever is fewer requests.

Part 1 is a path, never pasted text. If the plan is short enough that each task is its own screen, point at the section where it already lives. If it is long, extract each task's section to its own file first — a ten-line script, thrown away with the workspace — so that no agent ever receives the whole plan. Do the same for the reviewer's diff.

## 7. The return contract
Put this in every dispatch.

> Write your full report — what you changed and why, decisions taken, anything deferred — to `reports/<task>.md`. Return **at most fifteen lines**: what changed, files touched, tests run and their result, blockers. No code, no diffs, no file contents in your reply.

Read the report only when the status says something that needs it. Reviewers get a path to a diff file, not a diff, and return each finding's title with the file that owns it — enough to split the fix round without opening the report. **Never open a subagent transcript.**

The contract compresses; it does not validate: in fifteen lines a confident wrong explanation reads like a right one. When a report makes a causal claim you are about to build on — this was caused by X — check it first, by re-running the thing yourself, not by opening the transcript.

## 8. Dispatch discipline
- **Classify before you explore.** Confirm scope before dispatching a survey or research agent.
- **Slice so two agents never cover the same ground**; bundle tiny tasks that share setup.
- **Resume for a fix round only while the context is still small.** A resumed agent re-reads its whole accumulated context on every request, so resuming into a big one is the most expensive move available — a measured fix round cost 3.4x the build it was fixing. The token figure in the agent's completion notice is roughly the context you would resume into; once that reads six figures, a fresh agent given the original's report file is cheaper, and the report exists precisely so the rationale survives the handover. Cap the fix list at what the review found — a long list invites an agent to add work of its own.
- **Merge findings into one dispatch.** Review findings and live-run findings that land together go in one message, not two activations.
- **Fix by area, not by finding.** Fifteen findings become two or three fixers on disjoint files.
- **Your own context is the dearest in the run**: every turn re-reads all of it. Hand bounded writing — docs, changelog drafts — to a fresh cheap agent with a short brief; split a task wider than a few files; have agents wait on their own background jobs in the foreground, so they don't wake you with nothing.
- **Parallel implementers share a git index and a process table.** Commit with an explicit pathspec (`git commit -m "..." -- <paths>`), never `git add -A`; kill only PIDs you created, never `pkill` by pattern. Disjoint paths work fine in one tree; use `isolation: "worktree"` when they might overlap.

## 9. Clean up stale artifacts
When a milestone is done, delete the one-off inputs — briefs, packaged diffs, scratch files — whose content now lives in the plan, the backlog, or git history. Only files this job created; when unsure, put `Superseded by <file>` on line one instead.

After an unattended run, keep a decision record — rulings, deviations — folded into one surviving file. **If you keep something this rule says to delete, say so and why.**

## 10. One home for state, one home for rules
Task state lives in one file: the project's existing one (`TODO.md`, `BACKLOG.md`, a plan with checkboxes), otherwise a new `BACKLOG.md` checklist. New tasks, follow-ups and status go there and nowhere else.

An execution ledger dies with the workspace; the backlog holds work that outlives the run. No third surface — if a plan skill mandates checkboxes, tick them at task completion or say once that they're unused.

Rules get one home too: before adding a rule to memory or a skill file, check CLAUDE.md.

## 11. Commits and changelog (opt-in)
On only if the user or CLAUDE.md says so; otherwise keep the style the repo's history already uses. **If the repo has no style and the user hasn't chosen, ask in one clause of the heads-up or leave it off.**

When on: Conventional Commits — `type: short description` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`) — one commit per logically complete chunk.

### The changelog is written for a product owner
Its unit is the **milestone**, not the commit.

For each milestone: a plain-language heading, then two to four sentences on what it set out to do, what now works, and what that means for the product. No file names, no class names, no implementation detail. The commits sit underneath as evidence: subject line plus short hash.

A commit that belongs to no milestone gets one line under **Other changes**: subject, hash, and a clause on what it means for someone using the product.

Write entries at milestone checkpoints from `git log --oneline`; leave chores out.
