import type { Redis } from '@upstash/redis';

export type AppPlan = 'free' | 'premium' | 'business' | string;

function getUpstashRedisClass(): any {
  try {
    return require('@upstash/redis').Redis;
  } catch {
    return null;
  }
}

export const FREE_PROMPT_LIMIT = 1000;

export function normalizePlan(plan?: string | null): 'free' {
  return 'free';
}

export function isPaidPlan(plan?: string | null): boolean {
  return false;
}

export function getPromptLimit(plan?: string | null): number {
  return FREE_PROMPT_LIMIT;
}

export function buildCacheKey(type: string, userId: string, language?: string, text?: string): string {
  const normalizedText = (text ?? '').trim();
  const normalizedLanguage = (language ?? 'unknown').toLowerCase();
  return `grammar-master:${type}:${userId}:${normalizedLanguage}:${Buffer.from(normalizedText).toString('base64')}`;
}

export class PromptCache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();
  private readonly ttlMs: number;

  constructor(ttlMs = 60_000) {
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const current = this.entries.get(key);
    if (!current) return undefined;

    if (Date.now() > current.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }

    return current.value;
  }

  set(key: string, value: T): void {
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  has(key: string): boolean {
    return !!this.get(key);
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}

export class InMemoryRateLimiter {
  private hits: Map<string, number[]> = new Map();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor({ limit, windowMs }: { limit: number; windowMs: number }) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const bucket = this.hits.get(key) || [];
    const valid = bucket.filter((ts) => now - ts < this.windowMs);
    valid.push(now);
    this.hits.set(key, valid);

    const allowed = valid.length <= this.limit;
    const remaining = Math.max(0, this.limit - valid.length + 1);
    const resetAt = valid[0] ? valid[0] + this.windowMs : now + this.windowMs;

    if (!allowed) {
      return { allowed: false, remaining: 0, resetAt };
    }

    return { allowed: true, remaining, resetAt };
  }
}

export class RedisRateLimiter {
  private readonly client: Redis | null;
  private readonly limit: number;
  private readonly windowMs: number;

  constructor({ limit, windowMs, url, token }: { limit: number; windowMs: number; url?: string; token?: string }) {
    this.limit = limit;
    this.windowMs = windowMs;

    if (!url || !token) {
      this.client = null;
      return;
    }

    try {
      let formattedUrl = url.trim();
      if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }
      new URL(formattedUrl);
      const RedisClient = getUpstashRedisClass();
      this.client = RedisClient ? new RedisClient({ url: formattedUrl, token }) : null;
    } catch {
      this.client = null;
    }
  }

  async check(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    if (!this.client) {
      return new InMemoryRateLimiter({ limit: this.limit, windowMs: this.windowMs }).check(key);
    }

    const now = Date.now();
    const bucket = `ratelimit:${key}`;
    const windowSeconds = Math.ceil(this.windowMs / 1000);

    try {
      const current = await this.client.incr(bucket);
      const ttl = await this.client.ttl(bucket);

      if (ttl === -1 || ttl === -2) {
        await this.client.expire(bucket, windowSeconds);
      }

      const allowed = Number(current) <= this.limit;
      const remaining = Math.max(0, this.limit - Number(current));
      const resetAt = now + this.windowMs;

      return {
        allowed,
        remaining,
        resetAt,
      };
    } catch {
      return new InMemoryRateLimiter({ limit: this.limit, windowMs: this.windowMs }).check(key);
    }
  }
}

export async function enforceRateLimit(
  limiter: InMemoryRateLimiter | RedisRateLimiter,
  key: string
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (limiter instanceof RedisRateLimiter) {
    return limiter.check(key);
  }

  return limiter.check(key);
}

export function getRouteLimiter(limit = 20, windowMs = 60_000) {
  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.REDIS_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      return new RedisRateLimiter({ limit, windowMs, url: upstashUrl, token: upstashToken });
    }
  } catch {
    // Fall back to in-memory rate limiter if URL or Redis init fails
  }

  return new InMemoryRateLimiter({ limit, windowMs });
}
