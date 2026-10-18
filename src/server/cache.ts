import "server-only";
import { createHash } from "crypto";
import { LRUCache } from "lru-cache";
import { Redis } from "@upstash/redis";
import { env, hasUpstash } from "@/lib/env";

/**
 * Response cache for AI checks. Keys are a sha256 of everything that affects the
 * answer (text, model, prompt version, rules), never the text itself.
 * Upstash Redis when configured (shared across instances), otherwise a bounded LRU.
 */
const TTL_SECONDS = 60 * 60;

const memory = new LRUCache<string, string>({ max: 2000, ttl: TTL_SECONDS * 1000 });
const redis = hasUpstash ? new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! }) : null;

export function cacheKey(...parts: string[]): string {
  return "gm:c:" + createHash("sha256").update(parts.join("\u0000")).digest("hex");
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (redis) return (await redis.get<T>(key)) ?? null;
  const hit = memory.get(key);
  return hit ? (JSON.parse(hit) as T) : null;
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  if (redis) {
    await redis.set(key, value, { ex: TTL_SECONDS });
    return;
  }
  memory.set(key, JSON.stringify(value));
}
