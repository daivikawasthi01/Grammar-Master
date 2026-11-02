import type { StyleRule } from "../schemas";

/**
 * Style-guide rules are small and exact ("Use 'eBPF', never 'Ebpf'"), so they are
 * matched lexically: parsed once into {preferred, forbidden[]}, compiled into one
 * regex per user, and run in the browser (instant) and on the server (for the prompt).
 */

export type RuleHit = {
  ruleId: string;
  from: number; // offset in the text passed to matchRules
  to: number;
  original: string;
  replacement: string;
  note?: string;
};

type Variant = { term: string; ruleId: string; isPreferred: boolean };

export type CompiledRules = {
  regex: RegExp | null;
  byLower: Map<string, Variant[]>;
  rules: Map<string, StyleRule>;
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// \b fails next to symbols like "C++"; use explicit "not a word character" lookarounds instead.
const bounded = (term: string) => `(?<![\\p{L}\\p{N}_])${escape(term).replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}_])`;

const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

export function compileRules(rules: StyleRule[]): CompiledRules {
  const byLower = new Map<string, Variant[]>();
  const add = (v: Variant) => {
    const key = normalise(v.term);
    byLower.set(key, [...(byLower.get(key) ?? []), v]);
  };
  for (const r of rules) {
    if (r.kind === "protect") continue;
    for (const f of r.forbidden) if (f.trim()) add({ term: f.trim(), ruleId: r.id, isPreferred: false });
    // The preferred term itself is matched too, to catch wrong casing ("EBPF" for "eBPF").
    if (r.caseSensitive) add({ term: r.preferred, ruleId: r.id, isPreferred: true });
  }
  // Longest terms first, so "frontend developer" wins over "frontend".
  const terms = [...new Set([...byLower.values()].flat().map((v) => v.term))].sort((a, b) => b.length - a.length);
  return {
    regex: terms.length ? new RegExp(terms.map(bounded).join("|"), "giu") : null,
    byLower,
    rules: new Map(rules.map((r) => [r.id, r])),
  };
}

export type Span = { from: number; to: number; term: string };

/** Where the writer's protected vocabulary occurs in the text. A protect rule keeps several terms together (`preferred` plus `forbidden`). Always case-insensitive. */
export function protectedSpans(rules: StyleRule[], text: string): Span[] {
  const terms = [...new Set(rules.filter((r) => r.kind === "protect").flatMap((r) => [r.preferred, ...r.forbidden]).map((t) => t.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!terms.length) return [];
  const re = new RegExp(terms.map(bounded).join("|"), "giu");
  return [...text.matchAll(re)].map((m) => ({ from: m.index!, to: m.index! + m[0].length, term: m[0] }));
}

export const overlapsSpan = (spans: Span[], from: number, to: number) => spans.some((s) => from < s.to && to > s.from);

export function matchRules(compiled: CompiledRules, text: string): RuleHit[] {
  if (!compiled.regex) return [];
  const hits: RuleHit[] = [];
  compiled.regex.lastIndex = 0;
  for (const m of text.matchAll(compiled.regex)) {
    const found = m[0];
    const variants = compiled.byLower.get(normalise(found)) ?? [];
    for (const v of variants) {
      const rule = compiled.rules.get(v.ruleId);
      if (!rule) continue;
      if (v.isPreferred) {
        if (found === rule.preferred) continue; // correct already
      } else if (rule.caseSensitive && rule.forbidden.every((f) => normalise(f) !== normalise(found))) {
        continue;
      }
      if (found === rule.preferred) continue;
      hits.push({ ruleId: rule.id, from: m.index!, to: m.index! + found.length, original: found, replacement: rule.preferred, note: rule.note });
      break;
    }
  }
  return hits;
}

/** Applies every replace rule to `text` (leaving protected words alone), so a rewrite can't reintroduce a forbidden spelling. */
export function applyRules(rules: StyleRule[], text: string): string {
  const spans = protectedSpans(rules, text);
  const hits = matchRules(compileRules(rules), text).filter((h) => !overlapsSpan(spans, h.from, h.to));
  let out = "";
  let at = 0;
  for (const h of hits.sort((a, b) => a.from - b.from)) {
    if (h.from < at) continue;
    out += text.slice(at, h.from) + h.replacement;
    at = h.to;
  }
  return out + text.slice(at);
}

/** Protected words present in `original` that no longer appear in `result`. */
export function droppedProtected(rules: StyleRule[], original: string, result: string): string[] {
  const lower = result.toLowerCase();
  return [...new Set(protectedSpans(rules, original).map((s) => s.term.toLowerCase()))].filter((t) => !lower.includes(t));
}
