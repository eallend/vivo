import { createRemoteJWKSet, jwtVerify } from "jose"
import type { JWTVerifyGetKey } from "jose"

const GOOGLE_KEYS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

let googleKeys: JWTVerifyGetKey | null = null

/** Google's public keys for Firebase ID tokens, fetched once and cached by jose. */
function defaultKeys(): JWTVerifyGetKey {
  googleKeys ??= createRemoteJWKSet(new URL(GOOGLE_KEYS_URL))
  return googleKeys
}

/** Checks a Firebase ID token; any failure (missing, expired, wrong project, bad signature) throws "unauthenticated". */
export async function verifyIdToken(
  token: string | undefined,
  projectId: string,
  keys: JWTVerifyGetKey = defaultKeys()
): Promise<{ uid: string }> {
  try {
    if (!token || !projectId) throw new Error("missing token or project")
    const { payload } = await jwtVerify(token, keys, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    })
    if (typeof payload.sub !== "string" || payload.sub === "") {
      throw new Error("no subject")
    }
    return { uid: payload.sub }
  } catch {
    throw new Error("unauthenticated")
  }
}
