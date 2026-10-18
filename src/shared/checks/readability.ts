/**
 * Real Flesch reading ease and Flesch-Kincaid grade, with a syllable estimate.
 * No floors, no clamping: gibberish scores as gibberish.
 */

export function countSyllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

export type TextStats = {
  words: number;
  characters: number;
  sentences: number;
  paragraphs: number;
  readingMinutes: number;
  avgWordsPerSentence: number;
  fleschReadingEase: number | null;
  fleschKincaidGrade: number | null;
  longSentences: number;
};

export function textStats(text: string): TextStats {
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  const sentenceList = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
  const sentences = Math.max(sentenceList.length, words.length ? 1 : 0);
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);
  const wps = sentences ? words.length / sentences : 0;
  const spw = words.length ? syllables / words.length : 0;
  const enough = words.length >= 30;
  return {
    words: words.length,
    characters: text.replace(/\s/g, "").length,
    sentences,
    paragraphs: text.split(/\n+/).filter((p) => p.trim()).length,
    readingMinutes: words.length / 238,
    avgWordsPerSentence: Math.round(wps * 10) / 10,
    // Below ~30 words the formulas are noise, so the UI shows "not enough text" instead.
    fleschReadingEase: enough ? Math.round((206.835 - 1.015 * wps - 84.6 * spw) * 10) / 10 : null,
    fleschKincaidGrade: enough ? Math.round((0.39 * wps + 11.8 * spw - 15.59) * 10) / 10 : null,
    longSentences: sentenceList.filter((s) => (s.match(/\S+/g)?.length ?? 0) > 30).length,
  };
}

export function readingEaseLabel(score: number | null): string {
  if (score === null) return "Not enough text";
  if (score >= 80) return "Very easy";
  if (score >= 65) return "Plain English";
  if (score >= 50) return "Fairly difficult";
  if (score >= 30) return "Difficult";
  return "Very difficult";
}
