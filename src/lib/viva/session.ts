import type { Attempt } from "../attempts.client.ts"
import type { ExaminerReply, RevealedFinding } from "./types.ts"

/** The four states of the turn loop shown in the dock. */
export type TurnState =
  "your_turn" | "listening" | "thinking" | "examiner_speaking"

function mergeRevealed(
  known: RevealedFinding[],
  added: RevealedFinding[]
): RevealedFinding[] {
  const ids = new Set(known.map((f) => f.id))
  const merged = [...known]
  for (const f of added) {
    if (!ids.has(f.id)) {
      ids.add(f.id)
      merged.push(f)
    }
  }
  return merged
}

function appendLine(text: string, line: string): string {
  return text === "" ? line : `${text}\n${line}`
}

/**
 * Merges one examiner reply into the attempt: both turns, newly revealed
 * findings, status, the follow-up question and answer, and the answer text
 * (the turn that triggered the follow-up and the follow-up answer).
 * A reply that would move a finished attempt back is ignored.
 */
export function applyReply(
  a: Attempt,
  traineeText: string,
  reply: ExaminerReply,
  now: number
): Attempt {
  if (a.status === "finished" && reply.status !== "finished") return a

  const question = reply.followUpQuestion
  const asksFollowUp = question !== null
  const answersFollowUp =
    a.status === "follow_up_asked" && reply.status === "finished"

  let followUp = a.followUp
  if (asksFollowUp) {
    followUp = { question, answer: null }
  } else if (answersFollowUp && followUp) {
    followUp = { ...followUp, answer: traineeText }
  }

  return {
    ...a,
    status: reply.status,
    turns: [
      ...a.turns,
      { role: "trainee", text: traineeText, at: now },
      { role: "examiner", text: reply.spoken, at: now },
    ],
    revealedFindings: mergeRevealed(a.revealedFindings, reply.revealed),
    followUp,
    answerText:
      asksFollowUp || answersFollowUp
        ? appendLine(a.answerText, traineeText)
        : a.answerText,
  }
}
