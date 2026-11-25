import { RiForbidLine } from "@remixicon/react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { EyeTag } from "@/components/viva/eye-tag"
import type { RevealedFinding } from "@/lib/viva/types"

/** One revealed finding: eye, label, value (or "Not recorded" when blank) and method, or "Not available" with the reason. */
export function FindingCard({
  finding,
  isNew = false,
  className,
}: {
  finding: RevealedFinding
  isNew?: boolean
  className?: string
}) {
  const unavailable = !finding.available
  return (
    <Card
      size="sm"
      className={cn(
        "min-w-0 gap-1.25 rounded-lg",
        // A 2px border keeps the outer size by trimming 1px of padding.
        unavailable
          ? "border-2 border-dashed border-input bg-sidebar px-3.5 py-3"
          : isNew
            ? "border-2 border-primary px-3.5 py-3"
            : "px-3.75 py-3.25",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <EyeTag eye={finding.eye} size="sm" />
        <span className="text-sm font-bold text-muted-foreground">
          {finding.label}
        </span>
        {isNew && (
          <span className="ml-auto text-xs font-bold tracking-[0.06em] text-primary uppercase">
            New
          </span>
        )}
      </div>
      {unavailable ? (
        <div className="flex items-center gap-2 text-lg leading-tight font-bold text-muted-foreground">
          <RiForbidLine aria-hidden="true" className="size-5 shrink-0" />
          <span>Not available</span>
        </div>
      ) : (
        <div className="text-xl leading-tight font-bold text-card-foreground">
          {finding.valueText?.trim() || "Not recorded"}
        </div>
      )}
      {(unavailable ? finding.reason : finding.method) && (
        <div className="text-sm leading-snug text-muted-foreground">
          {unavailable ? finding.reason : finding.method}
        </div>
      )}
    </Card>
  )
}

/** An empty grid cell for a finding the trainee has not asked for. */
export function FindingNotAsked({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-16 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground",
        className
      )}
    >
      Not asked
    </div>
  )
}
