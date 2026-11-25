import { cn } from "@/lib/utils"
import { formatMs } from "@/components/viva/transcript-bubble"
import type { Attempt, Turn } from "@/lib/attempts.client"

export interface TranscriptEntry {
  role: Turn["role"]
  text: string
  /** The examiner's response time for this reply, when it was measured. */
  ms: number | null
}

/**
 * The opening prompt followed by every saved turn. The n-th examiner turn
 * gets `turnTimingsMs[n]`; the opening prompt has no time.
 */
export function transcriptEntries(
  a: Pick<Attempt, "openingPrompt" | "turns" | "turnTimingsMs">
): TranscriptEntry[] {
  let examinerIndex = 0
  return [
    { role: "examiner", text: a.openingPrompt, ms: null },
    ...a.turns.map((t): TranscriptEntry => {
      if (t.role === "trainee") return { role: t.role, text: t.text, ms: null }
      const ms = a.turnTimingsMs[examinerIndex] ?? null
      examinerIndex += 1
      return { role: t.role, text: t.text, ms }
    }),
  ]
}

export function turnCount(n: number): string {
  return `${n} ${n === 1 ? "turn" : "turns"}`
}

const SPEAKER: Record<Turn["role"], string> = {
  examiner: "Examiner",
  trainee: "Trainee",
}

/** The read-only transcript on the review screen: one row per turn. */
export function ReviewTranscript({
  entries,
  className,
}: {
  entries: TranscriptEntry[]
  className?: string
}) {
  return (
    <section
      aria-label="Transcript"
      className={cn("flex flex-col gap-3.5", className)}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Transcript</h2>
        <span className="text-sm text-muted-foreground">
          {turnCount(entries.length)}
        </span>
      </div>
      <ol className="overflow-hidden rounded-xl border border-border">
        {entries.map((e, i) => (
          <li
            key={i}
            className={cn(
              "flex gap-3.5 border-t border-border px-4 py-3 first:border-t-0",
              e.role === "examiner" ? "bg-card" : "bg-secondary"
            )}
          >
            <span className="flex w-21 shrink-0 flex-col gap-0.5 pt-0.75 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
              <span>{SPEAKER[e.role]}</span>
              {e.ms !== null && (
                <span className="font-normal tracking-normal normal-case">
                  {formatMs(e.ms)}
                </span>
              )}
            </span>
            <span className="leading-normal">{e.text}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
