export const dynamic = "force-dynamic";

import "@/lib/polyfill";
import { NextRequest, NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import mammoth from "mammoth";
import { requireUser } from "@/lib/api-auth";

import { logger } from "@/lib/logger";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.user.id;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds maximum size limit of 5MB" },
        { status: 413 }
      );
    }

    const fileNameLower = file.name.toLowerCase();

    // Explicitly reject legacy .doc
    if (fileNameLower.endsWith(".doc")) {
      return NextResponse.json(
        { error: "Legacy .doc format is not supported. Please convert to .docx, .txt, or .md." },
        { status: 400 }
      );
    }

    const isDocx = fileNameLower.endsWith(".docx");
    const isTxt = fileNameLower.endsWith(".txt");
    const isMd = fileNameLower.endsWith(".md");

    if (!isDocx && !isTxt && !isMd) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload .docx, .txt, or .md documents." },
        { status: 400 }
      );
    }

    const title = file.name.replace(/\.[^/.]+$/, "").trim() || "Uploaded Document";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let textContent = "";

    if (isDocx) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value || "";
      } catch (err) {
        logger.error({ err: err }, "Mammoth extractRawText failed");
        return NextResponse.json(
          { error: "Failed to extract text from Word document. The file may be corrupted." },
          { status: 422 }
        );
      }
    } else {
      textContent = buffer.toString("utf-8");
    }

    // Sanitize any stray HTML tags
    if (textContent.includes("<") && textContent.includes(">")) {
      textContent = textContent
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    await dbConnect();
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      {
        $push: {
          documents: {
            title,
            text: textContent,
            status: "created",
            language: "American English",
          },
        },
      },
      { new: true }
    );

    if (!updatedUser || !updatedUser.documents?.length) {
      return NextResponse.json(
        { error: "Failed to save uploaded document to user account" },
        { status: 500 }
      );
    }

    const documents = updatedUser.documents;
    const newDoc = documents[documents.length - 1];

    return NextResponse.json({
      success: true,
      status: "added",
      documentId: newDoc._id.toString(),
      _id: userId,
      title: newDoc.title,
      text: newDoc.text,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Upload route error");
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}