import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import bcrypt from 'bcrypt';

interface RequestBodyType {
  password: string 
  email: string
  newPassword: string
}

export async function POST(req: Request) {
    try {
        const { password, email, newPassword }: RequestBodyType = await req.json();
        await dbConnect();
        
        const user = await User.findOne({ email });
        if (!user) {
            return NextResponse.json({ error: 'User not found' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid password' });
        }
        
        const hash = bcrypt.hashSync(newPassword, 10);
        await User.findOneAndUpdate({ email }, { password: hash });
        return NextResponse.json({ status: 'Password changed' });
    } catch (error) {
        console.error('Password update error:', error);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }
}