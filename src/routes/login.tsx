import { lazy } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"

// The page uses Firebase and browser speech, so it is loaded only in the browser.
const loadPage = createClientOnlyFn(
  () => import("@/components/viva/login-page.client")
)

export const Route = createFileRoute("/login")({
  ssr: false,
  component: lazy(() => loadPage().then((m) => ({ default: m.LoginPage }))),
})
