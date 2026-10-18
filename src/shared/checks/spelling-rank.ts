/**
 * Hunspell suggestions are not ordered for typing errors ("Teh" -> "Ten" before "The").
 * Rank them by an edit distance where swapping two adjacent letters is cheap,
 * and pin the answers for the most common typos.
 */
export const COMMON_TYPOS: Record<string, string> = {
  teh: "the",
  hte: "the",
  adn: "and",
  nad: "and",
  taht: "that",
  thier: "their",
  wiht: "with",
  waht: "what",
  wich: "which",
  becuase: "because",
  beacuse: "because",
  recieve: "receive",
  recieved: "received",
  definately: "definitely",
  seperate: "separate",
  occured: "occurred",
  untill: "until",
  tomorow: "tomorrow",
  goverment: "government",
  enviroment: "environment",
  accomodate: "accommodate",
  occassion: "occasion",
  neccessary: "necessary",
  publically: "publicly",
  wierd: "weird",
  freind: "friend",
  beleive: "believe",
  acheive: "achieve",
  existance: "existence",
};

export function editDistance(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 0.5);
    }
  }
  return d[a.length][b.length];
}

function matchCase(source: string, word: string): string {
  if (source === source.toUpperCase() && source.length > 1) return word.toUpperCase();
  if (source[0] === source[0].toUpperCase()) return word[0].toUpperCase() + word.slice(1);
  return word;
}

export function rankSuggestions(word: string, suggestions: string[]): string[] {
  const pinned = COMMON_TYPOS[word.toLowerCase()];
  const scored = suggestions
    .map((s, i) => ({ s, score: editDistance(word, s) + i * 0.01 + (s[0]?.toLowerCase() === word[0]?.toLowerCase() ? 0 : 0.3) }))
    .sort((x, y) => x.score - y.score)
    .map((x) => x.s);
  const ordered = pinned ? [pinned, ...scored.filter((s) => s.toLowerCase() !== pinned)] : scored;
  const out: string[] = [];
  for (const s of ordered) {
    const cased = matchCase(word, s);
    if (!out.includes(cased)) out.push(cased);
  }
  return out;
}
