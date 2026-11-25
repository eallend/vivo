import { readFileSync } from "node:fs"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import type { CaseData, Interpretation, Passage } from "../lib/viva/types.ts"
import { loadCase } from "./case.server.ts"
import type { Deps } from "./viva.handlers.ts"
import {
  handleRevision,
  handleStart,
  handleTurn,
  REPEAT_TEXT,
} from "./viva.handlers.ts"

const passages = JSON.parse(
  readFileSync(
    new URL("../../data/reference-note.passages.json", import.meta.url),
    "utf8"
  )
) as Passage[]

const pressures: Interpretation = {
  findingIds: ["iop_right", "iop_left"],
  historyFields: [],
  unknownRequests: [],
  gaveAnswer: false,
  followUpQuestion: null,
}

const interpret = vi.fn<Deps["interpret"]>()
const revise = vi.fn<Deps["revise"]>()

let c: CaseData
let d: Deps

beforeAll(async () => {
  c = await loadCase()
})

beforeEach(() => {
  interpret.mockReset()
  interpret.mockResolvedValue(pressures)
  revise.mockReset()
  revise.mockImplementation(async ({ retrieved }) => ({
    supported: true,
    point: "Give pilocarpine once the pressure starts to fall.",
    passageId: retrieved[0].id,
    quote: retrieved[0].text.slice(0, 40),
  }))
  d = { loadCase, interpret, revise, passages }
})

describe("viva handlers", () => {
  it("R-5 no examiner notes leave the server", async () => {
    const out = JSON.stringify([
      await handleStart(d),
      await handleTurn(d, {
        text: "pressures please",
        status: "in_progress",
        history: [],
      }),
    ])
    for (const s of [
      c.examiner_notes.diagnosis,
      ...c.examiner_notes.key_points,
    ])
      expect(out).not.toContain(s)
  })

  it("starts with the case's opening prompt", async () => {
    expect(await handleStart(d)).toEqual({
      caseId: c.case_id,
      title: c.title,
      openingPrompt: c.opening_prompt,
    })
  })

  it("reveals what the model picked and passes the caller's status through", async () => {
    const reply = await handleTurn(d, {
      text: "pressures please",
      status: "in_progress",
      history: [{ role: "examiner", text: c.opening_prompt }],
    })
    expect(reply.revealed.map((r) => r.id)).toEqual(["iop_right", "iop_left"])
    expect(reply.spoken).toContain("58 mmHg")
    expect(reply.status).toBe("in_progress")
    expect(interpret).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "pressures please",
        status: "in_progress",
      })
    )
  })

  it("blank turn and failing model ask the trainee to repeat", async () => {
    expect(
      await handleTurn(d, { text: "   ", status: "in_progress", history: [] })
    ).toMatchObject({ spoken: REPEAT_TEXT, status: "in_progress" })
    expect(interpret).not.toHaveBeenCalled()
    expect(
      await handleTurn(
        {
          ...d,
          interpret: async () => {
            throw new Error("x")
          },
        },
        { text: "iop", status: "in_progress", history: [] }
      )
    ).toMatchObject({ spoken: REPEAT_TEXT, status: "in_progress" })
    expect(
      await handleTurn(
        { ...d, interpret: () => Promise.reject(new Error("timeout")) },
        { text: "iop", status: "follow_up_asked", history: [] }
      )
    ).toMatchObject({ spoken: REPEAT_TEXT, status: "follow_up_asked" })
  })

  it("an empty follow-up idea list still gives a follow-up question", async () => {
    const noIdeas: CaseData = {
      ...c,
      examiner_notes: { ...c.examiner_notes, follow_up_ideas: [] },
    }
    interpret.mockResolvedValue({
      ...pressures,
      findingIds: [],
      gaveAnswer: true,
      followUpQuestion: "What is the right eye pressure?",
    })
    const reply = await handleTurn(
      { ...d, loadCase: async () => noIdeas },
      { text: "acute angle closure", status: "in_progress", history: [] }
    )
    expect(reply.followUpQuestion).toBe("What would you do next?")
    expect(reply.status).toBe("follow_up_asked")
  })

  it("revision point: no answer, no passages, model error, supported", async () => {
    expect(await handleRevision(d, { answerText: "" })).toMatchObject({
      status: "no_support",
      reason: "no_answer",
      retrievedPages: [],
    })
    expect(
      await handleRevision(d, { answerText: "zebra quantum football" })
    ).toMatchObject({ reason: "no_passages" })
    expect(revise).not.toHaveBeenCalled()
    expect(
      await handleRevision(
        {
          ...d,
          revise: async () => {
            throw new Error("x")
          },
        },
        { answerText: "I would give pilocarpine" }
      )
    ).toMatchObject({ reason: "model_error" })

    const point = await handleRevision(d, {
      answerText: "I would give pilocarpine",
    })
    expect(point.status).toBe("supported")
    expect(point.retrievedPages.length).toBeGreaterThan(0)
    expect(revise).toHaveBeenCalledWith(
      expect.objectContaining({
        answerText: "I would give pilocarpine",
        notes: c.examiner_notes,
      })
    )
  })
})
