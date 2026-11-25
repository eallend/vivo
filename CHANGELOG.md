# Changelog

Milestones of the Voice Viva build. Each lists what now works, then the commits behind it (short hash, subject).

## M1: the logic, without voice or screens

Findings are now worded by code from the case file with the right eye, value, unit and method, and unavailable findings say why. The viva flow gives exactly one follow-up and guards against a follow-up that restates a finding. The reference note is split into page-tagged passages, with keyword search and a check that a quote really appears in a passage.

- dc9f557 chore: add test runner, dependencies, case types and loader
- b6656e7 chore: exclude tooling folders from lint
- 779ab6c feat: word findings and history from the case file
- 6d7632f feat: viva flow with one guarded follow-up
- 579224d feat: extract reference note into page-tagged passages
- 5c2372a feat: keyword retrieval and verbatim citation check
- 7a39453 docs: correct the retrieval test query, add the design prompt
- 47e165c fix: check citation length on the normalised quote

## M2: server, sign-in and private storage

Server functions now interpret a turn and write the revision point, and only answer signed-in users. Trainees can sign in with email and password, and attempts are stored so that only their owner can read them, proven by `pnpm check:privacy`. `pnpm check:live` times real Claude calls.

- 5a89d4a feat: Firebase sign-in, owner-only attempt storage and privacy check
- 0d71691 feat: server functions for viva turns and the revision point
- 689b154 docs: Firebase setup steps and settings

## M3: screens, speech and the finished viva

The app has the designed screens: sign-in, attempt list, the viva with visible turn states, a saved and reopenable transcript, per-turn timing and the revision point with its citation. Chrome speech is wrapped so it cannot hang, and later fixes made turns run one at a time, save before speaking, show no false timings and allow Retry on the revision point. Run instructions, the submission write-up and this changelog are added.

- ac90dd4 docs: Voice Viva design exports (UI kit and screens) with unpacked source
- 4ccaffa feat: themed UI kit, viva components, session merge and speech
- fe9978e fix: speech never hangs if Chrome drops the end event; no-microphone counts as blocked
- ee8a150 feat: voice viva screens with turn states, saved attempts and revision point
- 17e4a5b fix: one turn at a time, save before speaking, no false turn times
- 05417c9 fix: retry the revision point, start from a failed list, no ending mid-thought
- docs: run instructions, submission write-up and changelog (this commit)
