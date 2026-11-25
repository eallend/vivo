import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { checkCitation } from "../lib/revision/citation.ts"
import { retrieve } from "../lib/revision/retrieve.ts"
import { buildReply } from "../lib/viva/flow.ts"
import type {
  CaseData,
  ExaminerReply,
  Interpretation,
  Passage,
  RevisionPoint,
  VivaStatus,
} from "../lib/viva/types.ts"
import { loadCase } from "./case.server.ts"
import { interpretTurn, writeRevision } from "./claude.server.ts"

export const REPEAT_TEXT = "Sorry, I didn't catch that. Please say it again."

const NO_REQUEST: Interpretation = {
  findingIds: [],
  historyFields: [],
  unknownRequests: [],
  gaveAnswer: false,
  followUpQuestion: null,
}

const PASSAGES_FILE = "data/reference-note.passages.json"

export interface Deps {
  loadCase: () => Promise<CaseData>
  interpret: typeof interpretTurn
  revise: typeof writeRevision
  passages: Passage[]
}

export type HistoryEntry = { role: "trainee" | "examiner"; text: string }

let passagesCache: Passage[] | null = null

/** The real dependencies: the case file, the live Claude calls and the reference-note passages. */
export async function loadDeps(): Promise<Deps> {
  passagesCache ??= JSON.parse(
    await readFile(resolve(process.cwd(), PASSAGES_FILE), "utf8")
  ) as Passage[]
  return {
    loadCase: () => loadCase(),
    interpret: interpretTurn,
    revise: writeRevision,
    passages: passagesCache,
  }
}

/** Only the public parts of the case: never the findings or examiner notes. */
export async function handleStart(
  d: Deps
): Promise<{ caseId: string; title: string; openingPrompt: string }> {
  const c = await d.loadCase()
  return { caseId: c.case_id, title: c.title, openingPrompt: c.opening_prompt }
}

const repeat = (status: VivaStatus): ExaminerReply => ({
  spoken: REPEAT_TEXT,
  revealed: [],
  status,
  followUpQuestion: null,
})

/** One examiner turn. The status comes from the caller and is passed through or advanced by `buildReply`; after the follow-up no model is called; a blank text or a failed model call asks the trainee to repeat. */
export async function handleTurn(
  d: Deps,
  input: { text: string; status: VivaStatus; history: HistoryEntry[] }
): Promise<ExaminerReply> {
  const text = input.text.trim()
  if (text === "") return repeat(input.status)

  const c = await d.loadCase()
  // Once the follow-up has been asked, the reply is the closing line whatever was said.
  if (input.status !== "in_progress")
    return buildReply(c, input.status, NO_REQUEST)

  try {
    const interpretation = await d.interpret({
      c,
      text,
      history: input.history,
      status: input.status,
    })
    return buildReply(c, input.status, interpretation)
  } catch {
    return repeat(input.status)
  }
}

/** One revision point from the trainee's answer, backed by a quote that is checked against the retrieved passages. */
export async function handleRevision(
  d: Deps,
  input: { answerText: string }
): Promise<RevisionPoint> {
  const answerText = input.answerText.trim()
  if (answerText === "") {
    return { status: "no_support", reason: "no_answer", retrievedPages: [] }
  }

  const retrieved = retrieve(d.passages, answerText).map((r) => r.passage)
  if (retrieved.length === 0) {
    return { status: "no_support", reason: "no_passages", retrievedPages: [] }
  }

  const c = await d.loadCase()
  try {
    const reply = await d.revise({
      answerText,
      notes: c.examiner_notes,
      retrieved,
    })
    return checkCitation(reply, retrieved)
  } catch {
    const retrievedPages = [...new Set(retrieved.flatMap((p) => p.pages))].sort(
      (a, b) => a - b
    )
    return { status: "no_support", reason: "model_error", retrievedPages }
  }
}
