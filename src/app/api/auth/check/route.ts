export const dynamic = "force-dynamic";

import "@/lib/polyfill";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@/app/config/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { isAuthenticated: false, error: "Not authorized" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    return NextResponse.json({
      isAuthenticated: true,
      user: decoded,
    });
  } catch (error) {
    return NextResponse.json(
      { isAuthenticated: false, error: "Not authorized" },
      { status: 401 }
    );
  }
}
