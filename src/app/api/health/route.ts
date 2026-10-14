export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "disconnected";

  try {
    await dbConnect();
    const readyState = mongoose.connection.readyState;
    if (readyState === 1) {
      dbStatus = "connected";
    } else if (readyState === 2) {
      dbStatus = "connecting";
    }
  } catch (err) {
    dbStatus = "error";
  }

  const isHealthy = dbStatus === "connected";
  const latency = Date.now() - startTime;

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: latency,
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
