/**
 * Deterministic writing rules. Pure functions over plain text, shared by the
 * browser worker (instant underlines) and the server. Typos are handled by the
 * spell checker, so this list is about phrasing.
 */
export type RuleCategory = "correctness" | "clarity" | "engagement" | "delivery";

export type PhraseRule = {
  id: string;
  pattern: RegExp; // must use the g flag
  category: RuleCategory;
  title: string;
  replace: (match: string, groups: string[]) => string;
  reason: string;
};

const keepCase = (from: string, to: string) =>
  from[0] && from[0] === from[0].toUpperCase() && from[0] !== from[0].toLowerCase() ? to[0].toUpperCase() + to.slice(1) : to;

const phrase = (id: string, words: string, to: string, category: RuleCategory, title: string, reason: string): PhraseRule => ({
  id,
  pattern: new RegExp(`(?<![\\p{L}])${words.replace(/ /g, "\\s+")}(?![\\p{L}])`, "giu"),
  category,
  title,
  replace: (m) => keepCase(m, to),
  reason,
});

export const PHRASE_RULES: PhraseRule[] = [
  {
    id: "repeated-word",
    pattern: /(?<![\p{L}])(\p{L}+)\s+\1(?![\p{L}])/giu,
    category: "correctness",
    title: "Repeated word",
    replace: (_m, g) => g[0],
    reason: "The same word appears twice in a row.",
  },
  {
    id: "a-an",
    pattern: /(?<![\p{L}])(a)\s+(?=(?:[aeio]\p{L}|u(?:n|nd|s)\p{L}|hour|honest|honou?r))/giu,
    category: "correctness",
    title: "Article",
    replace: (m) => keepCase(m, "an") + " ",
    reason: "Use “an” before a vowel sound.",
  },
  phrase("irregardless", "irregardless", "regardless", "correctness", "Word choice", "“Irregardless” is nonstandard; use “regardless”."),
  phrase("could-of", "could of", "could have", "correctness", "Grammar", "The verb form is “could have”."),
  phrase("should-of", "should of", "should have", "correctness", "Grammar", "The verb form is “should have”."),
  phrase("would-of", "would of", "would have", "correctness", "Grammar", "The verb form is “would have”."),
  phrase("alot", "alot", "a lot", "correctness", "Spelling", "“A lot” is two words."),
  phrase("due-to-the-fact", "due to the fact that", "because", "clarity", "Wordy phrase", "“Because” says the same in one word."),
  phrase("in-order-to", "in order to", "to", "clarity", "Wordy phrase", "“To” is usually enough."),
  phrase("at-this-point", "at this point in time", "now", "clarity", "Wordy phrase", "“Now” is more direct."),
  phrase("for-the-purpose", "for the purpose of", "to", "clarity", "Wordy phrase", "Simplify to “to”."),
  phrase("make-a-decision", "make a decision", "decide", "clarity", "Weak verb", "Use the verb “decide”."),
  phrase("in-spite-of", "in spite of the fact that", "although", "clarity", "Wordy phrase", "“Although” is shorter."),
  phrase("has-the-ability", "has the ability to", "can", "clarity", "Wordy phrase", "“Can” is shorter."),
  phrase("utilize", "utilize", "use", "engagement", "Simpler word", "“Use” is plainer and reads faster."),
  phrase("very-unique", "very unique", "unique", "engagement", "Redundant", "“Unique” is absolute and does not need “very”."),
  phrase("really-good", "really good", "excellent", "engagement", "Stronger word", "A single stronger adjective reads better."),
  phrase("needless-to-say", "needless to say,? ?", "", "delivery", "Filler", "If it is needless to say, it can go."),
];

export type RuleMatch = {
  ruleId: string;
  from: number;
  to: number;
  original: string;
  replacement: string;
  category: RuleCategory;
  title: string;
  reason: string;
};

export function runPhraseRules(text: string, rules: PhraseRule[] = PHRASE_RULES): RuleMatch[] {
  const out: RuleMatch[] = [];
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const m of text.matchAll(rule.pattern)) {
      const original = m[0];
      const replacement = rule.replace(original, m.slice(1));
      if (replacement === original) continue;
      out.push({
        ruleId: rule.id,
        from: m.index!,
        to: m.index! + original.length,
        original,
        replacement,
        category: rule.category,
        title: rule.title,
        reason: rule.reason,
      });
    }
  }
  return out.sort((a, b) => a.from - b.from);
}
