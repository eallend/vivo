import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { loadCase } from "./case.server.ts"

const CASE_FILE =
  "docs/requirements/Eye Academy - Developer Take-Home (Case EA-VIVA-001).json"

describe("loadCase", () => {
  let tempDir: string | null = null

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
    tempDir = null
  })

  it("loads the provided case", async () => {
    const c = await loadCase()
    expect(c.case_id).toBe("EA-VIVA-001")
    expect(c.findings).toHaveLength(24)
    expect(c.findings.filter((f) => !f.available)).toHaveLength(6)
  })

  it("re-reads the file on every call", async () => {
    const original = JSON.parse(
      await readFile(join(process.cwd(), CASE_FILE), "utf8")
    )
    tempDir = await mkdtemp(join(tmpdir(), "viva-case-"))
    const path = join(tempDir, "case.json")

    const writeWithIop = async (value: number) => {
      const copy = structuredClone(original)
      copy.findings.find((f: { id: string }) => f.id === "iop_right").value =
        value
      await writeFile(path, JSON.stringify(copy))
    }

    await writeWithIop(44)
    const first = await loadCase(path)
    await writeWithIop(45)
    const second = await loadCase(path)

    expect(first.findings.find((f) => f.id === "iop_right")!.value).toBe(44)
    expect(second.findings.find((f) => f.id === "iop_right")!.value).toBe(45)
  })
})
