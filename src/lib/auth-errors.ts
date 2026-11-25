// Firebase Auth error codes turned into the sign-in screen's messages.

export type AuthMode = "sign_in" | "sign_up"

export interface AuthError {
  field: "email" | "password" | "form"
  message: string
}

export const MIN_PASSWORD = 8

/** Checks done before calling Firebase (sign-up asks for 8 characters; Firebase's own minimum is 6). */
export function checkCredentials(
  mode: AuthMode,
  email: string,
  password: string
): AuthError | null {
  if (email.trim() === "") {
    return { field: "email", message: "Enter your email address." }
  }
  if (password === "") {
    return { field: "password", message: "Enter your password." }
  }
  if (mode === "sign_up" && password.length < MIN_PASSWORD) {
    return {
      field: "password",
      message: `Password is too short. Use at least ${MIN_PASSWORD} characters.`,
    }
  }
  return null
}

function codeOf(err: unknown): string {
  return typeof err === "object" && err !== null && "code" in err
    ? String(err.code)
    : ""
}

export function authErrorMessage(err: unknown): AuthError {
  const code = codeOf(err)
  switch (code) {
    case "auth/wrong-password":
      return {
        field: "password",
        message: "Wrong password. Check it and try again.",
      }
    // With email enumeration protection on, Firebase reports a wrong password
    // and an unknown email alike.
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return {
        field: "password",
        message: "Wrong email or password. Check them and try again.",
      }
    case "auth/user-not-found":
      return {
        field: "email",
        message: "No account uses this email. Create an account instead.",
      }
    case "auth/email-already-in-use":
      return {
        field: "email",
        message: "This email is already in use. Sign in instead.",
      }
    case "auth/invalid-email":
      return { field: "email", message: "Enter a valid email address." }
    case "auth/weak-password":
      return {
        field: "password",
        message: `Password is too short. Use at least ${MIN_PASSWORD} characters.`,
      }
    case "auth/too-many-requests":
      return {
        field: "form",
        message: "Too many attempts. Wait a minute and try again.",
      }
    case "auth/network-request-failed":
      return {
        field: "form",
        message: "No connection. Check it and try again.",
      }
    default:
      return {
        field: "form",
        message: `Something went wrong${code ? ` (${code})` : ""}. Try again.`,
      }
  }
}
