import { afterEach, describe, expect, it, vi } from "vitest"
import { speak } from "./speech.client"

// A minimal stand-in for Chrome's speechSynthesis: it records the utterance
// so each test decides whether `start`, `end` or nothing fires.
interface FakeUtterance {
  text: string
  lang: string
  voice: unknown
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

function installFakeSynth() {
  const spoken: FakeUtterance[] = []
  const synth = {
    getVoices: () => [{ lang: "en-GB", localService: true }],
    addEventListener: () => {},
    removeEventListener: () => {},
    cancel: () => {},
    speak: (u: FakeUtterance) => spoken.push(u),
  }
  vi.stubGlobal("window", { speechSynthesis: synth })
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      lang = ""
      voice: unknown = null
      onstart = null
      onend = null
      onerror = null
      constructor(public text: string) {}
    }
  )
  return spoken
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("speak tells the caller whether audio really started", () => {
  it("reports false when speech is not available", async () => {
    const onStart = vi.fn()
    await speak("Hello", onStart)
    expect(onStart).toHaveBeenCalledExactlyOnceWith(false)
  })

  it("reports true when the utterance starts", async () => {
    const spoken = installFakeSynth()
    const onStart = vi.fn()
    const done = speak("Hello", onStart)
    await vi.waitFor(() => expect(spoken).toHaveLength(1))
    spoken[0].onstart?.()
    spoken[0].onend?.()
    await done
    expect(onStart).toHaveBeenCalledExactlyOnceWith(true)
  })

  it("reports false when the utterance fails before starting", async () => {
    const spoken = installFakeSynth()
    const onStart = vi.fn()
    const done = speak("Hello", onStart)
    await vi.waitFor(() => expect(spoken).toHaveLength(1))
    spoken[0].onerror?.()
    await done
    expect(onStart).toHaveBeenCalledExactlyOnceWith(false)
  })

  it("reports false when only the watchdog ends it", async () => {
    vi.useFakeTimers()
    const spoken = installFakeSynth()
    const onStart = vi.fn()
    const done = speak("Hello", onStart)
    await vi.waitFor(() => expect(spoken).toHaveLength(1))
    await vi.runAllTimersAsync()
    await done
    expect(onStart).toHaveBeenCalledExactlyOnceWith(false)
  })
})
