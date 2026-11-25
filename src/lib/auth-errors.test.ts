import { describe, expect, it } from "vitest"
import { authErrorMessage, checkCredentials } from "./auth-errors"

describe("authErrorMessage", () => {
  it("puts each Firebase error on the field it is about", () => {
    expect(authErrorMessage({ code: "auth/wrong-password" })).toEqual({
      field: "password",
      message: "Wrong password. Check it and try again.",
    })
    expect(authErrorMessage({ code: "auth/email-already-in-use" })).toEqual({
      field: "email",
      message: "This email is already in use. Sign in instead.",
    })
    expect(authErrorMessage({ code: "auth/invalid-credential" }).field).toBe(
      "password"
    )
  })

  it("shows an unknown code on the form", () => {
    expect(authErrorMessage({ code: "auth/odd" })).toEqual({
      field: "form",
      message: "Something went wrong (auth/odd). Try again.",
    })
    expect(authErrorMessage(new Error("x")).field).toBe("form")
  })
})

describe("checkCredentials", () => {
  it("asks for 8 characters when creating an account only", () => {
    expect(checkCredentials("sign_up", "a@b.c", "abc12")).toEqual({
      field: "password",
      message: "Password is too short. Use at least 8 characters.",
    })
    expect(checkCredentials("sign_in", "a@b.c", "abc12")).toBeNull()
    expect(checkCredentials("sign_up", "a@b.c", "longenoughpw")).toBeNull()
    expect(checkCredentials("sign_in", " ", "x")?.field).toBe("email")
  })
})
