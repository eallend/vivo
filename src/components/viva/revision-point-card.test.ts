import { describe, expect, it } from "vitest"
import { formatPages } from "./revision-point-card"

describe("formatPages", () => {
  it("names one page, a run, or a list", () => {
    expect(formatPages([5])).toBe("page 5")
    expect(formatPages([6, 5])).toBe("pages 5–6")
    expect(formatPages([5, 7, 9])).toBe("pages 5, 7 and 9")
    expect(formatPages([5, 5])).toBe("page 5")
  })
})
