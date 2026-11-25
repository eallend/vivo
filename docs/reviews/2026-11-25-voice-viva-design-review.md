# Review of 2026-11-25-voice-viva-design.md

Sources: critic subagent (lens `combined`) and builder check, both run 2026-11-25 on the first draft. Duplicates merged. "Assessment" is the design author's check for Critical and High; the author is biased toward the document.

| ID | Severity | Finding | Evidence | Author's assessment | Decision |
|---|---|---|---|---|---|
| F1 | Critical | Display rule adds the unit only to numeric values, so text values lose real units. Also raised by the builder check. | `bp` is `"168/94"` + `mmHg` (case JSON:228-229); `va_right` is `"6/36"` + `Snellen` (JSON:25-26). R-1 tests neither. | Confirmed. Read both JSON entries; design §3 "Display rule" drops their units. | pending |
| F2 | High | The follow-up is free model text spoken aloud, so the model can restate an eye, value or unit wrongly. | Design §2 says "the model never writes an eye, value or unit" and also has it write the follow-up. No requirement constrains the follow-up. | Confirmed. The two statements in §2 contradict each other. | pending |
| F3 | High | Retrieval query includes `examiner_notes`, which outweighs a short spoken answer. Results barely depend on the trainee; the query never scores zero, so "no support" cannot trigger at retrieval. Builder check asks the same: said or missed? | Brief: "one revision point based on the trainee's answer". Examiner notes are JSON:244-253. | Confirmed as a design flaw. Whether the point should cover what was missed is the user's call. | pending |
| F4 | High | Quote check normalises whitespace only. PDF extraction joins hyphens and keeps typographic dashes and quotes, so a correct quote can be rejected. R-12 never runs on the real extracted file. | Extracted text shows "Non-pupilblock" (p.3), "openangle" (p.10), "Posner–Schlossman", "Schlemm's". | Confirmed. The same joined words appear in the PDF text read during design. | pending |
| F5 | Medium | A bullet that crosses a page break is split; the sulfonamide-allergy check sits in the page-6 half without its heading. | Note p.5 last bullet continues on p.6; case key point JSON:248. | not assessed (Medium) | pending |
| F6 | Medium | App reads a copy in `data/cases/`; reviewers will likely edit the JSON in `docs/requirements/` and see no effect. Also raised by the builder check. | Design §3 "a copy of the provided JSON"; DoD (c). | not assessed (Medium) | pending |
| F7 | Medium | One intent per turn. A mixed turn or a misread question ends the questioning early, with no undo. | Design §2 intent list; §3 flow. | not assessed (Medium) | pending |
| F8 | Medium | Factual errors in §7: the case has 24 findings, 6 unavailable (design says 23 and 7); shadcn is at package.json:43, not 18-33. | `available: false` at JSON:136, 164, 183, 211, 220, 239. | Confirmed by recount. | pending |
| F9 | Low | R-5 checks only the built bundle; a server function returning the whole case would leak `examiner_notes` at runtime. | Design R-5. | not assessed (Low) | pending |
| F10 | Low | Timer starts at the final transcript, so it omits Chrome's end-of-speech wait; start point for typed turns is undefined. | Design §3 "Timing". | not assessed (Low) | pending |
| F11 | Low | `pnpm check:privacy` creates two accounts in the live project on every run, with no cleanup. | Design R-10. | not assessed (Low) | pending |
| F12 | Low | Unverifiable: model ids and Haiku options; how Chrome speaks "6/36", "mmHg", "+3.50 DS"; where `pnpm build` writes the client bundle. | Design §2, §7, R-5. | not assessed (Low) | pending |
| F13 | Low | Needed packages are not listed (firebase, JWT library, Anthropic SDK, vitest, PDF extractor). | package.json. | not assessed (Low) | pending |
| B4 | Low | Builder check: must the follow-up come from the case's `follow_up_ideas`, or may Claude write its own? | Case JSON:254-258. | not assessed (Low) | pending |

Critic's blocking line: F1 should block approval; F2 and F3 should be fixed in the spec before the build starts.
