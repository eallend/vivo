/// <reference types="node" />
// Live privacy check (R-10): one account can read its own attempt, another
// account and an anonymous caller cannot. Creates two throwaway accounts per run.
// Run with `pnpm check:privacy` (reads the Firebase web config from .env.local).

const apiKey = process.env.VITE_FIREBASE_API_KEY
const projectId =
  process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID

if (!apiKey || !projectId) {
  console.error(
    "Missing VITE_FIREBASE_API_KEY or VITE_FIREBASE_PROJECT_ID in .env.local"
  )
  process.exit(1)
}

interface Account {
  uid: string
  idToken: string
}

const documentsBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`

function randomTag(): string {
  return Math.random().toString(36).slice(2, 10)
}

async function signUp(label: string): Promise<Account> {
  const email = `viva-check-${randomTag()}@example.com`
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: `pw-${randomTag()}-${randomTag()}`,
        returnSecureToken: true,
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `sign-up of account ${label} failed: HTTP ${res.status} ${body}`
    )
  }
  const data = (await res.json()) as { localId: string; idToken: string }
  console.log(`signed up account ${label} (${email})`)
  return { uid: data.localId, idToken: data.idToken }
}

function docUrl(uid: string): string {
  return `${documentsBase}/users/${uid}/attempts/privacy-check`
}

function authHeader(account: Account | null): Record<string, string> {
  return account ? { Authorization: `Bearer ${account.idToken}` } : {}
}

let failures = 0

function report(step: string, expected: number, observed: number, detail = "") {
  const ok = expected === observed
  if (!ok) failures++
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${step}: expected ${expected}, observed ${observed}${
      ok || !detail ? "" : `\n      ${detail}`
    }`
  )
  return ok
}

async function main() {
  const a = await signUp("A")
  const b = await signUp("B")

  const write = await fetch(docUrl(a.uid), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(a) },
    body: JSON.stringify({
      fields: {
        note: { stringValue: "privacy check" },
        at: { integerValue: String(Date.now()) },
      },
    }),
  })
  const writeBody = await write.text()
  if (!report("A writes own attempt", 200, write.status, writeBody)) {
    console.log("stopping: A's write did not succeed, reads are meaningless")
    process.exit(1)
  }

  const cases: Array<[string, Account | null, number]> = [
    ["A reads own attempt", a, 200],
    ["B reads A's attempt", b, 403],
    ["anonymous reads A's attempt", null, 403],
  ]
  for (const [step, who, expected] of cases) {
    const res = await fetch(docUrl(a.uid), { headers: authHeader(who) })
    report(step, expected, res.status, await res.text())
  }

  if (failures > 0) {
    console.log(
      `\nprivacy check FAILED (${failures} mismatch${failures > 1 ? "es" : ""})`
    )
    process.exit(1)
  }
  console.log("\nprivacy check PASSED")
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
