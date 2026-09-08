import Groq from "groq-sdk";
import aiModels from "../config/ai-models.json";

export const GROQ_MODELS = {
  // Primary 120B model: High-quality reasoning, grammar, stylistic re-writes, and tone adjustment
  PRIMARY: aiModels.PRIMARY,
  // Fast 20B model: Low-latency instant completions (synonyms, quick triage)
  FAST: aiModels.FAST,
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
