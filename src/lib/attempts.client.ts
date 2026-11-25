// Owner-only attempt storage at users/{uid}/attempts/{id} (see firestore.rules).
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase.client"
import type {
  RevealedFinding,
  RevisionPoint,
  VivaStatus,
} from "@/lib/viva/types"

export interface Turn {
  role: "trainee" | "examiner"
  text: string
  at: number
}

export interface Attempt {
  id: string
  caseId: string
  title: string
  openingPrompt: string
  status: VivaStatus
  createdAt: number
  updatedAt: number
  turns: Turn[]
  revealedFindings: RevealedFinding[]
  followUp: { question: string; answer: string | null } | null
  answerText: string
  revisionPoint: RevisionPoint | null
  turnTimingsMs: number[]
}

function attemptsCollection(uid: string) {
  return collection(db, "users", uid, "attempts")
}

export async function createAttempt(
  uid: string,
  start: { caseId: string; title: string; openingPrompt: string }
): Promise<Attempt> {
  const ref = doc(attemptsCollection(uid))
  const now = Date.now()
  const attempt: Attempt = {
    id: ref.id,
    caseId: start.caseId,
    title: start.title,
    openingPrompt: start.openingPrompt,
    status: "in_progress",
    createdAt: now,
    updatedAt: now,
    turns: [],
    revealedFindings: [],
    followUp: null,
    answerText: "",
    revisionPoint: null,
    turnTimingsMs: [],
  }
  await setDoc(ref, attempt)
  return attempt
}

export async function saveAttempt(uid: string, a: Attempt): Promise<void> {
  await setDoc(doc(attemptsCollection(uid), a.id), {
    ...a,
    updatedAt: Date.now(),
  })
}

export async function listAttempts(uid: string): Promise<Attempt[]> {
  const snap = await getDocs(
    query(attemptsCollection(uid), orderBy("createdAt", "desc"))
  )
  return snap.docs.map((d) => ({ ...(d.data() as Attempt), id: d.id }))
}

export async function getAttempt(
  uid: string,
  id: string
): Promise<Attempt | null> {
  const snap = await getDoc(doc(attemptsCollection(uid), id))
  return snap.exists() ? { ...(snap.data() as Attempt), id: snap.id } : null
}
