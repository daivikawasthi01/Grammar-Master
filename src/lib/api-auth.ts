import "./polyfill";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { JWT_SECRET } from "@/app/config/auth";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  plan: string;
}

export interface AuthSuccess {
  authenticated: true;
  isDemo: false;
  user: AuthenticatedUser;
}

export interface DemoSession {
  authenticated: false;
  isDemo: true;
  user: AuthenticatedUser;
}

export interface AuthFailure {
  authenticated: false;
  isDemo: false;
  error: string;
}

export type AuthResult = AuthSuccess | DemoSession | AuthFailure;

/**
 * Checks if demo mode is allowed in the current runtime environment.
 * Strictly disabled in production unless explicitly enabled via ALLOW_DEMO_MODE=true.
 */
export function isDemoModeAllowed(): boolean {
  if (process.env.ALLOW_DEMO_MODE === "true") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

/**
 * Extracts and verifies JWT from request cookies using jose or jsonwebtoken.
 */
export async function verifyTokenFromRequest(req: Request): Promise<AuthenticatedUser | null> {
  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get("token")?.value;
  } catch {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) return null;

  try {
    // Primary: jose HMAC SHA-256 verification (works across Edge & Node runtimes)
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secretKey);
    const id = (payload.id as string) || (payload.sub as string);
    if (id) {
      return {
        id,
        email: (payload.email as string) || "",
        name: (payload.name as string) || "User",
        plan: (payload.plan as string) || "free",
      };
    }
  } catch {
    try {
      // Fallback: jsonwebtoken
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && (decoded.id || decoded.sub)) {
        return {
          id: decoded.id || decoded.sub,
          email: decoded.email || "",
          name: decoded.name || "User",
          plan: decoded.plan || "free",
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Strict authentication guard: returns verified user or 401 response.
 * Never falls back to demo mode or trusts client IDs.
 */
export async function requireUser(
  req: Request
): Promise<{ user: AuthenticatedUser } | { response: NextResponse }> {
  const user = await verifyTokenFromRequest(req);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Safely authenticates an incoming API request by validating the signed JWT cookie.
 * Prevents Insecure Direct Object References (IDOR) by deriving the user identity
 * strictly from cryptographic session credentials, never client-supplied IDs.
 */
export async function authenticateApiRequest(
  req: Request,
  requestedId?: string
): Promise<AuthResult> {
  const verifiedUser = await verifyTokenFromRequest(req);

  if (verifiedUser) {
    return {
      authenticated: true,
      isDemo: false,
      user: verifiedUser,
    };
  }

  // Security Guard against IDOR:
  // If the client supplies a real MongoDB ObjectId without a valid token, reject immediately!
  if (requestedId && requestedId !== "demo123" && mongoose.Types.ObjectId.isValid(requestedId)) {
    return {
      authenticated: false,
      isDemo: false,
      error: "Authentication required to access user resources.",
    };
  }

  // Isolated Demo Mode for local development / testing
  if (isDemoModeAllowed() && (!requestedId || requestedId === "demo123")) {
    return {
      authenticated: false,
      isDemo: true,
      user: {
        id: "demo123",
        email: "demo@writ.ai",
        name: "Demo User",
        plan: "free",
      },
    };
  }

  return {
    authenticated: false,
    isDemo: false,
    error: "Authentication required.",
  };
}

/**
 * Standard route guard helper that returns a 401 response if unauthenticated.
 */
export async function requireAuthOrDemo(
  req: Request,
  requestedId?: string
): Promise<{ auth: AuthSuccess | DemoSession } | { response: NextResponse }> {
  const result = await authenticateApiRequest(req, requestedId);

  if (!result.authenticated && !result.isDemo) {
    return {
      response: NextResponse.json(
        { error: result.error || "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { auth: result };
}

