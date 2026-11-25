import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useParams } from "@tanstack/react-router"
import {
  RiCheckLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiInformationLine,
  RiMicOffLine,
} from "@remixicon/react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  AppFooter,
  AppHeader,
  DISCLAIMER,
  MyAttemptsLink,
  SignOutButton,
} from "@/components/viva/app-shell"
import { FindingsPanel } from "@/components/viva/findings-panel"
import { RevisionPointCard } from "@/components/viva/revision-point-card"
import { StatusBanner } from "@/components/viva/status-banner"
import {
  ReviewTranscript,
  transcriptEntries,
  turnCount,
} from "@/components/viva/transcript"
import { TranscriptBubble } from "@/components/viva/transcript-bubble"
import { TurnDock } from "@/components/viva/turn-dock"
import { getAttempt, saveAttempt } from "@/lib/attempts.client"
import { getIdToken } from "@/lib/firebase.client"
import {
  listen,
  speak,
  speechSupported,
  stopListening,
} from "@/lib/speech.client"
import { useSignedInUser } from "@/lib/use-user.client"
import { applyReply } from "@/lib/viva/session"
import { makeRevisionPoint, takeTurn } from "@/server/viva.functions"
import type { Attempt } from "@/lib/attempts.client"
import type { TurnState } from "@/lib/viva/session"
import type { ExaminerReply, RevisionPoint } from "@/lib/viva/types"

// Limits of the server functions' input validation.
const MAX_TURN_TEXT = 2000
const MAX_HISTORY_TEXT = 4000
const MAX_HISTORY = 100
const MAX_ANSWER_TEXT = 4000

/** Shown, not saved, when a turn adds nothing (same words as the server's repeat reply). */
const REPEAT_TEXT = "Sorry, I didn't catch that. Please say it again."

type Notice = "nothing_heard" | "mic_problem" | "turn_failed"

const NOTICE_CAPTION: Record<Notice, string> = {
  nothing_heard: "Nothing was added. Press Speak and say it again.",
  mic_problem:
    "Nothing was added. Check your microphone, then press Speak and try again.",
  turn_failed:
    "Nothing was added. The examiner could not be reached; try again.",
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" })
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" })

function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel()
}

function historyOf(a: Attempt) {
  return a.turns.slice(-MAX_HISTORY).map((t) => ({
    role: t.role,
    text: t.text.slice(0, MAX_HISTORY_TEXT),
  }))
}

type Loaded = Attempt | "loading" | "missing" | "error"

export function VivaPage() {
  const { attemptId } = useParams({ from: "/viva/$attemptId" })
  const user = useSignedInUser()
  const [loaded, setLoaded] = useState<Loaded>("loading")

  useEffect(() => {
    if (!user) return
    let live = true
    setLoaded("loading")
    getAttempt(user.uid, attemptId)
      .then((a) => live && setLoaded(a ?? "missing"))
      .catch(() => live && setLoaded("error"))
    return () => {
      live = false
    }
  }, [user, attemptId])

  if (!user || typeof loaded === "string") {
    const problem =
      user && (loaded === "missing" || loaded === "error") ? loaded : null
    return <LoadingScreen problem={problem} />
  }
  return <VivaAttempt key={loaded.id} uid={user.uid} initial={loaded} />
}

function LoadingScreen({ problem }: { problem: "missing" | "error" | null }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader>
        <MyAttemptsLink />
        <SignOutButton />
      </AppHeader>
      <main className="mx-auto flex w-full max-w-308 grow flex-col gap-6 px-6 py-8">
        {problem ? (
          <p role="alert" className="text-xl font-bold">
            {problem === "missing"
              ? "This attempt was not found."
              : "This attempt could not be loaded. Reload the page to try again."}
          </p>
        ) : (
          <>
            <div
              role="status"
              className="flex items-center gap-3 text-xl font-bold"
            >
              <Spinner aria-hidden="true" role={undefined} className="size-6" />
              Loading this attempt…
            </div>
            <Skeleton aria-hidden="true" className="h-30 w-full rounded-md" />
            <div aria-hidden="true" className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-5.5 w-2/5" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-5.5 w-2/5" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            </div>
          </>
        )}
      </main>
      <AppFooter />
    </div>
  )
}

