export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import DocumentModel from "@/models/Document";
import { requireUser } from "@/lib/api-auth";
import mongoose from "mongoose";

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(req: NextRequest, props: RouteProps) {
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
    const restored = await DocumentModel.findOneAndUpdate(
      { _id: id, ownerId: auth.user.id, status: "trashed" },
      { $set: { status: "active", deletedAt: null } },
      { new: true }
    );

    if (!restored) {
      return NextResponse.json(
        { error: "Document not found in trash" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "restored", id });
  } catch (error) {
    console.error("Restore document error:", error);
    return NextResponse.json(
      { error: "Failed to restore document" },
      { status: 500 }
    );
  }
}
