# Business-logic decisions

One entry per decision: the problem, what we do, why. "By" says who decided: **user**, or **Claude** (proposed, not objected to). Technical detail lives in `docs/superpowers/specs/2026-11-25-voice-viva-design.md`.

## Voice and findings

**D-1 Who words a finding** (by user)
- Problem: an AI that reads findings aloud can swap an eye or mangle a value, the exact thing the brief checks.
- Decision: the AI only identifies which finding was asked for. Code reads it from the case file and builds the sentence.
- Why: wording becomes exact and testable.

**D-2 Where the voice comes from** (by user)
- Problem: the available key is for Claude, which is text-only.
- Decision: Chrome's built-in speech recognition and speech synthesis.
- Why: no second paid key, and it fits the time. Cost: synthetic voice, Chrome only. A real-time voice model is the named alternative.

**D-3 When to say the unit** (by user, review finding F1)
- Problem: some values already contain their unit ("5 mm"), others don't ("168/94" + mmHg).
- Decision: add the unit unless the value text already contains it.
- Why: never drops a unit, never says it twice.

**D-4 Unavailable findings** (by Claude)
- Problem: one finding is marked unavailable but still has a value; some requests match nothing in the case.
- Decision: the `available` flag wins and the stated reason is spoken. Unknown requests get "That is not available in this case."
- Why: the flag is the case author's explicit signal.

**D-5 No eye named** (by Claude)
- Problem: "What's the pressure?" could mean either eye.
- Decision: give both eyes, right then left.
- Why: guessing one eye risks the wrong one; an examiner would give both.

**D-6 History questions** (by Claude)
- Problem: the trainee may ask about medications or allergies, which are not "findings".
- Decision: answer from the case's patient section.
- Why: the allergy and the new antihistamine are key to this case.

## Viva flow

**D-7 The follow-up question** (by user, review finding F2)
- Problem: it must respond to the trainee, yet free AI text could misstate a finding.
- Decision: the AI writes it and is told not to restate findings. Code rejects one containing a number or "right"/"left" and uses the case file's first suggested question.
- Why: responsive in the normal case, safe in the bad one.

**D-8 Exactly one follow-up, then the viva ends** (by Claude)
- Problem: the brief says "one spoken follow-up".
- Decision: one question after the diagnosis; the trainee's reply closes the attempt.
- Why: literal reading of the brief; keeps the flow short.

**D-9 A turn that asks and answers at once** (by user, review finding F7)
- Problem: "I think it's angle closure, can I see the gonioscopy?" is both.
- Decision: give the findings first, then the follow-up. No "final answer?" confirmation.
- Why: nothing asked for is lost; confirmation was cut for time.

**D-10 The diagnosis stays on the server** (by Claude)
- Problem: the answer key is in the same file as the findings.
- Decision: only server code reads the case; the browser gets the opening prompt and revealed findings.
- Why: a trainee could otherwise read the answer in the browser.

**D-11 Which case file the app reads** (by user, review finding F6)
- Problem: reviewers will edit the file they sent; a copy would show no effect.
- Decision: read the original in `docs/requirements/` on every request.
- Why: their change shows on the next turn.

## Revision point

**D-12 What the revision point is about** (by user)
- Problem: "based on the trainee's answer" can mean what they said or what they missed.
- Decision: the most important thing they missed or got wrong, judged against the case's answer key.
- Why: more useful for revision, and it still depends on the answer.

**D-13 What the search uses** (by user, review finding F3)
- Problem: adding the answer key to the search made every trainee get the same passages.
- Decision: search with the trainee's own words; give the answer key to the AI separately.
- Why: results follow the trainee, and "no support" can really happen.

**D-14 Proving the citation** (by user, review finding F4)
- Problem: an AI can invent a quote; PDF text has glued words and odd dashes that break exact matching.
- Decision: the AI must quote word for word. Code checks the quote against the passage, ignoring spacing, dashes, hyphens and quote marks. The page number comes from the passage, never from the AI.
- Why: a citation is shown only if the note really says it.

**D-15 When to say "no support"** (by Claude)
- Problem: the brief requires telling the trainee when the note doesn't back the point.
- Decision: shown when no passage matches, when the AI finds nothing supported, or when the quote check fails.
- Why: all three mean we cannot show evidence.

**D-16 Passages across a page break** (by user, review finding F5)
- Problem: a bullet split over pages 5 and 6 lost its heading and half its text.
- Decision: join it into one passage that lists both pages.
- Why: the sulfonamide-allergy warning, key to this case, sits in that bullet.

## Accounts, storage, models

**D-17 Sign-in** (by Claude)
- Decision: email and password.
- Why: the brief names no method; two test accounts are easy to make to show privacy.

**D-18 What is saved** (by Claude)
- Decision: one record per attempt, under its owner, readable and writable only by that owner. Revealed findings are saved as they were when revealed.
- Why: a reopened attempt shows what the trainee actually saw, even if the case file changed later.

**D-19 Which AI model does what** (by user)
- Decision: Haiku 5.5 for live turns, Opus 5.5 for the revision point, Sonnet 5.5 measured as the comparison. All swappable by setting.
- Why: speed matters in conversation; quality matters once at the end.

**D-20 What the turn timer measures** (by Claude)
- Decision: from the final transcript (or typed submit) to the start of the examiner's audio.
- Why: both points are exact events in the browser. It leaves out Chrome's pause before it decides speech has ended; the write-up says so.
