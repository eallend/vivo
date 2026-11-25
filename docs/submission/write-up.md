# Voice Viva: submission write-up

Case EA-VIVA-001 (acute angle closure). Local demo, desktop Chrome. Run steps are in `README.md`; the reasons behind each business rule are in `docs/decisions.md` (entries D-1 to D-20).

## What works and where I stopped

Works, with automated tests (63 passing under `pnpm test`) or the live checks below:

- Sign up and sign in with email and password; each attempt is saved under its owner and only the owner can read it (`pnpm check:privacy`: 4 of 4 pass, including a 403 for a second account and for a signed-out visitor).
- A viva in which the trainee asks for findings by voice or typing. Each finding comes back with eye, label, value, unit and method exactly from the case file; an unavailable finding says so and gives the stated reason; a request that matches nothing gets "That is not available in this case."
- After the trainee gives a diagnosis and management, the examiner asks exactly one follow-up, then closes the viva.
- A revision point with a word-for-word quote and its page number from the reference note, or "No support found in the reference note for this answer."
- Turn states on screen (your turn, listening, thinking, examiner speaking), a millisecond figure per spoken turn, and saved attempts that can be reopened.

Where I stopped:

- Time: by git timestamps the build ran from the first commit at 19:48 to this write-up at 22:52 (Moscow time, GMT+3) on 25 November, about 3 hours, with planning just before. After that I spent roughly 1.5 hours more on the spoken run and what it showed (a 3-second guard for a silent speech engine), a loading screen, a final QA and product check, and Docker packaging (`docker compose up --build`, see README). Those later commits are listed in `CHANGELOG.md`.
- The manual spoken run was done (section "Manual spoken run" below), but Chrome's speech synthesis made no sound on that Mac, so the examiner's voice and a full spoken turn time were not verified.
- Everything that does not need a microphone or speakers was run, including a final QA pass: 14 of 16 acceptance rows pass, 2 not verified (both need audio), none fail (`docs/reviews/2026-11-26-final-check-qa.md`).
- I did not build any of the items listed as non-goals in the design (hosting, more than one case, non-Chrome browsers, interrupting the examiner, hands-free listening, scoring, password reset, embeddings, server-side database writes, an "is that your final answer?" step, cleaning up test accounts).
- In some automated browser runs (Playwright driving Chrome) the speech "start" event never fired, so turn times seen there were not real; in the final QA run it did fire and typed turns showed real times. The server-side timings below come from `pnpm check:live`.

## Model choice and responsiveness

**What I used.** Chrome's built-in speech recognition and speech synthesis for voice, and Claude Haiku 5.5 for each live turn. Claude Opus 5.5 writes the revision point once, at the end. All model ids are set by environment variables, so Sonnet 5.5 was timed by changing one line.

**Why.**

- Exact findings. The model never writes a finding. It only says which finding ids the trainee asked for and whether they gave an answer; code reads the case file and builds the sentence. A model that speaks the whole reply can say "58 mmHg, left eye" when the case says right eye, which is exactly what the brief checks.
- Testability. Because code words the findings, tests can assert on exact text (for example "58 mmHg" with "Goldmann applanation").
- No second key. The key I had is for Claude, which has no speech input or output. A voice service would need another paid account.

**Alternative considered: a real-time voice model** (for example OpenAI Realtime or Gemini Live). It would give a better voice and lower delay, but needs a second paid key and more build time, and it brings back the risk of the model rewording a finding. It is the improvement I would make next (last section). **Sonnet 5.5** was the other candidate for live turns; it was measured, see below.

**Measured turn times** from `pnpm check:live`, the time for the server to turn one trainee sentence into a reply, in milliseconds. This includes the network trip to Claude and Claude's work; it does not include speech recognition or speaking. Two runs for each model, taken a few minutes apart on 2026-11-25. Run 1 is from the build session; run 2 was made while writing this document.

| Question | Haiku 5.5, run 1 | Haiku 5.5, run 2 | Sonnet 5.5, run 1 | Sonnet 5.5, run 2 |
|---|---|---|---|---|
| "What is the intraocular pressure in the right eye?" | 3181 | 1160 | 2546 | 2417 |
| "Can I see the gonioscopy of the right eye?" | 1321 | 961 | 1326 | 1089 |

Revision point (Opus 5.5, once per viva): 4330 and 3524 ms in the first run, 3608 ms (Haiku run) and 3897 ms (Sonnet run) in the second. **But it varies a lot:** in the final QA pass on 26 November the same call took 64 s in `pnpm check:live` and about 38 s in the browser. The trainee sees a "Preparing your revision point" card meanwhile. The call now has a 60 s limit and no automatic retry (a retry doubled the worst case to 2 minutes); if it fails, the card offers Retry. If this persists, Sonnet 5.5 for the revision point (`VIVA_REVISION_MODEL`) is the obvious thing to measure next.

