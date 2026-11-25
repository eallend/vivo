import { beforeAll, describe, expect, it } from "vitest"
import { loadCase } from "../../server/case.server.ts"
import {
  formatHistory,
  resolveFindings,
  revealFinding,
  UNKNOWN_REQUEST_TEXT,
  valueWithUnit,
} from "./findings.ts"
import type { CaseData } from "./types.ts"

let c: CaseData

beforeAll(async () => {
  c = await loadCase()
})

const byId = (id: string) => revealFinding(c.findings.find((f) => f.id === id)!)

describe("findings wording", () => {
  it("R-1 keeps eye, value, unit", () => {
    const iop = byId("iop_right")
    expect(iop.spoken).toContain("Right eye")
    expect(iop.spoken).toContain("58 mmHg")
    expect(iop.spoken).toContain("Goldmann applanation")
    expect(byId("bp").spoken).toContain("168/94 mmHg")
    expect(byId("va_right").spoken).toMatch(/6\/36.*Snellen/)
    expect(byId("pupil_right").valueText!.match(/mm/g)).toHaveLength(1)
  })

  it("R-2 states unavailable findings", () => {
    const g = byId("gonio_right")
    expect(g.spoken).toContain("not available")
    expect(g.spoken).toContain("No view: corneal oedema")
    const r = byId("rapd")
    expect(r.spoken).toContain("Right pupil fixed")
    expect(r.spoken).not.toContain("Not assessable")
    expect(r.valueText).toBeNull()
  })

  it("R-3 orders right before left", () => {
    expect(
      resolveFindings(c, ["iop_left", "iop_right"]).revealed.map((f) => f.id)
    ).toEqual(["iop_right", "iop_left"])
  })

  it("R-4 reads the value from the file", () => {
    const edited = structuredClone(c)
    edited.findings.find((f) => f.id === "iop_right")!.value = 44
    expect(resolveFindings(edited, ["iop_right"]).revealed[0].spoken).toContain(
      "44 mmHg"
    )
  })

  it("treats an id missing from the case as unknown", () => {
    expect(
      resolveFindings(c, ["ct_head", "iop_right", "iop_right"])
    ).toMatchObject({
      unknownIds: ["ct_head"],
      revealed: [{ id: "iop_right" }],
    })
  })

  it("says not recorded for an available finding with no value", () => {
    expect(revealFinding({ ...c.findings[0], value: null }).spoken).toContain(
      "not recorded"
    )
    expect(
      revealFinding({ ...c.findings[0], value: null }).spoken
    ).not.toContain("null")
  })

  it("answers history from the patient block", () => {
    expect(formatHistory(c.patient, ["allergies", "medications"])).toContain(
      "Sulfonamide antibiotics (rash)"
    )
    expect(formatHistory(c.patient, ["medications"])).toContain(
      "Chlorphenamine 4 mg"
    )
  })

  it("words a full finding sentence", () => {
    expect(byId("iop_right").spoken).toBe(
      "Right eye, intraocular pressure: 58 mmHg. Goldmann applanation, 23:55."
    )
    expect(byId("bp").spoken).toBe(
      "Blood pressure: 168/94 mmHg. Automated cuff."
    )
    expect(byId("u_and_e").spoken).toBe(
      "Urea and electrolytes: not available. Bloods sent, results pending."
    )
    expect(byId("u_and_e").reason).toBe("Bloods sent, results pending")
  })

  it("orders by eye rank then case order", () => {
    const ids = ["bp", "refraction", "va_left", "iop_right", "va_right"]
    expect(resolveFindings(c, ids).revealed.map((f) => f.id)).toEqual([
      "va_right",
      "iop_right",
      "va_left",
      "refraction",
      "bp",
    ])
  })

  it("formats history one sentence per field", () => {
    expect(formatHistory(c.patient, ["allergies", "medications"])).toBe(
      "Allergies: Sulfonamide antibiotics (rash). Medications: Amlodipine 5 mg once daily; Chlorphenamine 4 mg (over the counter), started 2 days ago for hay fever."
    )
    expect(formatHistory(c.patient, ["age", "past_medical_history"])).toBe(
      "Age: 64. Past medical history: Hypertension."
    )
  })

  it("appends units once", () => {
    expect(valueWithUnit(58, "mmHg")).toBe("58 mmHg")
    expect(valueWithUnit("5 MM", "mm")).toBe("5 MM")
    expect(valueWithUnit("Clear", null)).toBe("Clear")
    expect(valueWithUnit(null, "mm")).toBeNull()
  })

  it("exports the unknown request text", () => {
    expect(UNKNOWN_REQUEST_TEXT).toBe("That is not available in this case.")
  })
})
