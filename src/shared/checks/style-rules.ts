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

// ---------------------------------------------------------------------------
// Parsing free-text guides into structured rules (done once, at save time).
// ---------------------------------------------------------------------------

const QUOTED = /['"“‘]([^'"”’]+)['"”’]/g;
const quoted = (s: string) => [...s.matchAll(QUOTED)].map((m) => m[1].trim()).filter(Boolean);
const bare = (s: string) =>
  s
    .split(/\s*(?:,|\bor\b|\band\b)\s*/i)
    .map((w) => w.replace(/^[\s'"“‘]+|[\s'"”’.;!]+$/g, "").trim())
    .filter(Boolean);
const listOf = (s: string) => (quoted(s).length ? quoted(s) : bare(s));

let counter = 0;
const newId = () => `r${Date.now().toString(36)}${(counter++).toString(36)}`;

export function parseRuleLine(line: string): Omit<StyleRule, "id"> | null {
  const text = line.trim().replace(/\.$/, "");
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => [string, string[]]]> = [
    // 'old' -> 'new'   /   old => new
    [/^(.+?)\s*(?:->|=>|→)\s*(.+)$/, (m) => [listOf(m[2])[0], listOf(m[1])]],
    // Use 'X', never 'Y' or 'Z'
    [/^(?:always\s+)?use\s+(['"“‘][^'"”’]+['"”’])\s*,?\s*(?:never|not)\s+(.+)$/i, (m) => [quoted(m[1])[0], listOf(m[2])]],
    // (Always) write/use 'X' instead of 'Y'
    [/^(?:always\s+)?(?:write|use|say)\s+(['"“‘][^'"”’]+['"”’])\s+instead\s+of\s+(.+)$/i, (m) => [quoted(m[1])[0], listOf(m[2])]],
    // Prefer 'X' over 'Y'
    [/^prefer\s+(['"“‘][^'"”’]+['"”’])\s+(?:over|to)\s+(.+)$/i, (m) => [quoted(m[1])[0], listOf(m[2])]],
    // Write 'X' as a single word, never 'Y'   /   Capitalize 'Q3' ..., never 'q3'
    [/^(?:write|capitali[sz]e|spell)\s+(['"“‘][^'"”’]+['"”’]).*?,?\s*never\s+(.+)$/i, (m) => [quoted(m[1])[0], listOf(m[2])]],
    // Always refer to <thing> as 'X'
    [/^(?:always\s+)?refer\s+to\s+(.+?)\s+as\s+(['"“‘][^'"”’]+['"”’])$/i, (m) => [quoted(m[2])[0], [m[1].replace(/^(?:our|the)\s+/i, (p) => p).trim()]]],
  ];
  for (const [re, pick] of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const [preferred, forbidden] = pick(m);
    if (!preferred) continue;
    const cleaned = [...new Set(forbidden.filter((f) => f && f !== preferred))];
    return { preferred, forbidden: cleaned, caseSensitive: true };
  }
  return null;
}

export function parseStyleGuideText(input: string): { rules: StyleRule[]; skipped: string[] } {
  const rules: StyleRule[] = [];
  const skipped: string[] = [];
  for (const raw of input.split(/\r?\n/)) {
    const line = raw
      .trim()
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim();
    if (!line || /^#{1,6}\s/.test(line) || /^[-*_]{3,}$/.test(line)) continue;
    const parsed = parseRuleLine(line);
    if (parsed) rules.push({ id: newId(), ...parsed, note: line.length <= 300 ? line : undefined });
    else skipped.push(line);
  }
  return { rules, skipped };
}
