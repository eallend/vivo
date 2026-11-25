import type { Passage } from "../viva/types.ts"

const K1 = 1.5
const B = 0.75

const STOP_WORDS = new Set(
  (
    "a about above after again against all am an and any are as at be because " +
    "been before being below between both but by can could did do does doing " +
    "down during each few for from further had has have having he her here hers " +
    "herself him himself his how i if in into is it its itself just me more most " +
    "my myself no nor not now of off on once only or other our ours ourselves out " +
    "over own s same she should so some such t than that the their theirs them " +
    "themselves then there these they this those through to too under until up " +
    "very was we were what when where which while who whom why will with would " +
    "you your yours yourself yourselves"
  ).split(" "),
)

/** Lower-cased word tokens with English stop words removed. */
export function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (t) => !STOP_WORDS.has(t),
  )
}

/**
 * BM25 (k1 1.5, b 0.75) over heading + text. Returns the top `k` passages
 * with a positive score, best first; ties keep the note's order.
 */
export function retrieve(
  passages: Passage[],
  query: string,
  k = 5,
): { passage: Passage; score: number }[] {
  const queryTerms = [...new Set(tokenize(query))]
  if (queryTerms.length === 0 || passages.length === 0) return []

  const docs = passages.map((p) => {
    const tf = new Map<string, number>()
    const tokens = tokenize(`${p.heading} ${p.text}`)
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
    return { tf, length: tokens.length }
  })
  const n = docs.length
  const avgLength = docs.reduce((sum, d) => sum + d.length, 0) / n || 1

  const idf = new Map<string, number>()
  for (const term of queryTerms) {
    const df = docs.filter((d) => d.tf.has(term)).length
    idf.set(term, Math.log(1 + (n - df + 0.5) / (df + 0.5)))
  }

  return passages
    .map((passage, i) => {
      const { tf, length } = docs[i]
      let score = 0
      for (const term of queryTerms) {
        const f = tf.get(term) ?? 0
        if (f === 0) continue
        score +=
          (idf.get(term) ?? 0) *
          ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * length) / avgLength)))
      }
      return { passage, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
