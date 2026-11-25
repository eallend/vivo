// Firebase sign-in state for routes (browser only: routes using it set `ssr: false`).
import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { onUser } from "@/lib/firebase.client"
import type { User } from "firebase/auth"

/** `undefined` until Firebase has restored the session, then the user or `null`. */
export function useUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => onUser(setUser), [])
  return user
}

/** The signed-in user; sends anyone signed out to `/login`. `null` while unknown or leaving. */
export function useSignedInUser(): User | null {
  const user = useUser()
  const navigate = useNavigate()
  useEffect(() => {
    if (user === null) void navigate({ to: "/login" })
  }, [user, navigate])
  return user ?? null
}