Reading: Haiku's first call of a session is the slowest (3181 ms in run 1), after which it settles near 1 second. Sonnet was not faster in any run and was slower on the first question in both. With four numbers per model I do not claim a precise difference; the figures only support "Haiku is at least as fast, so there is no reason to pay for Sonnet on live turns".

**On-screen timer.** It starts when Chrome delivers the final transcript of what the trainee said (for a typed turn, when they press send). It stops when the examiner's audio starts playing (the speech synthesiser's `start` event). It leaves out the pause Chrome waits after the trainee stops talking before it decides the sentence is over, which is typically a noticeable fraction of a second, so the real delay the trainee feels is longer than the figure. If the audio never actually starts, the turn is saved with a time of -1 and shown without a millisecond figure, rather than a made-up number.

## Three repeatable checks

Run `pnpm check:live` (needs `.env.local` and costs a few cents). All three passed on both models on 2026-11-25. To repeat by hand, start `pnpm dev`, sign in, and type the same sentences into the typed-turn box.

**1. Available finding.**
- Input: "What is the intraocular pressure in the right eye?"
- Expected: finding `iop_right` revealed; spoken text contains "58 mmHg".
- Observed: "Right eye, intraocular pressure: 58 mmHg. Goldmann applanation, 23:55." (PASS)

**2. Unavailable finding.**
- Input: "Can I see the gonioscopy of the right eye?"
- Expected: finding `gonio_right` revealed as unavailable; spoken text contains "not available" and "No view: corneal oedema".
- Observed: "Right eye, gonioscopy: not available. No view: corneal oedema." (PASS)

