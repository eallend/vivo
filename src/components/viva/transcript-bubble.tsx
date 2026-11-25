import { RiMoreLine, RiVoiceprintLine, RiVolumeUpLine } from "@remixicon/react"
import { cn } from "@/lib/utils"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Message } from "@/components/ui/message"
import type { Turn } from "@/lib/attempts.client"

/** Live states: the trainee is being recorded, the examiner is working out or speaking a reply. */
export type BubbleLiveState = "listening" | "thinking" | "speaking"

const SPEAKER: Record<Turn["role"], string> = {
  examiner: "Examiner",
  trainee: "Trainee",
}

export function formatMs(ms: number): string {
  return `${Math.round(ms).toLocaleString("en-GB")} ms`
}

/**
 * One transcript turn. Examiner bubbles sit on the left (outline), trainee
 * bubbles on the right (secondary). `ms` is the examiner's response time.
 * `live="listening"` / `"thinking"` show a placeholder instead of `text`.
 */
export function TranscriptBubble({
  role,
  text = "",
  ms = null,
  live,
  className,
}: {
  role: Turn["role"]
  text?: string
  ms?: number | null
  live?: BubbleLiveState
  className?: string
}) {
  const examiner = role === "examiner"
  const placeholder = live === "listening" || live === "thinking"
  return (
    <Message align={examiner ? "start" : "end"} className={className}>
      <Bubble variant={examiner ? "outline" : "secondary"}>
        <BubbleContent
          className={cn(
            "flex flex-col gap-0.75",
            // `!` beats the Bubble variant's own border and background on the content.
            live === "listening" &&
              "border-2 border-dashed border-recording! bg-recording-muted!",
            live === "thinking" && "border-2 border-dashed border-input!",
            live === "speaking" && "border-2 border-foreground!"
          )}
        >
          <div className="flex items-baseline gap-2.5 text-xs text-muted-foreground">
            <span className="font-bold tracking-[0.06em] uppercase">
              {SPEAKER[role]}
            </span>
            {ms !== null && <span>{formatMs(ms)}</span>}
            {live === "speaking" && (
              <span className="ml-auto inline-flex items-center gap-1.25 self-center font-bold text-foreground">
                <RiVolumeUpLine aria-hidden="true" className="size-3.5" />
                <span>Speaking</span>
              </span>
            )}
          </div>
          {placeholder ? (
            <div
              className={cn(
                "flex items-center gap-2 font-bold",
                live === "listening"
                  ? "text-recording-muted-foreground"
                  : "text-muted-foreground"
              )}
            >
              {live === "listening" ? (
                <RiVoiceprintLine aria-hidden="true" className="size-4.5" />
              ) : (
                <RiMoreLine aria-hidden="true" className="size-4.5" />
              )}
              <span>{live === "listening" ? "Listening…" : "Thinking…"}</span>
            </div>
          ) : (
            <div>{text}</div>
          )}
        </BubbleContent>
      </Bubble>
    </Message>
  )
}
