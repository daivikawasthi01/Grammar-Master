import {
  normalizePlan,
  isPaidPlan,
  getPromptLimit,
  InMemoryRateLimiter,
  PromptCache,
  buildCacheKey,
} from './free-plan';

describe('free-only plan rules', () => {
  it('normalizes any paid plan back to free', () => {
    expect(normalizePlan('premium')).toBe('free');
    expect(normalizePlan('business')).toBe('free');
    expect(normalizePlan('free')).toBe('free');
  });

  it('never treats free as paid', () => {
    expect(isPaidPlan('premium')).toBe(false);
    expect(isPaidPlan('business')).toBe(false);
    expect(isPaidPlan('free')).toBe(false);
  });

  it('uses the free tier prompt limit', () => {
    expect(getPromptLimit('premium')).toBe(1000);
    expect(getPromptLimit('business')).toBe(1000);
    expect(getPromptLimit('free')).toBe(1000);
  });

  it('enforces a memory-based rate limit', () => {
    const limiter = new InMemoryRateLimiter({ limit: 2, windowMs: 5000 });
    const key = 'user:test';

    expect(limiter.check(key).allowed).toBe(true);
    expect(limiter.check(key).allowed).toBe(true);
    expect(limiter.check(key).allowed).toBe(false);
  });

  it('stores and reuses cached values with a TTL', () => {
    const cache = new PromptCache<string>(2000);
    const key = buildCacheKey('grammar', 'user-1', 'en', 'hello');

    cache.set(key, 'cached-result');

    expect(cache.get(key)).toBe('cached-result');
    expect(cache.has(key)).toBe(true);
    cache.delete(key);
    expect(cache.has(key)).toBe(false);
  });
});
