import { describe, expect, it } from "vitest"
import type { Attempt } from "../attempts.client.ts"
import { applyReply } from "./session.ts"
import type { RevealedFinding } from "./types.ts"

const empty: Attempt = {
  id: "a1",
  caseId: "case",
  title: "Case",
  openingPrompt: "Open",
  status: "in_progress",
  createdAt: 0,
  updatedAt: 0,
  turns: [],
  revealedFindings: [],
  followUp: null,
  answerText: "",
  revisionPoint: null,
  turnTimingsMs: [],
}

const iopRight: RevealedFinding = {
  id: "iop_right",
  eye: "right",
  label: "Intraocular pressure",
  available: true,
  valueText: "58 mmHg",
  method: "Goldmann applanation",
  reason: null,
  spoken: "Right eye intraocular pressure is 58 mmHg.",
}

const iopLeft: RevealedFinding = {
  ...iopRight,
  id: "iop_left",
  eye: "left",
  valueText: "18 mmHg",
  spoken: "Left eye intraocular pressure is 18 mmHg.",
}

describe("applyReply", () => {
  it("merges a reply into the attempt", () => {
    const a1 = applyReply(
      empty,
      "pressures",
      {
        spoken: "Right eye…",
        revealed: [iopRight, iopLeft],
        status: "in_progress",
        followUpQuestion: null,
      },
      1
    )
    expect(a1.turns.map((t) => t.role)).toEqual(["trainee", "examiner"])
    const a2 = applyReply(
      a1,
      "right pressure again",
      {
        spoken: "…",
        revealed: [iopRight],
        status: "in_progress",
        followUpQuestion: null,
      },
      2
    )
    expect(a2.revealedFindings.map((f) => f.id)).toEqual([
      "iop_right",
      "iop_left",
    ])
    const a3 = applyReply(
      a2,
      "It is angle closure",
      {
        spoken: "Why?",
        revealed: [],
        status: "follow_up_asked",
        followUpQuestion: "Why?",
      },
      3
    )
    const a4 = applyReply(
      a3,
      "Because of pupil block",
      {
        spoken: "Thank you.",
        revealed: [],
        status: "finished",
        followUpQuestion: null,
      },
      4
    )
    expect(a4.followUp).toEqual({
      question: "Why?",
      answer: "Because of pupil block",
    })
    expect(a4.answerText).toBe("It is angle closure\nBecause of pupil block")
    expect(a2.answerText).toBe("")
  })

  it("records turn text, time and status without mutating the input", () => {
    const a1 = applyReply(
      empty,
      "pressures",
      {
        spoken: "Right eye…",
        revealed: [iopRight],
        status: "follow_up_asked",
        followUpQuestion: "Why?",
      },
      7
    )
    expect(a1.turns).toEqual([
      { role: "trainee", text: "pressures", at: 7 },
      { role: "examiner", text: "Right eye…", at: 7 },
    ])
    expect(a1.status).toBe("follow_up_asked")
    expect(a1.followUp).toEqual({ question: "Why?", answer: null })
    expect(a1.answerText).toBe("pressures")
    expect(empty.turns).toEqual([])
    expect(empty.revealedFindings).toEqual([])
    expect(empty.status).toBe("in_progress")
  })

  it("ignores a reply that would move a finished attempt back", () => {
    const finished: Attempt = { ...empty, status: "finished" }
    const after = applyReply(
      finished,
      "one more thing",
      {
        spoken: "Right eye…",
        revealed: [iopRight],
        status: "in_progress",
        followUpQuestion: null,
      },
      9
    )
    expect(after).toBe(finished)
  })
})
