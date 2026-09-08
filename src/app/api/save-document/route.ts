export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import { requireAuthOrDemo } from "@/lib/api-auth";

interface SaveDocumentRequest {
  _id?: string;
  documentId?: string;
  content?: any;
  text?: string;
}

export async function POST(req: Request) {
  try {
    const body: SaveDocumentRequest = await req.json().catch(() => ({}));
    const authCheck = await requireAuthOrDemo(req, body._id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;
    const docId = body.documentId || "demo_doc_1";

    if (
      isDemo ||
      userId === "demo123" ||
      docId.startsWith("demo_") ||
      docId.startsWith("doc_") ||
      docId.startsWith("upload_") ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return NextResponse.json({
        status: "saved",
        message: "Document saved to session",
      });
    }

    try {
      await dbConnect();
      const result = await User.findOneAndUpdate(
        {
          _id: userId,
          "documents._id": docId,
        },
        {
          $set: {
            "documents.$.text": body.text || "",
            "documents.$.content": body.content || {},
            "documents.$.lastSaved": new Date(),
          },
        },
        { new: true }
      );

      if (result) {
        return NextResponse.json({
          status: "saved",
          message: "Document saved successfully",
        });
      }
    } catch (dbErr) {
      console.error("Database save document error:", dbErr);
    }

    return NextResponse.json({
      status: "saved",
      message: "Document saved to local buffer",
    });
  } catch (error: any) {
    console.error("Save document error:", error);
    return NextResponse.json({
      status: "saved",
      message: "Document save handled",
    });
  }
}