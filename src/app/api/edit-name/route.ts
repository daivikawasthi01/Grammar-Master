import * as jose from 'jose';
import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";

import bcrypt from 'bcrypt'

interface RequestBodyType {
  newName:string 
  email:string
}

export async function POST(req : Request) {
    const {email,newName}:RequestBodyType = await req.json()
    await dbConnect();
    const user = await User.findOne({ email });
    if (!user) {
        return NextResponse.json({ error: 'User not found' });
    }
    await User.findOneAndUpdate({email: email},{name: newName})
    return NextResponse.json({ status: 'Name changed' });
  }