import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface DocumentParamsType {
  params: { 
    _id: string, 
    document_id: string
  } 
}

export async function GET(req: Request, { params }: DocumentParamsType) {
    try {
        await dbConnect();
        
        if (!params._id || !params.document_id) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const user = await User.findOne(
            { 
                '_id': params._id, 
                'documents._id': params.document_id
            },
            { 'documents.$': 1 }
        );

        if (!user || !user.documents?.[0]) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        const document = user.documents[0];

        if (document.content && document.content.blocks) {
            document.content.blocks = document.content.blocks.map((block: any) => {
                if (block.type === 'image' && block.data?.file?.url) {
                    if (!block.data.file.url.startsWith('data:image/')) {
                        block.data.file.url = `data:image/jpeg;base64,${block.data.file.url}`;
                    }
                }
                return block;
            });
        }

        return NextResponse.json(document);
    } catch (error) {
        console.error('Error fetching document:', error);
        return NextResponse.json(
            { error: 'Failed to fetch document' },
            { status: 500 }
        );
    }
}