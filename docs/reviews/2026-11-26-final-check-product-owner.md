# Final acceptance check: product owner (2026-11-26)

Branch `feat/voice-viva`, HEAD 46f62d8. Judged against the Candidate Brief PDF, not against the team's own spec. Read-only check: `pnpm test` run (13 files, 63 tests pass); client bundle searched (no "anticholinergic antihistamine", no "sk-ant"); git history, remote and branches inspected.

Overall verdict: **PARTLY ready.** Every feature and write-up section the brief names exists and is evidenced, but the spoken half of the voice viva has never been heard working, a voice turn was never measured end to end, the AI-cost receipt and time-spent statement are missing, there is no repository link yet, and the write-up contradicts itself in places.

## Brief requirements

| Brief requirement | Where met | Verdict |
|---|---|---|
| TanStack Start + Firebase Auth + Firestore, from an empty repo | `package.json`, `src/routes/`, `src/server/`, `firestore.rules` | MET |
| Signed-in trainee asks for findings aloud | Chrome speech recognition, `src/components/viva/turn-dock.tsx`; spoken run in write-up (IOP revealed) | MET |
| Finding read back (spoken) and shown, correct eye/value/units | Code builds the sentence (`src/lib/viva/`), tests R-1/R-4, `check:live` check 1; on screen: `finding-card.tsx`. Spoken read-back never heard (silent Chrome speech on test Mac); pronunciation of "6/36", "mmHg" not checked (U-3) | PARTLY |
| Say when a finding is unavailable | Tests R-2, `check:live` check 2 | MET |
| One spoken follow-up that responds to the trainee | Flow tests R-6/R-7, spoken run R-7 pass (shown as text; audio not heard) | MET |
| Clear when trainee can speak vs examiner responding | Four turn states in UI; typed Playwright saw all four; spoken run only "partly verified" (R-8) | PARTLY |
| Saved attempts reopen after refresh (transcript + revealed findings) | Spoken run R-9 pass | MET |
| Attempts private to owner | `firestore.rules`, `pnpm check:privacy` 4/4 (B and anonymous get 403) | MET |
| Revision point from retrieved note passages, based on trainee's answer | BM25 over trainee's words (`src/lib/revision/`), Opus writes point, R-11 | MET |
| Show page number and short supporting excerpt | `revision-point-card.tsx` (pages + blockquote), quote verified against passage (R-12) | MET |
| Tell trainee if no support in the note | "No support found in the reference note for this answer." | MET |
| PDF may be preprocessed | `pnpm prepare:note` -> `data/reference-note.passages.json`, R-13 | MET |
| Repository and run instructions | `README.md` (pnpm and Docker), `docs/firebase-setup.md`, `.env.example`. No git remote: no repo link exists yet; `main` holds only the initial commit | PARTLY |
| Stop after four hours; say what works and where you stopped | Write-up "What works and where I stopped". No time-spent figure; git shows about 3 h 53 min to the write-up (16:48-20:41 GMT) and Docker added after the 4-hour mark (21:20 GMT), not mentioned in the write-up. "Where I stopped" still says the spoken run "has not been done yet", contradicted later in the same file | PARTLY |
| Why this voice model + one alternative | Write-up: Chrome speech + Haiku; alternative OpenAI Realtime / Gemini Live; Sonnet measured | MET |
| Measure a voice turn; explain timer start/stop | Timer start/stop explained (final transcript -> synthesis `start`). Only server-side times measured (`check:live`, no speech); no full voice-turn figure exists (R-15 not verified) | PARTLY |
| Three repeatable checks with expected and observed | Write-up checks 1-3, `pnpm check:live` | MET |
| Citation check records pages retrieved and passage cited | Check 3: pages 3, 4, 5, 7 retrieved (5 passage ids), cited p-072 page 5 with quote | MET |
| Handover: how the note was prepared and passages selected | Write-up "Handover" | MET |
| AI tools: one concrete example and how verified | Write-up "AI tools" (citation length bug, tests + live run) | MET |
| Optional: one improvement added or sketched, with why | Write-up "Improvement I would make next" (sketched) | MET |
| Deadline 23:59 GMT 25 Nov: send repo link and write-up | Work committed by 21:20 GMT, but nothing pushed and no link; must be sent before 23:59 GMT | PARTLY |
| AI cost receipt or usage screenshot (to claim up to GBP 10) | Not in repo or write-up | MISSING |
| Ready for walkthrough "small change" | README explains the case JSON is read on every request; R-4 test | MET |

Spec vs brief: the spec did not drop a brief feature. It narrowed "measure a voice turn" to a manual R-15 check, which then failed to verify, and the write-up substitutes server-only timings. The R-5 bundle check in the DoD searched only "sk-ant"; the diagnosis-text search (spec R-5) was not recorded there, but this check confirms it passes.

## Top risks for the reviewer's impression

1. **No audible voice has ever been verified.** The headline feature is a voice viva; examiner speech, the visible "examiner speaking" state, and the timer were all unverified because the test Mac's Chrome produced no sound. A run on another machine before sending would close R-8, R-15 and U-3.
2. **No real voice-turn measurement.** The brief asks to measure a voice turn; the numbers given exclude recognition and speech. A reviewer will notice the timed figure is a server round-trip.
3. **Self-contradictions in the write-up.** "Where I stopped" says the spoken run was not done, while a later section reports it; test count says 57 (actual 63; DoD says 61 and 63); DoD R-15 quotes Haiku times 1221/1528 ms that appear nowhere in the write-up table; the spoken run is stamped "23:14 CET", but the commit recording it was made at 23:41 +0300 (21:41 CET), so 23:14 CET is impossible (likely 23:14 local, i.e. 21:14 CET).
4. **Submission logistics.** No remote and no pushed branch, work lives on `feat/voice-viva` while `main` is the bare initial commit, no AI-cost receipt, no stated time spent; Docker work after the four-hour mark is unexplained.
5. **Speech recognition on medical terms.** "Gonioscopy" heard as "colonoscopy" returns "not available in this case", the opposite of the right answer for a core finding; honestly disclosed but visible in any live demo. Revision point also varies between runs (sometimes "no support").
6. **Setup friction.** A fresh reviewer needs their own Firebase project (about 5 min, well documented) and an Anthropic key; no hosted demo.
