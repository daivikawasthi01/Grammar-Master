export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StyleGuide, StyleGuideChunk } from "@/models/StyleGuide";
import { splitIntoAtomicRules } from "@/lib/rag-style";
import { generateEmbedding } from "@/lib/embeddings";
import { upsertVectors } from "@/lib/vector-store";
import { requireAuthOrDemo } from "@/lib/api-auth";
import crypto from "crypto";

interface StyleGuideUploadRequest {
  name?: string;
  content: string;
  _id?: string;
}

export async function POST(req: Request) {
  try {
    const body: StyleGuideUploadRequest = await req.json().catch(() => ({ content: "" }));
    const { name = "Custom Style Guide", content, _id } = body;

    const authCheck = await requireAuthOrDemo(req, _id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Style guide content cannot be empty" }, { status: 400 });
    }

    const rules = splitIntoAtomicRules(content);
    if (rules.length === 0) {
      return NextResponse.json(
        { error: "Could not extract any atomic rules from the provided text." },
        { status: 400 }
      );
    }

    // 1. Create or update StyleGuide
    let styleGuideId = `sg_${Date.now()}`;
    if (!isDemo) {
      await dbConnect();
      const guide = await StyleGuide.create({
        userId,
        name: name.trim() || "Custom Style Guide",
      });
      styleGuideId = guide._id.toString();
    }

    // 2. Generate embeddings for all rules in parallel
    const vectorRecords: Array<{
      id: string;
      vector: number[];
      metadata: { userId: string; styleGuideId: string; text: string };
    }> = [];

    const chunkDocs: Array<{
      styleGuideId: string;
      userId: string;
      text: string;
      vectorId: string;
    }> = [];

    for (const rule of rules) {
      const vectorId = `chunk_${crypto.randomUUID()}`;
      const embedding = await generateEmbedding(rule);

      vectorRecords.push({
        id: vectorId,
        vector: embedding,
        metadata: {
          userId: String(userId),
          styleGuideId: String(styleGuideId),
          text: rule,
        },
      });

      chunkDocs.push({
        styleGuideId: String(styleGuideId),
        userId: String(userId),
        text: rule,
        vectorId,
      });
    }

    // 3. Persist chunks in MongoDB
    if (!isDemo) {
      await StyleGuideChunk.insertMany(chunkDocs);
    }

    // 4. Upsert vectors to vector store (Upstash or in-memory fallback)
    await upsertVectors(vectorRecords);

    return NextResponse.json({
      success: true,
      styleGuide: {
        id: styleGuideId,
        name: name.trim() || "Custom Style Guide",
        rulesCount: rules.length,
        rulesSample: rules.slice(0, 3),
      },
    });
  } catch (error: any) {
    console.error("Style guide upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process style guide" },
      { status: 500 }
    );
  }
}
