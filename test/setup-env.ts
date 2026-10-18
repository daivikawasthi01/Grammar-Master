import "@testing-library/jest-dom/vitest";
import { inject } from "vitest";

// Runs before each test file's imports, so env.ts validates against these.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-test-secret";
process.env.GROQ_API_KEY = "test-key";
process.env.MONTHLY_AI_LIMIT = "5";
// Each test file gets its own database on the shared in-memory server.
process.env.MONGODB_URI = `${inject("mongoBase").replace(/\/?$/, "/")}gm_${Math.random().toString(36).slice(2, 10)}`;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
