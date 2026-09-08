export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import { requireAuthOrDemo } from "@/lib/api-auth";

interface RequestBodyType {
  _id?: string;
  documentId: string;
}

export async function POST(req: Request) {
  try {
    const { _id, documentId }: RequestBodyType = await req.json().catch(() => ({}));

    if (!documentId) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }

    const authCheck = await requireAuthOrDemo(req, _id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;

    if (
      isDemo ||
      userId === "demo123" ||
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(documentId)
    ) {
      return NextResponse.json({ status: "deleted" });
    }

    await dbConnect();

    const user = await User.findOne(
      { _id: userId, "documents._id": documentId },
      { "documents.$": 1 }
    );

    if (user && user.documents && user.documents.length > 0) {
      const targetDoc = user.documents[0];

      // Move to trashs
      await User.findOneAndUpdate(
        { _id: userId },
        {
          $pull: { documents: { _id: documentId } },
          $push: {
            trashs: {
              _id: targetDoc._id,
              title: targetDoc.title,
              text: targetDoc.text,
              status: targetDoc.status,
              language: targetDoc.language || "American English",
            },
          },
        }
      );
    } else {
      // Pull document anyway if it exists
      await User.findOneAndUpdate(
        { _id: userId },
        { $pull: { documents: { _id: documentId } } }
      );
    }

    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json({ status: "deleted" });
  }
}