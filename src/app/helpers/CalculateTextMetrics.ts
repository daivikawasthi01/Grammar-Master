export interface TextMetrics {
  correctness: number;
  clarity: number;
  engagement: number;
  delivery: number;
}

// Common misspellings and typos dictionary
const KNOWN_TYPOS = new Set([
  'teh', 'definately', 'recieve', 'seperate', 'untill', 'wierd', 'occured',
  'goverment', 'beleive', 'truely', 'accommodate', 'embarass', 'neccessary',
  'concious', 'existance', 'maintainance', 'pronounciation', 'tommorow',
  'irregardless', 'alot', 'untill', 'wich', 'thier'
]);

// Common irregular past participles for true passive voice detection
const PASSIVE_PARTICIPLES = new Set([
  'built', 'done', 'seen', 'written', 'known', 'made', 'found',
  'taken', 'given', 'chosen', 'driven', 'eaten', 'spoken', 'broken',
  'brought', 'caught', 'bought', 'taught', 'thought', 'felt', 'left'
]);

export const calculateTextMetrics = async (text: string): Promise<TextMetrics> => {
  const metrics: TextMetrics = {
    correctness: 0,
    clarity: 0,
    engagement: 0,
    delivery: 0,
  };

  if (!text || text.trim().length === 0) {
    return metrics;
  }

  const cleanText = text.replace(/<[^>]*>/g, '');
  if (cleanText.trim().length === 0) {
    return metrics;
  }

  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  if (words.length === 0 || sentences.length === 0) {
    return metrics;
  }

  // Calculate scores
  metrics.correctness = calculateCorrectnessScore(words, sentences, cleanText);
  metrics.clarity = calculateClarityScore(cleanText, words, sentences);
  metrics.engagement = calculateEngagementScore(words);
  metrics.delivery = calculateDeliveryScore(cleanText, words);

  return metrics;
};

/**
 * Evaluates spelling based on known high-frequency typos, 
 * triple-letter repetitions, and impossible consonant clusters.
 */
export const calculateSpellingScore = (words: string[]): number => {
  if (words.length === 0) return 100;

  let typoCount = 0;

  for (const word of words) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) continue;

    // 1. Check known high-frequency typos
    if (KNOWN_TYPOS.has(clean)) {
      typoCount++;
      continue;
    }

    // 2. Three or more identical consecutive characters (e.g. "soooo", "pleaaase")
    if (/([a-z])\1{2,}/.test(clean)) {
      typoCount++;
      continue;
    }

    // 3. 5+ consecutive consonants without a vowel (excluding common onomatopoeia/initialisms)
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(clean) && clean.length > 5) {
      typoCount++;
      continue;
    }
  }

  const errorRatio = typoCount / words.length;
  return Math.max(50, Math.round(100 - errorRatio * 200));
};

/**
 * Checks for genuine grammar errors, true passive voice constructions,
 * and punctuation abnormalities without falsely penalizing continuous tense.
 */
