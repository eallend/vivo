# Voice viva demo (Eye Academy take-home, case EA-VIVA-001): design

Date: 2026-11-25. Participation level: L2. Deadline: 23:59 GMT 2026-11-25 (00:59 CET 26 Nov). Target effort: about four hours, no hard stop.

Inputs: `docs/requirements/` (candidate brief PDF, case JSON and PDF, reference note PDF, readme).

## 1. Goal and core value

Submit a working local demo for the Eye Academy contract-developer exercise. Reviewers read the repo and write-up, then in a walkthrough make a small change and watch what happens.

**Core value:** a signed-in trainee can talk through one case, get each finding back exactly as written in the case file, and leave with one revision point they can check against the reference note.

**Anti-goals** (failure even if it runs): a finding spoken with the wrong eye, value or unit; a citation the note does not contain; one trainee reading another's attempt; the diagnosis visible to the trainee before they answer.

## 2. Approach

**Chosen (user picked A):** browser speech + Claude, with findings spoken by code.

- **Voice in and out:** Chrome's Web Speech API (`webkitSpeechRecognition` and `speechSynthesis`, `en-GB`). No extra key.
- **Turn interpretation:** one server call per trainee turn to Claude. It returns structured data only: the intent (`findings` / `history` / `answer` / `other`), the ids of case findings or patient-history fields asked for, any request that matches nothing in the case, and, when the intent is `answer`, one follow-up question that responds to what the trainee said.
- **Finding wording:** code looks the ids up in the case file and builds the spoken and displayed text from the stored fields. The model never writes an eye, value or unit.
- **Revision point:** code retrieves passages from the pre-processed note, Claude writes one point with a word-for-word quote, code verifies the quote.

**Rejected:**

- **B, Claude writes the whole spoken reply.** Sounds more natural, but the model can restate "58 mmHg, right eye" wrongly, which is what the brief checks, and it is hard to test.
- **C, a real-time voice model (OpenAI Realtime, Gemini Live).** Best voice and lowest delay. Needs a second paid key the user has not set up, more build time, and has the same paraphrasing risk. It is the "alternative considered" for the write-up. Strongest case for it: reviewers asked about a "voice model" and may see browser speech as sidestepping; we answer that openly in the write-up.

**Models** (ids from the Claude API reference, cached 2026-11-03):

- Live turn: `claude-haiku-5-5`, chosen for speed.
- Revision point: `claude-opus-5-5`, chosen for quality.
- Both ids come from environment variables (`VIVA_TURN_MODEL`, `VIVA_REVISION_MODEL`) so `claude-sonnet-5-5` can be swapped in. The write-up reports the measured turn time for Haiku and Sonnet. (User: "let's not forget about sonnet"; reading it as "keep it as a compared option" is my interpretation.)

## 3. How it fits together

