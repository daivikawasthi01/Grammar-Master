export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { requireUser } from "@/lib/api-auth";
import mongoose from "mongoose";
import { z } from "zod";

import { logger, getRequestId } from "@/lib/logger";
interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

const patchDocSchema = z.object({
  title: z.string().trim().optional(),
  content: z.record(z.string(), z.any()).optional(),
  plainText: z.string().optional(),
  language: z.string().optional(),
  baseVersion: z.number().optional(),
});

export async function GET(req: NextRequest, props: RouteProps) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const { id } = await props.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    await dbConnect();
    const doc = (await DocumentModel.findOne({
      _id: id,
      ownerId: auth.user.id,
    }).lean()) as any;

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: doc._id.toString(),
      _id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      plainText: doc.plainText,
      language: doc.language,
      status: doc.status,
      version: doc.version,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (error) {
    logger.error({ err: error, requestId: getRequestId(req) }, "GET /api/documents/:id error");
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, props: RouteProps) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const { id } = await props.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = patchDocSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { title, content, plainText, language, baseVersion } = parsed.data;

    await dbConnect();

    const query: any = {
      _id: id,
      ownerId: auth.user.id,
    };

    // Optimistic concurrency control
    if (typeof baseVersion === "number") {
      query.version = baseVersion;
    }

    const setFields: Record<string, any> = {};
    if (title !== undefined) setFields.title = title;
    if (content !== undefined) setFields.content = content;
    if (plainText !== undefined) setFields.plainText = plainText;
    if (language !== undefined) setFields.language = language;

    const updated = await DocumentModel.findOneAndUpdate(
      query,
      {
        $set: setFields,
        $inc: { version: 1 },
      },
      { new: true }
    );

    if (!updated) {
      // Check if it failed because of version conflict or because not found
      const exists = await DocumentModel.findOne({ _id: id, ownerId: auth.user.id });
      if (exists) {
        return NextResponse.json(
          { error: "VERSION_CONFLICT", currentVersion: exists.version },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "saved",
      id: updated._id.toString(),
      version: updated.version,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    logger.error({ err: error, requestId: getRequestId(req) }, "PATCH /api/documents/:id error");
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, props: RouteProps) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const { id } = await props.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "1";

    await dbConnect();

    if (permanent) {
      const deleted = await DocumentModel.findOneAndDelete({
        _id: id,
        ownerId: auth.user.id,
      });
      if (!deleted) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      return NextResponse.json({ status: "permanently_deleted", id });
    }

    const softDeleted = await DocumentModel.findOneAndUpdate(
      { _id: id, ownerId: auth.user.id },
      { $set: { status: "trashed", deletedAt: new Date() } },
      { new: true }
    );

    if (!softDeleted) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "trashed", id });
  } catch (error) {
    logger.error({ err: error, requestId: getRequestId(req) }, "DELETE /api/documents/:id error");
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