/** One loaded attempt: the live viva until it is finished, then the review. */
function VivaAttempt({ uid, initial }: { uid: string; initial: Attempt }) {
  const [attempt, setAttempt] = useState(initial)
  const attemptRef = useRef(initial)
  const [phase, setPhase] = useState<"session" | "review">(
    initial.status === "finished" ? "review" : "session"
  )
  const [saveFailed, setSaveFailed] = useState(false)
  // Set on unmount and when the viva is ended: async turn steps stop there.
  const stoppedRef = useRef(false)
  const endedRef = useRef(false)
  const halted = () => stoppedRef.current || endedRef.current

  useEffect(() => {
    stoppedRef.current = false
    return () => {
      stoppedRef.current = true
      stopSpeaking()
      stopListening()
    }
  }, [])

  function commit(a: Attempt) {
    attemptRef.current = a
    setAttempt(a)
  }

  async function persist(a: Attempt): Promise<void> {
    try {
      await saveAttempt(uid, a)
      if (!stoppedRef.current) setSaveFailed(false)
    } catch {
      if (!stoppedRef.current) setSaveFailed(true)
    }
  }

  // The revision point is made once the viva is finished, and again after a
  // reload if it was never saved.
  const revisingRef = useRef(false)
  useEffect(() => {
    if (phase !== "review" || attempt.revisionPoint || revisingRef.current) {
      return
    }
    revisingRef.current = true
    void (async () => {
      let revisionPoint: RevisionPoint
      let save = true
      try {
        revisionPoint = await makeRevisionPoint({
          data: {
            idToken: await getIdToken(),
            answerText: attemptRef.current.answerText.slice(0, MAX_ANSWER_TEXT),
          },
        })
      } catch {
        // Shown but not saved, so a reload asks again.
        revisionPoint = {
          status: "no_support",
          reason: "model_error",
          retrievedPages: [],
        }
        save = false
      }
      if (stoppedRef.current) return
      const next = { ...attemptRef.current, revisionPoint }
      commit(next)
      if (save) await persist(next)
    })()
  }, [phase, attempt.revisionPoint])

  function end() {
    endedRef.current = true
    stopSpeaking()
    stopListening()
    const finished: Attempt = { ...attemptRef.current, status: "finished" }
    commit(finished)
    setPhase("review")
    void persist(finished)
  }

  const saveAgain = () => void persist(attemptRef.current)

  if (phase === "review") {
    return (
      <ReviewScreen
        attempt={attempt}
        saveFailed={saveFailed}
        onSaveAgain={saveAgain}
      />
    )
  }
  return (
    <SessionScreen
      attempt={attempt}
      attemptRef={attemptRef}
      commit={commit}
      persist={persist}
      halted={halted}
      saveFailed={saveFailed}
      onSaveAgain={saveAgain}
      onEnd={end}
      onFinished={() => setPhase("review")}
    />
  )
}

