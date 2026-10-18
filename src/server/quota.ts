import "server-only";
import { Types } from "mongoose";
import { env } from "@/lib/env";
import { connectDb } from "@/server/db";
import { Usage } from "@/server/models/Usage";
import { AppError } from "@/server/errors";

export const currentPeriod = (d = new Date()) => d.toISOString().slice(0, 7);

const nextPeriodStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));

function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

/**
 * Reserve one AI call before making it. A single conditional upsert: if this month's
 * row is already at the limit the filter misses, the upsert collides with the unique
 * index, and that collision means "over quota". Two parallel requests cannot both pass.
 */
export async function reserveQuota(userId: string): Promise<{ used: number; limit: number }> {
  await connectDb();
  const limit = env.MONTHLY_AI_LIMIT;
  const ownerId = new Types.ObjectId(userId);
  const period = currentPeriod();
  try {
    const row = await Usage.findOneAndUpdate(
      { ownerId, period, used: { $lt: limit } },
      { $inc: { used: 1 } },
      { upsert: true, new: true },
    ).lean();
    return { used: row!.used, limit };
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw new AppError("QUOTA_EXCEEDED", `You have used all ${limit} AI checks this month.`, {
        resetAt: nextPeriodStart().toISOString(),
      });
    }
    throw err;
  }
}

/** Give the call back when the AI request failed, so outages do not burn quota. */
export async function refundQuota(userId: string): Promise<void> {
  await Usage.updateOne({ ownerId: new Types.ObjectId(userId), period: currentPeriod(), used: { $gt: 0 } }, { $inc: { used: -1 } });
}

export async function getUsage(userId: string): Promise<{ used: number; limit: number; period: string; resetAt: string }> {
  await connectDb();
  const period = currentPeriod();
  const row = await Usage.findOne({ ownerId: new Types.ObjectId(userId), period }).lean();
  return { used: row?.used ?? 0, limit: env.MONTHLY_AI_LIMIT, period, resetAt: nextPeriodStart().toISOString() };
}
