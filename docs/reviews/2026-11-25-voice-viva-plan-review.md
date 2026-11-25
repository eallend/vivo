# Plan review: 2026-11-25-voice-viva.md

Sources: plan-breaker subagent (simulated execution against the repo) and the author's coverage table, 2026-11-25. Decisions are the user's; "pending" until given.

## Findings

| ID | Severity | Finding | Evidence | Author's assessment | Decision |
|---|---|---|---|---|---|
| P1 | High | Task 5 test expects "topiramate myopic shift" not to rank page 5 first, but page 5 will win. Design R-11 has the same flaw. | Note p.5 differential table row "Topiramate-induced angle closure: Both eyes, sudden myopic shift, recent start of topiramate" is short and matches every query word. | Confirmed. The row is on page 5 of the PDF. | pending |
| P2 | High | `pnpm check:live` runs with plain Node, which cannot resolve `@/` imports or imports without `.ts`; the plan allows both in app code the script reaches. | Plan "Working rules"; `paths` in tsconfig.json applies to Vite and tsc only. | Confirmed. | pending |
| P3 | High | Global Constraints omit part (a) of the Definition of Done (acceptance rows, bundle search, privacy check, manual steps). | Design §10(a); plan Global Constraints. | Confirmed as an omission. Every row is covered by a task (table below), so the risk is to reviewers' view, not to coverage. | pending |
| P4 | Medium | No step writes `docs/reviews/2026-11-25-voice-viva-design-dod.md`, required by the project CLAUDE.md. | CLAUDE.md, Planning gate, third bullet. | not assessed (Medium) | pending |
| P5 | Medium | Task 3 is marked parallel with Task 2 but its tests need Task 2's real output. | Plan "Order" line; Task 3 mixed-turn test. | not assessed (Medium) | pending |
| P6 | Medium | The bundle search in Task 6 has no exact command; the client output folder is unknown. | Design U-5. | not assessed (Medium) | pending |
| P7 | Medium | No timeout on the Claude calls; the SDK default is 10 minutes with retries, so a slow call never reaches the "say it again" reply. | Task 6 interface specs. | not assessed (Medium) | pending |
| P8 | Low | Task 9 (apply the design sketch) serves no numbered requirement. | Coverage table. | It implements the user's design hand-off (design §3). Not scope creep. | pending |
| P9 | Low | R-8 (turn state visible, mic disabled while the examiner speaks) has no automated test. | Coverage table. | The design defines R-8 as a manual check. | pending |

## Coverage: requirement → task → test

| Req | Task | Test or check that fails if the criterion is not met |
|---|---|---|
| R-1 | 2 | `findings.test.ts` "R-1 keeps eye, value, unit" |
| R-2 | 2, 3 | `findings.test.ts` "R-2 states unavailable findings"; `flow.test.ts` "unknown request and empty turn" |
| R-3 | 2 | `findings.test.ts` "R-3 orders right before left" |
| R-4 | 1, 2 | `case.server.test.ts` "re-reads the file"; `findings.test.ts` "R-4 reads the value from the file" |
| R-5 | 6 | `viva.handlers.test.ts` "R-5 no examiner notes leave the server"; bundle search in Task 6 Step 5 |
| R-6 | 3 | `flow.test.ts` two "R-6" tests |
| R-7 | 3, 10 | `flow.test.ts` "R-7 a follow-up that restates a finding is replaced"; manual line in the write-up |
| R-8 | 8, 10 | manual: Task 8 Step 4 typed run; hand-off H-3 |
| R-9 | 7, 8, 10 | manual: Task 8 Step 4 reload; hand-off H-3 |
| R-10 | 7 | `pnpm check:privacy` |
| R-11 | 5, 6, 8 | `revision.test.ts` "R-11 retrieval follows the words"; `retrievedPages` saved on the attempt |
| R-12 | 5 | `revision.test.ts` "R-12 quote must be in the note" |
| R-13 | 4 | `prepare-note.test.ts` "R-13 pages and headings" |
| R-14 | 6 | `auth.server.test.ts` "R-14 rejects missing and wrong-audience tokens" |
| R-15 | 8, 10 | manual: hand-off H-3 |
| R-16 | 10 | files exist with the listed sections |
| DoD (b) gates | all | Global Constraints |
| DoD (c) must not change | all | Global Constraints; Task 10 Step 4 |

No requirement is without a task. Tasks without a numbered requirement: Task 9 (P8).
