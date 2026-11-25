import { useId } from "react"
import type { FormEvent, ReactNode } from "react"
import {
  RiArrowRightLine,
  RiMicLine,
  RiMicOffLine,
  RiMoreLine,
  RiVoiceprintLine,
  RiVolumeUpLine,
} from "@remixicon/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { TurnState } from "@/lib/viva/session"

const PLACEHOLDER = "For a noisy room or a broken microphone"

interface Look {
  dock: string
  tone: string
  icon: ReactNode
  title: string
  caption: string
  captionTone: string
  labelTone: string
}

function look(state: TurnState, voice: boolean): Look {
  switch (state) {
    case "listening":
      return {
        dock: "border-recording bg-recording-muted",
        tone: "text-recording-muted-foreground",
        icon: <RiVoiceprintLine />,
        title: "Listening",
        caption: "Recording you now. Press Stop when you have finished.",
        captionTone: "text-foreground",
        labelTone: "text-foreground",
      }
    case "thinking":
      return {
        dock: "border-dashed border-input bg-muted",
        tone: "text-foreground",
        icon: <RiMoreLine />,
        title: "Thinking",
        caption: "The examiner is working out a reply.",
        captionTone: "text-muted-foreground",
        labelTone: "text-muted-foreground",
      }
    case "examiner_speaking":
      return {
        dock: "border-speaking bg-speaking",
        tone: "text-speaking-foreground",
        icon: <RiVolumeUpLine />,
        title: "Examiner speaking",
        caption: "Audio is playing. You can speak when it ends.",
        captionTone: "text-speaking-muted-foreground",
        labelTone: "text-speaking-muted-foreground",
      }
    case "your_turn":
      return {
        dock: "border-primary bg-card",
        tone: "text-primary",
        icon: <RiMicLine />,
        title: "Your turn",
        caption: voice
          ? "Press Speak, then ask for a finding or give your answer."
          : "Type your question or answer below.",
        captionTone: "text-muted-foreground",
        labelTone: "text-muted-foreground",
      }
  }
}

/** Disabled Speak button looks, per dock background (no opacity fade, as in the kit). */
const SPEAK_DISABLED: Record<TurnState, string> = {
  your_turn: "border-dashed border-input bg-muted text-muted-foreground",
  listening: "",
  thinking: "border-dashed border-input bg-card text-muted-foreground",
  examiner_speaking:
    "border-dashed border-muted-foreground bg-speaking-foreground/10 text-speaking-muted-foreground",
}

/**
 * The bottom dock of the viva screen: turn state, the Speak / Stop control
 * and the typed-turn box. `voice` is false when speech is unavailable, which
 * makes typing the main path. Presentational: the parent owns the state.
 */
export function TurnDock({
  state,
  voice,
  typedText,
  onTypedTextChange,
  onSendTyped,
  onSpeak,
  onStop,
  caption,
  className,
}: {
  state: TurnState
  voice: boolean
  typedText: string
  onTypedTextChange: (text: string) => void
  onSendTyped: (text: string) => void
  onSpeak: () => void
  onStop: () => void
  /** Replaces the state's default caption, e.g. after nothing was heard. */
  caption?: string
  className?: string
}) {
  const inputId = useId()
  const l = look(state, voice)
  const canType = state === "your_turn"
  const canSpeak = canType && voice
  const typingFirst = canType && !voice
  const onDark = state === "examiner_speaking"

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = typedText.trim()
    if (canType && text !== "") onSendTyped(text)
  }

  return (
    <section
      aria-label="Your turn"
      className={cn(
        "flex shrink-0 items-center gap-6 border-t-4 px-6 py-3.5",
        l.dock,
        className
      )}
    >
      <div className={cn("flex w-100 shrink-0 items-center gap-3.5", l.tone)}>
        <span
          aria-hidden="true"
          className="flex size-13 shrink-0 items-center justify-center rounded-full border-2 border-current [&_svg]:size-6"
        >
          {l.icon}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div role="status" className="text-2xl leading-tight font-bold">
            {l.title}
          </div>
          <div className={cn("text-sm leading-snug", l.captionTone)}>
            {caption ?? l.caption}
          </div>
        </div>
      </div>

      {state === "listening" ? (
        <Button
          size="speak"
          onClick={onStop}
          className="border-recording bg-recording text-recording-foreground ring-6 ring-recording/20 hover:bg-recording/90 motion-safe:animate-speak-pulse"
        >
          <span
            aria-hidden="true"
            className="size-3.5 rounded-[3px] bg-current"
          />
          <span>Stop</span>
        </Button>
      ) : (
        <Button
          size="speak"
          onClick={onSpeak}
          disabled={!canSpeak}
          className={cn(
            !canSpeak && ["disabled:opacity-100", SPEAK_DISABLED[state]]
          )}
        >
          {canSpeak ? <RiMicLine /> : <RiMicOffLine />}
          <span>Speak</span>
        </Button>
      )}

      <form onSubmit={submit} className="flex min-w-0 grow flex-col gap-1">
        <label htmlFor={inputId} className={cn("text-sm", l.labelTone)}>
          {voice ? "Or type your turn instead of speaking" : "Type your turn"}
        </label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            value={typedText}
            onChange={(e) => onTypedTextChange(e.target.value)}
            disabled={!canType}
            placeholder={PLACEHOLDER}
            className={cn(
              typingFirst && "border-2 border-primary",
              onDark &&
                "placeholder:text-speaking-muted-foreground/70 disabled:border-muted-foreground disabled:bg-speaking-foreground/10 disabled:text-speaking-muted-foreground"
            )}
          />
          <Button
            type="submit"
            variant="outline"
            size="icon-lg"
            aria-label="Send typed turn"
            disabled={!canType}
            className={cn(
              "disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100",
              typingFirst && "border-primary",
              onDark &&
                "disabled:border-muted-foreground disabled:bg-speaking-foreground/10 disabled:text-speaking-muted-foreground"
            )}
          >
            <RiArrowRightLine />
          </Button>
        </div>
      </form>
    </section>
  )
}
