import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);
// Production server in CI; dev server locally. Either way, test artifacts are written outside
// the project: the dev server watches the project and would reload on every trace file.
const PROD = Boolean(process.env.CI || process.env.E2E_PROD);
const OUT = process.env.E2E_OUTPUT_DIR ?? join(tmpdir(), "grammar-master-e2e");

/**
 * End-to-end tests against a real dev server and a real MongoDB.
 * Set E2E_MONGODB_URI (default: a local mongod on 27017). No Groq key is needed:
 * the critical path uses the in-browser checks, and AI calls degrade gracefully.
 */
export default defineConfig({
  testDir: "e2e",
  outputDir: join(OUT, "results"),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder: join(OUT, "report") }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 900 } } }],
  webServer: {
    command: PROD ? `npm run build && npm run start -- --port ${PORT}` : `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: PROD ? 400_000 : 180_000,
    env: {
      MONGODB_URI: process.env.E2E_MONGODB_URI ?? "mongodb://127.0.0.1:27017/gm_e2e",
      JWT_SECRET: "e2e-only-secret-e2e-only-secret-e2e-only-secret",
      GROQ_API_KEY: process.env.E2E_GROQ_API_KEY ?? "e2e-no-ai",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      SENTRY_DSN: "",
    },
  },
});
