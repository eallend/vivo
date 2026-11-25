import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import type { Passage } from "../viva/types.ts"
import { checkCitation } from "./citation.ts"
import { retrieve } from "./retrieve.ts"

const passages = JSON.parse(
  readFileSync(
    new URL("../../../data/reference-note.passages.json", import.meta.url),
    "utf8"
  )
) as Passage[]

describe("revision", () => {
  it("R-11 retrieval follows the words", () => {
    expect(
      retrieve(passages, "pilocarpine iris sphincter ischaemic")[0].passage
        .pages
    ).toContain(5)
    expect(
      retrieve(passages, "cycloplegics hyperosmotics vitrectomy")[0].passage
        .pages
    ).toContain(8)
    expect(retrieve(passages, "zebra quantum football")).toEqual([])
    expect(retrieve(passages, "pilocarpine pressure iridotomy")).toHaveLength(5)
  })

  it("R-12 quote must be in the note", () => {
    // No passage contains the substring "pupilblock" (the note writes
    // "Non-pupil-block"), so the passage is located by its closing phrase.
    const p = passages.find((x) =>
      x.text.includes("important in East Asian patients")
    )!
    const ok = checkCitation(
      {
        supported: true,
        point: "x",
        passageId: p.id,
        quote: "non-pupil-block mechanisms are relatively more important",
      },
      [p]
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
        [p]
      )
    ).toMatchObject({ status: "no_support", reason: "quote_not_found" })
    expect(
      checkCitation(
        {
          supported: true,
          point: "x",
          passageId: "p-999",
          quote: "non-pupil-block mechanisms are relatively",
        },
        [p]
      )
    ).toMatchObject({ reason: "quote_not_found" })
    expect(
      checkCitation(
        { supported: false, point: "", passageId: null, quote: null },
        [p]
      )
    ).toMatchObject({ reason: "model_unsupported", retrievedPages: p.pages })
  })

  describe("citation edge cases", () => {
    const byId = (id: string) => passages.find((x) => x.id === id)!
    const cite = (passageId: string, quote: string, retrieved: Passage[]) =>
      checkCitation(
        { supported: true, point: "x", passageId, quote },
        retrieved
      )
    const p = passages.find((x) =>
      x.text.includes("important in East Asian patients")
    )!

    it("rejects a quote under 15 characters", () => {
      expect(cite(p.id, "pupil-block", [p])).toMatchObject({
        status: "no_support",
        reason: "quote_not_found",
      })
    })

    it.each([
      ["15 spaces", " ".repeat(15)],
      ["15 hyphens", "-".repeat(15)],
      ["spaced hyphens", "- - - - - - - - "],
      ["one letter and spaces", "e" + " ".repeat(14)],
      ["two words padded", "relatively more" + " ".repeat(10)],
    ])("rejects a quote that normalises to junk: %s", (_, quote) => {
      expect(cite(p.id, quote, [p])).toMatchObject({
        status: "no_support",
        reason: "quote_not_found",
      })
    })

    it("matches a plain apostrophe against a curly one in the note", () => {
      const q = byId("p-015")
      expect(q.text).toContain("Schwalbe’s line")
      expect(
        cite(q.id, "trabecular meshwork and Schwalbe's line", [q])
      ).toMatchObject({ status: "supported", pages: q.pages })
    })

    it("lists retrieved pages sorted and unique", () => {
      // p-073 spans pages 5 and 6; p-071 repeats page 5.
      const retrieved = [
        byId("p-106"),
        byId("p-073"),
        p,
        byId("p-071"),
        byId("p-015"),
      ]
      expect(
        checkCitation(
          { supported: false, point: "", passageId: null, quote: null },
          retrieved
        ).retrievedPages
      ).toEqual([2, 3, 5, 6, 8])
    })
  })
})
