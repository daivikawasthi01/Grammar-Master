export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

import { logger } from "@/lib/logger";
const trashRestoreSchema = z.object({
  documentId: z.string().min(1, "Document ID required"),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => null);
    const parsed = trashRestoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid parameters" },
        { status: 400 }
      );
    }

    const { documentId } = parsed.data;

    await dbConnect();
    const user = await User.findOne(
      { _id: auth.user.id, "trashs._id": documentId },
      { "trashs.$": 1 }
    );

    if (!user || !user.trashs || user.trashs.length === 0) {
      return NextResponse.json(
        { error: "Document not found in trash" },
        { status: 404 }
      );
    }

    const targetTrash = user.trashs[0];
    await User.findOneAndUpdate(
      { _id: auth.user.id },
      {
        $pull: { trashs: { _id: documentId } },
        $push: {
          documents: {
            _id: targetTrash._id,
            title: targetTrash.title,
            text: targetTrash.text,
            status: targetTrash.status || "created",
            language: targetTrash.language || "American English",
          },
        },
      }
    );

    return NextResponse.json({ status: "restored", documentId });
  } catch (err) {
    logger.error({ err: err }, "Trash restore error");
    return NextResponse.json(
      { error: "Failed to restore document" },
      { status: 500 }
    );
  }
}