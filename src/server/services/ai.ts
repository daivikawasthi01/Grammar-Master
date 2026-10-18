import "server-only";
import { cacheGet, cacheKey, cacheSet } from "@/server/cache";
import { refundQuota, reserveQuota } from "@/server/quota";
import { getLLM, MODELS, type LLMClient } from "@/server/ai/llm";
import {
  CHECK_PROMPT_VERSION,
  EDITS_SCHEMA,
  REWRITE_PROMPT_VERSION,
  TONE_PROMPT_VERSION,
  TONE_SCHEMA,
  TONE_SYSTEM_PROMPT,
  checkSystemPrompt,
  rewriteSystemPrompt,
} from "@/server/ai/prompts";
import { getStyleGuide, rulesRelevantTo } from "@/server/services/style-guide";
import { EDIT_CATEGORIES, type CheckResponse, type Edit, type Language, type RewriteAction, type ToneResponse } from "@/shared/schemas";

/**
 * Never trust the model's positions or even its quotes: keep only edits whose
 * original text really occurs (at the claimed occurrence) and that change something.
 */
export function sanitizeEdits(text: string, raw: unknown): Edit[] {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { edits?: unknown }).edits)) return [];
  const out: Edit[] = [];
  const seen = new Set<string>();
  for (const e of (raw as { edits: Partial<Edit>[] }).edits) {
    if (typeof e?.original !== "string" || typeof e.replacement !== "string") continue;
    if (!e.original || e.original === e.replacement) continue;
    const category = EDIT_CATEGORIES.includes(e.category as Edit["category"]) ? (e.category as Edit["category"]) : "correctness";
    let occurrence = Number.isInteger(e.occurrence) && (e.occurrence as number) >= 0 ? (e.occurrence as number) : 0;
    const count = text.split(e.original).length - 1;
    if (count === 0) continue;
    if (occurrence >= count) occurrence = 0;
    const key = `${e.original}\u0000${occurrence}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ original: e.original, replacement: e.replacement, category, reason: String(e.reason ?? "").slice(0, 300), occurrence });
  }
  return out;
}

export async function checkParagraph(opts: {
  userId: string;
  text: string;
  language: Language;
  requestId?: string;
  /** Eval runs measure the real pipeline: no cache reads/writes and no quota. Dev only. */
  isEval?: boolean;
  llm?: LLMClient;
}): Promise<CheckResponse> {
  const { userId, text, language, isEval = false } = opts;
  const guide = await getStyleGuide(userId);
  const styleRules = rulesRelevantTo(guide.rules, text);
  const model = MODELS.FAST;
  const key = cacheKey("check", CHECK_PROMPT_VERSION, model, language, styleRules.join("\n"), text);

  if (!isEval) {
    const cached = await cacheGet<CheckResponse>(key);
    if (cached) return { ...cached, requestId: opts.requestId, meta: { ...cached.meta, cached: true } };
    await reserveQuota(userId);
  }

  try {
    const result = await (opts.llm ?? getLLM()).completeJson<{ edits: unknown[] }>({
      model,
      schemaName: "edits",
      schema: EDITS_SCHEMA,
      messages: [
        { role: "system", content: checkSystemPrompt(language, styleRules) },
        { role: "user", content: text },
      ],
    });
    const response: CheckResponse = {
      requestId: opts.requestId,
      edits: sanitizeEdits(text, result.data),
      meta: { model: result.model, promptVersion: CHECK_PROMPT_VERSION, cached: false, usage: result.usage },
    };
    if (!isEval) await cacheSet(key, { ...response, requestId: undefined });
    return response;
  } catch (err) {
    if (!isEval) await refundQuota(userId);
    throw err;
  }
}

export async function rewriteStream(opts: { userId: string; text: string; action: RewriteAction; language: Language; signal?: AbortSignal; llm?: LLMClient }): Promise<ReadableStream<Uint8Array>> {
  await reserveQuota(opts.userId);
  const llm = opts.llm ?? getLLM();
  const iterator = llm
    .streamText({
      model: MODELS.PRIMARY,
      signal: opts.signal,
      maxTokens: Math.min(4000, Math.ceil(opts.text.length / 2) + 600),
      messages: [
        { role: "system", content: rewriteSystemPrompt(opts.action, opts.language) },
        { role: "user", content: opts.text },
      ],
    })
    [Symbol.asyncIterator]();

  // Pull the first token before answering, so a provider failure becomes a proper
  // JSON error response (and a quota refund) instead of a broken stream.
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (err) {
    await refundQuota(opts.userId);
    throw err;
  }

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encoder.encode(first.value));
        for (let next = await iterator.next(); !next.done; next = await iterator.next()) {
          controller.enqueue(encoder.encode(next.value));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}

export { REWRITE_PROMPT_VERSION };

export async function detectTone(opts: { userId: string; text: string; llm?: LLMClient }): Promise<ToneResponse> {
  const text = opts.text.slice(0, 6000);
  const key = cacheKey("tone", TONE_PROMPT_VERSION, text);
  const cached = await cacheGet<ToneResponse>(key);
  if (cached) return cached;
  await reserveQuota(opts.userId);
  try {
    const result = await (opts.llm ?? getLLM()).completeJson<ToneResponse>({
      model: MODELS.FAST,
      schemaName: "tone",
      schema: TONE_SCHEMA,
      maxTokens: 512,
      messages: [
        { role: "system", content: TONE_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    });
    await cacheSet(key, result.data);
    return result.data;
  } catch (err) {
    await refundQuota(opts.userId);
    throw err;
  }
}
