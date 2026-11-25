import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { useNavigate } from "@tanstack/react-router"
import { RiErrorWarningLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AppLogo, DISCLAIMER } from "@/components/viva/app-shell"
import {
  MIN_PASSWORD,
  authErrorMessage,
  checkCredentials,
} from "@/lib/auth-errors"
import { signIn, signUp } from "@/lib/firebase.client"
import { useUser } from "@/lib/use-user.client"
import { PageLoader } from "@/components/viva/page-loader"
import type { AuthError, AuthMode } from "@/lib/auth-errors"

const COPY: Record<
  AuthMode,
  {
    title: string
    intro: string
    submit: string
    switchText: string
    switchLink: string
  }
> = {
  sign_in: {
    title: "Sign in",
    intro: "Practise the oral exam out loud with an AI examiner.",
    submit: "Sign in",
    switchText: "New here?",
    switchLink: "Create an account",
  },
  sign_up: {
    title: "Create your account",
    intro: "Email and a password are all you need.",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLink: "Sign in",
  },
}

function ErrorText({ id, message }: { id: string; message: string }) {
  return (
    <FieldError id={id} className="flex items-start gap-1.5 leading-[1.35]">
      <RiErrorWarningLine
        aria-hidden="true"
        className="mt-px size-4 shrink-0"
      />
      <span>{message}</span>
    </FieldError>
  )
}

export function LoginPage() {
  const user = useUser()
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>("sign_in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<AuthError | null>(null)
  const [busy, setBusy] = useState(false)
  const copy = COPY[mode]

  useEffect(() => {
    if (user) void navigate({ to: "/" })
  }, [user, navigate])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const invalid = checkCredentials(mode, email, password)
    setError(invalid)
    if (invalid) return
    setBusy(true)
    try {
      // The signed-in user effect above then opens the attempts list.
      await (mode === "sign_in" ? signIn : signUp)(email.trim(), password)
    } catch (err) {
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  function switchMode() {
    setMode(mode === "sign_in" ? "sign_up" : "sign_in")
    setError(null)
  }

  // Session still being restored, or already signed in and on the way to /.
  if (user !== null) return <PageLoader />

  const emailError = error?.field === "email" ? error.message : null
  const passwordError = error?.field === "password" ? error.message : null

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6 py-12">
      <div className="flex w-full max-w-105 flex-col gap-5">
        <AppLogo />
        <form
          noValidate
          onSubmit={submit}
          className="flex flex-col gap-4.5 rounded-xl border border-border bg-card p-7"
        >
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl leading-tight font-bold">{copy.title}</h1>
            <p className="leading-[1.45] text-muted-foreground">{copy.intro}</p>
          </div>
          <Field className="gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={emailError !== null || undefined}
              aria-describedby={emailError ? "email-err" : undefined}
            />
            {emailError && <ErrorText id="email-err" message={emailError} />}
          </Field>
          <Field className="gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={
                mode === "sign_in" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={passwordError !== null || undefined}
              aria-describedby={passwordError ? "password-err" : undefined}
            />
            {passwordError ? (
              <ErrorText id="password-err" message={passwordError} />
            ) : (
              mode === "sign_up" && (
                <FieldDescription>
                  At least {MIN_PASSWORD} characters
                </FieldDescription>
              )
            )}
          </Field>
          {error?.field === "form" && (
            <ErrorText id="form-err" message={error.message} />
          )}
          <Button type="submit" size="lg" disabled={busy}>
            {copy.submit}
          </Button>
          <div className="text-center text-muted-foreground">
            {copy.switchText}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="text-primary underline hover:text-foreground"
            >
              {copy.switchLink}
            </button>
          </div>
        </form>
        <p className="text-center text-sm leading-[1.45] text-muted-foreground">
          {DISCLAIMER}
          <br />
          Voice needs desktop Chrome; you can type instead.
        </p>
      </div>
    </div>
  )
}
