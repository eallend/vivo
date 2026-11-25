import { describe, expect, it } from "vitest"
import { transcriptEntries, turnCount } from "./transcript"

describe("transcriptEntries", () => {
  it("starts with the opening prompt and gives each examiner reply its timing", () => {
    const entries = transcriptEntries({
      openingPrompt: "Opening",
      turns: [
        { role: "trainee", text: "q1", at: 1 },
        { role: "examiner", text: "a1", at: 1 },
        { role: "trainee", text: "q2", at: 2 },
        { role: "examiner", text: "a2", at: 2 },
      ],
      turnTimingsMs: [1240],
    })
    expect(entries).toEqual([
      { role: "examiner", text: "Opening", ms: null },
      { role: "trainee", text: "q1", ms: null },
      { role: "examiner", text: "a1", ms: 1240 },
      { role: "trainee", text: "q2", ms: null },
      { role: "examiner", text: "a2", ms: null },
    ])
  })

  it("counts turns", () => {
    expect(turnCount(1)).toBe("1 turn")
    expect(turnCount(5)).toBe("5 turns")
  })
})
