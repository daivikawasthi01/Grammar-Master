export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

interface RequestBodyType {
  _id: string;
  documentId: string;
}

export async function POST(req: Request) {
  try {
    const { _id, documentId }: RequestBodyType = await req.json();

    if (
      _id === "demo123" ||
      !mongoose.Types.ObjectId.isValid(_id) ||
      !mongoose.Types.ObjectId.isValid(documentId)
    ) {
      return NextResponse.json({ status: "deleted" });
    }

    await dbConnect();
    await User.findOneAndUpdate(
      { _id: _id },
      { $pull: { trashs: { _id: documentId } } }
    );
    return NextResponse.json({ status: "deleted" });
  } catch (err) {
    console.error("Trash delete error:", err);
    return NextResponse.json({ status: "deleted" });
  }
}