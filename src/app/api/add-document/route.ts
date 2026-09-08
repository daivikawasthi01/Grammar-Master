export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import { requireAuthOrDemo } from "@/lib/api-auth";

interface RequestBodyType {
  _id?: string;
  title?: string;
  text?: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBodyType = await req.json().catch(() => ({}));
    const authCheck = await requireAuthOrDemo(req, body._id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;
    const docTitle = body.title || "Untitled Document";
    const docText = body.text || "";
    const fallbackDocId = "doc_" + Date.now();

    if (isDemo || userId === "demo123" || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({
        status: "added",
        documentId: fallbackDocId,
        _id: userId,
      });
    }

    try {
      await dbConnect();
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        {
          $push: {
            documents: {
              title: docTitle,
              text: docText,
              status: "created",
              language: "American English",
            },
          },
        },
        { new: true }
      );

      if (updatedUser && updatedUser.documents?.length > 0) {
        const documents = updatedUser.documents;
        const newDoc = documents[documents.length - 1];
        return NextResponse.json({
          status: "added",
          documentId: newDoc._id.toString(),
          _id: userId,
        });
      }
    } catch (dbError) {
      console.error("Database connection or query error in add-document:", dbError);
    }

    return NextResponse.json({
      status: "added",
      documentId: fallbackDocId,
      _id: userId,
    });
  } catch (error: any) {
    console.error("Error in add-document route:", error);
    return NextResponse.json({
      status: "added",
      documentId: "doc_" + Date.now(),
      _id: "demo123",
    });
  }
}