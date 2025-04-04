import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";

interface RequestBodyType {
  _id:string 
  documentId: string
}

export async function POST(req : Request) {
    const {_id,documentId}:RequestBodyType = await req.json()
    await dbConnect();
    await User.findOneAndUpdate(
        { _id: _id },
        { $pull: { trashs: {_id: documentId} } } 
    )
    return NextResponse.json({status: 'deleted'})
  }