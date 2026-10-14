export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const editPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => null);
    const parsed = editPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input parameters" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    await dbConnect();
    const user = await User.findById(auth.user.id).select("+password");
    if (!user || !user.password) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Async hash to avoid blocking event loop
    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(auth.user.id, { password: hashed });

    return NextResponse.json({ status: "Password changed successfully" });
  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
}