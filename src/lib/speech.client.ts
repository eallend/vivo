// Browser speech: Web Speech API recognition (listen) and synthesis (speak), en-GB.
// Desktop Chrome only (other browsers are a non-goal); callers check speechSupported().

export type ListenError = "none" | "no_speech" | "mic_blocked" | "other"

export interface ListenResult {
  text: string
  error: ListenError
}

// The DOM lib has no SpeechRecognition types; this is the part used here.
interface RecognitionResultList {
  length: number
  [index: number]: { isFinal: boolean; 0: { transcript: string } }
}

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: RecognitionResultList }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognitionConstructor = new () => Recognition

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechSupported(): boolean {
  return (
    recognitionConstructor() !== null &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  )
}

let current: Recognition | null = null

const LISTEN_LIMIT_MS = 60_000

function toListenError(code: string): ListenError {
  if (code === "no-speech") return "no_speech"
  // audio-capture = no microphone found; the trainee fixes it the same way.
  if (
    code === "not-allowed" ||
    code === "service-not-allowed" ||
    code === "audio-capture"
  ) {
    return "mic_blocked"
  }
  return "other"
}

/**
 * Records one utterance in en-GB and resolves with its final transcript.
 * Never rejects: `error` says why `text` is empty (nothing heard, microphone
 * blocked, or anything else). `stopListening()` ends it early with what was heard.
 */
export function listen(): Promise<ListenResult> {
  const Ctor = recognitionConstructor()
  if (!Ctor) return Promise.resolve({ text: "", error: "other" })
  current?.abort()

  return new Promise((resolve) => {
    const rec = new Ctor()
    rec.lang = "en-GB"
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 1

    let text = ""
    let error: ListenError = "none"
    let settled = false
    // A stuck recogniser must not keep the screen in "Listening": stop after
    // LISTEN_LIMIT_MS, and give up entirely if `end` still does not arrive.
    const stopTimer = setTimeout(() => rec.stop(), LISTEN_LIMIT_MS)
    const giveUpTimer = setTimeout(() => {
      rec.abort()
      finish()
    }, LISTEN_LIMIT_MS + 3000)
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(stopTimer)
      clearTimeout(giveUpTimer)
      if (current === rec) current = null
      const heard = text.trim()
      resolve({
        text: heard,
        error: heard !== "" ? "none" : error === "none" ? "no_speech" : error,
      })
    }

    rec.onresult = (e) => {
      const parts: string[] = []
      for (const result of Array.from(e.results)) {
        if (result.isFinal) parts.push(result[0].transcript)
      }
      text = parts.join(" ")
    }
    rec.onerror = (e) => {
      error = toListenError(e.error)
    }
    rec.onend = finish

    current = rec
    try {
      rec.start()
    } catch {
      error = "other"
      finish()
    }
  })
}

/** Ends the current recognition; the pending `listen()` resolves with what was heard. */
export function stopListening(): void {
  current?.stop()
}

function pickVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  return (
    voices.find((v) => v.lang === "en-GB" && v.localService) ??
    voices.find((v) => v.lang === "en-GB") ??
    voices.find((v) => v.lang.replace("_", "-").startsWith("en-GB")) ??
    null
  )
}

/** Chrome loads voices asynchronously; wait briefly for them on first use. */
function loadVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const voices = synth.getVoices()
  if (voices.length > 0) return Promise.resolve(voices)
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done)
      clearTimeout(timer)
      resolve(synth.getVoices())
    }
    const timer = setTimeout(done, 1000)
    synth.addEventListener("voiceschanged", done)
  })
}

// Held so Chrome does not garbage-collect the utterance before `end` fires.
let speaking: SpeechSynthesisUtterance | null = null

/**
 * Speaks `text` with an en-GB voice when one exists. `onStart` runs exactly
 * once: with `true` when audio starts, or with `false` when speech cannot play,
 * fails, or the watchdog gives up before `start` fired (so callers' timers
 * always stop, and know the moment is not a real audio start). Resolves when
 * speech ends or fails. Never rejects.
 */
const START_LIMIT_MS = 3000

export async function speak(
  text: string,
  onStart: (audioStarted: boolean) => void
): Promise<void> {
  let started = false
  const start = (audioStarted: boolean) => {
    if (started) return
    started = true
    onStart(audioStarted)
  }

  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    text.trim() === ""
  ) {
    start(false)
    return
  }
  const synth = window.speechSynthesis
  const voice = pickVoice(await loadVoices(synth))

  await new Promise<void>((resolve) => {
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = "en-GB"
    if (voice) u.voice = voice
    // Chrome sometimes never fires `end` (right after cancel(), long remote
    // voices). Without this the viva would stay in "Examiner speaking" for good.
    // Budget: ~80 ms per character (slow speech) plus 5 s for start-up.
    const watchdog = setTimeout(
      () => {
        synth.cancel()
        end()
      },
      text.length * 80 + 5000
    )
    // If audio has not started within START_LIMIT_MS, Chrome's speech engine is
    // stuck or silent (seen on a real machine: speaking=true, no events at all).
    // Give up quickly; the text is already on screen.
    const startGuard = setTimeout(() => {
      if (!started) {
        synth.cancel()
        end()
      }
    }, START_LIMIT_MS)
    let ended = false
    const end = () => {
      if (ended) return
      ended = true
      clearTimeout(watchdog)
      clearTimeout(startGuard)
      if (speaking === u) speaking = null
      start(false)
      resolve()
    }
    u.onstart = () => start(true)
    u.onend = end
    u.onerror = end
    speaking = u
    synth.speak(u)
  })
}
