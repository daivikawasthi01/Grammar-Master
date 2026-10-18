import { SignJWT, jwtVerify } from "jose";

/**
 * The session cookie holds a short signed token naming a server-side session.
 * The proxy verifies the signature (edge-safe, no DB); route handlers also
 * check that the session row still exists, which is what makes logout and
 * password changes revoke access immediately.
 */
export const SESSION_COOKIE = "gm_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionClaims = { sid: string; sub: string };

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signSessionToken(claims: SessionClaims, secret: string): Promise<string> {
  return new SignJWT({ sid: claims.sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key(secret));
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined): Promise<SessionClaims | null> {
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    if (typeof payload.sid !== "string" || typeof payload.sub !== "string") return null;
    return { sid: payload.sid, sub: payload.sub };
  } catch {
    return null;
  }
}
