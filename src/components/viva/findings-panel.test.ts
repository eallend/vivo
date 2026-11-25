import { describe, expect, it } from "vitest"
import { groupFindings } from "./findings-panel"
import type { Eye, RevealedFinding } from "@/lib/viva/types"

const f = (id: string, eye: Eye, label: string): RevealedFinding => ({
  id,
  eye,
  label,
  available: true,
  valueText: "x",
  method: null,
  reason: null,
  spoken: "",
})

describe("groupFindings", () => {
  it("pairs right and left by label in first-seen order, then both eyes, then whole body", () => {
    const groups = groupFindings([
      f("pupil_right", "right", "Pupil"),
      f("bp", null, "Blood pressure"),
      f("iop_left", "left", "Intraocular pressure"),
      f("refraction", "both", "Refraction"),
      f("iop_right", "right", "Intraocular pressure"),
    ])
    expect(groups.pairs.map((p) => [p.label, p.right?.id, p.left?.id])).toEqual(
      [
        ["Pupil", "pupil_right", undefined],
        ["Intraocular pressure", "iop_right", "iop_left"],
      ]
    )
    expect(groups.both.map((x) => x.id)).toEqual(["refraction"])
    expect(groups.body.map((x) => x.id)).toEqual(["bp"])
  })

  it("is empty for no findings", () => {
    expect(groupFindings([])).toEqual({ pairs: [], both: [], body: [] })
  })
})
