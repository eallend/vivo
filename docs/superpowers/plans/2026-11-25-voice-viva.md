# Voice Viva Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local demo where a signed-in trainee talks through case EA-VIVA-001, hears each finding exactly as stored, and gets one revision point cited from the reference note.

**Architecture:** Pure TypeScript modules hold all rules (finding wording, viva flow, retrieval, citation check) and are unit-tested. TanStack Start server functions verify the Firebase ID token and call Claude for turn interpretation and the revision point. The browser handles speech (Web Speech API), sign-in and Firestore storage.

**Tech Stack:** TanStack Start 1.169 (React 19, Vite 8), Tailwind 4 + shadcn, Firebase Auth + Firestore (web SDK), `@anthropic-ai/sdk` + `zod`, `jose`, `pdfjs-dist`, `vitest`. Package manager: pnpm. Node 24 runs `.ts` scripts directly.

**Spec:** `docs/superpowers/specs/2026-11-25-voice-viva-design.md`. Reasons for each rule: `docs/decisions.md`.

## Global Constraints

Project gates, each must exit 0: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`.

Must not change:

- Files in `docs/requirements/` stay byte-identical.
- `.claude/hooks`, `.claude/settings.json` and the planning gate are untouched.
- `.env.local` is never committed; `ANTHROPIC_API_KEY` appears in no client bundle (searching the build output for "sk-ant" finds nothing).
- Nothing in the Non-goals list is built: hosting or deployment; more than one case; mobile or non-Chrome browsers; interrupting the examiner; hands-free listening; scoring the trainee; password reset; embeddings or a vector store; server-side Firestore writes; a "is that your final answer?" confirmation step; cleaning up the test accounts the privacy check creates.

Acceptance criteria (design §10(a)): every row R-1 to R-16 in design section 4. R-1 to R-4, R-6, R-11 to R-14 and the test halves of R-5 and R-7 pass under `pnpm test`. R-5's bundle half by the search in Task 6 Step 5. R-10 by `pnpm check:privacy` (creates two throwaway accounts in the Firebase project). R-7's manual half, R-8, R-9, R-15 by the manual steps written in `docs/submission/write-up.md` with observed results. R-16 by the files existing with those sections.

Completion record: before the branch is finished, `docs/reviews/2026-11-25-voice-viva-design-dod.md` exists and lists every Definition of Done item with the command run, its output and pass / fail / not verified. Anything not checked is "not verified".

Working rules:

- Model ids: `claude-haiku-5-5` (turn), `claude-opus-5-5` (revision), read from `VIVA_TURN_MODEL` and `VIVA_REVISION_MODEL` with those defaults. Never add date suffixes.
- Claude calls use the official SDK: `client.messages.parse` with `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod`. No `temperature`, no forced `tool_choice`, no `budget_tokens`.
- Imports: files under `scripts/`, `src/lib/viva/`, `src/lib/revision/` and `src/server/` (except `viva.functions.ts`), and their tests, use relative imports with the `.ts` extension and never `@/`, because `scripts/check-live.ts` loads them with plain Node. JSON is imported with `with { type: "json" }` or read with `fs`. Routes, components and `*.client.ts` files may use `@/`.
- Claude client: `new Anthropic({ timeout: 15_000, maxRetries: 1 })` for the turn call and `{ timeout: 60_000, maxRetries: 1 }` for the revision call.
- Firebase and speech code run only in the browser: routes that use them set `ssr: false`.
- Commits: Conventional Commits, one per task, with an explicit pathspec (`git commit -m "..." -- <paths>`). Never `git add -A`.
- A failure in a file a task does not own is reported, not fixed.

## Review Focus

1. **Empty or whitespace transcript** (mic picked up nothing): no Claude call; the examiner asks the trainee to repeat. Test in Task 6.
2. **Claude returns a finding id that is not in the case:** it is treated as an unknown request, never crashes. Test in Task 2.
3. **Case file edited to an odd shape** (the walkthrough change), for example `available: true` with `value: null`: the examiner says "not recorded", never "null". Test in Task 2.
4. **Claude call fails, times out or refuses:** the turn returns "Sorry, I didn't catch that. Please say it again." and the status does not change; the revision point becomes "no support". Test in Task 6.
5. **Viva ended before any diagnosis was given:** the revision point is "no support" with reason `no_answer` and no model call. Test in Task 6.

## Milestones and hand-offs

- **M1 Rules core:** Tasks 1 to 5. Ends with `pnpm test` green; nothing visible yet.
- **M2 Server and storage:** Tasks 6 and 7. Ends with the live check and the privacy check passing.
- **M3 Screens and submission:** Tasks 8 to 10. Ends with the demo usable and the write-up done.

User hand-offs:

- **H-1 (during Task 7):** paste `firestore.rules` into Firebase console → Firestore Database → Rules → Publish. Without it nothing can be saved.
- **H-2 (ideally before Task 8):** put the chosen Claude Design sketch (screenshots or exported HTML) in `docs/design/`. If it is there when Task 8 starts, Task 8 builds the screens in that design directly and Task 9 is skipped as already done. If it is not there when Tasks 1 to 7 are done, stop and ask the user before starting Task 8: wait for the sketch, or build plain screens now and restyle in Task 9. Do not start Task 8 without the sketch or that answer.
- **H-3 (during Task 10):** a five-minute spoken run in Chrome following `docs/submission/write-up.md`, to record R-7, R-8, R-9, R-15. An agent cannot use the microphone.

Order: Task 1 first. Then Tasks 2, 4 and 7 can run in parallel. Task 3 needs 2. Task 5 needs 4. Task 6 needs 2, 3, 5. Task 8 needs 6, 7. Task 9 needs 8. Task 10 last.

## File map

| Path | Responsibility |
|---|---|
| `src/lib/viva/types.ts` | Shared types, no logic |
| `src/lib/viva/findings.ts` | Finding and history wording |
| `src/lib/viva/flow.ts` | Viva status, examiner reply, follow-up guard |
| `src/lib/revision/retrieve.ts` | BM25 retrieval over passages |
| `src/lib/revision/citation.ts` | Quote normalisation and check |
| `scripts/prepare-note.ts` | PDF → `data/reference-note.passages.json` |
| `src/server/case.server.ts` | Reads the case file per request |
| `src/server/auth.server.ts` | Firebase ID token check |
| `src/server/claude.server.ts` | The two Claude calls |
| `src/server/viva.handlers.ts` | Pure handlers with injected dependencies |
| `src/server/viva.functions.ts` | `createServerFn` wrappers |
| `src/lib/firebase.client.ts`, `src/lib/attempts.client.ts` | Sign-in and Firestore access |
| `src/lib/speech.client.ts` | Listen and speak |
| `src/routes/*` | Screens |
| `firestore.rules`, `scripts/check-privacy.ts`, `scripts/check-live.ts` | Rules and the repeatable checks |

---

### Task 1: Tooling, types and case loading

**Files:**
- Modify: `package.json` (dependencies, scripts)
- Create: `vitest.config.ts`, `src/lib/viva/types.ts`, `src/server/case.server.ts`
- Test: `src/server/case.server.test.ts`

**Interfaces:**
- Produces (in `types.ts`):

```ts
export type Eye = "right" | "left" | "both" | null
export interface Finding { id: string; eye: Eye; label: string; value: string | number | null; unit: string | null; method: string | null; available: boolean; unavailable_reason?: string }
export type PatientField = "age" | "sex" | "presenting_complaint" | "past_ocular_history" | "past_medical_history" | "medications" | "allergies" | "family_history"
export type Patient = Record<PatientField, string | number | string[]>
export interface ExaminerNotes { diagnosis: string; key_points: string[]; follow_up_ideas: string[] }
export interface CaseData { case_id: string; title: string; opening_prompt: string; patient: Patient; findings: Finding[]; examiner_notes: ExaminerNotes }
export interface RevealedFinding { id: string; eye: Eye; label: string; available: boolean; valueText: string | null; method: string | null; reason: string | null; spoken: string }
export type VivaStatus = "in_progress" | "follow_up_asked" | "finished"
export interface Interpretation { findingIds: string[]; historyFields: PatientField[]; unknownRequests: string[]; gaveAnswer: boolean; followUpQuestion: string | null }
export interface ExaminerReply { spoken: string; revealed: RevealedFinding[]; status: VivaStatus; followUpQuestion: string | null }
export interface Passage { id: string; pages: number[]; heading: string; text: string }
export type NoSupportReason = "no_answer" | "no_passages" | "model_unsupported" | "quote_not_found" | "model_error"
export type RevisionPoint =
  | { status: "supported"; point: string; pages: number[]; excerpt: string; retrievedPages: number[] }
  | { status: "no_support"; reason: NoSupportReason; retrievedPages: number[] }
```

- Produces (in `case.server.ts`): `loadCase(path?: string): Promise<CaseData>`. Default path: `process.env.VIVA_CASE_PATH`, else `docs/requirements/Eye Academy - Developer Take-Home (Case EA-VIVA-001).json` resolved from `process.cwd()`. Reads the file on every call, no cache.

- [ ] **Step 1:** Run `pnpm typecheck`, `pnpm lint`, `pnpm build` on the untouched starter and note the result. A failure here is reported before anything else.
- [ ] **Step 2:** `pnpm add firebase @anthropic-ai/sdk zod jose` and `pnpm add -D vitest pdfjs-dist`. Add scripts: `"test": "vitest run"`, `"prepare:note": "node scripts/prepare-note.ts"`, `"check:privacy": "node --env-file=.env.local scripts/check-privacy.ts"`, `"check:live": "node --env-file=.env.local scripts/check-live.ts"`. `vitest.config.ts`: node environment, `resolve.tsconfigPaths: true`, include `src/**/*.test.ts` and `scripts/**/*.test.ts`.
- [ ] **Step 3: Write the failing test** `case.server.test.ts`:

```ts
it("loads the provided case", async () => {
  const c = await loadCase()
  expect(c.case_id).toBe("EA-VIVA-001")
  expect(c.findings).toHaveLength(24)
  expect(c.findings.filter((f) => !f.available)).toHaveLength(6)
})
it("re-reads the file on every call", async () => {
  // write a temp copy with iop_right.value = 44, load, change to 45, load again
  expect(first.findings.find((f) => f.id === "iop_right")!.value).toBe(44)
  expect(second.findings.find((f) => f.id === "iop_right")!.value).toBe(45)
})
```

- [ ] **Step 4:** Run `pnpm test`; expect FAIL (module missing). Implement `types.ts` and `loadCase`. Run again; expect PASS.
- [ ] **Step 5:** Run all four gates. Commit: `chore: add test runner, dependencies, case types and loader`.

### Task 2: Finding and history wording (R-1, R-2, R-3, R-4)

**Files:**
- Create: `src/lib/viva/findings.ts`
- Test: `src/lib/viva/findings.test.ts`

**Interfaces:**
- Consumes: types from Task 1; tests load the real case with `loadCase()`.
- Produces:
  - `valueWithUnit(value: string | number | null, unit: string | null): string | null`
  - `revealFinding(f: Finding): RevealedFinding`
  - `resolveFindings(c: CaseData, ids: string[]): { revealed: RevealedFinding[]; unknownIds: string[] }`
  - `formatHistory(p: Patient, fields: PatientField[]): string`
  - `UNKNOWN_REQUEST_TEXT = "That is not available in this case."`

Rules the tests do not fully fix:

- Unit is appended with one space unless the value text already contains the unit, compared lower-case.
- `spoken` for an available finding: `"<Eye prefix>, <label lower-case>: <valueText>. <method>."` where the prefix is "Right eye", "Left eye", "Both eyes", or omitted with the label capitalised when `eye` is null. Omit the method sentence when `method` is null.
- `spoken` for `available: false`: `"<prefix>, <label>: not available. <unavailable_reason>."`; `valueText` is null and `reason` is set.
- `available: true` with `value: null`: `valueText` is "not recorded".
- `resolveFindings` drops duplicate ids, puts ids missing from the case in `unknownIds`, and orders by case order within eye rank right, left, both, null.
- `formatHistory` gives one sentence per field, for example "Allergies: Sulfonamide antibiotics (rash)."; arrays are joined with "; ".

- [ ] **Step 1: Write the failing tests:**

```ts
const byId = (id: string) => revealFinding(c.findings.find((f) => f.id === id)!)
it("R-1 keeps eye, value, unit", () => {
  const iop = byId("iop_right")
  expect(iop.spoken).toContain("Right eye")
  expect(iop.spoken).toContain("58 mmHg")
  expect(iop.spoken).toContain("Goldmann applanation")
  expect(byId("bp").spoken).toContain("168/94 mmHg")
  expect(byId("va_right").spoken).toMatch(/6\/36.*Snellen/)
  expect(byId("pupil_right").valueText!.match(/mm/g)).toHaveLength(1)
})
it("R-2 states unavailable findings", () => {
  const g = byId("gonio_right")
  expect(g.spoken).toContain("not available")
  expect(g.spoken).toContain("No view: corneal oedema")
  const r = byId("rapd")
  expect(r.spoken).toContain("Right pupil fixed")
  expect(r.spoken).not.toContain("Not assessable")
  expect(r.valueText).toBeNull()
})
it("R-3 orders right before left", () => {
  expect(resolveFindings(c, ["iop_left", "iop_right"]).revealed.map((f) => f.id)).toEqual(["iop_right", "iop_left"])
})
it("R-4 reads the value from the file", () => {
  const edited = structuredClone(c); edited.findings.find((f) => f.id === "iop_right")!.value = 44
  expect(resolveFindings(edited, ["iop_right"]).revealed[0].spoken).toContain("44 mmHg")
})
it("treats an id missing from the case as unknown", () => {
  expect(resolveFindings(c, ["ct_head", "iop_right", "iop_right"])).toMatchObject({ unknownIds: ["ct_head"], revealed: [{ id: "iop_right" }] })
})
it("says not recorded for an available finding with no value", () => {
  expect(revealFinding({ ...c.findings[0], value: null }).spoken).toContain("not recorded")
  expect(revealFinding({ ...c.findings[0], value: null }).spoken).not.toContain("null")
})
it("answers history from the patient block", () => {
  expect(formatHistory(c.patient, ["allergies", "medications"])).toContain("Sulfonamide antibiotics (rash)")
  expect(formatHistory(c.patient, ["medications"])).toContain("Chlorphenamine 4 mg")
})
```

- [ ] **Step 2:** Run `pnpm test src/lib/viva/findings.test.ts`; expect FAIL.
- [ ] **Step 3:** Implement the five exports.
- [ ] **Step 4:** Run the test file; expect PASS. Run `pnpm typecheck` and `pnpm lint`.
- [ ] **Step 5:** Commit: `feat: word findings and history from the case file`.

### Task 3: Viva flow and follow-up guard (R-6, R-7)

**Files:**
- Create: `src/lib/viva/flow.ts`
- Test: `src/lib/viva/flow.test.ts`

**Interfaces:**
- Consumes: `resolveFindings`, `formatHistory`, `UNKNOWN_REQUEST_TEXT` from Task 2, which must be committed first.
- Produces:
  - `guardFollowUp(question: string | null, ideas: string[]): string`
  - `buildReply(c: CaseData, status: VivaStatus, i: Interpretation): ExaminerReply`
  - `CLOSING_TEXT = "Thank you. That concludes the viva."`
  - `PROMPT_AGAIN_TEXT = "Please ask for an examination finding, or tell me your diagnosis and management."`

Rules:

- `guardFollowUp` returns `ideas[0]` when the question is null, blank, contains a digit, or matches `/\b(right|left)\b/i`; otherwise the trimmed question.
- `buildReply` with status `follow_up_asked`: reply is `CLOSING_TEXT`, status `finished`, no findings revealed whatever the interpretation holds.
- With status `finished`: reply is `CLOSING_TEXT`, status stays `finished`.
- With status `in_progress`: `spoken` joins, in order, the spoken text of each resolved finding, the history text, `UNKNOWN_REQUEST_TEXT` once if `unknownRequests` or `unknownIds` is non-empty, then the guarded follow-up if `gaveAnswer`. Status becomes `follow_up_asked` only if `gaveAnswer`. If nothing was produced, `spoken` is `PROMPT_AGAIN_TEXT`.

- [ ] **Step 1: Write the failing tests:**

```ts
const base: Interpretation = { findingIds: [], historyFields: [], unknownRequests: [], gaveAnswer: false, followUpQuestion: null }
it("R-6 one follow-up then finished", () => {
  const a = buildReply(c, "in_progress", { ...base, gaveAnswer: true, followUpQuestion: "Why treat the fellow eye as well?" })
  expect(a.status).toBe("follow_up_asked")
  expect(a.followUpQuestion).toBe("Why treat the fellow eye as well?")
  const b = buildReply(c, "follow_up_asked", { ...base, gaveAnswer: true, followUpQuestion: "Another?", findingIds: ["iop_right"] })
  expect(b).toMatchObject({ status: "finished", spoken: CLOSING_TEXT, revealed: [], followUpQuestion: null })
})
it("R-6 findings come before the follow-up in a mixed turn", () => {
  const r = buildReply(c, "in_progress", { ...base, findingIds: ["gonio_left"], gaveAnswer: true, followUpQuestion: "What would you do next?" })
  expect(r.spoken.indexOf("Iridotrabecular")).toBeLessThan(r.spoken.indexOf("What would you do next?"))
  expect(r.revealed).toHaveLength(1)
})
it("R-7 a follow-up that restates a finding is replaced", () => {
  const ideas = c.examiner_notes.follow_up_ideas
  expect(guardFollowUp("You said the pressure was 58, why?", ideas)).toBe(ideas[0])
  expect(guardFollowUp("Why treat the left eye too?", ideas)).toBe(ideas[0])
  expect(guardFollowUp(null, ideas)).toBe(ideas[0])
  expect(guardFollowUp("  Why might pilocarpine fail early on?  ", ideas)).toBe("Why might pilocarpine fail early on?")
})
it("unknown request and empty turn", () => {
  expect(buildReply(c, "in_progress", { ...base, unknownRequests: ["CT head"] }).spoken).toBe(UNKNOWN_REQUEST_TEXT)
  expect(buildReply(c, "in_progress", base)).toMatchObject({ spoken: PROMPT_AGAIN_TEXT, status: "in_progress" })
})
```

Note: the case's own first idea is "Why treat the left eye as well?", which contains "left". The guard applies to model text only; a case-file idea is returned as written.

- [ ] **Step 2:** Run the test file; expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the test file; expect PASS. Run `pnpm typecheck` and `pnpm lint`.
- [ ] **Step 5:** Commit: `feat: viva flow with one guarded follow-up`.

### Task 4: Reference note passages (R-13)

**Files:**
- Create: `scripts/prepare-note.ts`, `data/reference-note.passages.json` (generated, committed)
- Test: `scripts/prepare-note.test.ts`

**Interfaces:**
- Produces: `data/reference-note.passages.json`, a `Passage[]` with ids `p-001`, `p-002`, … in reading order. `pnpm prepare:note` regenerates it from `docs/requirements/Eye Academy - Glaucoma_and_Angle_Closure_Reference_Note.pdf`.

Approach: use `pdfjs-dist` (`legacy/build/pdf.mjs`) `getTextContent()` per page. Group text items into lines by their y position, lines into blocks by vertical gap, and detect headings by font height larger than body text. Each block is one passage carrying the nearest heading above it. Drop the running header ("eyeacademy Take-home reference note") and footer ("Glaucoma and angle closure · Eye Academy reference note N") and a table header row repeated at the top of a page. When the last block of a page does not end in `.`, `)` or `:` and the next page's first block is not a heading, join them into one passage whose `pages` lists both.

- [ ] **Step 1: Write the failing test** (reads the generated JSON):

```ts
const find = (s: string) => passages.filter((p) => p.text.includes(s))
it("R-13 pages and headings", () => {
  expect(find("Lie the patient flat")[0].pages).toEqual([5])
  expect(find("Prophylactic LPI in the fellow eye")[0].pages).toEqual([6])
  const acet = find("Check for sulfonamide allergy")[0]
  expect(acet.pages).toEqual([5, 6])
  expect(acet.text).toContain("Acetazolamide 500 mg")
  expect(acet.heading).toBe("Immediate treatment")
})
it("has no header or footer text and unique ids", () => {
  expect(passages.some((p) => /Take-home reference note|Eye Academy reference note \d/.test(p.text))).toBe(false)
  expect(new Set(passages.map((p) => p.id)).size).toBe(passages.length)
  expect(passages.length).toBeGreaterThan(80)
  expect(find("Dim light, such as a cinema")[0]).toMatchObject({ pages: [4], heading: "Triggers" })
})
```

- [ ] **Step 2:** Run it; expect FAIL (file missing).
- [ ] **Step 3:** Implement the script, run `pnpm prepare:note`, read the JSON by eye for split or glued passages around pages 4 to 6.
- [ ] **Step 4:** Run the test file; expect PASS. Run `pnpm typecheck` and `pnpm lint`.
- [ ] **Step 5:** Commit: `feat: extract reference note into page-tagged passages`.

### Task 5: Retrieval and citation check (R-11, R-12)

**Files:**
- Create: `src/lib/revision/retrieve.ts`, `src/lib/revision/citation.ts`
- Test: `src/lib/revision/revision.test.ts`

**Interfaces:**
- Consumes: `data/reference-note.passages.json` (Task 4), `Passage`, `RevisionPoint`.
- Produces:
  - `retrieve(passages: Passage[], query: string, k = 5): { passage: Passage; score: number }[]` — BM25 (k1 1.5, b 0.75) over lower-cased word tokens of heading + text, English stop words removed, results with score 0 dropped.
  - `normaliseForQuote(s: string): string` — lower-case; curly quotes to plain; every dash and hyphen removed; whitespace collapsed to one space; trimmed.
  - `checkCitation(reply: { supported: boolean; point: string; passageId: string | null; quote: string | null }, retrieved: Passage[]): RevisionPoint` — `retrievedPages` is the sorted unique pages of `retrieved`. Returns `no_support` with `model_unsupported` when `supported` is false or a field is missing, `quote_not_found` when the passage id is not among `retrieved`, the quote is under 15 characters, or the normalised quote is not inside the normalised passage text. Otherwise `supported` with `pages` from the passage and `excerpt` = the quote.

- [ ] **Step 1: Write the failing tests** (on the real passages file):

```ts
it("R-11 retrieval follows the words", () => {
  expect(retrieve(passages, "pilocarpine iris sphincter ischaemic")[0].passage.pages).toContain(5)
  expect(retrieve(passages, "ciliochoroidal effusion cycloplegics")[0].passage.pages).toContain(8)
  expect(retrieve(passages, "zebra quantum football")).toEqual([])
  expect(retrieve(passages, "pilocarpine pressure iridotomy")).toHaveLength(5)
})
it("R-12 quote must be in the note", () => {
  const p = passages.find((x) => x.text.includes("pupilblock"))!
  const ok = checkCitation({ supported: true, point: "x", passageId: p.id, quote: "non-pupil-block mechanisms are relatively more important" }, [p])
  expect(ok).toMatchObject({ status: "supported", pages: p.pages })
  expect(checkCitation({ supported: true, point: "x", passageId: p.id, quote: "pilocarpine cures all angle closure instantly" }, [p])).toMatchObject({ status: "no_support", reason: "quote_not_found" })
  expect(checkCitation({ supported: true, point: "x", passageId: "p-999", quote: "non-pupil-block mechanisms are relatively" }, [p])).toMatchObject({ reason: "quote_not_found" })
  expect(checkCitation({ supported: false, point: "", passageId: null, quote: null }, [p])).toMatchObject({ reason: "model_unsupported", retrievedPages: p.pages })
})
```

- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement both files.
- [ ] **Step 4:** Run; expect PASS. Run `pnpm typecheck` and `pnpm lint`. This closes M1: run all four gates.
- [ ] **Step 5:** Commit: `feat: keyword retrieval and verbatim citation check`.

### Task 6: Server side: token check, Claude calls, handlers (R-5, R-14)

**Files:**
- Create: `src/server/auth.server.ts`, `src/server/claude.server.ts`, `src/server/viva.handlers.ts`, `src/server/viva.functions.ts`, `scripts/check-live.ts`
- Test: `src/server/auth.server.test.ts`, `src/server/viva.handlers.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 to 5.
- Produces:
  - `verifyIdToken(token: string | undefined, projectId: string, keys?: JWTVerifyGetKey): Promise<{ uid: string }>` — `jose.jwtVerify` with `issuer: "https://securetoken.google.com/<projectId>"`, `audience: projectId`, RS256; default keys `createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"))`. Throws `Error("unauthenticated")` on any failure.
  - `interpretTurn(args: { c: CaseData; text: string; history: { role: "trainee" | "examiner"; text: string }[]; status: VivaStatus }): Promise<Interpretation>` — turn model, `max_tokens: 1024`, `output_config: { effort: "low", format: zodOutputFormat(schema) }`. System prompt holds: the finding list as `id | eye | label` only, the patient field names, the instruction to list both eyes when none is named, to set `gaveAnswer` only when the trainee states a diagnosis or management, to write one follow-up question that reacts to the trainee's answer without restating any finding, number or eye, and the `follow_up_ideas` as inspiration. It never includes finding values.
  - `writeRevision(args: { answerText: string; notes: ExaminerNotes; retrieved: Passage[] }): Promise<{ supported: boolean; point: string; passageId: string | null; quote: string | null }>` — revision model, `max_tokens: 4000`, `output_config: { effort: "medium", format }`. Prompt: pick the most important thing the trainee missed or got wrong that one passage supports; copy the quote word for word, 15 to 300 characters; return `supported: false` if none fits. If `stop_reason` is `"refusal"` or `parsed_output` is null, throw. Add the refusal `fallbacks` option from the Claude API reference only if the SDK's typed `parse` call accepts it.
  - In `viva.handlers.ts`, with `Deps = { loadCase: () => Promise<CaseData>; interpret: typeof interpretTurn; revise: typeof writeRevision; passages: Passage[] }`:
    - `handleStart(d: Deps): Promise<{ caseId: string; title: string; openingPrompt: string }>`
    - `handleTurn(d: Deps, input: { text: string; status: VivaStatus; history: {...}[] }): Promise<ExaminerReply>`
    - `handleRevision(d: Deps, input: { answerText: string }): Promise<RevisionPoint>`
    - `REPEAT_TEXT = "Sorry, I didn't catch that. Please say it again."`
  - In `viva.functions.ts`: `startViva`, `takeTurn`, `makeRevisionPoint`, each `createServerFn({ method: "POST" })` taking `{ idToken, ...input }`, calling `verifyIdToken(idToken, process.env.FIREBASE_PROJECT_ID!)` first, then the handler with real deps. Check the installed type for the validator method name (`inputValidator` or `validator`).

