import "server-only";
import Groq from "groq-sdk";
import { env } from "@/lib/env";
import { AppError } from "@/server/errors";

/**
 * The only place that talks to an LLM provider. Services depend on this
 * interface, so tests pass a fake and a provider can be swapped later.
 */
export const MODELS = {
  // Background checks run on every typing pause: speed matters most.
  FAST: "openai/gpt-oss-20b",
  // Explicit rewrites the user asked for: quality matters most.
  PRIMARY: "openai/gpt-oss-120b",
} as const;
export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export type ChatMessage = { role: "system" | "user"; content: string };

export type JsonCompletion<T> = {
  data: T;
  model: string;
  usage: { promptTokens: number | null; completionTokens: number | null };
};

export interface LLMClient {
  completeJson<T>(opts: {
    model: ModelId;
    messages: ChatMessage[];
    schemaName: string;
    schema: Record<string, unknown>;
    maxTokens?: number;
    signal?: AbortSignal;
  }): Promise<JsonCompletion<T>>;

  streamText(opts: { model: ModelId; messages: ChatMessage[]; maxTokens?: number; signal?: AbortSignal }): AsyncIterable<string>;
}

const TIMEOUT_MS = 8_000;
const STREAM_TIMEOUT_MS = 30_000;

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const status = (err as { status?: number })?.status;
  if (status === 429) return new AppError("AI_UNAVAILABLE", "The AI service is busy. Try again in a moment.");
  return new AppError("AI_UNAVAILABLE", "The AI service did not respond. Instant checks still work.");
}

export class GroqLLMClient implements LLMClient {
  private client: Groq;

  constructor(apiKey = env.GROQ_API_KEY) {
    // One retry on 429 and 5xx (the SDK only retries those), with an 8 s timeout per attempt.
    this.client = new Groq({ apiKey, maxRetries: 1, timeout: TIMEOUT_MS });
  }

  async completeJson<T>({ model, messages, schemaName, schema, maxTokens = 2048, signal }: Parameters<LLMClient["completeJson"]>[0]) {
    try {
      const completion = await this.client.chat.completions.create(
        {
          model,
          messages,
          // gpt-oss models reason before answering; reasoning tokens count against the output budget.
          reasoning_effort: "low",
          include_reasoning: false,
          max_completion_tokens: maxTokens,
          temperature: 0,
          response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
        },
        { signal },
      );
      const choice = completion.choices[0];
      if (choice?.finish_reason === "length") throw new AppError("AI_UNAVAILABLE", "The AI response was cut off.");
      const raw = choice?.message?.content;
      if (!raw) throw new AppError("AI_UNAVAILABLE", "The AI service returned an empty response.");
      let data: T;
      try {
        data = JSON.parse(raw) as T;
      } catch {
        throw new AppError("AI_UNAVAILABLE", "The AI service returned malformed output.");
      }
      return {
        data,
        model: completion.model ?? model,
        usage: { promptTokens: completion.usage?.prompt_tokens ?? null, completionTokens: completion.usage?.completion_tokens ?? null },
      };
    } catch (err) {
      throw toAppError(err);
    }
  }

  async *streamText({ model, messages, maxTokens = 1500, signal }: Parameters<LLMClient["streamText"]>[0]) {
    let stream;
    try {
      stream = await this.client.chat.completions.create(
        { model, messages, stream: true, reasoning_effort: "low", include_reasoning: false, max_completion_tokens: maxTokens, temperature: 0.4 },
        { signal, timeout: STREAM_TIMEOUT_MS },
      );
    } catch (err) {
      throw toAppError(err);
    }
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) yield token;
    }
  }
}

let defaultClient: LLMClient | null = null;
export const getLLM = (): LLMClient => (defaultClient ??= new GroqLLMClient());

/** Tests only. */
export function setLLMForTesting(client: LLMClient | null) {
  defaultClient = client;
}
