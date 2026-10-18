export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

import { logger } from "@/lib/logger";
const languageSchema = z.object({
  documentId: z.string().min(1, "Document ID required"),
  language: z.string().min(1, "Language required"),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => null);
    const parsed = languageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid parameters" },
        { status: 400 }
      );
    }

    const { documentId, language } = parsed.data;

    await dbConnect();
    const result = await User.updateOne(
      { _id: auth.user.id, "documents._id": documentId },
      {
        $set: {
          "documents.$.language": language,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "saved", language });
  } catch (error) {
    logger.error({ err: error }, "Language document error");
    return NextResponse.json(
      { error: "Failed to update document language" },
      { status: 500 }
    );
  }
}