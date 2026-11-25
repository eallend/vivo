import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { verifyIdToken } from "./auth.server.ts"
import {
  handleRevision,
  handleStart,
  handleTurn,
  loadDeps,
} from "./viva.handlers.ts"

// A missing token passes validation so that verifyIdToken rejects it as "unauthenticated".
const Authed = z.object({ idToken: z.string().optional() })

const TurnInput = Authed.extend({
  text: z.string().max(2000),
  status: z.enum(["in_progress", "follow_up_asked", "finished"]),
  history: z
    .array(
      z.object({
        role: z.enum(["trainee", "examiner"]),
        text: z.string().max(4000),
      })
    )
    .max(100),
})

const RevisionInput = Authed.extend({ answerText: z.string().max(4000) })

const checkToken = (idToken: string | undefined) =>
  verifyIdToken(idToken, process.env.FIREBASE_PROJECT_ID!)

export const startViva = createServerFn({ method: "POST" })
  .validator(Authed)
  .handler(async ({ data }) => {
    await checkToken(data.idToken)
    return handleStart(await loadDeps())
  })

export const takeTurn = createServerFn({ method: "POST" })
  .validator(TurnInput)
  .handler(async ({ data: { idToken, ...input } }) => {
    await checkToken(idToken)
    return handleTurn(await loadDeps(), input)
  })

export const makeRevisionPoint = createServerFn({ method: "POST" })
  .validator(RevisionInput)
  .handler(async ({ data: { idToken, ...input } }) => {
    await checkToken(idToken)
    return handleRevision(await loadDeps(), input)
  })
