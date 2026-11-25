import { RiBookOpenLine, RiInformationLine } from "@remixicon/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import type { RevisionPoint } from "@/lib/viva/types"

/** "page 5", "pages 5–6" for a run, "pages 5, 7 and 9" otherwise. */
export function formatPages(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b)
  if (sorted.length === 0) return ""
  if (sorted.length === 1) return `page ${sorted[0]}`
  const isRun = sorted.every((p, i) => i === 0 || p === sorted[i - 1] + 1)
  if (isRun) return `pages ${sorted[0]}–${sorted[sorted.length - 1]}`
  return `pages ${sorted.slice(0, -1).join(", ")} and ${sorted[sorted.length - 1]}`
}

/**
 * Whether asking again could help: only when making the point failed (the
 * model or the call), not when the answer or the note gave nothing to cite.
 */
export function canRetryRevisionPoint(revisionPoint: RevisionPoint): boolean {
  return (
    revisionPoint.status === "no_support" &&
    revisionPoint.reason === "model_error"
  )
}

/**
 * The post-viva revision point. Pass `"preparing"` while it is being made,
 * then the `RevisionPoint` the server returned. `onRetry` adds a Retry button
 * when the point failed to be made.
 */
export function RevisionPointCard({
  revisionPoint,
  onRetry,
  className,
}: {
  revisionPoint: RevisionPoint | "preparing"
  onRetry?: () => void
  className?: string
}) {
  const preparing = revisionPoint === "preparing"
  const supported = !preparing && revisionPoint.status === "supported"
  return (
    <Card
      role="region"
      aria-label="Revision point"
      className={cn(
        "gap-3.5 border-2 px-6 py-5.5 text-base",
        supported
          ? "border-primary"
          : preparing
            ? "border-dashed border-primary"
            : "border-dashed border-input",
        className
      )}
    >
      <div className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
        Revision point
      </div>

      {preparing ? (
        <>
          <div className="flex items-center gap-3.5">
            <Spinner aria-hidden="true" role={undefined} className="size-6" />
            <div className="flex flex-col gap-0.5">
              <div role="status" className="text-xl font-bold">
                Preparing your revision point…
              </div>
              <div className="leading-[1.45] text-muted-foreground">
                This can take up to about 20 seconds. Your transcript and
                findings are ready below.
              </div>
            </div>
          </div>
          <Progress value={null} aria-hidden="true" />
        </>
      ) : revisionPoint.status === "supported" ? (
        <>
          <p className="text-xl leading-[1.45] font-bold">
            {revisionPoint.point}
          </p>
          <figure className="flex flex-col gap-2.5 rounded-lg bg-accent px-4.5 py-4">
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <RiBookOpenLine aria-hidden="true" className="size-4.5" />
              <span>Reference note, {formatPages(revisionPoint.pages)}</span>
            </div>
            <blockquote className="text-lg leading-normal">
              “{revisionPoint.excerpt}”
            </blockquote>
            <figcaption className="text-sm text-muted-foreground">
              Quoted word for word from the reference note.
            </figcaption>
          </figure>
        </>
      ) : (
        <div className="flex items-start gap-3">
          <RiInformationLine
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          />
          <div className="flex flex-col gap-1">
            <p className="text-xl leading-[1.4] font-bold">
              No support found in the reference note for this answer.
            </p>
            <p className="leading-[1.45] text-muted-foreground">
              A revision point is only shown when the note backs it with a
              quote.
            </p>
            {onRetry && canRetryRevisionPoint(revisionPoint) && (
              <Button
                variant="outline"
                className="mt-2 self-start"
                onClick={onRetry}
              >
                <span>Retry</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
