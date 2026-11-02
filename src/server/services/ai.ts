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
import {
  compileRules,
  matchRules,
  overlapsSpan,
  protectedSpans,
  type Span,
} from "@/shared/checks/style-rules";
import {
  getStyleGuide,
  rulesRelevantTo,
} from "@/server/services/style-guide";
import {
  EDIT_CATEGORIES,
  type CheckResponse,
  type Edit,
  type Language,
  type RewriteAction,
  type StyleRule,
  type ToneResponse,
  type TranslateTarget,
} from "@/shared/schemas";

/**
 * Never trust the model's positions or even its quotes: keep only edits whose
 * original text really occurs (at the claimed occurrence) and that change something.
 */
export function sanitizeEdits(text: string, raw: unknown): Edit[] {
  if (
    !raw ||
    typeof raw !== "object" ||
    !Array.isArray((raw as { edits?: unknown }).edits)
  )
    return [];
  const out: Edit[] = [];
  const seen = new Set<string>();
  for (const e of (raw as { edits: Partial<Edit>[] }).edits) {
    if (typeof e?.original !== "string" || typeof e.replacement !== "string")
      continue;
    if (!e.original || e.original === e.replacement) continue;
    const category = EDIT_CATEGORIES.includes(e.category as Edit["category"])
      ? (e.category as Edit["category"])
      : "correctness";
    let occurrence =
      Number.isInteger(e.occurrence) && (e.occurrence as number) >= 0
        ? (e.occurrence as number)
        : 0;
    const count = text.split(e.original).length - 1;
    if (count === 0) continue;
    if (occurrence >= count) occurrence = 0;
    const key = `${e.original}\u0000${occurrence}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      original: e.original,
      replacement: e.replacement,
      category,
      reason: String(e.reason ?? "").slice(0, 300),
      occurrence,
    });
  }
  return out;
}

/**
 * The model proposes, policy decides: drop any edit whose target overlaps a word the
 * writer protects, whatever the prompt said.
 */
export function enforceProtected(
  text: string,
  edits: Edit[],
  spans: Span[],
): Edit[] {
  if (!spans.length) return edits;
  return edits.filter((e) => {
    let from = -1;
    for (let i = 0; i <= e.occurrence; i++)
      from = text.indexOf(e.original, from + 1);
    return from < 0 || !overlapsSpan(spans, from, from + e.original.length);
  });
}

/**
 * Replace rules are exact, so the model may not contradict them: drop any edit that touches a
 * word a rule already handles (the instant check offers that fix) or that would introduce a forbidden term.
 */
export function enforceRules(text: string, edits: Edit[], rules: StyleRule[]): Edit[] {
  const compiled = compileRules(rules);
  const hits = matchRules(compiled, text);
  if (!compiled.regex) return edits;
  const spans = hits.map((h) => ({ from: h.from, to: h.to, term: h.original }));
  return edits.filter((e) => {
    if (matchRules(compiled, e.replacement).length) return false;
    let from = -1;
    for (let i = 0; i <= e.occurrence; i++) from = text.indexOf(e.original, from + 1);
    return from < 0 || !overlapsSpan(spans, from, from + e.original.length);
  });
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
  const spans = protectedSpans(guide.rules, text);
  const protectedTerms = [...new Set(spans.map((s) => s.term.toLowerCase()))];
  const guidanceNotes = guide.guidanceNotes;
  const model = MODELS.FAST;
  const key = cacheKey(
    "check",
    CHECK_PROMPT_VERSION,
    model,
    language,
    protectedTerms.join("\n"),
    styleRules.join("\n"),
    guidanceNotes.join("\n"),
    text,
  );

  if (!isEval) {
    const cached = await cacheGet<CheckResponse>(key);
    if (cached)
      return {
        ...cached,
        requestId: opts.requestId,
        meta: { ...cached.meta, cached: true },
      };
    await reserveQuota(userId);
  }

  try {
    const result = await (opts.llm ?? getLLM()).completeJson<{
      edits: unknown[];
    }>({
      model,
      schemaName: "edits",
      schema: EDITS_SCHEMA,
      messages: [
        {
          role: "system",
          content: checkSystemPrompt(
            language,
            styleRules,
            guidanceNotes,
            protectedTerms,
          ),
        },
        { role: "user", content: text },
      ],
    });
    const response: CheckResponse = {
      requestId: opts.requestId,
      edits: enforceRules(text, enforceProtected(text, sanitizeEdits(text, result.data), spans), guide.rules),
      meta: {
        model: result.model,
        promptVersion: CHECK_PROMPT_VERSION,
        cached: false,
        usage: result.usage,
      },
    };
    if (!isEval) await cacheSet(key, { ...response, requestId: undefined });
    return response;
  } catch (err) {
    if (!isEval) await refundQuota(userId);
    throw err;
  }
}

const OPEN = "⟦";
const CLOSE = "⟧";

/** Swap each protected word for a marker the model is told to copy, so it never sees (or alters) the word. */
export function maskProtected(text: string, spans: Span[]): { masked: string; terms: string[] } {
  let masked = "";
  let at = 0;
  const terms: string[] = [];
  for (const s of [...spans].sort((a, b) => a.from - b.from)) {
    if (s.from < at) continue;
    terms.push(text.slice(s.from, s.to));
    masked += text.slice(at, s.from) + `${OPEN}${terms.length}${CLOSE}`;
    at = s.to;
  }
  return { masked: masked + text.slice(at), terms };
}

/** Puts the original words back as tokens stream in, holding back a marker split across chunks. */
export function createUnmasker(terms: string[]) {
  let held = "";
  const restore = (t: string) => t.replace(/⟦(\d+)⟧/g, (m, n) => terms[Number(n) - 1] ?? m);
  return {
    push(chunk: string) {
      held += chunk;
      const open = held.lastIndexOf(OPEN);
      const cut = open >= 0 && held.indexOf(CLOSE, open) < 0 && held.length - open < 8 ? open : held.length;
      const out = restore(held.slice(0, cut));
      held = held.slice(cut);
      return out;
    },
    flush() {
      const out = restore(held);
      held = "";
      return out;
    },
  };
}

export async function rewriteStream(opts: {
  userId: string;
  text: string;
  action: RewriteAction;
  language: Language;
  target?: TranslateTarget;
  signal?: AbortSignal;
  llm?: LLMClient;
}): Promise<ReadableStream<Uint8Array>> {
  const guide = await getStyleGuide(opts.userId);
  const { masked, terms } = maskProtected(opts.text, protectedSpans(guide.rules, opts.text));
  const unmasker = createUnmasker(terms);
  await reserveQuota(opts.userId);
  const llm = opts.llm ?? getLLM();
  const iterator = llm
    .streamText({
      model: MODELS.PRIMARY,
      signal: opts.signal,
      maxTokens: Math.min(4000, Math.ceil(opts.text.length / (opts.action === "translate" ? 1 : 2)) + 600),
      messages: [
        {
          role: "system",
          content: rewriteSystemPrompt(opts.action, opts.language, opts.target, terms.length > 0),
        },
        { role: "user", content: masked },
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
        const send = (t: string) => t && controller.enqueue(encoder.encode(t));
        if (!first.done) send(unmasker.push(first.value));
        for (
          let next = await iterator.next();
          !next.done;
          next = await iterator.next()
        ) {
          send(unmasker.push(next.value));
        }
        send(unmasker.flush());
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

export async function detectTone(opts: {
  userId: string;
  text: string;
  llm?: LLMClient;
}): Promise<ToneResponse> {
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
