import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";

interface DecodedToken extends JwtPayload {
    id: string;
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        
        if (!token) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
        
        if (!decoded.id) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        await dbConnect();
        
        const user = await User.findById(decoded.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Convert Mongoose document to plain object and ensure documents array exists
        const userData = {
            _id: user._id.toString(),
            email: user.email,
            documents: user.documents || []
        };

        return NextResponse.json(userData);
    } catch (error) {
        console.error('User fetch error:', error);
        if (error instanceof jwt.JsonWebTokenError) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
}
