import "server-only";
import mongoose from "mongoose";
import { env } from "@/lib/env";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Reuse one connection across hot reloads and warm serverless invocations.
const globalCache = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = (globalCache.__mongoose ??= { conn: null, promise: null });

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose
    .connect(env.MONGODB_URI, { bufferCommands: false, serverSelectionTimeoutMS: 5000 })
    .then(async (m) => {
      // Unique indexes (email, usage period) are correctness, not performance: wait for them.
      await Promise.all(Object.values(m.models).map((model) => model.init()));
      return m;
    });
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
