import { lazy } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"

// The page uses Firebase and browser speech, so it is loaded only in the browser.
const loadPage = createClientOnlyFn(
  () => import("@/components/viva/home-page.client")
)

export const Route = createFileRoute("/")({
  ssr: false,
  component: lazy(() => loadPage().then((m) => ({ default: m.HomePage }))),
})
