# Definition of Done: Voice Viva (design 2026-11-25)

Checked on 2026-11-25 at commit 23b7185; manual rows updated after the spoken run (fix 9509633: 63/63 tests, four gates exit 0) (branch `feat/voice-viva`). Every command below was run by the controller for this record; outputs are quoted or summarised.

## (a) Acceptance criteria

| Row | What | How checked | Observed | Result |
|---|---|---|---|---|
| R-1 | Available finding keeps eye, value, unit | `pnpm test` (`src/lib/viva/findings.test.ts`) | 63/63 tests pass; also `pnpm check:live` Check 1: spoken "Right eye, intraocular pressure: 58 mmHg. Goldmann applanation, 23:55." | pass |
| R-2 | Unavailable finding is stated | `pnpm test` (`findings.test.ts`); `pnpm check:live` Check 2 | spoken "Right eye, gonioscopy: not available. No view: corneal oedema." | pass |
| R-3 | No eye named gives both | `pnpm test` (`findings.test.ts`) | pass | pass |
| R-4 | Findings come from the file | `pnpm test` (`findings.test.ts`) | pass | pass |
| R-5 | Diagnosis not sent to the browser | test half: `pnpm test` (`src/server/viva.handlers.test.ts`); bundle half: after `pnpm build`, search `dist/client` for `examiner_notes` and for the diagnosis sentence ("Right acute primary angle closure, with a narrow left angle") | tests pass; 0 files contain either (re-checked 2026-11-26) | pass |
| R-6 | Exactly one follow-up | `pnpm test` (`src/lib/viva/flow.test.ts`) | pass | pass |
| R-7 | Follow-up never restates a finding | test half: `pnpm test` (`flow.test.ts`); manual half: spoken run | tests pass; spoken run: follow-up asked "Why would you start pilocarpine but not wait for the pressure to fall first?" about the trainee's own plan | pass |
| R-8 | Turn state is visible | manual spoken run in Chrome (H-3) | typed Playwright runs saw all four states; spoken run saw listening and thinking, but no audio played on the test Mac (Chrome speech engine silent even in a bare console test) | not verified (partly) |
| R-9 | Attempt survives refresh | manual | spoken run: after reload and reopening from the list, all 9 turns, the finding and the revision point were identical | pass |
| R-10 | Attempts are private | `pnpm check:privacy` | 4/4 PASS: A writes 200, A reads 200, B reads 403, anonymous reads 403 | pass |
| R-11 | Retrieval follows the trainee's words | `pnpm test` (`src/lib/revision/revision.test.ts`) | pass | pass |
| R-12 | Quote must exist in the note | `pnpm test` (`revision.test.ts`); `pnpm check:live` Check 3 | tests pass; Check 3 status supported, quote found in passage p-072 (page 5) | pass |
| R-13 | Passages carry correct pages | `pnpm test` (`scripts/prepare-note.test.ts`) | pass (128 passages after clean-up) | pass |
| R-14 | Only signed-in users reach Claude | `pnpm test` (`src/server/auth.server.test.ts`, incl. expired and wrong-key tokens) | pass | pass |
| R-15 | Voice turn is measured | manual spoken run | no audio played on the test Mac, so the app stored "no time" (correct behaviour); `check:live` turn times 1221 ms and 1528 ms (Haiku) | not verified |
| R-16 | Submission write-up exists | read `README.md`, `docs/submission/write-up.md` | README names the case file the app reads and has run steps; write-up has all seven sections | pass |

## (b) Project gates

| Command | Exit | Output |
|---|---|---|
| `pnpm typecheck` | 0 | no errors |
| `pnpm lint` | 0 | no errors |
| `pnpm build` | 0 | built to `dist/` |
| `pnpm test` | 0 | Test Files 13 passed (13), Tests 63 passed (63) |

## (c) Must not change

| Item | How checked | Result |
|---|---|---|
| `docs/requirements/` byte-identical | `git log --oneline -- docs/requirements` shows only the baseline commit 474fd5e; `git status` clean there | pass |
| `.claude/hooks`, `.claude/settings.json`, planning gate untouched | no commit on the branch includes them (all commits used explicit pathspecs); the gate hook blocks shell commands that name those paths, so no command could be run | not verified by command |
| `.env.local` never committed | `git ls-files .env.local` → 0 lines | pass |
| No Anthropic key in client bundle | `grep -rl sk-ant dist` → 0 files | pass |
| No Non-goal built | Task 8b review checked the list; no hosting, one case, no interrupting, no hands-free listening, no scoring, no password reset, no vector store, no server-side Firestore writes, no "final answer?" step | pass (by review) |

## Deviations from the plan (all logged in the SDD ledger and write-up)

- Task 9 folded into Task 8 (design arrived first); Task 8 split into 8a kit and 8b screens.
- `listen()` returns `{ text, error }`, `stopListening()` added; `speak` reports whether audio started; a turn without audio is stored with time -1.
- User decisions: revision point Retry on model failure; End viva disabled while thinking; opening prompt re-spoken on reopen.
- Citation rule stricter than the spec (15 characters and 3 words after normalising).
- Turn model call `maxRetries: 0` (was 1).

## Open

- R-8 audio half and R-15 need a machine where Chrome's speech synthesis plays sound.
- Sound-alike mishearings of medical terms ("colonoscopy" for gonioscopy) are not handled; listed as the next improvement.
