import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { RiArrowLeftLine, RiLogoutBoxRLine, RiMicLine } from "@remixicon/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { signOutUser } from "@/lib/firebase.client"

export const DISCLAIMER =
  "Fictional case for exam practice. Not clinical guidance."

/** The round mic mark and app name shown above the sign-in form. */
export function AppLogo() {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <RiMicLine className="size-5.5" />
      </span>
      <span className="text-2xl font-bold tracking-[-0.01em]">Voice Viva</span>
    </div>
  )
}

/** Top bar: app name (with the disclaimer during a viva) and actions on the right. */
export function AppHeader({
  note,
  children,
}: {
  note?: string
  children?: ReactNode
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <div className="flex items-baseline gap-3.5">
        <span className="text-xl font-bold tracking-[-0.01em]">Voice Viva</span>
        {note && <span className="text-sm text-muted-foreground">{note}</span>}
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </header>
  )
}

export function MyAttemptsLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 font-bold text-primary hover:text-foreground"
    >
      <RiArrowLeftLine aria-hidden="true" className="size-4.5" />
      My attempts
    </Link>
  )
}

/** Signs out; pages using `useSignedInUser` then send the user to `/login`. */
export function SignOutButton() {
  return (
    <Button variant="outline" onClick={() => void signOutUser()}>
      <RiLogoutBoxRLine aria-hidden="true" />
      <span>Sign out</span>
    </Button>
  )
}

export function AppFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "px-6 py-4 text-center text-sm text-muted-foreground",
        className
      )}
    >
      {DISCLAIMER}
    </footer>
  )
}
