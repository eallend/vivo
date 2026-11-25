import { cn } from "@/lib/utils"
import { EyeTag } from "@/components/viva/eye-tag"
import { FindingCard, FindingNotAsked } from "@/components/viva/finding-card"
import type { RevealedFinding } from "@/lib/viva/types"

export interface FindingGroups {
  /** One row per label: right eye in the left column, as the examiner faces the patient. */
  pairs: {
    label: string
    right: RevealedFinding | null
    left: RevealedFinding | null
  }[]
  both: RevealedFinding[]
  /** Whole-body findings (`eye: null`). */
  body: RevealedFinding[]
}

/** Groups revealed findings for the panel, keeping first-seen order. */
export function groupFindings(findings: RevealedFinding[]): FindingGroups {
  const pairs: FindingGroups["pairs"] = []
  const byLabel = new Map<string, FindingGroups["pairs"][number]>()
  const both: RevealedFinding[] = []
  const body: RevealedFinding[] = []
  for (const f of findings) {
    if (f.eye === "right" || f.eye === "left") {
      let pair = byLabel.get(f.label)
      if (!pair) {
        pair = { label: f.label, right: null, left: null }
        byLabel.set(f.label, pair)
        pairs.push(pair)
      }
      pair[f.eye] = f
    } else if (f.eye === "both") {
      both.push(f)
    } else {
      body.push(f)
    }
  }
  return { pairs, both, body }
}

/**
 * Revealed findings: right/left pairs in two columns, then both-eye findings,
 * then whole-body findings. `newIds` marks findings revealed by the reply
 * being spoken.
 */
export function FindingsPanel({
  findings,
  newIds,
  className,
}: {
  findings: RevealedFinding[]
  newIds?: ReadonlySet<string>
  className?: string
}) {
  const { pairs, both, body } = groupFindings(findings)
  const card = (f: RevealedFinding) => (
    <FindingCard key={f.id} finding={f} isNew={newIds?.has(f.id) ?? false} />
  )
  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">Findings</h2>
        <span className="text-sm text-muted-foreground">
          {findings.length} revealed · Right eye is on the left, as you face the
          patient
        </span>
      </div>
      {findings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-input p-7 text-center leading-normal text-muted-foreground">
          No findings yet.
          <br />
          Each finding you ask for appears here and stays for the whole viva.
        </div>
      ) : (
        <>
          {pairs.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <EyeTag eye="right" />
              </div>
              <div>
                <EyeTag eye="left" />
              </div>
              {pairs.flatMap((p) => [
                p.right ? (
                  card(p.right)
                ) : (
                  <FindingNotAsked key={`${p.label}-right`} />
                ),
                p.left ? (
                  card(p.left)
                ) : (
                  <FindingNotAsked key={`${p.label}-left`} />
                ),
              ])}
            </div>
          )}
          {both.length > 0 && (
            <div className="flex flex-col gap-2.5">{both.map(card)}</div>
          )}
          {body.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">{body.map(card)}</div>
          )}
        </>
      )}
    </div>
  )
}
