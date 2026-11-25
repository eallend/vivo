import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import type { Passage } from "../viva/types.ts"
import { checkCitation } from "./citation.ts"
import { retrieve } from "./retrieve.ts"

const passages = JSON.parse(
  readFileSync(
    new URL("../../../data/reference-note.passages.json", import.meta.url),
    "utf8",
  ),
) as Passage[]

describe("revision", () => {
  it("R-11 retrieval follows the words", () => {
    expect(
      retrieve(passages, "pilocarpine iris sphincter ischaemic")[0].passage
        .pages,
    ).toContain(5)
    expect(
      retrieve(passages, "cycloplegics hyperosmotics vitrectomy")[0].passage
        .pages,
    ).toContain(8)
    expect(retrieve(passages, "zebra quantum football")).toEqual([])
    expect(retrieve(passages, "pilocarpine pressure iridotomy")).toHaveLength(5)
  })

  it("R-12 quote must be in the note", () => {
    // No passage contains the substring "pupilblock" (the note writes
    // "Non-pupil-block"), so the passage is located by its closing phrase.
    const p = passages.find((x) =>
      x.text.includes("important in East Asian patients"),
    )!
    const ok = checkCitation(
      {
        supported: true,
        point: "x",
        passageId: p.id,
        quote: "non-pupil-block mechanisms are relatively more important",
      },
      [p],
    )
    expect(ok).toMatchObject({ status: "supported", pages: p.pages })
    expect(
      checkCitation(
        {
          supported: true,
          point: "x",
          passageId: p.id,
          quote: "pilocarpine cures all angle closure instantly",
        },
        [p],
      ),
    ).toMatchObject({ status: "no_support", reason: "quote_not_found" })
    expect(
      checkCitation(
        {
          supported: true,
          point: "x",
          passageId: "p-999",
          quote: "non-pupil-block mechanisms are relatively",
        },
        [p],
      ),
    ).toMatchObject({ reason: "quote_not_found" })
    expect(
      checkCitation(
        { supported: false, point: "", passageId: null, quote: null },
        [p],
      ),
    ).toMatchObject({ reason: "model_unsupported", retrievedPages: p.pages })
  })
})
