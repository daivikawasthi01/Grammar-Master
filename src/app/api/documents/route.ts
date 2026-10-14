export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { requireUser } from "@/lib/api-auth";
import { syncLegacyUserDocuments } from "@/lib/document-sync";
import mammoth from "mammoth";
import { z } from "zod";

const createDocSchema = z.object({
  title: z.string().trim().optional().default("Untitled Document"),
  content: z.record(z.string(), z.any()).optional(),
  plainText: z.string().optional().default(""),
  language: z.string().optional().default("American English"),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.user.id;
    await dbConnect();
    await syncLegacyUserDocuments(userId);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") === "trashed" ? "trashed" : "active";
    const q = searchParams.get("q")?.trim();

    const query: any = {
      ownerId: userId,
      status,
    };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { plainText: { $regex: q, $options: "i" } },
      ];
    }

    const docs = await DocumentModel.find(query)
      .sort({ updatedAt: -1 })
      .select("_id title language status version updatedAt createdAt plainText")
      .lean();

    const formatted = docs.map((d: any) => ({
      _id: d._id.toString(),
      id: d._id.toString(),
      title: d.title || "Untitled Document",
      language: d.language || "American English",
      status: d.status,
      version: d.version || 1,
      snippet: (d.plainText || "").slice(0, 150),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return NextResponse.json({ documents: formatted });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.user.id;
    const contentType = req.headers.get("content-type") || "";

    await dbConnect();

    // Check if multipart upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File exceeds 5MB size limit" },
          { status: 413 }
        );
      }

      const fileNameLower = file.name.toLowerCase();
      if (fileNameLower.endsWith(".doc")) {
        return NextResponse.json(
          { error: "Legacy .doc format is not supported. Please upload .docx, .txt, or .md." },
          { status: 400 }
        );
      }

      const isDocx = fileNameLower.endsWith(".docx");
      const isTxt = fileNameLower.endsWith(".txt");
      const isMd = fileNameLower.endsWith(".md");

      if (!isDocx && !isTxt && !isMd) {
        return NextResponse.json(
          { error: "Unsupported file type. Please upload .docx, .txt, or .md files." },
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
          return NextResponse.json(
            { error: "Failed to extract text from Word document" },
            { status: 422 }
          );
        }
      } else {
        textContent = buffer.toString("utf-8");
      }

      const doc = await DocumentModel.create({
        ownerId: userId,
        title,
        plainText: textContent,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: textContent }],
            },
          ],
        },
        language: "American English",
        status: "active",
        version: 1,
      });

      return NextResponse.json(
        {
          id: doc._id.toString(),
          _id: doc._id.toString(),
          title: doc.title,
          version: doc.version,
          status: doc.status,
        },
        { status: 201 }
      );
    }

    // JSON creation
    const body = await req.json().catch(() => ({}));
    const parsed = createDocSchema.safeParse(body);
    const data = parsed.success
      ? parsed.data
      : {
          title: "Untitled Document",
          plainText: "",
          content: undefined,
          language: "American English",
        };

    const doc = await DocumentModel.create({
      ownerId: userId,
      title: data.title,
      plainText: data.plainText,
      content: data.content || {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: data.plainText }],
          },
        ],
      },
      language: data.language,
      status: "active",
      version: 1,
    });

    return NextResponse.json(
      {
        id: doc._id.toString(),
        _id: doc._id.toString(),
        title: doc.title,
        version: doc.version,
        status: doc.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
