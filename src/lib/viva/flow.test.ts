import { beforeAll, describe, expect, it } from "vitest"
import { loadCase } from "../../server/case.server.ts"
import { UNKNOWN_REQUEST_TEXT } from "./findings.ts"
import {
  buildReply,
  CLOSING_TEXT,
  guardFollowUp,
  PROMPT_AGAIN_TEXT,
} from "./flow.ts"
import type { CaseData, Interpretation } from "./types.ts"

let c: CaseData

beforeAll(async () => {
  c = await loadCase()
})

const base: Interpretation = {
  findingIds: [],
  historyFields: [],
  unknownRequests: [],
  gaveAnswer: false,
  followUpQuestion: null,
}

describe("viva flow", () => {
  it("R-6 one follow-up then finished", () => {
    const a = buildReply(c, "in_progress", {
      ...base,
      gaveAnswer: true,
      followUpQuestion: "Why treat the fellow eye as well?",
    })
    expect(a.status).toBe("follow_up_asked")
    expect(a.followUpQuestion).toBe("Why treat the fellow eye as well?")
    const b = buildReply(c, "follow_up_asked", {
      ...base,
      gaveAnswer: true,
      followUpQuestion: "Another?",
      findingIds: ["iop_right"],
    })
    expect(b).toMatchObject({
      status: "finished",
      spoken: CLOSING_TEXT,
      revealed: [],
      followUpQuestion: null,
    })
  })

  it("R-6 findings come before the follow-up in a mixed turn", () => {
    const r = buildReply(c, "in_progress", {
      ...base,
      findingIds: ["gonio_left"],
      gaveAnswer: true,
      followUpQuestion: "What would you do next?",
    })
    expect(r.spoken.indexOf("Iridotrabecular")).toBeLessThan(
      r.spoken.indexOf("What would you do next?")
    )
    expect(r.revealed).toHaveLength(1)
  })

  it("R-7 a follow-up that restates a finding is replaced", () => {
    const ideas = c.examiner_notes.follow_up_ideas
    expect(guardFollowUp("You said the pressure was 58, why?", ideas)).toBe(
      ideas[0]
    )
    expect(guardFollowUp("Why treat the left eye too?", ideas)).toBe(ideas[0])
    expect(guardFollowUp(null, ideas)).toBe(ideas[0])
    expect(
      guardFollowUp("  Why might pilocarpine fail early on?  ", ideas)
    ).toBe("Why might pilocarpine fail early on?")
  })

  it("unknown request and empty turn", () => {
    expect(
      buildReply(c, "in_progress", { ...base, unknownRequests: ["CT head"] })
        .spoken
    ).toBe(UNKNOWN_REQUEST_TEXT)
    expect(buildReply(c, "in_progress", base)).toMatchObject({
      spoken: PROMPT_AGAIN_TEXT,
      status: "in_progress",
    })
  })
})
