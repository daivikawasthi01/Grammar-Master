export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

import { logger } from "@/lib/logger";
const deleteDocSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => null);
    const parsed = deleteDocSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { documentId } = parsed.data;
    const userId = auth.user.id;

    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne(
      { _id: userId, "documents._id": documentId },
      { "documents.$": 1 }
    );

    if (!user || !user.documents || user.documents.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const targetDoc = user.documents[0];

    // Move to trash
    await User.findOneAndUpdate(
      { _id: userId },
      {
        $pull: { documents: { _id: documentId } },
        $push: {
          trashs: {
            _id: targetDoc._id,
            title: targetDoc.title,
            text: targetDoc.text,
            status: targetDoc.status || "created",
            language: targetDoc.language || "American English",
          },
        },
      }
    );

    return NextResponse.json({ status: "deleted", documentId });
  } catch (error) {
    logger.error({ err: error }, "Delete document error");
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}