Rules: `handleTurn` with blank `text` returns `REPEAT_TEXT`, same status, no `interpret` call. If `interpret` throws or rejects (including the SDK's timeout error), same result. `handleRevision` with blank `answerText` returns `no_support` / `no_answer` without retrieval; with no retrieved passages returns `no_passages` without calling `revise`; if `revise` throws returns `model_error`; otherwise `checkCitation`.

- [ ] **Step 1: Write the failing tests:**

```ts
// auth.server.test.ts: generate an RS256 key pair with jose, sign tokens, pass a local key resolver
it("R-14 rejects missing and wrong-audience tokens", async () => {
  await expect(verifyIdToken(undefined, "proj", keys)).rejects.toThrow("unauthenticated")
  await expect(verifyIdToken(await sign({ aud: "other", iss: "https://securetoken.google.com/other", sub: "u1" }), "proj", keys)).rejects.toThrow("unauthenticated")
  await expect(verifyIdToken(await sign({ aud: "proj", iss: "https://securetoken.google.com/proj", sub: "u1" }), "proj", keys)).resolves.toEqual({ uid: "u1" })
})
// viva.handlers.test.ts: deps with real loadCase and passages, fake interpret and revise
it("R-5 no examiner notes leave the server", async () => {
  const out = JSON.stringify([await handleStart(d), await handleTurn(d, { text: "pressures please", status: "in_progress", history: [] })])
  for (const s of [c.examiner_notes.diagnosis, ...c.examiner_notes.key_points]) expect(out).not.toContain(s)
})
it("blank turn and failing model ask the trainee to repeat", async () => {
  expect(await handleTurn(d, { text: "   ", status: "in_progress", history: [] })).toMatchObject({ spoken: REPEAT_TEXT, status: "in_progress" })
  expect(interpret).not.toHaveBeenCalled()
  expect(await handleTurn({ ...d, interpret: async () => { throw new Error("x") } }, { text: "iop", status: "in_progress", history: [] })).toMatchObject({ spoken: REPEAT_TEXT, status: "in_progress" })
})
it("revision point: no answer, no passages, model error, supported", async () => {
  expect(await handleRevision(d, { answerText: "" })).toMatchObject({ status: "no_support", reason: "no_answer" })
  expect(await handleRevision(d, { answerText: "zebra quantum football" })).toMatchObject({ reason: "no_passages" })
  expect(revise).not.toHaveBeenCalled()
  expect(await handleRevision({ ...d, revise: async () => { throw new Error("x") } }, { answerText: "I would give pilocarpine" })).toMatchObject({ reason: "model_error" })
  // fake revise quoting the first retrieved passage's opening 40 characters → status "supported", retrievedPages non-empty
})
```

- [ ] **Step 2:** Run; expect FAIL. Implement the four files. Run; expect PASS.
- [ ] **Step 3:** Write `scripts/check-live.ts`: builds real deps and runs three checks against the live API, printing expected and observed for each and exiting non-zero on a mismatch:
  1. "What is the intraocular pressure in the right eye?" → revealed ids equal `["iop_right"]`, spoken contains "58 mmHg".
  2. "Can I see the gonioscopy of the right eye?" → revealed `gonio_right`, spoken contains "not available" and "No view: corneal oedema".
  3. Revision for "This is acute angle closure. I would give pilocarpine straight away and acetazolamide." → prints retrieved pages, the passage id, pages and quote; passes if status is `supported` and the quote is in that passage, or prints the no-support reason and fails.
  It also prints each call's duration, and reads the model ids from the environment so Sonnet can be timed with `VIVA_TURN_MODEL=claude-sonnet-5-5 pnpm check:live`.
- [ ] **Step 4:** Run `pnpm check:live`; expect three PASS lines. If a model id is rejected, report the error text and stop. Start `pnpm dev`, confirm a server function can read `process.env.ANTHROPIC_API_KEY`; if it is undefined, load `.env.local` in `vite.config.ts` with Vite's `loadEnv` into `process.env`.
- [ ] **Step 5:** Run all four gates. After `pnpm build`, find the client output folder (`ls -d dist/client .output/public 2>/dev/null`; record which exists in the report), then run `grep -rl -e "sk-ant" -e "anticholinergic antihistamine" <that folder>`. Expected: no output, exit status 1. Commit: `feat: server functions for viva turns and the revision point`.

### Task 7: Sign-in, attempt storage, privacy (R-9 storage half, R-10)

**Files:**
- Create: `src/lib/firebase.client.ts`, `src/lib/attempts.client.ts`, `firestore.rules`, `scripts/check-privacy.ts`
- Test: `scripts/check-privacy.ts` is the test (live)

**Interfaces:**
- Produces:
  - `firebase.client.ts`: `auth`, `db` (initialised from the four `VITE_FIREBASE_*` variables), `signUp(email, password)`, `signIn(email, password)`, `signOutUser()`, `onUser(cb: (u: User | null) => void): () => void`, `getIdToken(): Promise<string>`.
  - `attempts.client.ts`:

```ts
export interface Turn { role: "trainee" | "examiner"; text: string; at: number }
export interface Attempt { id: string; caseId: string; title: string; openingPrompt: string; status: VivaStatus; createdAt: number; updatedAt: number; turns: Turn[]; revealedFindings: RevealedFinding[]; followUp: { question: string; answer: string | null } | null; answerText: string; revisionPoint: RevisionPoint | null; turnTimingsMs: number[] }
createAttempt(uid: string, start: { caseId: string; title: string; openingPrompt: string }): Promise<Attempt>
saveAttempt(uid: string, a: Attempt): Promise<void>      // setDoc, whole document, updatedAt refreshed
listAttempts(uid: string): Promise<Attempt[]>            // newest first
getAttempt(uid: string, id: string): Promise<Attempt | null>
```

  - `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/attempts/{attemptId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

- [ ] **Step 1:** Write `scripts/check-privacy.ts` using only `fetch`: sign up two accounts `viva-check-<random>@example.com` through `identitytoolkit.googleapis.com/v1/accounts:signUp`; as A, PATCH a document at `users/<A>/attempts/privacy-check` through the Firestore REST API; expect A's GET 200, B's GET 403, an unauthenticated GET 403. Print expected and observed; exit non-zero on mismatch.
- [ ] **Step 2:** Run `pnpm check:privacy`; expect FAIL at A's write until the rules are published. **Hand-off H-1:** ask the user to paste `firestore.rules` into the console and publish.
- [ ] **Step 3:** Implement `firebase.client.ts` and `attempts.client.ts`.
- [ ] **Step 4:** After H-1, run `pnpm check:privacy`; expect PASS. Run `pnpm typecheck` and `pnpm lint`.
- [ ] **Step 5:** Commit: `feat: Firebase sign-in, owner-only attempt storage and privacy check`.

### Task 8: Speech and screens (R-8, R-9, R-15)

**Files:**
- Create: `src/lib/speech.client.ts`, `src/lib/viva/session.ts`, `src/routes/login.tsx`, `src/routes/viva.$attemptId.tsx`, components under `src/components/viva/`
- Modify: `src/routes/index.tsx` (attempts list), `src/routes/__root.tsx` (title "Voice Viva")
- Test: `src/lib/viva/session.test.ts`

**Interfaces:**
- Consumes: server functions (Task 6), `firebase.client.ts` and `attempts.client.ts` (Task 7).
- Produces:
  - `speech.client.ts`: `speechSupported(): boolean`; `listen(): Promise<string>` (one utterance, `en-GB`, resolves with the final transcript, empty string on no speech or error); `speak(text: string, onStart: () => void): Promise<void>` (resolves on end; picks an `en-GB` voice when one exists).
  - `session.ts`: `type TurnState = "your_turn" | "listening" | "thinking" | "examiner_speaking"`; `applyReply(a: Attempt, traineeText: string, reply: ExaminerReply, now: number): Attempt` — appends both turns, merges `revealed` without duplicate ids, sets status, records `followUp.question` when the reply carries one, sets `followUp.answer` when the status moves to `finished`, and appends to `answerText` the trainee text of the turn that triggered the follow-up and of the follow-up answer.

Screens (all `ssr: false`; unauthenticated users are sent to `/login`):

- `/login`: email and password, sign in or sign up, error text from Firebase shown.
- `/`: attempts list (date, status), "Start new viva" (calls `startViva`, `createAttempt`, navigates), sign out.
- `/viva/$attemptId`: loads the attempt. If not `finished`: opening prompt, turn indicator with the four states, mic button (enabled only in `your_turn`), typed-input box, transcript, revealed-findings panel (eye badge, label, `valueText` or "Not available: reason", method), last turn time in ms, "End viva". If `finished`: read-only transcript and findings plus the revision-point card: point, "Reference note, page 5" (or "pages 5–6"), excerpt, or "No support found in the reference note for this answer."
- Turn loop: `listening` → transcript (or typed text) → `thinking`, timer starts → `takeTurn` → `examiner_speaking`, timer stops in `speak`'s `onStart` → `applyReply` → `saveAttempt` → `your_turn`. The opening prompt is spoken when a new attempt opens. When the status becomes `finished` or "End viva" is pressed: `makeRevisionPoint({ answerText })`, save, show the card.
- If `speechSupported()` is false, show "Voice needs desktop Chrome; you can type instead." and keep the text box.
- Use shadcn components (`pnpm dlx shadcn@latest add card input badge`). If `docs/design/` holds a sketch, follow its layout, colour, type and spacing. Otherwise add no custom styling beyond layout.

- [ ] **Step 1: Write the failing test** for `applyReply`:

```ts
it("merges a reply into the attempt", () => {
  const a1 = applyReply(empty, "pressures", { spoken: "Right eye…", revealed: [iopRight, iopLeft], status: "in_progress", followUpQuestion: null }, 1)
  expect(a1.turns.map((t) => t.role)).toEqual(["trainee", "examiner"])
  const a2 = applyReply(a1, "right pressure again", { spoken: "…", revealed: [iopRight], status: "in_progress", followUpQuestion: null }, 2)
  expect(a2.revealedFindings.map((f) => f.id)).toEqual(["iop_right", "iop_left"])
  const a3 = applyReply(a2, "It is angle closure", { spoken: "Why?", revealed: [], status: "follow_up_asked", followUpQuestion: "Why?" }, 3)
  const a4 = applyReply(a3, "Because of pupil block", { spoken: "Thank you.", revealed: [], status: "finished", followUpQuestion: null }, 4)
  expect(a4.followUp).toEqual({ question: "Why?", answer: "Because of pupil block" })
  expect(a4.answerText).toBe("It is angle closure\nBecause of pupil block")
  expect(a2.answerText).toBe("")
})
```

- [ ] **Step 2:** Run; expect FAIL. Implement `session.ts`. Run; expect PASS.
- [ ] **Step 3:** Implement `speech.client.ts` and the three screens.
- [ ] **Step 4:** Run all four gates. Start `pnpm dev` and, with the typed-input box in a browser, run one full viva: sign up, ask "right eye pressure", ask "gonioscopy right eye", give a diagnosis, answer the follow-up, see the revision card, reload, reopen the attempt from the list and compare. Report what was seen; the spoken path is left for H-3.
- [ ] **Step 5:** Commit: `feat: voice viva screens with turn states, saved attempts and revision point`.

### Task 9: Apply the chosen design sketch

**Files:**
- Modify: files under `src/routes/` and `src/components/viva/`, `src/styles.css`

**Interfaces:**
- Consumes: the sketch in `docs/design/` (H-2). If the folder is empty, skip this task and say so in the report.

- [ ] **Step 1:** Read the sketch. List the differences from the current screens in the task report.
- [ ] **Step 2:** Restyle layout, colour, type and spacing to match. Change no behaviour, no text that a test or check reads, and no file outside the list above.
- [ ] **Step 3:** Run all four gates; repeat the typed run from Task 8 Step 4.
- [ ] **Step 4:** Commit: `feat: apply the chosen visual design`.

### Task 10: Submission write-up (R-16, and recorded results for R-7, R-8, R-9, R-15)

**Files:**
- Modify: `README.md`
- Create: `docs/submission/write-up.md`, `CHANGELOG.md`, `.env.example`

**Interfaces:**
- Consumes: outputs of `pnpm check:live` (Haiku and Sonnet runs) and `pnpm check:privacy`; `docs/decisions.md`; git log.

- [ ] **Step 1:** `README.md`: what it is; prerequisites (Node 24, pnpm, desktop Chrome, a Firebase project with Email/Password and Firestore, an Anthropic key); `.env.local` keys from `.env.example`; publishing `firestore.rules`; `pnpm install`, `pnpm dev`, open `http://localhost:3000`; the four gate commands and the two check commands; **the case file the app reads** and that an edit shows on the next turn; `pnpm prepare:note`.
- [ ] **Step 2:** `docs/submission/write-up.md` with these sections, filled from real runs:
  - **What works and where I stopped.**
  - **Model choice and responsiveness:** browser speech + Claude Haiku 5.5, why (exact findings, testability, no second key); alternative considered (a real-time voice model) and Sonnet 5.5; measured turn times for Haiku and Sonnet from `pnpm check:live`; the on-screen timer's start and stop points and what it leaves out.
  - **Three repeatable checks:** available finding, unavailable finding, citation; each with command or steps, expected and observed; for the citation check the retrieved pages and the cited passage.
  - **Manual spoken run (H-3):** numbered steps for R-7, R-8, R-9, R-15 with an "observed" line each, left as "not yet run" until the user does them.
  - **Handover:** how the note was prepared and passages selected; known limits (Chrome only, no undo of an early answer, privacy check leaves two test accounts, one-document attempt).
  - **AI tools:** one concrete example of work they did and how it was verified.
  - **Improvement I would make next** and why.
- [ ] **Step 3:** `CHANGELOG.md`: one section per milestone M1 to M3, two to four plain sentences each on what now works, with the commit subjects and short hashes beneath.
- [ ] **Step 4:** Run all four gates. Confirm `git status` shows no change under `docs/requirements/` and `.env.local` is untracked.
- [ ] **Step 5:** Commit: `docs: run instructions, submission write-up and changelog`. **Hand-off H-3:** ask the user to do the spoken run and fill in the observed lines.
