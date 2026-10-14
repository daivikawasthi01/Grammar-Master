import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  UPSTASH_VECTOR_REST_URL: z.string().optional(),
  UPSTASH_VECTOR_REST_TOKEN: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

function validateEnv() {
  // In test environment, provide dummy fallbacks if not explicitly provided
  if (process.env.NODE_ENV === "test") {
    return {
      MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/test",
      JWT_SECRET: process.env.JWT_SECRET || "test-secret-must-be-long-enough-12345",
      GROQ_API_KEY: process.env.GROQ_API_KEY || "gsk_test_api_key_1234567890",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      UPSTASH_VECTOR_REST_URL: process.env.UPSTASH_VECTOR_REST_URL,
      UPSTASH_VECTOR_REST_TOKEN: process.env.UPSTASH_VECTOR_REST_TOKEN,
      NODE_ENV: "test" as const,
    };
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error("❌ Invalid environment variables:", JSON.stringify(formatted, null, 2));
    throw new Error(
      `Missing or invalid required environment variables: ${Object.keys(formatted)
        .filter((k) => k !== "_errors")
        .join(", ")}`
    );
  }

  return result.data;
}

export const env = validateEnv();
