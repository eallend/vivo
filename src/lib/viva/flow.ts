import {
  formatHistory,
  resolveFindings,
  UNKNOWN_REQUEST_TEXT,
} from "./findings.ts"
import type {
  CaseData,
  ExaminerReply,
  Interpretation,
  VivaStatus,
} from "./types.ts"

export const CLOSING_TEXT = "Thank you. That concludes the viva."

export const PROMPT_AGAIN_TEXT =
  "Please ask for an examination finding, or tell me your diagnosis and management."

/** Model text that could restate a finding (a number, or naming an eye) is replaced by the case's first follow-up idea. */
export function guardFollowUp(
  question: string | null,
  ideas: string[]
): string {
  const text = question?.trim() ?? ""
  if (text === "" || /\d/.test(text) || /\b(right|left)\b/i.test(text)) {
    return ideas[0]
  }
  return text
}

/** Builds the examiner's reply for one turn; after the single follow-up has been asked, the viva closes. */
export function buildReply(
  c: CaseData,
  status: VivaStatus,
  i: Interpretation
): ExaminerReply {
  if (status !== "in_progress") {
    return {
      spoken: CLOSING_TEXT,
      revealed: [],
      status: "finished",
      followUpQuestion: null,
    }
  }

  const { revealed, unknownIds } = resolveFindings(c, i.findingIds)
  const history = formatHistory(c.patient, i.historyFields)
  const followUpQuestion = i.gaveAnswer
    ? guardFollowUp(i.followUpQuestion, c.examiner_notes.follow_up_ideas)
    : null

  const parts = [
    ...revealed.map((r) => r.spoken),
    history,
    i.unknownRequests.length > 0 || unknownIds.length > 0
      ? UNKNOWN_REQUEST_TEXT
      : "",
    followUpQuestion ?? "",
  ].filter((part) => part !== "")

  return {
    spoken: parts.length > 0 ? parts.join(" ") : PROMPT_AGAIN_TEXT,
    revealed,
    status: i.gaveAnswer ? "follow_up_asked" : "in_progress",
    followUpQuestion,
  }
}
