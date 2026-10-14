export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const addDocSchema = z.object({
  title: z.string().optional().default("Untitled Document"),
  text: z.string().optional().default(""),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    const parsed = addDocSchema.safeParse(body);
    const { title, text } = parsed.success ? parsed.data : { title: "Untitled Document", text: "" };
    const userId = auth.user.id;

    await dbConnect();
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      {
        $push: {
          documents: {
            title: title.trim() || "Untitled Document",
            text: text || "",
            status: "created",
            language: "American English",
          },
        },
      },
      { new: true }
    );

    if (!updatedUser || !updatedUser.documents?.length) {
      return NextResponse.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }

    const documents = updatedUser.documents;
    const newDoc = documents[documents.length - 1];

    return NextResponse.json({
      status: "added",
      documentId: newDoc._id.toString(),
      _id: userId,
      title: newDoc.title,
    });
  } catch (error: any) {
    console.error("Error in add-document route:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}