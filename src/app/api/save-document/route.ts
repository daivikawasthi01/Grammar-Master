import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";

interface SaveDocumentRequest {
    _id: string;
    documentId: string;
    content: {
        blocks: Array<{
            type: string;
            data?: {
                file?: {
                    url?: string;
                };
            };
        }>;
    };
}

export async function POST(req: Request) {
    try {
        const { _id, documentId, content }: SaveDocumentRequest = await req.json();
        
        if (!_id || !documentId) {
            return NextResponse.json({ 
                error: 'Missing required fields' 
            }, { 
                status: 400 
            });
        }

        await dbConnect();

        // Process images in content before saving
        if (content?.blocks) {
            content.blocks = content.blocks.map(block => {
                if (block.type === 'image' && block.data?.file?.url) {
                    // Strip data:image prefix if exists and store only base64
                    const base64Data = block.data.file.url.replace(/^data:image\/\w+;base64,/, '');
                    block.data.file.url = base64Data;
                }
                return block;
            });
        }

        // Update the document
        const result = await User.findOneAndUpdate(
            { 
                _id,
                'documents._id': documentId
            },
            {
                $set: {
                    'documents.$.content': content,
                    'documents.$.lastSaved': new Date()
                }
            },
            { 
                new: true,
                runValidators: true
            }
        );

        if (!result) {
            return NextResponse.json({ 
                error: 'Document not found' 
            }, { 
                status: 404 
            });
        }

        return NextResponse.json({
            status: 'saved',
            message: 'Document saved successfully'
        });
    } catch (error: any) {
        console.error('Save document error:', error);
        return NextResponse.json({ 
            error: error.message || 'Failed to save document' 
        }, { 
            status: 500 
        });
    }
}