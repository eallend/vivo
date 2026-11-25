import { describe, expect, it } from "vitest"
import { canRetryRevisionPoint, formatPages } from "./revision-point-card"
import type { NoSupportReason } from "@/lib/viva/types"

describe("formatPages", () => {
  it("names one page, a run, or a list", () => {
    expect(formatPages([5])).toBe("page 5")
    expect(formatPages([6, 5])).toBe("pages 5–6")
    expect(formatPages([5, 7, 9])).toBe("pages 5, 7 and 9")
    expect(formatPages([5, 5])).toBe("page 5")
  })
})

describe("canRetryRevisionPoint", () => {
  const noSupport = (reason: NoSupportReason) => ({
    status: "no_support" as const,
    reason,
    retrievedPages: [],
  })

  it("offers Retry only when making the point failed", () => {
    expect(canRetryRevisionPoint(noSupport("model_error"))).toBe(true)
    for (const reason of [
      "no_answer",
      "no_passages",
      "model_unsupported",
      "quote_not_found",
    ] as const) {
      expect(canRetryRevisionPoint(noSupport(reason))).toBe(false)
    }
  })

  it("never offers Retry for a supported point", () => {
    expect(
      canRetryRevisionPoint({
        status: "supported",
        point: "p",
        pages: [5],
        excerpt: "e",
        retrievedPages: [5],
      })
    ).toBe(false)
  })
})
