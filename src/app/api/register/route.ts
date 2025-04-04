import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import bcrypt from 'bcrypt';
import dbConnect from "@/lib/mongodb";

interface RequestBodyType {
  password: string 
  name: string 
  email: string
}

export async function POST(req: Request) {
    try {
        const { password, name, email }: RequestBodyType = await req.json();
        await dbConnect();

        const checkEmailDb = await User.findOne({ email });
        if (checkEmailDb) {
            return NextResponse.json({ error: 'Email is already in use' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const user = new User({ 
            password: hash, 
            name, 
            email,
            plan: 'free',
            prompts: 0
        });
        await user.save();
        
        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}