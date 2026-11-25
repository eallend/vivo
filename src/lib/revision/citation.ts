import type { Passage, RevisionPoint } from "../viva/types.ts"

// Both limits apply to the normalised quote, so padding cannot satisfy them.
const MIN_QUOTE_LENGTH = 15
const MIN_QUOTE_WORDS = 3

/**
 * Lower-case, curly quotes to plain, every dash and hyphen removed,
 * whitespace collapsed to one space, trimmed.
 */
export function normaliseForQuote(s: string): string {
  return s
    .normalize("NFC")
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
  retrieved: Passage[]
): RevisionPoint {
  const retrievedPages = [...new Set(retrieved.flatMap((p) => p.pages))].sort(
    (a, b) => a - b
  )

  if (!reply.supported || !reply.point || !reply.passageId || !reply.quote) {
    return { status: "no_support", reason: "model_unsupported", retrievedPages }
  }

  const passage = retrieved.find((p) => p.id === reply.passageId)
  const quote = normaliseForQuote(reply.quote)
  if (
    !passage ||
    quote.length < MIN_QUOTE_LENGTH ||
    quote.split(" ").length < MIN_QUOTE_WORDS ||
    !normaliseForQuote(passage.text).includes(quote)
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
