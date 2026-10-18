export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

import { logger } from "@/lib/logger";
const editNameSchema = z.object({
  newName: z.string().trim().min(1, "Name cannot be empty").max(100, "Name too long"),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => null);
    const parsed = editNameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid name provided" },
        { status: 400 }
      );
    }

    await dbConnect();
    const updated = await User.findByIdAndUpdate(
      auth.user.id,
      { name: parsed.data.newName },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "Name changed", name: updated.name });
  } catch (error) {
    logger.error({ err: error }, "Edit name error");
    return NextResponse.json({ error: "Failed to update name" }, { status: 500 });
  }
}