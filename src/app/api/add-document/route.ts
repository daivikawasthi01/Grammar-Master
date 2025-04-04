import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";

interface RequestBodyType {
    _id: string
}

export async function POST(req: Request) {
    try {
        const { _id }: RequestBodyType = await req.json();
        
        if (!_id) {
            return NextResponse.json({ 
                error: 'User ID is required' 
            }, { 
                status: 400 
            });
        }

        if (_id === 'demo123') {
            return NextResponse.json({
                status: 'added',
                documentId: 'demo_doc_' + Date.now(),
                _id: 'demo123'
            });
        }

        try {
            await dbConnect();
        } catch (error) {
            console.error('Database connection error:', error);
            return NextResponse.json({ 
                error: 'Database connection failed' 
            }, { 
                status: 500 
            });
        }
        
        const user = await User.findById(_id);
        if (!user) {
            return NextResponse.json({ 
                error: 'User not found' 
            }, { 
                status: 404 
            });
        }

        try {
            const updatedUser = await User.findOneAndUpdate(
                { _id: _id },
                { 
                    $push: { 
                        documents: {
                            title: 'Untitled Document',
                            text: '',
                            status: 'created',
                            language: 'American English'
                        }
                    } 
                },
                { new: true }
            );

            if (!updatedUser) {
                throw new Error('Failed to update user');
            }

            const documents = updatedUser.documents;
            const documentId = documents[documents.length - 1]._id;

            return NextResponse.json({
                status: 'added',
                documentId: documentId,
                _id: _id
            });
        } catch (error: any) {
            console.error('Document creation error:', error);
            return NextResponse.json({ 
                error: 'Failed to create document' 
            }, { 
                status: 500 
            });
        }

    } catch (error: any) {
        console.error('Error in add-document route:', error);
        return NextResponse.json(
            { 
                error: error.message || 'Internal server error' 
            }, 
            { 
                status: 500 
            }
        );
    }
}