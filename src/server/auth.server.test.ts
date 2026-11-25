import { generateKeyPair, SignJWT } from "jose"
import type { JWTPayload, JWTVerifyGetKey } from "jose"
import { beforeAll, describe, expect, it } from "vitest"
import { verifyIdToken } from "./auth.server.ts"

let keys: JWTVerifyGetKey
let sign: (claims: JWTPayload) => Promise<string>

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256")
  keys = async () => publicKey
  sign = (claims) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey)
})

describe("verifyIdToken", () => {
  it("R-14 rejects missing and wrong-audience tokens", async () => {
    await expect(verifyIdToken(undefined, "proj", keys)).rejects.toThrow(
      "unauthenticated"
    )
    await expect(
      verifyIdToken(
        await sign({
          aud: "other",
          iss: "https://securetoken.google.com/other",
          sub: "u1",
        }),
        "proj",
        keys
      )
    ).rejects.toThrow("unauthenticated")
    await expect(
      verifyIdToken(
        await sign({
          aud: "proj",
          iss: "https://securetoken.google.com/proj",
          sub: "u1",
        }),
        "proj",
        keys
      )
    ).resolves.toEqual({ uid: "u1" })
  })

  it("rejects a token with the right audience but the wrong issuer, or no subject", async () => {
    await expect(
      verifyIdToken(
        await sign({ aud: "proj", iss: "https://evil.example", sub: "u1" }),
        "proj",
        keys
      )
    ).rejects.toThrow("unauthenticated")
    await expect(
      verifyIdToken(
        await sign({ aud: "proj", iss: "https://securetoken.google.com/proj" }),
        "proj",
        keys
      )
    ).rejects.toThrow("unauthenticated")
  })
})
