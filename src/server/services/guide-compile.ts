import "server-only";
import { getLLM, MODELS, type LLMClient } from "@/server/ai/llm";
import { COMPILE_SCHEMA, COMPILE_SYSTEM_PROMPT } from "@/server/ai/prompts";
import { refundQuota, reserveQuota } from "@/server/quota";
import { logger } from "@/lib/logger";
import type { StyleRule } from "@/shared/schemas";

/** A term to protect. `named` terms occur in the writer's own text; the rest are the model's examples. */
export type ProtectTerm = { term: string; named: boolean };

export type CompiledGuide = {
  /** Replace rules, ready to add. */
  rules: StyleRule[];
  protectTerms: ProtectTerm[];
  /** Lines the AI reads as free text (also every protect line, so it covers members the list missed). */
  guidance: string[];
};

const MAX_LINES = 60;
const MAX_TERM = 40;
const MAX_NOTE = 300;

let counter = 0;
const newId = () => `r${Date.now().toString(36)}${(counter++).toString(36)}`;

const tidy = (terms: unknown, limit: number): string[] =>
  Array.isArray(terms)
    ? [...new Set(terms.filter((t): t is string => typeof t === "string").map((t) => t.trim().replace(/[.;!,]+$/, "")))].filter((t) => t && t.length <= MAX_TERM).slice(0, limit)
    : [];

export function guideLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((raw) => raw.trim().replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "").trim())
    .filter((line) => line && !/^#{1,6}\s/.test(line) && !/^[-*_]{3,}$/.test(line))
    .map((line) => line.slice(0, MAX_NOTE));
  return [...new Set(lines)];
}

/**
 * Turns what the writer typed into rules with one LLM call. The model is not trusted: "named"
 * terms must literally occur in the line (otherwise they become mere suggestions), everything is
 * length-capped, and any failure degrades to "every line is guidance".
 */
export async function compileGuide(userId: string, text: string, existing: StyleRule[] = [], llm?: LLMClient): Promise<CompiledGuide> {
  const lines = guideLines(text).slice(0, MAX_LINES);
  const asGuidance: CompiledGuide = { rules: [], protectTerms: [], guidance: lines };
  if (!lines.length) return asGuidance;
  try {
    await reserveQuota(userId);
  } catch (err) {
    logger.info({ err }, "skipping guide compilation: no quota");
    return asGuidance;
  }
  try {
    const result = await (llm ?? getLLM()).completeJson<{ items?: unknown[] }>({
      model: MODELS.FAST,
      schemaName: "guide_lines",
      schema: COMPILE_SCHEMA,
      maxTokens: 4096,
      messages: [
        { role: "system", content: COMPILE_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(lines) },
      ],
    });
    const items = Array.isArray(result.data?.items) ? result.data.items : [];
    const known = new Set(existing.filter((r) => r.kind === "protect").flatMap((r) => [r.preferred, ...r.forbidden]).map((t) => t.toLowerCase()));
    const replaced = new Set(existing.filter((r) => r.kind !== "protect").map((r) => r.preferred));
    const out: CompiledGuide = { rules: [], protectTerms: [], guidance: [] };
    const seen = new Set<string>();
    const addTerm = (term: string, named: boolean) => {
      const key = term.toLowerCase();
      if (known.has(key) || seen.has(key)) return;
      seen.add(key);
      out.protectTerms.push({ term, named });
    };
    lines.forEach((line, i) => {
      const item = items[i] as { intent?: string; named_terms?: unknown; suggested_terms?: unknown; preferred?: unknown; forbidden?: unknown } | undefined;
      if (item?.intent === "protect") {
        // A term is "named" if it literally occurs in the line, whichever list the model put it in.
        const claimed = [...tidy(item.named_terms, 20), ...tidy(item.suggested_terms, 8)];
        const inLine = (t: string) => new RegExp(`(?<![\\p{L}\\p{N}_])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_])`, "iu").test(line);
        const named = claimed.filter(inLine);
        const rest = claimed.filter((t) => !inLine(t));
        named.forEach((t) => addTerm(t, true));
        rest.forEach((t) => addTerm(t, false));
        out.guidance.push(line);
      } else if (item?.intent === "replace") {
        const preferred = tidy([item.preferred], 1)[0];
        const forbidden = tidy(item.forbidden, 20).filter((t) => t !== preferred);
        if (preferred && forbidden.length && !replaced.has(preferred)) out.rules.push({ id: newId(), preferred, forbidden, caseSensitive: true, note: line });
        else out.guidance.push(line);
      } else {
        out.guidance.push(line);
      }
    });
    return out;
  } catch (err) {
    logger.warn({ err }, "guide compilation failed; lines stay as guidance");
    await refundQuota(userId);
    return asGuidance;
  }
}