- **Case file:** the app reads `data/cases/EA-VIVA-001.json`, a copy of the provided JSON, on every server request with no caching, so an edit shows on the next turn without a restart. Only server code reads it. The browser receives the opening prompt and the findings already revealed, never `examiner_notes`.
- **Display rule:** speak and show eye, label, value, then the unit only when the value is a number (`58` + `mmHg`), then the method. Text values are used as written because they already carry their units ("Mid-dilated, 5 mm, unreactive to light").
- **Availability:** the `available` flag is the truth. If `false`, say the finding is unavailable and give `unavailable_reason`, ignoring any `value`. A request that matches nothing in the case gets "That is not available in this case."
- **No eye named:** give every matching finding (both eyes).
- **Viva flow:** opening prompt → any number of finding or history turns → trainee gives diagnosis and management → examiner asks exactly one follow-up → trainee answers → closing line → attempt is `finished` → revision point is generated.
- **Turn states in the UI:** `your turn` (mic button enabled), `listening`, `thinking`, `examiner speaking` (mic disabled). A typed-input box does the same as speaking.
- **Sign-in:** Firebase Auth, email and password, in the browser.
- **Storage:** the browser writes to Firestore at `users/{uid}/attempts/{attemptId}`: one document holding `caseId`, `status`, timestamps, `turns[]`, `revealedFindings[]` (a snapshot of the fields as revealed), `followUp`, `revisionPoint`, `turnTimingsMs[]`. Rules allow read and write only when `request.auth.uid == uid`.
- **Server calls:** TanStack Start server functions. Each verifies the caller's Firebase ID token against Google's public keys using `FIREBASE_PROJECT_ID` before calling Claude. There is no service-account key, so the server does not write to Firestore.
- **Reference note:** a script run before the demo extracts the PDF into `data/reference-note.passages.json`, one entry per paragraph, bullet or table row: `{id, page, heading, text}`. The file is committed.
- **Retrieval:** BM25 keyword scoring in code. Query = the trainee's diagnosis, management and follow-up answer + the follow-up question + the case's `examiner_notes` (so points the trainee missed can be found). Top 5 passages; their pages are logged and stored. Zero-scoring query → "no support" without a model call.
- **Citation check:** Claude returns `{supported, point, passageId, quote}`. Code accepts it only if `quote` is a whitespace-normalised substring of that passage. The page shown comes from the passage record. Otherwise the trainee sees "No support found in the reference note for this answer."
- **Timing:** start when speech recognition delivers the final transcript, stop when the examiner's audio starts (`SpeechSynthesisUtterance` `start` event). Shown on screen and saved per turn.
- **Design hand-off:** the user sketches screens in Claude Design and puts the chosen one in `docs/design/`. Logic is built first. If no sketch is there when screen work starts, screens use plain shadcn defaults and are restyled when it arrives (my call).

## 4. Requirements and acceptance criteria

| ID | Requirement | Acceptance criterion |
|---|---|---|
| R-1 | Available finding keeps eye, value, unit | Test: formatting `iop_right` yields text containing "right", "58 mmHg" and "Goldmann applanation"; formatting `pupil_right` contains "5 mm" exactly once and no trailing "mm" |
| R-2 | Unavailable finding is stated | Test: `gonio_right` yields "not available" plus "No view: corneal oedema"; `rapd` yields its reason and not its `value`; an unknown request yields "not available in this case" |
| R-3 | No eye named gives both | Test: resolving ids `iop_right`, `iop_left` returns two findings in right, left order |
| R-4 | Findings come from the file | Test: with a case fixture whose `iop_right.value` is 44, the formatted text contains "44 mmHg" |
| R-5 | Diagnosis is not sent to the browser | After `pnpm build`, searching the client bundle for "anticholinergic antihistamine" finds nothing |
| R-6 | Exactly one follow-up | Test of the flow reducer: after an `answer` turn the state is `follow_up_asked`; after the next trainee turn it is `finished`; no second follow-up is accepted |
| R-7 | Follow-up responds to the trainee | Manual check: the follow-up text refers to something in the trainee's answer; recorded in the write-up |
| R-8 | Turn state is visible | Manual check in Chrome: indicator shows each of the four states; mic button is disabled while the examiner speaks |
| R-9 | Attempt survives refresh | Manual check: reload the page, open the attempt, transcript and revealed findings match |
| R-10 | Attempts are private | Script `pnpm check:privacy`: user B reading user A's attempt over the Firestore REST API gets HTTP 403 |
| R-11 | Retrieval is real and logged | Test: query "pilocarpine iris sphincter ischaemic" ranks a page-5 passage first; retrieved pages are stored on the attempt |
| R-12 | Quote must exist in the note | Test: a model reply whose quote is in the passage is accepted with that passage's page; a reply with an invented quote becomes "no support" |
| R-13 | Passages carry correct pages | Test: the passage containing "Lie the patient flat" has page 5; the one containing "Prophylactic LPI in the fellow eye" has page 6 |
| R-14 | Only signed-in users reach Claude | Test: the token verifier rejects a missing token and a token with the wrong audience |
| R-15 | Voice turn is measured | Manual check: a millisecond figure appears after a spoken turn and is saved on the attempt |
| R-16 | Submission write-up exists | `README.md` has run steps; `docs/submission/write-up.md` has model choice and alternative, timing with start and stop points, three checks with expected and observed, handover, AI-tool example, where the work stopped |

## 5. Non-goals

Hosting or deployment. More than one case. Mobile or non-Chrome browsers. Interrupting the examiner. Hands-free listening. Scoring the trainee. Password reset. Embeddings or a vector store. Server-side Firestore writes.

