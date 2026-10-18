import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Convenience redirects and request ids only. This is NOT the security boundary:
 * every API route and the app layout check the session against the database themselves.
 */
export async function proxy(request: NextRequest) {
  // Never trust a client-supplied id: it would let a caller forge log correlation.
  const requestId = crypto.randomUUID();
  const { pathname } = request.nextUrl;

  const withId = (res: NextResponse) => {
    res.headers.set(REQUEST_ID_HEADER, requestId);
    return res;
  };

  if (pathname.startsWith("/api")) {
    const headers = new Headers(request.headers);
    headers.set(REQUEST_ID_HEADER, requestId);
    return withId(NextResponse.next({ request: { headers } }));
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = Boolean(await verifySessionToken(token, process.env.JWT_SECRET));

  if (pathname.startsWith("/app") && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    const res = withId(NextResponse.redirect(url));
    // A stale or forged cookie would otherwise loop between /app and /login.
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (signedIn && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return withId(NextResponse.redirect(url));
  }

  return withId(NextResponse.next());
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register", "/api/:path*"],
};
