import { Spinner } from "@/components/ui/spinner"

/**
 * Full-page loader shown while a page's code downloads or while Firebase is
 * still restoring the session, so no page flashes before the redirect.
 * No Firebase import here: the router uses it on the server too.
 */
export function PageLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div
        role="status"
        className="flex items-center gap-3 text-lg font-bold text-muted-foreground"
      >
        <Spinner aria-hidden="true" role={undefined} className="size-6" />
        Loading…
      </div>
    </div>
  )
}
