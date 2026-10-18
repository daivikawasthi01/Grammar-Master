export const dynamic = "force-dynamic";

import "@/lib/polyfill";
import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { requireUser } from "@/lib/api-auth";

import { logger } from "@/lib/logger";
export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    await dbConnect();
    const user = await User.findById(auth.user.id).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      _id: user._id.toString(),
      email: user.email,
      name: user.name || "User",
      plan: user.plan || "free",
      prompts: user.prompts || 0,
      documents: user.documents || [],
      trashs: user.trashs || [],
    });
  } catch (error) {
    logger.error({ err: error }, "User fetch error");
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