function SessionScreen({
  attempt,
  attemptRef,
  commit,
  persist,
  halted,
  saveFailed,
  onSaveAgain,
  onEnd,
  onFinished,
}: {
  attempt: Attempt
  attemptRef: React.RefObject<Attempt>
  commit: (a: Attempt) => void
  persist: (a: Attempt) => Promise<void>
  halted: () => boolean
  saveFailed: boolean
  onSaveAgain: () => void
  onEnd: () => void
  onFinished: () => void
}) {
  const [voiceSupported] = useState(speechSupported)
  const [micBlocked, setMicBlocked] = useState(false)
  const voice = voiceSupported && !micBlocked
  const [turnState, setTurnState] = useState<TurnState>("your_turn")
  const [openingSpeaking, setOpeningSpeaking] = useState(false)
  const [pendingTrainee, setPendingTrainee] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(new Set())
  const [typedText, setTypedText] = useState("")
  const [confirmEnd, setConfirmEnd] = useState(false)

  // A new attempt opens with the examiner reading the opening prompt aloud.
  useEffect(() => {
    if (attemptRef.current.turns.length > 0) return
    let cancelled = false
    setOpeningSpeaking(true)
    setTurnState("examiner_speaking")
    void speak(attemptRef.current.openingPrompt, () => {}).then(() => {
      if (cancelled || halted()) return
      setOpeningSpeaking(false)
      setTurnState("your_turn")
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function runTurn(rawText: string) {
    const text = rawText.slice(0, MAX_TURN_TEXT)
    const before = attemptRef.current
    setNotice(null)
    setPendingTrainee(text)
    setTurnState("thinking")
    const startedAt = performance.now()

    let reply: ExaminerReply
    try {
      reply = await takeTurn({
        data: {
          idToken: await getIdToken(),
          text,
          status: before.status,
          history: historyOf(before),
        },
      })
    } catch {
      if (halted()) return
      setPendingTrainee(null)
      setNotice("turn_failed")
      setTurnState("your_turn")
      return
    }
    if (halted()) return

    const next = applyReply(before, text, reply, Date.now())
    const known = new Set(before.revealedFindings.map((f) => f.id))
    setNewIds(
      new Set(reply.revealed.map((f) => f.id).filter((id) => !known.has(id)))
    )
    setPendingTrainee(null)
    commit(next)
    setTurnState("examiner_speaking")

    // The turn time runs from sending the text to the examiner's audio starting.
    let spoken: Promise<void> = Promise.resolve()
    const ms = await new Promise<number>((resolve) => {
      spoken = speak(reply.spoken, () =>
        resolve(Math.round(performance.now() - startedAt))
      )
    })
    if (halted()) return
    const timed: Attempt = {
      ...next,
      turnTimingsMs: [...next.turnTimingsMs, ms],
    }
    commit(timed)
    await Promise.all([spoken, persist(timed)])
    if (halted()) return
    setNewIds(new Set())
    if (timed.status === "finished") onFinished()
    else setTurnState("your_turn")
  }

  async function onSpeak() {
    setNotice(null)
    setTurnState("listening")
    const heard = await listen()
    if (halted()) return
    if (heard.error === "mic_blocked") {
      setMicBlocked(true)
      setTurnState("your_turn")
      return
    }
    if (heard.text === "") {
      // Nothing heard: no server call, nothing saved.
      setNotice(heard.error === "no_speech" ? "nothing_heard" : "mic_problem")
      setTurnState("your_turn")
      return
    }
    await runTurn(heard.text)
  }

  function onSendTyped(text: string) {
    setTypedText("")
    void runTurn(text)
  }

  function retryMicrophone() {
    setMicBlocked(false)
    void onSpeak()
  }

  // Transcript: saved turns, then whatever the current turn is showing.
  const entries = transcriptEntries(attempt)
  const speakingIndex =
    turnState === "examiner_speaking"
      ? openingSpeaking
        ? 0
        : entries.length - 1
      : -1
  const shownCount =
    entries.length + (notice ? 1 : 0) + (pendingTrainee !== null ? 1 : 0)

  const scrollRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [shownCount, turnState])

  let caption: string | undefined
  if (turnState === "your_turn") {
    if (notice) caption = NOTICE_CAPTION[notice]
    else if (micBlocked) caption = "Type your turn, or allow the microphone."
    else if (attempt.status === "follow_up_asked") {
      caption =
        "Answer the follow-up question. The viva ends after your answer."
    }
  }

  return (
    <div className="flex h-svh min-h-180 min-w-250 flex-col overflow-hidden bg-background">
      <AppHeader note={DISCLAIMER}>
        {saveFailed ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-warning-foreground">
            <RiErrorWarningLine aria-hidden="true" className="size-4" />
            <span>Not saved</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <RiCheckLine aria-hidden="true" className="size-4" />
            <span>Saved</span>
          </span>
        )}
        <Button variant="outline" onClick={() => setConfirmEnd(true)}>
          <span>End viva</span>
        </Button>
      </AppHeader>

      <main className="flex min-h-0 grow">
        <section
          aria-label="Transcript"
          className="flex min-h-0 w-110 shrink-0 flex-col border-r border-border bg-sidebar"
        >
          <div className="flex shrink-0 items-baseline justify-between px-5 pt-3.5 pb-2.5">
            <h2 className="text-lg font-bold">Transcript</h2>
            <span className="text-sm text-muted-foreground">
              {turnCount(shownCount)}
            </span>
          </div>
          <div
            ref={scrollRef}
            className="min-h-0 grow overflow-y-auto px-5 pb-4"
          >
            <div className="flex min-h-full flex-col justify-end gap-2.5">
              {entries.map((e, i) => (
                <TranscriptBubble
                  key={i}
                  role={e.role}
                  text={e.text}
                  ms={e.ms}
                  live={i === speakingIndex ? "speaking" : undefined}
                />
              ))}
              {notice && (
                <TranscriptBubble role="examiner" text={REPEAT_TEXT} />
              )}
              {turnState === "listening" && (
                <TranscriptBubble role="trainee" live="listening" />
              )}
              {pendingTrainee !== null && (
                <>
                  <TranscriptBubble role="trainee" text={pendingTrainee} />
                  <TranscriptBubble role="examiner" live="thinking" />
                </>
              )}
            </div>
          </div>
        </section>

        <section
          aria-label="Case and findings"
          className="flex min-h-0 min-w-0 grow flex-col gap-4 overflow-y-auto px-6 py-4"
        >
          <div className="flex shrink-0 flex-col gap-1 rounded-lg bg-secondary px-4 py-3">
            <div className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
              The case
            </div>
            <div className="leading-[1.45]">{attempt.openingPrompt}</div>
          </div>
          <FindingsPanel
            findings={attempt.revealedFindings}
            newIds={turnState === "examiner_speaking" ? newIds : undefined}
          />
        </section>
      </main>

      {!voiceSupported && (
        <StatusBanner
          tone="info"
          icon={<RiInformationLine />}
          title="Voice needs desktop Chrome; you can type instead."
        />
      )}
      {micBlocked && (
        <StatusBanner
          tone="warning"
          icon={<RiMicOffLine />}
          title="Microphone is blocked."
          action={
            <Button variant="outline" onClick={retryMicrophone}>
              <span>Try again</span>
            </Button>
          }
        >
          Allow microphone access for this site in Chrome, then try again. You
          can type your turn meanwhile.
        </StatusBanner>
      )}
      {saveFailed && (
        <StatusBanner
          tone="warning"
          icon={<RiErrorWarningLine />}
          title="Your last turn was not saved."
          action={
            <Button variant="outline" onClick={onSaveAgain}>
              <span>Save again</span>
            </Button>
          }
        >
          Check your connection. The viva can continue once it is saved.
        </StatusBanner>
      )}

      <TurnDock
        state={turnState}
        voice={voice}
        typedText={typedText}
        onTypedTextChange={setTypedText}
        onSendTyped={onSendTyped}
        onSpeak={() => void onSpeak()}
        onStop={stopListening}
        caption={caption}
      />

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent className="gap-3 p-7 data-[size=default]:max-w-110 data-[size=default]:sm:max-w-110">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              End the viva now?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-normal">
              The viva will finish here and you will go to the review. A
              finished viva cannot be resumed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel size="lg">Keep going</AlertDialogCancel>
            <Button
              size="lg"
              onClick={() => {
                setConfirmEnd(false)
                onEnd()
              }}
            >
              End viva
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ReviewScreen({
  attempt,
  saveFailed,
  onSaveAgain,
}: {
  attempt: Attempt
  saveFailed: boolean
  onSaveAgain: () => void
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader>
        <MyAttemptsLink />
        <SignOutButton />
      </AppHeader>
      {saveFailed && (
        <StatusBanner
          tone="warning"
          icon={<RiErrorWarningLine />}
          title="This viva was not saved."
          action={
            <Button variant="outline" onClick={onSaveAgain}>
              <span>Save again</span>
            </Button>
          }
        >
          Check your connection, then save again.
        </StatusBanner>
      )}
      <main className="mx-auto flex w-full max-w-308 grow flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center gap-3.5">
          <h1 className="text-3xl font-bold">Viva review</h1>
          <Badge variant="secondary">
            <RiCheckLine aria-hidden="true" />
            Finished
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <RiEyeLine aria-hidden="true" className="size-4" />
            Read-only
          </span>
          <span className="ml-auto text-muted-foreground">
            {dateFormat.format(attempt.createdAt)},{" "}
            {timeFormat.format(attempt.createdAt)}
          </span>
        </div>
        <RevisionPointCard
          revisionPoint={attempt.revisionPoint ?? "preparing"}
        />
        <div className="grid grid-cols-2 items-start gap-6">
          <ReviewTranscript entries={transcriptEntries(attempt)} />
          <section aria-label="Findings">
            <FindingsPanel findings={attempt.revealedFindings} />
          </section>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
