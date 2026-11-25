// Browser-only Firebase setup: routes that import this set `ssr: false`.
import { initializeApp } from "firebase/app"
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import type { User, UserCredential } from "firebase/auth"

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)
export const db = getFirestore(app)

export function signUp(
  email: string,
  password: string
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function signIn(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password)
}

export function signOutUser(): Promise<void> {
  return signOut(auth)
}

export function onUser(cb: (u: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb)
}

export async function getIdToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error("Not signed in")
  return user.getIdToken()
}
