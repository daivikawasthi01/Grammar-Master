import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

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

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isAuth = await isValidToken(token);

  // Protect account routes: must have a cryptographically verified token
  if (request.nextUrl.pathname.startsWith('/account')) {
    if (!isAuth) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      const response = NextResponse.redirect(loginUrl);
      if (token) {
        // Clear invalid/stale cookie so it doesn't loop
        response.cookies.delete('token');
      }
      return response;
    }
  }

  // Redirect authenticated users away from login/register
  if (isAuth && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/register'
  )) {
    const accountUrl = request.nextUrl.clone();
    accountUrl.pathname = '/account';
    return NextResponse.redirect(accountUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/account/:path*',
    '/login',
    '/register'
  ]
};