**Later, if time remains:** the brief's "one improvement", chosen at the end from what the build shows is weakest.

## 6. Assumptions and unknowns

- A-1 Demo runs locally in desktop Chrome, English, one case.
- A-2 Email and password sign-in is acceptable to the reviewers.
- A-3 "One spoken follow-up" means exactly one, after the diagnosis.
- A-4 History questions (medications, allergies) are answered from the case's `patient` block.
- A-5 The reviewers' "small change" is most likely an edit to the case JSON.
- A-6 AI spend stays under £10.
- A-7 Claude's API has no speech input or output `[unverified]`: the bundled API reference lists none; not checked against live docs.
- U-1 Where the repo will be published; no git remote is set `[verified: git remote -v prints nothing]`.
- U-2 Whether Chrome's recogniser hears terms such as "gonioscopy" well enough `[unverified]`.

## 7. Statements about the existing repo and services

- Starter is TanStack Start with React 19, Tailwind 4 and shadcn `[verified: package.json:18-33]`; installed `@tanstack/react-start` is 1.169.7 `[verified: node_modules/@tanstack/react-start/package.json]`.
- Scripts exist for `dev`, `build`, `lint`, `check`, `typecheck` `[verified: package.json:6-13]`; there is no test script or test runner `[verified: package.json:5-14]`.
- Whether `pnpm build`, `pnpm lint` and `pnpm typecheck` pass on the untouched starter `[unverified]`.
- `.env.local` holds `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `FIREBASE_PROJECT_ID`, `ANTHROPIC_API_KEY`, all filled `[verified: key names listed 2026-11-25]`, and is ignored by git `[verified: .gitignore:6]`.
- Email and password sign-in is enabled in the Firebase project `[verified: Identity Toolkit sign-in probe returned INVALID_LOGIN_CREDENTIALS, not OPERATION_NOT_ALLOWED]`.
- The Firestore database exists and its rules currently deny anonymous reads `[verified: REST read returned 403 PERMISSION_DENIED, not 404]`. Whether the rules already allow owner access `[unverified]`.
- The case has 23 findings, 7 of them `available: false`; `rapd` is unavailable yet has a `value` `[verified: case JSON lines 129-138]`.
- The reference note has 10 pages with printed page numbers `[verified: PDF read]`.
- Java and the Firebase CLI are not installed, so the local emulator is not used `[verified: commands not found]`.
- Firebase ID tokens can be verified with Google's public keys and the project id alone `[unverified]`.

## 8. Risks

- **Speech recognition mishears medical terms.** Mitigation: Claude interprets loosely; typed input is always available.
- **Turn delay.** Haiku with thinking may still take over a second. Mitigation: lowest effort setting, short prompt, measure early.
- **Firebase rules not published.** Saving fails until the user pastes `firestore.rules` into the console. Mitigation: exact text and clicks in the README; `pnpm check:privacy` proves it.
- **Server rendering.** Firebase and speech code must run only in the browser.
- **Time.** Seven hours to the deadline with four checkpoints. Mitigation: cut order is styling, then Sonnet comparison, then the optional improvement.

## 9. Hard-to-reverse decisions

None for a local demo with a fictional case. Closest: the Firestore document shape (one document per attempt) and using browser speech; both can be replaced without data loss that matters.

## 10. Definition of Done

**(a) Acceptance criteria:** every row in section 4. R-1 to R-4, R-6, R-11 to R-14 pass under `pnpm test`. R-5 by the bundle search. R-10 by `pnpm check:privacy` (creates two throwaway accounts in the Firebase project). R-7, R-8, R-9, R-15 by the manual steps written in `docs/submission/write-up.md` with observed results. R-16 by the files existing with those sections.

**(b) Project gates:** `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` each exit 0.

**(c) Must not change:**

- Files in `docs/requirements/` stay byte-identical.
- `.claude/hooks`, `.claude/settings.json` and the planning gate are untouched.
- `.env.local` is never committed; `ANTHROPIC_API_KEY` appears in no client bundle (`grep -r "sk-ant" .output dist` finds nothing).
- Nothing in the Non-goals list is built.