**3. Citation.**
- Input (the trainee's answer): "This is acute angle closure. I would give pilocarpine straight away and acetazolamide."
- Expected: a supported revision point whose quote is found in the passage it cites, with the pages taken from that passage.
- Observed: the search retrieved five passages from pages 3, 4, 5 and 7 (p-024 page 3, p-086 page 7, p-071 page 5, p-072 page 5, p-059 page 4). Claude cited passage p-072, page 5, with the point "You didn't mention definitive treatment. Once the cornea clears, both eyes need laser peripheral iridotomy, including the at-risk fellow eye, not just pressure-lowering drops." and the quote "Either way, the priority is prompt iridotomy in both eyes." The code found that quote in p-072 after normalising spacing, dashes and case, so it was shown. (PASS)

The rule that the quote must really exist is also tested without any model call: a made-up quote becomes "no support", and "non-pupil-block mechanisms" correctly matches the note's extracted text "Non-pupilblock mechanisms".

**Honest limit of check 3.** With similar diagnosis answers, the revision point was supported (page 6) in one run in the app and "no support" (the model's quote failed the check) in another. The citation guard works as designed; it is the model's choice of quote that varies. A trainee can therefore sometimes see "no support" for an answer that has a supportable point.

## Manual spoken run (H-3)

Run on 25 November 2026 at 23:14 Moscow time (20:14 GMT) by the author, in desktop Chrome on macOS, with the microphone allowed. The trainee spoke English as a second language, which made it a fair test of speech recognition on medical words.

1. **R-7, follow-up refers to the answer.** The trainee said a diagnosis and plan that included pilocarpine drops. The examiner asked: "Why would you start pilocarpine but not wait for the pressure to fall first?"
   - Observed: **pass**. The question is about the trainee's own plan and restates no finding value or eye.
2. **R-8, turn states.** Observed: **partly verified**. Listening and thinking showed as expected, but the examiner state stayed on screen for a long time because no audio played (see the note below). The typed Playwright runs saw all four states, and End viva disabled while thinking.
3. **R-9, attempt survives refresh.** After the viva finished, the page was reloaded and the attempt reopened from "My attempts".
   - Observed: **pass**. All 9 turns, the revealed finding (right IOP 58 mmHg) and the revision point (quoted from reference note page 7) were identical.
4. **R-15, turn is measured.** Observed: **not verified on this machine**. No millisecond figure appeared, because audio never started, so the app correctly stored "no time" instead of a wrong number. Measured turn times from `pnpm check:live` (no browser audio) are in "Model choice and responsiveness".

**Why there was no audio.** Chrome's speech synthesis produced no sound on this Mac, even outside the app. A bare console test (`speechSynthesis.speak` with the local "Daniel" voice, after `cancel()`) fired no start, end or error event, and `speechSynthesis.speaking` stayed `true`. The same happened after quitting and reopening Chrome and in an Incognito window, while the Mac's own `say hello` worked. So this is the browser's speech engine on that machine, not the app. Fix made from this: `speak()` now gives up after 3 s if audio has not started (commit 9509633), so a silent engine no longer leaves the trainee waiting; the examiner's words are already on screen.

**Speech recognition on medical words (U-2).** Chrome turned "what's the pressure" into "what does depression", "pilocarpine" into "pillow carbon" / "pillow karpan", and "gonioscopy" into "colonoscopy". Claude Haiku still mapped the first two correctly (the right IOP was revealed; the follow-up named pilocarpine). "Colonoscopy" was treated as a finding not in the case, so the trainee heard "That is not available in this case." instead of the gonioscopy result. Next improvement: tell the turn model that the text comes from speech recognition and may hold sound-alike errors for medical terms.

**Voice reading of "6/36", "mmHg", "+3.50 DS" (U-3).** Not checked, because no audio played.

## Handover

**How the reference note was prepared.** `pnpm prepare:note` reads the PDF with `pdfjs-dist`, reads the text with its page numbers, drops the running header and footer, and cuts it into one passage per paragraph, bullet or table row. Each passage is `{id, pages, heading, text}`. A bullet that runs over a page break is joined into one passage listing both pages and keeping its heading; the sulfonamide-allergy warning (pages 5 and 6, heading "Immediate treatment") is such a case and is covered by a test. The result (128 passages after removing header-only rows) is committed in `data/reference-note.passages.json`.

**How passages are selected.** Code, not the model, picks them. It scores passages by keyword match (BM25) against the trainee's own diagnosis, management and follow-up answer only. The case's answer key is not added to the search, because that gave every trainee the same passages (decision D-13). The top five go to Claude together with the answer key, and Claude returns one point and one quote. The page number shown always comes from the passage record. If nothing matches, the trainee sees "no support" with no model call.

**Rules stricter than the first design.** A quote must be at least 15 characters and 3 words after normalising, so an empty or one-word quote can never pass. Two-word quotes that were honest are therefore rejected and shown as "no support". The retrieval test query was changed to "cycloplegics hyperosmotics vitrectomy" because the first one ranked a short table row above the longer bullet it was meant to find; short rows outranking long bullets is normal for this scoring and is a property of the approach.

**Interface differences from the plan.** Listening returns the text plus a reason when there is none (microphone blocked, nothing heard), and a Stop button exists, because the design has separate screens for those cases. The speaker reports whether audio really started.

**Choices made with the user during the build.** The revision point offers Retry if the model call failed. End viva is greyed out while the examiner is thinking. When an attempt that has no turns yet is reopened, the opening prompt is spoken again.

**Known limits.**

- Chrome only (desktop). Typing works anywhere the page loads; voice does not.
- There is no undo of an early answer: if Chrome mishears a turn as a final answer, the viva moves to the follow-up and cannot go back. The prompt only treats a clearly stated diagnosis or management as an answer.
- The revision point can contain answer-key content, by design (D-12): it tells the trainee what they missed. The functions that start a viva and handle a turn never return the diagnosis (tested, and the client bundle contains neither the diagnosis text nor "sk-ant"). The server keeps no record of attempts (server-side database writes are out of scope), so it cannot refuse a revision request before the viva is finished; a trainee who crafts that request against their own practice attempt could see the point early.
- `pnpm check:privacy` leaves two throwaway accounts in Firebase Authentication each run.
- One document only: the app reads a single case file and one attempt covers that one case.
- A failed live turn (model error) is not retried by the app; the trainee repeats the sentence. The revision point does offer Retry.
- Revision point quality varies between runs, as described in check 3, and so does its time (4 s to over a minute).
- The closing line after the follow-up answer is built by code with no model call, so its millisecond figure (tens of ms) only measures the app, not Claude.
- Under Docker the case file is inside the image: editing it needs `docker compose up --build`, or mount your own file and point `VIVA_CASE_PATH` at it.
- Short excerpt shown for a citation is the model's quote, not the note's own text after the match.

## AI tools

I used Claude Code to build this, with a plan split into ten tasks and a separate Claude reviewer for each task. One concrete example: the citation check. My first version checked that the quote was long enough before cleaning it up, so a quote made only of dashes or blanks passed the length test and then matched nearly anywhere. The reviewer, reading the code against the rule "a citation is shown only if the note really says it", flagged it as the one critical finding of the build. The fix was to measure length on the cleaned-up quote, and I tightened it to 15 characters and 3 words. I verified it with tests that feed in blank, dash-only and too-short quotes and expect "no support", plus tests with real quotes from the real passages file, and then confirmed against a live Claude run (check 3 above) that a genuine quote still passes. The rule is stricter than the first design, so I changed the design document and decision log to match.

## Improvement I would make next

Replace the browser's speech with a real-time voice model for listening and speaking only, while keeping findings worded by code. Reason: the biggest weakness the build shows is the voice layer. The turn timer cannot see Chrome's end-of-speech wait, the voice is flat, and a mic that mishears "gonioscopy" cannot be fixed from our side. A real-time model would shorten the wait and sound better, and keeping the exact-finding rule means the improvement does not reopen the risk of a reworded finding. I would measure it with the same timer first, and keep the typed-input path as a fallback.
