import "server-only";
import { z } from "zod";

/**
 * Validated server configuration. Importing this module throws if a required
 * variable is missing, so the server refuses to start rather than running with
 * a guessable secret. There are deliberately no fallbacks.
 */
const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters (openssl rand -base64 48)"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  MONTHLY_AI_LIMIT: z.coerce.number().int().positive().default(1000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const fields = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n  ${fields.join("\n  ")}`);
  }
  return result.data;
}

export const env = validateEnv();

export const hasUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
