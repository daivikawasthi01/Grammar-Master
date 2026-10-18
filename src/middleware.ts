import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const REQUEST_ID_HEADER = 'x-request-id';

async function isValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;

  try {
    const secretKey = new TextEncoder().encode(secret);
    await jose.jwtVerify(token, secretKey);
    return true;
  } catch {
    return false;
  }
}

/** Forward the request id to route handlers and echo it back so a user can quote it in a bug report. */
function withRequestId(request: NextRequest, requestId: string): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export async function middleware(request: NextRequest) {
  // Never trust a client-supplied id: it would let a caller forge log correlation.
  const requestId = crypto.randomUUID();
  const { pathname } = request.nextUrl;

  // API routes only get an id; each handler does its own auth check.
  if (pathname.startsWith('/api')) {
    return withRequestId(request, requestId);
  }

  const token = request.cookies.get('token')?.value;
  const isAuth = await isValidToken(token);

  // Protect account routes: must have a cryptographically verified token
  if (pathname.startsWith('/account')) {
    if (!isAuth) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      const response = NextResponse.redirect(loginUrl);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      if (token) {
        // Clear invalid/stale cookie so it doesn't loop
        response.cookies.delete('token');
      }
      return response;
    }
  }

  // Redirect authenticated users away from login/register
  if (isAuth && (pathname === '/login' || pathname === '/register')) {
    const accountUrl = request.nextUrl.clone();
    accountUrl.pathname = '/account';
    const response = NextResponse.redirect(accountUrl);
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  return withRequestId(request, requestId);
}

export const config = {
  matcher: [
    '/account/:path*',
    '/login',
    '/register',
    '/api/:path*'
  ]
};
