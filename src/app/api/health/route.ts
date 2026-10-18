export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/server/db";
import { getLogger } from "@/lib/logger";

const PING_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Liveness + database check. No auth, and no internals in the body: the database
 * is actually pinged (a connected socket alone does not prove the server answers).
 */
export async function GET(req: Request) {
  const log = getLogger(req, "health");
  const started = Date.now();
  let database: "ok" | "down" = "down";

  try {
    await withTimeout(connectDb(), PING_TIMEOUT_MS);
    const db = mongoose.connection.db;
    if (!db) throw new Error("no database handle");
    await withTimeout(db.admin().ping(), PING_TIMEOUT_MS);
    database = "ok";
  } catch (err) {
    log.error({ err }, "health check: database ping failed");
  }

  const healthy = database === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
