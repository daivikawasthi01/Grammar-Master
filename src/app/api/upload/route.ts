export const dynamic = "force-dynamic";

import "@/lib/polyfill";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@/app/config/auth";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import mammoth from "mammoth";

interface DecodedToken extends JwtPayload {
  id: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    let userId = formData.get("_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Try to get userId from token if not explicitly passed
    if (!userId) {
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        if (token) {
          const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
          userId = decoded.id;
        }
      } catch (err) {
        console.error("Token verification failed in upload:", err);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const title = file.name.replace(/\.[^/.]+$/, "") || "Uploaded Document";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let textContent = "";
    const fileNameLower = file.name.toLowerCase();

    if (fileNameLower.endsWith(".docx") || fileNameLower.endsWith(".doc")) {
      try {
        const result = await mammoth.convertToHtml({ buffer });
        textContent = result.value || "";
      } catch (err) {
        console.error("Error extracting docx HTML with mammoth, trying raw text:", err);
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value || "";
      }
    } else {
      // Plain text, markdown, html, csv, etc.
      textContent = buffer.toString("utf-8");
    }

    if (userId === "demo123") {
      const demoDocId = "demo_upload_" + Date.now();
      return NextResponse.json({
        success: true,
        status: "added",
        documentId: demoDocId,
        _id: "demo123",
        title,
        text: textContent,
      });
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

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found or upload failed" }, { status: 404 });
    }

    const documents = updatedUser.documents;
    const newDoc = documents[documents.length - 1];

    return NextResponse.json({
      success: true,
      status: "added",
      documentId: newDoc._id,
      _id: userId,
      title: newDoc.title,
      text: newDoc.text,
    });
  } catch (error: any) {
    console.error("Upload route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process uploaded file" },
      { status: 500 }
    );
  }
}