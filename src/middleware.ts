import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token');
    
    // Protect account routes
    if (request.nextUrl.pathname.startsWith('/account')) {
        if (!token) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.pathname = '/login';
            return NextResponse.redirect(loginUrl);
        }
    }

    // Redirect logged-in users away from auth pages
    if (token && (
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
