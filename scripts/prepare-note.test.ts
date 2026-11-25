import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import type { Passage } from "../src/lib/viva/types.ts"

const passages: Passage[] = JSON.parse(
  readFileSync(
    new URL("../data/reference-note.passages.json", import.meta.url),
    "utf8"
  )
)

const find = (s: string) => passages.filter((p) => p.text.includes(s))

describe("reference note passages", () => {
  it("R-13 pages and headings", () => {
    expect(find("Lie the patient flat")[0].pages).toEqual([5])
    expect(find("Prophylactic LPI in the fellow eye")[0].pages).toEqual([6])
    const acet = find("Check for sulfonamide allergy")[0]
    expect(acet.pages).toEqual([5, 6])
    expect(acet.text).toContain("Acetazolamide 500 mg")
    expect(acet.heading).toBe("Immediate treatment")
  })

  it("has no header or footer text and unique ids", () => {
    expect(
      passages.some((p) =>
        /Take-home reference note|Eye Academy reference note \d/.test(p.text)
      )
    ).toBe(false)
    expect(new Set(passages.map((p) => p.id)).size).toBe(passages.length)
    expect(passages.length).toBeGreaterThan(80)
    expect(find("Dim light, such as a cinema")[0]).toMatchObject({
      pages: [4],
      heading: "Triggers",
    })
  })
})
