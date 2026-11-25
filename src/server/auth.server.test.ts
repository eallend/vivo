import { generateKeyPair, SignJWT } from "jose"
import type { JWTPayload, JWTVerifyGetKey } from "jose"
import { beforeAll, describe, expect, it } from "vitest"
import { verifyIdToken } from "./auth.server.ts"

let keys: JWTVerifyGetKey
let sign: (claims: JWTPayload) => Promise<string>
let privateKey: CryptoKey

beforeAll(async () => {
  const pair = await generateKeyPair("RS256")
  const publicKey = pair.publicKey
  privateKey = pair.privateKey
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

  it("rejects an expired token and a token signed by another key", async () => {
    const claims = {
      aud: "proj",
      iss: "https://securetoken.google.com/proj",
      sub: "u1",
    }
    const now = Math.floor(Date.now() / 1000)
    const expired = await new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuedAt(now - 7200)
      .setExpirationTime(now - 3600)
      .sign(privateKey)
    await expect(verifyIdToken(expired, "proj", keys)).rejects.toThrow(
      "unauthenticated"
    )

    const other = await generateKeyPair("RS256")
    const forged = await new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(other.privateKey)
    await expect(verifyIdToken(forged, "proj", keys)).rejects.toThrow(
      "unauthenticated"
    )
  })
})
