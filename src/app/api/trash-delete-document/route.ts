export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const trashDeleteSchema = z.object({
  documentId: z.string().min(1, "Document ID required"),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => null);
    const parsed = trashDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid parameters" },
        { status: 400 }
      );
    }

    const { documentId } = parsed.data;

    await dbConnect();
    const result = await User.findOneAndUpdate(
      { _id: auth.user.id },
      { $pull: { trashs: { _id: documentId } } },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "deleted", documentId });
  } catch (err) {
    console.error("Trash delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete document from trash" },
      { status: 500 }
    );
  }
}