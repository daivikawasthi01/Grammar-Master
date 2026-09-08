export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import { requireAuthOrDemo } from "@/lib/api-auth";

interface DocumentParamsType {
  params: Promise<{
    _id: string;
    document_id: string;
  }>;
}

const DEFAULT_DEMO_DOC = {
  _id: "demo_doc_1",
  title: "Quarterly_AI_Strategy.docx",
  text: "Executive Summary: In modern software engineering and content generation, friction during draft creation limits creativity. writ.ai introduces an ethereal glassmorphism workspace that automatically evaluates correctness, tone, and conciseness in real-time.",
  status: "created",
  language: "American English",
  createdAt: new Date().toISOString(),
};

export async function GET(req: Request, props: DocumentParamsType) {
  try {
    const params = await props.params;
    const requestedUserId = params._id;
    const docId = params.document_id;

    if (!requestedUserId || !docId) {
      return NextResponse.json(DEFAULT_DEMO_DOC);
    }

    const authCheck = await requireAuthOrDemo(req, requestedUserId);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;

    // Handle demo IDs or non-ObjectId formats gracefully
    if (
      isDemo ||
      userId === "demo123" ||
      docId.startsWith("demo_") ||
      docId.startsWith("upload_") ||
      docId.startsWith("doc_") ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return NextResponse.json({
        ...DEFAULT_DEMO_DOC,
        _id: docId,
        title: docId.includes("upload") ? "Uploaded Document" : "Quarterly_AI_Strategy.docx",
      });
    }

    try {
      await dbConnect();
      const user = await User.findOne(
        {
          _id: userId,
          "documents._id": docId,
        },
        { "documents.$": 1 }
      );

      if (user && user.documents?.[0]) {
        const document = user.documents[0];
        return NextResponse.json(document);
      }
    } catch (dbErr) {
      console.error("Error querying document in DB:", dbErr);
    }

    return NextResponse.json({
      ...DEFAULT_DEMO_DOC,
      _id: docId,
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(DEFAULT_DEMO_DOC);
  }
}