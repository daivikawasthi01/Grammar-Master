import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token');
    
    // Protect account routes
    if (request.nextUrl.pathname.startsWith('/account')) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // Redirect logged-in users away from auth pages
    if (token && (
        request.nextUrl.pathname === '/login' || 
        request.nextUrl.pathname === '/register'
    )) {
        return NextResponse.redirect(new URL('/account', request.url));
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
