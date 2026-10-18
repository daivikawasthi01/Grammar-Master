import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { Types } from "mongoose";
import { env } from "@/lib/env";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "@/lib/session-token";
import { connectDb } from "@/server/db";
import { Session } from "@/server/models/Session";
import { User } from "@/server/models/User";
import { AppError } from "@/server/errors";

export type SessionUser = { id: string; email: string; name: string; language: string; sessionId: string };

function readCookie(req: Request): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Resolves the signed-in user from the request cookie, or null. Never trusts any id the client sends. */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const claims = await verifySessionToken(readCookie(req), env.JWT_SECRET);
  if (!claims || !Types.ObjectId.isValid(claims.sid)) return null;
  await connectDb();
  const session = await Session.findOne({ _id: claims.sid, userId: claims.sub, expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  const user = await User.findById(session.userId).lean();
  if (!user) return null;
  return { id: String(user._id), email: user.email, name: user.name, language: user.language ?? "en-US", sessionId: claims.sid };
}

export async function requireUser(req: Request): Promise<SessionUser> {
  const user = await getSessionUser(req);
  if (!user) throw new AppError("UNAUTHENTICATED", "Sign in to continue");
  return user;
}

/** For server components: the same check, reading the cookie from next/headers. */
export async function getSessionUserFromCookies(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(new Request("http://internal", { headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } }));
}

export type IssuedSession = { token: string; expiresAt: Date };

export async function startSession(userId: string, req: Request): Promise<IssuedSession> {
  await connectDb();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const session = await Session.create({
    userId,
    expiresAt,
    userAgent: req.headers.get("user-agent")?.slice(0, 300),
  });
  const token = await signSessionToken({ sid: String(session._id), sub: userId }, env.JWT_SECRET);
  return { token, expiresAt };
}

/** Attach the session cookie to a response. HTTP-only, so page scripts can never read it. */
export function setSessionCookie(res: NextResponse, session: IssuedSession): NextResponse {
  res.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return res;
}

export async function endSession(res: NextResponse, sessionId?: string): Promise<NextResponse> {
  if (sessionId) {
    await connectDb();
    await Session.deleteOne({ _id: sessionId });
  }
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

/** Revokes every session of a user except, optionally, the current one. */
export async function endOtherSessions(userId: string, keepSessionId?: string): Promise<void> {
  await connectDb();
  await Session.deleteMany({ userId, ...(keepSessionId ? { _id: { $ne: keepSessionId } } : {}) });
}
