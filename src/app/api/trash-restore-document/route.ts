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
      return NextResponse.json({ status: "restored" });
    }

    await dbConnect();
    const user = await User.findOne(
      { _id: _id, "trashs._id": documentId },
      { "trashs.$": 1 }
    );

    if (user && user.trashs && user.trashs.length > 0) {
      const targetTrash = user.trashs[0];
      await User.findOneAndUpdate(
        { _id: _id },
        {
          $pull: { trashs: { _id: documentId } },
          $push: {
            documents: {
              _id: targetTrash._id,
              title: targetTrash.title,
              text: targetTrash.text,
              status: targetTrash.status,
              language: targetTrash.language || "American English",
            },
          },
        }
      );
    }

    return NextResponse.json({ status: "restored" });
  } catch (err) {
    console.error("Trash restore error:", err);
    return NextResponse.json({ status: "restored" });
  }
}