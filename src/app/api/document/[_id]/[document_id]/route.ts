export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { requireUser } from "@/lib/api-auth";
import mongoose from "mongoose";

interface DocumentParamsType {
  params: Promise<{
    _id: string;
    document_id: string;
  }>;
}

export async function GET(req: Request, props: DocumentParamsType) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const params = await props.params;
    const docId = params.document_id;
    const userId = auth.user.id;

    if (!docId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findOne(
      {
        _id: userId,
        "documents._id": docId,
      },
      { "documents.$": 1 }
    );

    if (!user || !user.documents || user.documents.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(user.documents[0]);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}