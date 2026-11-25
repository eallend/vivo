# Prompt for Claude Design

Paste everything below the line into Claude Design. Save the chosen result (screenshots or exported HTML) into this folder, `docs/design/`.

---

Design the screens for a small web app called "Voice Viva". The visual direction, layout and styling are entirely yours. Below are only the purpose, the scenarios, the rules and the limits.

## What the product is

A practice oral exam (a "viva") for ophthalmology trainees. The trainee talks out loud with an AI examiner about one fictional patient case. The trainee asks for examination findings, the examiner reads each one back, then the trainee gives a diagnosis and a management plan, answers one follow-up question, and receives one revision point backed by a quote from a reference note.

## Who uses it

A junior eye doctor preparing for an oral exam, alone at a desk, on a laptop in desktop Chrome, using the laptop microphone and speakers. They are under mild exam stress and are looking at the screen while speaking.

## Scenarios

**1. Sign in**
- The trainee signs in with email and password, or creates an account with the same two fields.
- Errors to show: wrong password, email already in use, password too short.

**2. Home: my attempts**
- The trainee sees their own past attempts, newest first. Each has a date and time and a status: in progress or finished.
- They can start a new viva, open any attempt, or sign out.
- First-time state: no attempts yet.

**3. The viva (the main screen)**
- The examiner opens by saying, and the screen shows: "A 64-year-old woman attends eye casualty at 23:40 with a painful red right eye. Ask me for any examination findings you need, then tell me your diagnosis and immediate management."
- The trainee presses a button and speaks, for example "What is the pressure in the right eye?". The examiner answers aloud, and the finding appears on screen and stays there.
- This repeats as many times as the trainee wants.
- The trainee then states a diagnosis and management. The examiner asks exactly one follow-up question, for example "Why treat the other eye as well?". The trainee answers. The examiner says "Thank you. That concludes the viva."
- The trainee can also end the viva early at any time.

**4. Review of a finished attempt**
- Shown right after the viva ends, and whenever a finished attempt is opened from Home, including after a page refresh.
- Read-only: the full transcript, every finding that was revealed, and the revision point.

## Rules the screens must respect

**Whose turn it is must be unmistakable.** At every moment the app is in exactly one of four states, and the trainee must be able to tell which at a glance:
- **Your turn:** the trainee may press the speak button.
- **Listening:** the microphone is recording the trainee.
- **Thinking:** the examiner is working out a reply (usually 1 to 3 seconds).
- **Examiner speaking:** audio is playing. The trainee cannot speak; the speak button is disabled.

**Findings must be read without error.** Each revealed finding shows these parts:
- Which eye: right, left, both, or none (for whole-body findings such as blood pressure). Confusing right and left is the worst possible mistake, so this must be obvious.
- Name of the finding.
- Value with its unit, exactly as given.
- How it was measured.

Real examples:
- Right eye · Intraocular pressure · 58 mmHg · Goldmann applanation, 23:55
- Left eye · Intraocular pressure · 18 mmHg · Goldmann applanation, 23:55
- Right eye · Pupil · Mid-dilated, 5 mm, unreactive to light · Pen torch
- Right eye · Anterior chamber depth · Shallow, Van Herick grade 1 (peripheral depth under 1/4 of corneal thickness) · Slit lamp
- Blood pressure · 168/94 mmHg · Automated cuff (no eye)
- Both eyes · Refraction · Right +3.50 DS, left +3.25 DS (from her current glasses) · Focimetry of current glasses

**Unavailable findings are shown too, and look different.** Example: Right eye · Gonioscopy · Not available: No view: corneal oedema. If the trainee asks for something the case does not contain, the examiner says "That is not available in this case." and nothing is added to the findings.

**Findings accumulate.** A trainee may reveal up to 24 findings in one viva. Right-eye and left-eye versions of the same finding often appear together and are compared.

**Transcript.** Everything said by both sides is kept in order and visible, labelled trainee or examiner. A viva has roughly 10 to 30 turns. Examiner turns that read out findings can be long.

**Typing instead of speaking.** A text field must always be available to type a turn instead of speaking it, for a noisy room or a broken microphone. It is a fallback, not the main path.

**Response time.** After each spoken turn, a small figure shows how long the examiner took to start answering, for example "1,240 ms". It is secondary information.

**Revision point.** Shown only after the viva ends. Two variants, both needed:
- Supported: one or two sentences of advice, a page reference ("Reference note, page 5" or "pages 5–6"), and a short word-for-word quote from the note. Example quote: "The iris sphincter is often ischaemic and does not respond while the IOP is very high, so pilocarpine works better once the pressure has started to fall".
- Not supported: "No support found in the reference note for this answer."
- While it is being prepared (up to about 20 seconds) the screen shows that it is on its way.

**Privacy.** A trainee only ever sees their own attempts. The correct diagnosis is never shown before the trainee has answered.

## Messages and edge states to include

- Browser without voice support: "Voice needs desktop Chrome; you can type instead."
- Microphone permission denied.
- Nothing was heard, or the examiner could not answer: "Sorry, I didn't catch that. Please say it again."
- Loading an attempt; saving failed.
- A notice that the case is fictional and this is not clinical guidance.

## Limits

- Desktop Chrome only, laptop screens from 1280 px wide. No mobile layout needed.
- One case only. No case picker, no scoring, no grades, no password reset, no settings, no profile.
- The trainee cannot interrupt the examiner while audio is playing.
- It will be built with Tailwind CSS and shadcn/ui components, with Remix icons available. Keep to elements that are straightforward to build this way; no illustrations or photos that would have to be produced separately, and no real organisation's logo.
- English only.

## What I need back

Every screen and state listed above, including the four turn states on the viva screen, a viva screen with many findings revealed, and both revision-point variants.