export const calculateGrammarScore = (text: string, sentences: string[]): number => {
  if (sentences.length === 0) return 100;

  let issues = 0;

  // 1. Double punctuation or space before punctuation
  const spaceBeforePunctuation = (text.match(/\s+[.,!?:;]/g) || []).length;
  const multipleSpaces = (text.match(/[^\S\r\n]{2,}/g) || []).length;
  const uncapitalizedI = (text.match(/\bi\b(?!['])/g) || []).length;

  // 2. Isolated single letters other than 'a' or 'i' (e.g. "the c dog")
  const rogueSingleLetters = (text.match(/\s+[b-hj-zB-HJ-Z]\s+/g) || []).length;

  // 3. True passive voice: auxiliary 'be' + regular past participle (-ed/-en) or known irregular
  const passiveMatches = Array.from(
    text.matchAll(/\b(am|is|are|was|were|been|being|be)\s+([a-zA-Z]+)\b/gi)
  );
  let truePassiveCount = 0;
  for (const match of passiveMatches) {
    const verb = match[2].toLowerCase();
    if (verb.endsWith("ed") || verb.endsWith("en") || PASSIVE_PARTICIPLES.has(verb)) {
      truePassiveCount++;
    }
  }

  // 4. Common confusable collocations (e.g. "their is", "your welcome")
  const confusableTypos =
    (text.match(/\btheir\s+(is|are|was|were)\b/gi) || []).length +
    (text.match(/\byour\s+(welcome|right|wrong)\b/gi) || []).length;

  issues +=
    spaceBeforePunctuation +
    multipleSpaces +
    uncapitalizedI +
    rogueSingleLetters +
    truePassiveCount * 0.5 +
    confusableTypos * 1.5;

  // Sentence structure checks
  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (trimmed.length > 0 && !/^[A-Z"']/.test(trimmed)) issues += 0.5;
    if (trimmed.length > 300) issues += 0.5; // Excessively long run-on sentence
  });

  const penalty = (issues / sentences.length) * 20;
  return Math.max(50, Math.round(100 - penalty));
};

export const calculatePunctuationScore = (text: string): number => {
  const punctuation = [',', ';', ':', '!', '?', '-', '(', '"', '.'];
  const textLength = Math.max(1, text.length);

  const quotes = (text.match(/"/g) || []).length;
  const openParens = (text.match(/\(/g) || []).length;
  const closeParens = (text.match(/\)/g) || []).length;
  const balanced = quotes % 2 === 0 && openParens === closeParens;

  let punctuationCount = 0;
  for (const punct of punctuation) {
    punctuationCount += (text.split(punct).length - 1);
  }

  const density = (punctuationCount / (textLength / 100));
  const balancedScore = balanced ? 100 : 85;
  const densityScore = Math.min(100, Math.max(60, Math.round(70 + density * 5)));

  return Math.round((balancedScore + densityScore) / 2);
};

export const analyzeTextComplexity = (text: string): number => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const complexWords = words.filter(
    (word) =>
      word.length > 8 ||
      /(tion|ment|ness|ity|ship|able|ible)$/i.test(word)
  );
  return (complexWords.length / words.length) * 100;
};

export const analyzeSentenceVariety = (sentences: string[]): number => {
  if (sentences.length < 2) return 70;

  const lengths = sentences.map((s) => s.trim().split(/\s+/).filter(Boolean).length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / lengths.length;
  return Math.min(100, Math.max(50, Math.round(60 + Math.sqrt(variance) * 5)));
};

export const countTransitionWords = (text: string): number => {
  const transitionWords = [
    'however', 'therefore', 'furthermore', 'moreover', 'nevertheless',
    'although', 'consequently', 'meanwhile', 'afterward', 'finally',
    'thus', 'hence', 'accordingly', 'subsequently', 'conversely'
  ];

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  let count = 0;
  for (const word of transitionWords) {
    count += (lower.split(word).length - 1);
  }

  return Math.min(100, Math.round((count / words.length) * 400 + 50));
};

export const calculateCorrectnessScore = (
  words: string[],
  sentences: string[],
  text: string
): number => {
  const spellingScore = calculateSpellingScore(words);
  const grammarScore = calculateGrammarScore(text, sentences);
  const punctuationScore = calculatePunctuationScore(text);

  return Math.round(
    spellingScore * 0.4 +
    grammarScore * 0.4 +
    punctuationScore * 0.2
  );
};

export const calculateClarityScore = (
  text: string,
  words: string[],
  sentences: string[]
): number => {
  const complexity = analyzeTextComplexity(text);
  const variety = analyzeSentenceVariety(sentences);
  const structure = countTransitionWords(text);

  return Math.round(
    Math.max(40, 100 - complexity * 0.5) * 0.4 +
    variety * 0.3 +
    structure * 0.3
  );
};

export const calculateEngagementScore = (words: string[]): number => {
  if (words.length === 0) return 100;
  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ''))).size;
  const lexicalDiversity = (uniqueWords / words.length) * 100;

  return Math.min(100, Math.max(50, Math.round(lexicalDiversity * 0.8 + 20)));
};

export const calculateDeliveryScore = (text: string, words: string[]): number => {
  const punctuationScore = calculatePunctuationScore(text);
  const transitionScore = countTransitionWords(text);

  return Math.round(
    punctuationScore * 0.5 +
    transitionScore * 0.5
  );
};