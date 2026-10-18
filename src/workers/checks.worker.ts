/// <reference lib="webworker" />
import NSpell from "nspell";
import { runPhraseRules } from "@/shared/checks/rules";
import { rankSuggestions } from "@/shared/checks/spelling-rank";
import { compileRules, matchRules, type CompiledRules } from "@/shared/checks/style-rules";
import type { StyleRule } from "@/shared/schemas";
import type { CheckBlockResult, WorkerRequest, WorkerResponse, InstantHit } from "./checks-protocol";

/**
 * Instant checks, off the main thread and off the network: spelling (Hunspell
 * dictionary via nspell), phrase rules, and the user's style guide.
 */
let spell: NSpell | null = null;
let spellLoading: Promise<void> | null = null;
let compiled: CompiledRules = compileRules([]);
let rulesKey = "";
let ignored = new Set<string>();
const cache = new Map<string, InstantHit[]>();

const WORD = /[\p{L}][\p{L}'’]*[\p{L}]|[\p{L}]/gu;

function loadSpell(base: string) {
  spellLoading ??= Promise.all([fetch(`${base}/en.aff`).then((r) => r.text()), fetch(`${base}/en.dic`).then((r) => r.text())])
    .then(([aff, dic]) => {
      spell = NSpell(aff, dic);
      cache.clear();
    })
    .catch(() => {
      spellLoading = null; // retry on next request
    });
  return spellLoading;
}

function looksLikeName(word: string, text: string, index: number) {
  // Capitalised words mid-sentence are usually names; the dictionary will not know them.
  if (!/^\p{Lu}/u.test(word)) return false;
  const before = text.slice(0, index).trimEnd();
  return before.length > 0 && !/[.!?:"“]$/.test(before);
}

function spellingHits(text: string): InstantHit[] {
  if (!spell) return [];
  const hits: InstantHit[] = [];
  for (const m of text.matchAll(WORD)) {
    const raw = m[0];
    const word = raw.replace(/’/g, "'");
    const index = m.index!;
    if (word.length < 2 || /^\p{Lu}+$/u.test(word)) continue; // acronyms
    if (ignored.has(word.toLowerCase())) continue;
    const prev = text[index - 1];
    const next = text[index + raw.length];
    if (prev === "@" || prev === "#" || prev === "/" || prev === "." || next === "@" || /[\p{N}_]/u.test(next ?? "") || /[\p{N}_]/u.test(prev ?? "")) continue; // handles, paths, emails, code
    if (spell.correct(word)) continue;
    const stripped = word.replace(/'s$/i, "");
    if (stripped !== word && spell.correct(stripped)) continue;
    if (looksLikeName(word, text, index)) continue;
    const suggestions = rankSuggestions(raw, spell.suggest(word)).slice(0, 4);
    hits.push({
      kind: "spelling",
      from: index,
      to: index + raw.length,
      original: raw,
      replacements: suggestions,
      category: "spelling",
      title: "Spelling",
      message: suggestions.length ? `“${raw}” may be misspelled.` : `“${raw}” is not in the dictionary.`,
    });
  }
  return hits;
}

function checkText(text: string): InstantHit[] {
  const cached = cache.get(text);
  if (cached) return cached;
  const style = matchRules(compiled, text).map<InstantHit>((h) => ({
    kind: "style",
    from: h.from,
    to: h.to,
    original: h.original,
    replacements: [h.replacement],
    category: "style",
    title: "Style guide",
    message: h.note ? `Your style guide: ${h.note}` : `Your style guide prefers “${h.replacement}”.`,
  }));
  const rules = runPhraseRules(text).map<InstantHit>((r) => ({
    kind: "rule",
    from: r.from,
    to: r.to,
    original: r.original,
    replacements: [r.replacement],
    category: r.category,
    title: r.title,
    message: r.reason,
  }));
  // Style-guide terms are correct by definition; do not flag them as misspellings.
  const preferred = new Set([...compiled.rules.values()].map((r) => r.preferred.toLowerCase()));
  const spelling = spellingHits(text).filter((h) => !preferred.has(h.original.toLowerCase()) && !style.some((s) => h.from < s.to && s.from < h.to));
  const out = [...style, ...rules, ...spelling].sort((a, b) => a.from - b.from);
  if (cache.size > 2000) cache.clear();
  cache.set(text, out);
  return out;
}

function setRules(rules: StyleRule[]) {
  const key = JSON.stringify(rules);
  if (key === rulesKey) return;
  rulesKey = key;
  compiled = compileRules(rules);
  cache.clear();
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === "config") {
    setRules(msg.rules);
    ignored = new Set(msg.ignoredWords.map((w) => w.toLowerCase()));
    cache.clear();
    await loadSpell(msg.dictionaryBase);
    (self as unknown as Worker).postMessage({ type: "ready", spelling: Boolean(spell) } satisfies WorkerResponse);
    return;
  }
  if (msg.type === "check") {
    const started = performance.now();
    const blocks: CheckBlockResult[] = msg.blocks.map((b) => ({ index: b.index, text: b.text, hits: checkText(b.text) }));
    (self as unknown as Worker).postMessage({ type: "result", requestId: msg.requestId, blocks, ms: performance.now() - started } satisfies WorkerResponse);
  }
};
