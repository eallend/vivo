import { useEffect, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  RiAddLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiErrorWarningLine,
} from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  AppFooter,
  AppHeader,
  SignOutButton,
} from "@/components/viva/app-shell"
import { createAttempt, listAttempts } from "@/lib/attempts.client"
import { getIdToken } from "@/lib/firebase.client"
import { useSignedInUser } from "@/lib/use-user.client"
import { PageLoader } from "@/components/viva/page-loader"
import { startViva } from "@/server/viva.functions"
import type { Attempt } from "@/lib/attempts.client"

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" })
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeStyle: "short" })

function StatusBadge({ status }: { status: Attempt["status"] }) {
  if (status === "finished") {
    return (
      <Badge variant="secondary">
        <RiCheckLine aria-hidden="true" />
        Finished
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-primary">
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      In progress
    </Badge>
  )
}

function AttemptRow({ attempt }: { attempt: Attempt }) {
  const finished = attempt.status === "finished"
  return (
    <li>
      <Link
        to="/viva/$attemptId"
        params={{ attemptId: attempt.id }}
        className="flex items-center gap-4 border-t border-border px-5 py-4 text-foreground hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <span className="flex grow flex-col gap-0.5">
          <span className="text-lg font-bold">
            {dateFormat.format(attempt.createdAt)}
          </span>
          <span className="text-sm text-muted-foreground">
            {timeFormat.format(attempt.createdAt)}
          </span>
        </span>
        <StatusBadge status={attempt.status} />
        <span className="inline-flex w-32.5 items-center justify-end gap-1 font-bold text-primary">
          {finished ? "Open review" : "Continue"}
          <RiArrowRightSLine aria-hidden="true" className="size-4.5" />
        </span>
      </Link>
    </li>
  )
}

export function HomePage() {
  const user = useSignedInUser()
  const navigate = useNavigate()
  const [attempts, setAttempts] = useState<Attempt[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(false)

  useEffect(() => {
    if (!user) return
    let live = true
    listAttempts(user.uid)
      .then((list) => live && setAttempts(list))
      .catch(() => live && setLoadError(true))
    return () => {
      live = false
    }
  }, [user])

  async function start() {
    if (!user) return
    setStarting(true)
    setStartError(false)
    try {
      const opening = await startViva({ data: { idToken: await getIdToken() } })
      const attempt = await createAttempt(user.uid, opening)
      await navigate({
        to: "/viva/$attemptId",
        params: { attemptId: attempt.id },
      })
    } catch {
      setStartError(true)
      setStarting(false)
    }
  }

  const startButton = (label: string) => (
    <Button size="lg" onClick={start} disabled={starting}>
      {starting ? (
        <Spinner className="text-current" />
      ) : (
        <RiAddLine aria-hidden="true" />
      )}
      {label}
    </Button>
  )
  const empty = attempts !== null && attempts.length === 0

  // Session still being restored, or signed out and on the way to /login.
  if (!user) return <PageLoader />

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader>
        <SignOutButton />
      </AppHeader>
      <main className="mx-auto flex w-full max-w-205 grow flex-col gap-5 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">My attempts</h1>
          {(loadError || (attempts !== null && !empty)) &&
            startButton("Start new viva")}
        </div>
        {startError && (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-sm font-bold text-destructive"
          >
            <RiErrorWarningLine aria-hidden="true" className="size-4" />
            The viva could not be started. Check your connection and try again.
          </p>
        )}
        {loadError ? (
          <p role="alert" className="font-bold text-destructive">
            Your attempts could not be loaded. Reload the page to try again.
          </p>
        ) : attempts === null ? (
          <div
            aria-label="Loading your attempts"
            className="flex flex-col gap-2.5"
          >
            <Skeleton className="h-18 w-full" />
            <Skeleton className="h-18 w-full" />
          </div>
        ) : empty ? (
          <Empty className="flex-none gap-3.5 bg-card px-8 py-12">
            <EmptyTitle className="text-2xl">No attempts yet</EmptyTitle>
            <EmptyDescription className="max-w-115 text-base leading-normal">
              You will talk through one patient case with an AI examiner: ask
              for findings, give your diagnosis and management, then answer one
              follow-up question.
            </EmptyDescription>
            <EmptyContent>{startButton("Start your first viva")}</EmptyContent>
          </Empty>
        ) : (
          <>
            <ul className="overflow-hidden rounded-xl border border-border bg-card [&>li:first-child>a]:border-t-0">
              {attempts.map((a) => (
                <AttemptRow key={a.id} attempt={a} />
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              Newest first. Only you can see your attempts.
            </p>
          </>
        )}
      </main>
      <AppFooter />
    </div>
  )
}
