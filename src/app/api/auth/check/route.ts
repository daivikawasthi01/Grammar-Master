import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ 
                isAuthenticated: false,
                error: 'No token found' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        
        return NextResponse.json({ 
            isAuthenticated: true,
            user: decoded 
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return NextResponse.json({ 
            isAuthenticated: false,
            error: 'Invalid token' 
        });
    }
} 