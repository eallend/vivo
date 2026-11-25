import type { Passage, RevisionPoint } from "../viva/types.ts"

const MIN_QUOTE_LENGTH = 15

/**
 * Lower-case, curly quotes to plain, every dash and hyphen removed,
 * whitespace collapsed to one space, trimmed.
 */
export function normaliseForQuote(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[-‐-―−﹘﹣－]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Accepts the model's point only when its quote is verbatim in a retrieved passage. */
export function checkCitation(
  reply: {
    supported: boolean
    point: string
    passageId: string | null
    quote: string | null
  },
  retrieved: Passage[],
): RevisionPoint {
  const retrievedPages = [...new Set(retrieved.flatMap((p) => p.pages))].sort(
    (a, b) => a - b,
  )

  if (!reply.supported || !reply.point || !reply.passageId || !reply.quote) {
    return { status: "no_support", reason: "model_unsupported", retrievedPages }
  }

  const passage = retrieved.find((p) => p.id === reply.passageId)
  if (
    !passage ||
    reply.quote.length < MIN_QUOTE_LENGTH ||
    !normaliseForQuote(passage.text).includes(normaliseForQuote(reply.quote))
  ) {
    return { status: "no_support", reason: "quote_not_found", retrievedPages }
  }

  return {
    status: "supported",
    point: reply.point,
    pages: passage.pages,
    excerpt: reply.quote,
    retrievedPages,
  }
}
