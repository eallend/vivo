# Voice Viva

A local demo of a spoken viva (oral exam) for ophthalmology trainees, built for the Eye Academy developer take-home (case EA-VIVA-001, acute angle closure).

A signed-in trainee talks to a virtual examiner in the browser. They ask for findings and get each one back exactly as written in the case file. When they give a diagnosis and management plan, the examiner asks one follow-up question. At the end the trainee gets one revision point with a word-for-word quote and page number from the reference note, or a plain "no support found" message when the note does not back the point. Each attempt is saved and can be reopened; only its owner can read it.

How it works in one paragraph: Chrome's built-in speech recognition and speech synthesis provide the voice. Claude Haiku 5.5 only works out which finding the trainee asked for; the code then builds the spoken sentence from the case file, so a value, eye or unit is never reworded. Claude Opus 5.5 writes the revision point, and the code checks that its quote really appears in the note. The reasoning is in `docs/submission/write-up.md` and `docs/decisions.md`.

## What you need

- Node 24 and pnpm, or only Docker (see "Run with Docker" below).
- Desktop Chrome (speech recognition does not work in other browsers) and a microphone. Typing a turn also works.
- A Firebase project with Email/Password sign-in and a Firestore database. Free plan, about five minutes: follow `docs/firebase-setup.md`.
- An Anthropic API key.

## Set up

1. Copy `.env.example` to `.env.local` and fill in the values. `.env.local` is ignored by git; keep it that way. The Firebase values come from the web app settings in the Firebase console, as described in `docs/firebase-setup.md`.
2. Publish `firestore.rules` (repo root) in the Firebase console, under Firestore Database, Rules tab, then Publish. It limits every attempt to its owner. Until this is done the app cannot save anything.
3. Install and start:

```
pnpm install
pnpm dev
```

4. Open http://localhost:3000 in Chrome, sign up with any email and password, and start a viva. Allow the microphone when Chrome asks. After changing `.env.local`, stop and restart `pnpm dev`.

## Run with Docker

The quickest way to run it: no Node or pnpm needed, only Docker (Docker Desktop or OrbStack).

1. Do steps 1 and 2 of "Set up" above: a filled-in `.env.local` and the published `firestore.rules`.
2. In the project folder:

```
docker compose up --build
```

3. Open http://localhost:3000 in Chrome. If port 3000 is taken: `VIVA_PORT=3002 docker compose up --build` and open http://localhost:3002.

Stop it with Ctrl+C, or `docker compose down` if it runs in the background (`-d`). After changing `.env.local`, run `docker compose up --build` again: the Firebase values are built into the browser bundle.

How secrets are handled: `.env.local` is never copied into the image. It is mounted only during the build, to bake in the public Firebase web settings (the `VITE_` lines), and passed to the running container for the server-only values (`ANTHROPIC_API_KEY`, `FIREBASE_PROJECT_ID`). The image runs the production build (`pnpm build`, served by `srvx`, same as `pnpm start`) and contains the case file and the reference-note passages it reads.

## Checks

The four gates, each of which should exit 0:

```
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

Two checks that talk to real services (run them after `.env.local` is filled in):

```
pnpm check:live      # asks Claude two examiner questions and one revision point; prints how long each took; costs a few cents
pnpm check:privacy   # proves account B and a signed-out visitor cannot read account A's attempt
```

`pnpm check:privacy` leaves two throwaway accounts (`viva-check-...@example.com`) in Firebase Authentication. They are harmless and can be deleted in the console. To time the other model, run `VIVA_TURN_MODEL=claude-sonnet-5-5 pnpm check:live`.

## The case file the app reads

The server reads `docs/requirements/Eye Academy - Developer Take-Home (Case EA-VIVA-001).json` directly on every request, with no caching and no copy. If you edit a finding in that file (for example change the right-eye pressure from 58 to 44), the next turn uses the new value; no restart is needed. To point the app at a different file, set `VIVA_CASE_PATH` in `.env.local`. Only server code reads this file, so the browser never receives the diagnosis or examiner notes.

## The reference note

The revision point is checked against `data/reference-note.passages.json`, a committed file with the reference note split into page-tagged passages. If you change the note PDF in `docs/requirements/`, regenerate it:

```
pnpm prepare:note
```

## Where things are

- `src/lib/viva/`: case types, finding wording, viva flow rules (pure code, covered by tests).
- `src/lib/revision/`: keyword search over the note and the quote check.
- `src/server/`: sign-in token check, Claude calls, the server functions the browser calls.
- `src/routes/`, `src/components/viva/`: screens.
- `docs/`: design, decision log (`docs/decisions.md`), Firebase setup, submission write-up (`docs/submission/write-up.md`), changelog at `CHANGELOG.md`.

## Limits

Chrome on desktop only; one case; English (UK) speech; no password reset; no hosting setup. See the "Handover" section of the write-up for more.
