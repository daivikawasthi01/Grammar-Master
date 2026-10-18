import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env, hasUpstash } from "@/lib/env";
import { AppError } from "@/server/errors";

type Policy = { limit: number; windowSeconds: number };

export const POLICIES = {
  login: { limit: 8, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  password: { limit: 5, windowSeconds: 15 * 60 },
  ai: { limit: 30, windowSeconds: 60 },
  api: { limit: 240, windowSeconds: 60 },
} satisfies Record<string, Policy>;

export type PolicyName = keyof typeof POLICIES;

interface Limiter {
  limit(key: string): Promise<{ success: boolean; reset: number }>;
}

/**
 * Process-wide sliding-window limiter for development and single-instance deploys.
 * Module level, so every request shares one counter (the old fallback built a new one per call).
 */
class MemoryLimiter implements Limiter {
  private hits = new Map<string, number[]>();
  constructor(private policy: Policy) {}

  async limit(key: string) {
    const now = Date.now();
    const windowMs = this.policy.windowSeconds * 1000;
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    const success = recent.length < this.policy.limit;
    if (success) recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(now, windowMs);
    return { success, reset: (recent[0] ?? now) + windowMs };
  }

  private prune(now: number, windowMs: number) {
    for (const [k, times] of this.hits) if (times.every((t) => now - t >= windowMs)) this.hits.delete(k);
  }
}

const limiters = new Map<PolicyName, Limiter>();

function limiterFor(name: PolicyName): Limiter {
  let limiter = limiters.get(name);
  if (!limiter) {
    const policy = POLICIES[name];
    limiter = hasUpstash
      ? new Ratelimit({
          redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! }),
          limiter: Ratelimit.slidingWindow(policy.limit, `${policy.windowSeconds} s`),
          prefix: `gm:rl:${name}`,
        })
      : new MemoryLimiter(policy);
    limiters.set(name, limiter);
  }
  return limiter;
}

export async function enforceRateLimit(name: PolicyName, key: string): Promise<void> {
  const { success, reset } = await limiterFor(name).limit(key);
  if (!success) {
    throw new AppError("RATE_LIMITED", "Too many requests. Try again shortly.", { resetAt: new Date(reset).toISOString() });
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
