export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const saveDocSchema = z.object({
  documentId: z.string().min(1, "Document ID required"),
  title: z.string().optional(),
  text: z.string().optional().default(""),
  content: z.any().optional().default({}),
  baseVersion: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => null);
    const parsed = saveDocSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { documentId, title, text, content } = parsed.data;
    const userId = auth.user.id;

    await dbConnect();

    const updateFields: Record<string, any> = {
      "documents.$.text": text,
      "documents.$.content": content,
      "documents.$.lastSaved": new Date(),
      "documents.$.version": Date.now(),
    };

    if (title !== undefined && title.trim().length > 0) {
      updateFields["documents.$.title"] = title.trim();
    }

    const result = await User.findOneAndUpdate(
      {
        _id: userId,
        "documents._id": documentId,
      },
      {
        $set: updateFields,
      },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "saved",
      message: "Document saved successfully",
      version: updateFields["documents.$.version"],
    });
  } catch (error: any) {
    console.error("Save document error:", error);
    return NextResponse.json(
      { error: "Failed to save document to database" },
      { status: 500 }
    );
  }
}