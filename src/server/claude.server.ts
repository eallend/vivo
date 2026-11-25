import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import type {
  CaseData,
  ExaminerNotes,
  Interpretation,
  Passage,
  PatientField,
  VivaStatus,
} from "../lib/viva/types.ts"

const PATIENT_FIELDS = [
  "age",
  "sex",
  "presenting_complaint",
  "past_ocular_history",
  "past_medical_history",
  "medications",
  "allergies",
  "family_history",
] as const satisfies readonly PatientField[]

const turnModel = () => process.env.VIVA_TURN_MODEL ?? "claude-haiku-5-5"
const revisionModel = () => process.env.VIVA_REVISION_MODEL ?? "claude-opus-5-5"

let turnClient: Anthropic | null = null
let revisionClient: Anthropic | null = null

// Created on first use so the API key is read after the environment is loaded.
// No retry on the turn call: a 15 s timeout plus a retry could keep the trainee waiting 30 s.
const getTurnClient = () =>
  (turnClient ??= new Anthropic({ timeout: 15_000, maxRetries: 0 }))
const getRevisionClient = () =>
  (revisionClient ??= new Anthropic({ timeout: 60_000, maxRetries: 1 }))

const InterpretationSchema = z.object({
  findingIds: z.array(z.string()),
  historyFields: z.array(z.enum(PATIENT_FIELDS)),
  unknownRequests: z.array(z.string()),
  gaveAnswer: z.boolean(),
  followUpQuestion: z.string().nullable(),
})

type HistoryEntry = { role: "trainee" | "examiner"; text: string }

/** The turn prompt: finding ids, eyes and labels only, never a finding's value. */
function turnSystemPrompt(c: CaseData, status: VivaStatus): string {
  const findings = c.findings
    .map((f) => `${f.id} | ${f.eye ?? "none"} | ${f.label}`)
    .join("\n")
  const ideas = c.examiner_notes.follow_up_ideas.map((i) => `- ${i}`).join("\n")

  return [
    "You interpret what an ophthalmology trainee says during an oral exam (a viva). You do not answer the trainee; you only classify the latest utterance into the JSON fields.",
    "",
    "Findings the trainee can ask for, one per line as id | eye | label:",
    findings,
    "",
    `Patient history fields the trainee can ask for: ${PATIENT_FIELDS.join(", ")}.`,
    "",
    "Rules:",
    "- findingIds: the ids of every finding the trainee asks for in the latest utterance. Use only ids from the list. If the trainee asks for a finding without naming an eye, list the ids for both eyes.",
    "- historyFields: the patient history fields the trainee asks about.",
    "- unknownRequests: short descriptions of anything the trainee asks for that matches no finding and no history field.",
    "- gaveAnswer: true only when the trainee states a diagnosis or a management plan. Asking for findings or history is not an answer.",
    "- followUpQuestion: when gaveAnswer is true, write one short follow-up question that reacts to the trainee's answer. Never restate any finding, number or eye in it. Otherwise null.",
    status === "in_progress"
      ? ""
      : "- The examiner has already asked the follow-up question; set followUpQuestion to null.",
    "",
    "Follow-up ideas, for inspiration only:",
    ideas || "- What would you do next?",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n")
}

function turnUserMessage(text: string, history: HistoryEntry[]): string {
  const earlier = history
    .map((h) => `${h.role === "trainee" ? "Trainee" : "Examiner"}: ${h.text}`)
    .join("\n")
  return [
    earlier ? `Conversation so far:\n${earlier}\n` : "",
    `Latest trainee utterance:\n${text}`,
  ].join("")
}

/** Asks the turn model what the trainee asked for and whether they gave an answer. */
export async function interpretTurn(args: {
  c: CaseData
  text: string
  history: HistoryEntry[]
  status: VivaStatus
}): Promise<Interpretation> {
  const response = await getTurnClient().messages.parse({
    model: turnModel(),
    max_tokens: 1024,
    system: turnSystemPrompt(args.c, args.status),
    messages: [
      { role: "user", content: turnUserMessage(args.text, args.history) },
    ],
    output_config: {
      effort: "low",
      format: zodOutputFormat(InterpretationSchema),
    },
  })
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(
      `turn model gave no usable output (${response.stop_reason})`
    )
  }
  return response.parsed_output
}

const RevisionSchema = z.object({
  supported: z.boolean(),
  point: z.string(),
  passageId: z.string().nullable(),
  quote: z.string().nullable(),
})

const REVISION_SYSTEM_PROMPT = [
  "You write one revision point for an ophthalmology trainee after an oral exam.",
  "You get the trainee's answer, the examiner's notes and numbered passages from a reference note.",
  "Pick the most important thing the trainee missed or got wrong that one of the passages supports.",
  "Write it as `point`: one or two plain sentences addressed to the trainee.",
  "Set `passageId` to the id of the passage that supports it, and `quote` to a word-for-word copy of 15 to 300 characters from that passage.",
  'Copy the quote from within one sentence of one passage. Some passages are table rows whose cells are joined by " | ": never let a quote cross a " | ".',
  "If no passage supports any such point, return supported: false with passageId and quote null.",
].join("\n")

function revisionUserMessage(
  answerText: string,
  notes: ExaminerNotes,
  retrieved: Passage[]
): string {
  const passages = retrieved
    .map(
      (p) =>
        `<passage id="${p.id}" pages="${p.pages.join(",")}" heading="${p.heading}">\n${p.text}\n</passage>`
    )
    .join("\n")
  return [
    `<trainee_answer>\n${answerText}\n</trainee_answer>`,
    `<examiner_notes>\nDiagnosis: ${notes.diagnosis}\nKey points:\n${notes.key_points.map((k) => `- ${k}`).join("\n")}\n</examiner_notes>`,
    `<passages>\n${passages}\n</passages>`,
  ].join("\n\n")
}

/** Asks the revision model for one point backed by a verbatim quote; throws on a refusal or unparsable output. */
export async function writeRevision(args: {
  answerText: string
  notes: ExaminerNotes
  retrieved: Passage[]
}): Promise<{
  supported: boolean
  point: string
  passageId: string | null
  quote: string | null
}> {
  const response = await getRevisionClient().messages.parse({
    model: revisionModel(),
    max_tokens: 4000,
    system: REVISION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: revisionUserMessage(
          args.answerText,
          args.notes,
          args.retrieved
        ),
      },
    ],
    output_config: {
      effort: "medium",
      format: zodOutputFormat(RevisionSchema),
    },
  })
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(
      `revision model gave no usable output (${response.stop_reason})`
    )
  }
  return response.parsed_output
}
