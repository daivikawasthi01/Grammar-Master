import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";

interface RequestBodyType {
  _id:string 
}

interface documentParamsType {
  params: { 
    document: string, 
  } 
}

export async function POST(req : Request,{ params } : documentParamsType) {
    try {
        const {_id}:RequestBodyType = await req.json()
        await dbConnect();
        
        if (params.document){
            const document = await User.findOne({ '_id': _id}).select('documents')
            const filteredDocument = document.documents.filter((doc: any) =>
                doc.title.toLowerCase().includes(params.document.toLowerCase())
            )
            return NextResponse.json({status: 'searched', filteredDocument})
        }
        
        return NextResponse.json({ error: 'No search term provided' }, { status: 400 });
    } catch (error) {
        console.error('Search document error:', error);
        return NextResponse.json({ error: 'Failed to search documents' }, { status: 500 });
    }
}