import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
 * Safely authenticates an incoming API request by validating the signed JWT cookie.
 * Prevents Insecure Direct Object References (IDOR) by deriving the user identity
 * strictly from cryptographic session credentials, never client-supplied IDs.
 *
 * Demo mode fallback is strictly isolated to the synthetic 'demo123' sandbox.
 */
export async function authenticateApiRequest(
  req: Request,
  requestedId?: string
): Promise<AuthResult> {
  // 1. Try reading the token cookie from next/headers
  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get("token")?.value;
  } catch {
    // Fallback to parsing the Cookie header directly
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  // 2. If token exists, verify cryptographic signature
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        name: string;
        plan?: string;
      };

      if (decoded && decoded.id) {
        return {
          authenticated: true,
          isDemo: false,
          user: {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name,
            plan: decoded.plan || "free",
          },
        };
      }
    } catch {
      // Invalid/expired token: proceed to check if non-prod demo mode applies
    }
  }

  // 3. Security Guard against IDOR:
  // If the client supplies a real MongoDB ObjectId without a valid token, reject immediately!
  if (requestedId && requestedId !== "demo123" && mongoose.Types.ObjectId.isValid(requestedId)) {
    return {
      authenticated: false,
      isDemo: false,
      error: "Authentication required to access user resources.",
    };
  }

  // 4. Isolated Demo Mode for local development / testing
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
