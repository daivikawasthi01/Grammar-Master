export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { JWT_SECRET } from "@/app/config/auth";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";

const editEmailSchema = z.object({
  password: z.string().min(1, "Password is required"),
  newEmail: z.string().email("Invalid email format").toLowerCase().trim(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => null);
    const parsed = editEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input parameters" },
        { status: 400 }
      );
    }

    const { password, newEmail } = parsed.data;

    await dbConnect();
    const user = await User.findById(auth.user.id).select("+password");
    if (!user || !user.password) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if new email is already taken
    const existing = await User.findOne({ email: newEmail });
    if (existing && existing._id.toString() !== auth.user.id) {
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 409 }
      );
    }

    user.email = newEmail;
    await user.save();

    // Re-issue JWT cookie with updated email
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        plan: user.plan || "free",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({
      status: "Email changed",
      email: user.email,
    });
  } catch (error) {
    console.error("Email update error:", error);
    return NextResponse.json(
      { error: "Failed to update email" },
      { status: 500 }
    );
  }
}