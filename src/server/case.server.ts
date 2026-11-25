import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import type { CaseData } from "../lib/viva/types.ts"

const DEFAULT_CASE_FILE =
  "docs/requirements/Eye Academy - Developer Take-Home (Case EA-VIVA-001).json"

/** Reads the case file on every call (no cache), so edits to the file show up without a restart. */
export async function loadCase(path?: string): Promise<CaseData> {
  const casePath = resolve(
    process.cwd(),
    path ?? process.env.VIVA_CASE_PATH ?? DEFAULT_CASE_FILE
  )
  return JSON.parse(await readFile(casePath, "utf8")) as CaseData
}
