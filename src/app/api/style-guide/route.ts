export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { StyleGuide, StyleGuideChunk } from "@/models/StyleGuide";
import { deleteVectors, upsertVectors } from "@/lib/vector-store";
import { generateEmbedding } from "@/lib/embeddings";
import { splitIntoAtomicRules } from "@/lib/rag-style";
import { requireAuthOrDemo } from "@/lib/api-auth";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const _id = searchParams.get("_id") || undefined;

    const authCheck = await requireAuthOrDemo(req, _id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;

    if (isDemo) {
      return NextResponse.json({
        success: true,
        styleGuides: [
          {
            _id: "demo_sg_1",
            name: "Engineering & Tech Brand Glossary",
            rulesCount: 5,
            rules: [
              "Use 'eBPF', never 'Ebpf' or 'ebpf'.",
              "Always write 'PostgreSQL' instead of 'Postgres'.",
              "Write 'microservices' as a single word, never 'micro-services'.",
              "Capitalize 'Q3' in all business communications, never 'q3'.",
              "Always refer to our application as 'Grammar Master'."
            ],
            createdAt: new Date(),
          },
        ],
      });
    }

    await dbConnect();
    const guides = await StyleGuide.find({ userId }).sort({ createdAt: -1 });

    const guidesWithRules = await Promise.all(
      guides.map(async (g) => {
        const chunks = await StyleGuideChunk.find({
          styleGuideId: g._id.toString(),
          userId,
        }).sort({ createdAt: 1 });

        return {
          _id: g._id,
          name: g.name,
          rulesCount: chunks.length,
          rules: chunks.map((c) => c.text),
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      styleGuides: guidesWithRules,
    });
  } catch (error: any) {
    console.error("Style guide fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch style guides" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, name, content, _id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing style guide id" }, { status: 400 });
    }

    const authCheck = await requireAuthOrDemo(req, _id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;

    if (!isDemo) {
      await dbConnect();
      const guide = await StyleGuide.findOne({ _id: id, userId });
      if (!guide) {
        return NextResponse.json({ error: "Style guide not found" }, { status: 404 });
      }

      if (name && name.trim()) {
        guide.name = name.trim();
        await guide.save();
      }

      // If content was updated, re-segment and re-vectorize
      if (typeof content === "string" && content.trim()) {
        const rules = splitIntoAtomicRules(content);
        if (rules.length > 0) {
          // 1. Delete old chunks & vectors
          const oldChunks = await StyleGuideChunk.find({ styleGuideId: id, userId });
          const oldVectorIds = oldChunks.map((c) => c.vectorId).filter(Boolean);
          if (oldVectorIds.length > 0) {
            await deleteVectors(oldVectorIds);
          }
          await StyleGuideChunk.deleteMany({ styleGuideId: id, userId });

          // 2. Generate new embeddings & insert new chunks
          const newVectorRecords: Array<{
            id: string;
            vector: number[];
            metadata: { userId: string; styleGuideId: string; text: string };
          }> = [];

          const newChunkDocs: Array<{
            styleGuideId: string;
            userId: string;
            text: string;
            vectorId: string;
          }> = [];

          for (const rule of rules) {
            const vectorId = `chunk_${crypto.randomUUID()}`;
            const embedding = await generateEmbedding(rule);

            newVectorRecords.push({
              id: vectorId,
              vector: embedding,
              metadata: {
                userId: String(userId),
                styleGuideId: String(id),
                text: rule,
              },
            });

            newChunkDocs.push({
              styleGuideId: String(id),
              userId: String(userId),
              text: rule,
              vectorId,
            });
          }

          await StyleGuideChunk.insertMany(newChunkDocs);
          await upsertVectors(newVectorRecords);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Style guide updated successfully",
      styleGuide: {
        id,
        name: name?.trim() || "Style Guide",
      },
    });
  } catch (error: any) {
    console.error("Style guide update error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update style guide" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    let _id = searchParams.get("_id") || undefined;

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
      if (body._id) _id = body._id;
    }

    if (!id) {
      return NextResponse.json({ error: "Missing style guide id" }, { status: 400 });
    }

    const authCheck = await requireAuthOrDemo(req, _id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;

    if (!isDemo) {
      await dbConnect();

      // Find all chunk vector IDs to clean up from vector store
      const chunks = await StyleGuideChunk.find({
        styleGuideId: id,
        userId,
      });

      const vectorIds = chunks.map((c) => c.vectorId).filter(Boolean);
      if (vectorIds.length > 0) {
        await deleteVectors(vectorIds);
      }

      await StyleGuideChunk.deleteMany({ styleGuideId: id, userId });
      await StyleGuide.deleteOne({ _id: id, userId });
    }

    return NextResponse.json({ success: true, message: "Style guide deleted successfully" });
  } catch (error: any) {
    console.error("Style guide delete error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete style guide" },
      { status: 500 }
    );
  }
}
