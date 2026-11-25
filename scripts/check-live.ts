/// <reference types="node" />
// Live check against the Claude API: two examiner turns and one revision point.
// Run with `pnpm check:live` (reads ANTHROPIC_API_KEY from .env.local). Spends a
// little money on every run. Time Sonnet with
// `VIVA_TURN_MODEL=claude-sonnet-5-5 pnpm check:live`.

import { retrieve } from "../src/lib/revision/retrieve.ts"
import type { Deps } from "../src/server/viva.handlers.ts"
import {
  handleRevision,
  handleTurn,
  loadDeps,
} from "../src/server/viva.handlers.ts"

const deps = await loadDeps()
let failures = 0

console.log(
  `Turn model: ${process.env.VIVA_TURN_MODEL ?? "claude-haiku-5-5"}; revision model: ${process.env.VIVA_REVISION_MODEL ?? "claude-opus-5-5"}`
)

async function timed<T>(label: string, run: () => Promise<T>): Promise<T> {
  const start = performance.now()
  const result = await run()
  console.log(`  ${label}: ${Math.round(performance.now() - start)} ms`)
  return result
}

function report(
  name: string,
  pass: boolean,
  expected: string,
  observed: string
) {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}`)
  console.log(`  expected: ${expected}`)
  console.log(`  observed: ${observed}`)
  if (!pass) failures++
}

// A real model error is turned into the repeat reply by the handler; surface it here.
const interpretLoudly: Deps["interpret"] = async (args) => {
  try {
    return await deps.interpret(args)
  } catch (error) {
    console.log(`  turn model error: ${(error as Error).message}`)
    throw error
  }
}

async function checkTurn(
  name: string,
  text: string,
  expectedIds: string[],
  mustContain: string[]
) {
  console.log(`\n${name}: "${text}"`)
  const reply = await timed("turn duration", () =>
    handleTurn(
      { ...deps, interpret: interpretLoudly },
      { text, status: "in_progress", history: [] }
    )
  )
  const ids = reply.revealed.map((r) => r.id)
  const pass =
    JSON.stringify(ids) === JSON.stringify(expectedIds) &&
    mustContain.every((s) => reply.spoken.includes(s))
  report(
    name,
    pass,
    `revealed ${JSON.stringify(expectedIds)}, spoken contains ${mustContain.map((s) => `"${s}"`).join(" and ")}`,
    `revealed ${JSON.stringify(ids)}, spoken "${reply.spoken}"`
  )
}

await checkTurn(
  "Check 1 (pressure)",
  "What is the intraocular pressure in the right eye?",
  ["iop_right"],
  ["58 mmHg"]
)

await checkTurn(
  "Check 2 (unavailable finding)",
  "Can I see the gonioscopy of the right eye?",
  ["gonio_right"],
  ["not available", "No view: corneal oedema"]
)

{
  const answerText =
    "This is acute angle closure. I would give pilocarpine straight away and acetazolamide."
  const name = "Check 3 (revision point)"
  console.log(`\n${name}: "${answerText}"`)

  const retrieved = retrieve(deps.passages, answerText).map((r) => r.passage)
  console.log(
    `  retrieved: ${retrieved.map((p) => `${p.id} (p${p.pages.join(",")})`).join(", ")}`
  )

  let modelReply: Awaited<ReturnType<Deps["revise"]>> | null = null
  const revise: Deps["revise"] = async (args) => {
    try {
      modelReply = await deps.revise(args)
      return modelReply
    } catch (error) {
      console.log(`  revision model error: ${(error as Error).message}`)
      throw error
    }
  }

  const point = await timed("revision duration", () =>
    handleRevision({ ...deps, revise }, { answerText })
  )
  console.log(`  retrieved pages: ${JSON.stringify(point.retrievedPages)}`)

  const reply = modelReply as Awaited<ReturnType<Deps["revise"]>> | null
  if (point.status === "supported" && reply) {
    const passage = retrieved.find((p) => p.id === reply.passageId)
    console.log(`  passage id: ${reply.passageId}`)
    console.log(`  pages: ${JSON.stringify(point.pages)}`)
    console.log(`  point: ${point.point}`)
    console.log(`  quote: "${point.excerpt}"`)
    report(
      name,
      passage !== undefined,
      "status supported, quote found in the cited passage",
      `status supported, passage ${reply.passageId}`
    )
  } else {
    if (reply) console.log(`  model reply: ${JSON.stringify(reply)}`)
    report(
      name,
      false,
      "status supported, quote found in the cited passage",
      `status ${point.status}${point.status === "no_support" ? `, reason ${point.reason}` : ""}`
    )
  }
}

console.log(
  failures === 0
    ? "\nAll live checks passed."
    : `\n${failures} live check(s) failed.`
)
process.exit(failures === 0 ? 0 : 1)
