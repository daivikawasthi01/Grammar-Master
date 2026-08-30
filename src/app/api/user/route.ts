export const dynamic = 'force-dynamic';

import "@/lib/polyfill";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { JWT_SECRET } from "@/app/config/auth";
import mongoose from "mongoose";

interface DecodedToken extends JwtPayload {
    id: string;
}

const DEFAULT_DEMO_USER = {
    _id: "demo123",
    email: "demo@writ.ai",
    name: "Writ AI User",
    documents: [
        {
            _id: "demo_doc_1",
            title: "Quarterly_AI_Strategy.docx",
            text: "<p>Executive Summary: In modern software engineering and content generation, friction during draft creation limits creativity. writ.ai introduces an ethereal glassmorphic workspace that automatically evaluates correctness, tone, and conciseness in real-time.</p>",
            status: "created",
            language: "American English"
        }
    ]
};

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        
        if (!token) {
            return NextResponse.json(DEFAULT_DEMO_USER);
        }

        let userId = "";
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
            userId = decoded.id;
        } catch (jwtErr) {
            return NextResponse.json(DEFAULT_DEMO_USER);
        }
 
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return NextResponse.json(DEFAULT_DEMO_USER);
        }

        try {
            await dbConnect();
            const user = await User.findById(userId);
            if (user) {
                return NextResponse.json({
                    _id: user._id.toString(),
                    email: user.email,
                    name: user.name || "User",
                    documents: user.documents || []
                });
            }
        } catch (dbErr) {
            console.error('Database connection error in /api/user:', dbErr);
        }

        return NextResponse.json(DEFAULT_DEMO_USER);
    } catch (error) {
        console.error('User fetch error:', error);
        return NextResponse.json(DEFAULT_DEMO_USER);
    }
}
