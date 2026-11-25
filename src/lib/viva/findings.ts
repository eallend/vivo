import type {
  CaseData,
  Eye,
  Finding,
  Patient,
  PatientField,
  RevealedFinding,
} from "./types.ts"

export const UNKNOWN_REQUEST_TEXT = "That is not available in this case."

const EYE_PREFIX: Record<Exclude<Eye, null>, string> = {
  right: "Right eye",
  left: "Left eye",
  both: "Both eyes",
}

const EYE_RANK: Record<Exclude<Eye, null>, number> = {
  right: 0,
  left: 1,
  both: 2,
}

const eyeRank = (eye: Eye): number => (eye === null ? 3 : EYE_RANK[eye])

/** Appends the unit with one space unless the value text already contains it (case-insensitive). */
export function valueWithUnit(
  value: string | number | null,
  unit: string | null
): string | null {
  if (value === null) return null
  const text = String(value)
  if (!unit || text.toLowerCase().includes(unit.toLowerCase())) return text
  return `${text} ${unit}`
}

/** Ends a sentence with a full stop unless it already ends with one. */
const sentence = (text: string): string =>
  /[.!?]$/.test(text) ? text : `${text}.`

/** Lower-cases a label for use after the eye prefix, keeping acronyms such as "OCT" intact. */
const lowerLabel = (label: string): string =>
  label
    .split(" ")
    .map((word) => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(" ")

const capitalise = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1)

const labelPart = (f: Finding): string =>
  f.eye === null
    ? capitalise(f.label)
    : `${EYE_PREFIX[f.eye]}, ${lowerLabel(f.label)}`

export function revealFinding(f: Finding): RevealedFinding {
  const base = { id: f.id, eye: f.eye, label: f.label, method: f.method }

  if (!f.available) {
    const reason = f.unavailable_reason ?? null
    const spoken = [
      `${labelPart(f)}: not available.`,
      reason ? sentence(reason) : null,
    ]
      .filter(Boolean)
      .join(" ")
    return { ...base, available: false, valueText: null, reason, spoken }
  }

  const valueText = valueWithUnit(f.value, f.unit) ?? "not recorded"
  const spoken = [
    sentence(`${labelPart(f)}: ${valueText}`),
    f.method ? sentence(f.method) : null,
  ]
    .filter(Boolean)
    .join(" ")
  return { ...base, available: true, valueText, reason: null, spoken }
}

/** Reveals the requested findings in case order within eye rank (right, left, both, none); unknown ids are returned separately. */
export function resolveFindings(
  c: CaseData,
  ids: string[]
): { revealed: RevealedFinding[]; unknownIds: string[] } {
  const requested = new Set(ids)
  const known = new Set(c.findings.map((f) => f.id))
  const unknownIds = [...requested].filter((id) => !known.has(id))

  const revealed = c.findings
    .map((f, index) => ({ f, index }))
    .filter(({ f }) => requested.has(f.id))
    .sort((a, b) => eyeRank(a.f.eye) - eyeRank(b.f.eye) || a.index - b.index)
    .map(({ f }) => revealFinding(f))

  return { revealed, unknownIds }
}

const fieldLabel = (field: PatientField): string =>
  capitalise(field.replaceAll("_", " "))

/** One sentence per field, e.g. "Allergies: Sulfonamide antibiotics (rash)."; arrays are joined with "; ". */
export function formatHistory(p: Patient, fields: PatientField[]): string {
  return fields
    .map((field) => {
      const value = p[field]
      const text = Array.isArray(value) ? value.join("; ") : String(value)
      return sentence(`${fieldLabel(field)}: ${text}`)
    })
    .join(" ")
}
