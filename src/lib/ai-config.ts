import Groq from "groq-sdk";

export const GROQ_MODELS = {
  // LLaMA 3.3 70B: High-quality reasoning, grammar, stylistic re-writes, and tone adjustment
  PRIMARY: "llama-3.3-70b-versatile",
  // LLaMA 3.1 8B: Low-latency instant completions (synonyms, quick triage)
  FAST: "llama-3.1-8b-instant",
} as const;

export type GroqModelType = (typeof GROQ_MODELS)[keyof typeof GROQ_MODELS];

let groqInstance: Groq | null = null;

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is missing.");
  }

  if (!groqInstance) {
    groqInstance = new Groq({ apiKey });
  }

  return groqInstance;
}
