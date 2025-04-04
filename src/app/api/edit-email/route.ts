import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import bcrypt from 'bcrypt';

interface RequestBodyType {
  password: string 
  email: string
  newEmail: string
}

export async function POST(req: Request) {
    try {
        const { password, email, newEmail }: RequestBodyType = await req.json();
        await dbConnect();
        
        const user = await User.findOne({ email });
        if (!user) {
            return NextResponse.json({ error: 'User not found' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid password' });
        }
        
        const emailCheck = await User.findOne({ email: newEmail });
        if (emailCheck) {
            return NextResponse.json({ error: 'This email is already in use' });
        }
        
        await User.findOneAndUpdate({ email }, { email: newEmail });
        return NextResponse.json({ status: 'Email changed' });
    } catch (error) {
        console.error('Email update error:', error);
        return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
    }
}