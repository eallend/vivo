import { describe, expect, it } from "vitest"
import {
  UNTIMED_MS,
  transcriptEntries,
  turnCount,
  withTurnTime,
} from "./transcript"

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

  it("shows no time for a reply whose audio never started, and keeps later times aligned", () => {
    const entries = transcriptEntries({
      openingPrompt: "Opening",
      turns: [
        { role: "trainee", text: "q1", at: 1 },
        { role: "examiner", text: "a1", at: 1 },
        { role: "trainee", text: "q2", at: 2 },
        { role: "examiner", text: "a2", at: 2 },
      ],
      turnTimingsMs: [UNTIMED_MS, 980],
    })
    expect(entries.map((e) => e.ms)).toEqual([null, null, null, null, 980])
  })

  it("counts turns", () => {
    expect(turnCount(1)).toBe("1 turn")
    expect(turnCount(5)).toBe("5 turns")
  })
})

describe("withTurnTime", () => {
  const attempt = { turnTimingsMs: [1200], status: "in_progress" as const }

  it("records the measured time when the examiner's audio started", () => {
    expect(withTurnTime(attempt, 1000, 2234.4, true)).toEqual({
      turnTimingsMs: [1200, 1234],
      status: "in_progress",
    })
  })

  it("records no time when the audio never started", () => {
    expect(withTurnTime(attempt, 1000, 11_600, false).turnTimingsMs).toEqual([
      1200,
      UNTIMED_MS,
    ])
  })
})
