interface TextMetrics {
  correctness: number;
  clarity: number;
  engagement: number;
  delivery: number;
}

// Expanded common words dictionary
const commonWords = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
  'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
  'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
  'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like',
  'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
  'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look',
  'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
  'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
  'any', 'these', 'give', 'day', 'most', 'us',
  'is', 'are', 'was', 'were', 'has', 'have', 'had', 'been', 'being',
  'do', 'does', 'did', 'doing', 'would', 'should', 'could', 'might',
  'must', 'shall', 'will', 'may', 'can', 'here', 'there', 'where',
  'why', 'how', 'what', 'who', 'whom', 'whose', 'which', 'when',
  'am', 'im', "i'm", "isn't", "aren't", "wasn't", "weren't",
  'very', 'really', 'quite', 'rather', 'too', 'enough', 'such',
  'both', 'either', 'neither', 'each', 'every', 'any', 'some',
  'many', 'much', 'more', 'most', 'other', 'another', 'same',
  // Add common name prefixes/suffixes
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'ing', 'ed', 'ph',
]);

// Common sentence starters for better engagement analysis
const sentenceStarters = new Set([
  'firstly', 'secondly', 'finally', 'notably', 'importantly',
  'interestingly', 'surprisingly', 'consequently', 'additionally',
  'similarly', 'conversely', 'meanwhile', 'subsequently', 'ultimately'
]);

export const calculateTextMetrics = async (text: string): Promise<TextMetrics> => {
  const metrics: TextMetrics = {
    correctness: 0,
    clarity: 0,
    engagement: 0,
    delivery: 0
  };

  if (!text || text.trim().length === 0) {
    return metrics;
  }

  const cleanText = text.replace(/<[^>]*>/g, '');
  if (cleanText.trim().length === 0) {
    return metrics;
  }

  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);

  if (words.length === 0 || sentences.length === 0) {
    return metrics;
  }

  // Calculate scores
  metrics.correctness = calculateCorrectnessScore(words, sentences);
  metrics.clarity = calculateClarityScore(cleanText, words, sentences);
  metrics.engagement = calculateEngagementScore(words);
  metrics.delivery = calculateDeliveryScore(cleanText);

  return metrics;
};

// Enhanced scoring functions
const calculateSpellingScore = (words: string[]): number => {
  const potentialMisspellings = words.filter(word => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    return cleanWord.length > 0 && 
           !commonWords.has(cleanWord) && 
           !commonWords.has(cleanWord + 's') &&
           !commonWords.has(cleanWord + 'ed') &&
           !commonWords.has(cleanWord + 'ing');
  });

  return Math.max(0, 100 - (potentialMisspellings.length / words.length * 100));
};

const calculateGrammarScore = (text: string, sentences: string[]): number => {
  let issues = 0;
  
  // Check for common grammar issues
  const grammarPatterns = [
    /\s+[.,!?]/, // Space before punctuation
    /[^\s]\s+[^\s]{1}\s+/, // Isolated single letters
    /\s+'/,  // Space before apostrophe
    /\s\s+/, // Multiple spaces
    /\bi\b(?!['])/i, // Uncapitalized 'I'
    /\b(am|is|are|was|were)\s+\w+ing\b/i, // Potential passive voice
    /\b(their|there|they're|your|you're|its|it's|whose|who's)\b/i, // Common confusables
  ];

  issues = grammarPatterns.reduce((count, pattern) => {
    return count + (text.match(pattern)?.length || 0);
  }, 0);

  // Sentence structure checks
  sentences.forEach(sentence => {
    if (sentence.trim().length < 3) issues++;
    if (sentence.trim().length > 250) issues++;
    if (!/^[A-Z]/.test(sentence.trim())) issues++;
  });

  return Math.max(0, 100 - (issues / sentences.length * 25));
};

const calculatePunctuationScore = (text: string): number => {
  const punctuation = [',', ';', ':', '!', '?', '-', '(', '"', '.'];
  const textLength = text.length;
  
  // Check for balanced punctuation
  const quotes = (text.match(/"/g) || []).length;
  const parentheses = (text.match(/\(/g) || []).length === (text.match(/\)/g) || []).length;
  
  const punctuationCount = punctuation.reduce((count, punct) => {
    return count + (text.match(new RegExp(`\\${punct}`, 'g'))?.length || 0);
  }, 0);

  const balancedScore = (quotes % 2 === 0 && parentheses) ? 100 : 80;
  const densityScore = Math.min(100, (punctuationCount / (textLength / 100)) * 15);
  
  return Math.round((balancedScore + densityScore) / 2);
};

// Helper functions remain the same
const analyzeTextComplexity = (text: string): number => {
  const words = text.split(/\s+/);
  const complexWords = words.filter(word => 
    word.length > 6 || 
    word.match(/ing$|ed$|tion$|ment$|ness$|ity$/)
  );
  return (complexWords.length / words.length) * 100;
};

const analyzeSentenceVariety = (sentences: string[]): number => {
  if (sentences.length < 2) return 50;

  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / lengths.length;
  return Math.min(100, variance * 5);
};

const countTransitionWords = (text: string): number => {
  const transitionWords = [
    'however', 'therefore', 'furthermore', 'moreover', 'nevertheless',
    'although', 'consequently', 'meanwhile', 'afterward', 'finally',
    'thus', 'hence', 'accordingly', 'subsequently', 'conversely'
  ];
  
  const wordCount = text.toLowerCase().split(/\s+/).length;
  const transitionCount = transitionWords.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    return count + (text.match(regex)?.length || 0);
  }, 0);

  return Math.min(100, (transitionCount / wordCount) * 500);
};

const analyzePunctuationVariety = (text: string): number => {
  const punctuation = [',', ';', ':', '!', '?', '-', '(', '"'];
  const textLength = text.length;
  
  const punctuationCount = punctuation.reduce((count, punct) => {
    return count + (text.match(new RegExp(`\\${punct}`, 'g'))?.length || 0);
  }, 0);

  return Math.min(100, (punctuationCount / (textLength / 100)) * 10);
};

// Add these missing calculation functions
const calculateCorrectnessScore = (words: string[], sentences: string[]): number => {
  const spellingScore = calculateSpellingScore(words);
  const grammarScore = calculateGrammarScore(sentences.join(' '), sentences);
  const punctuationScore = calculatePunctuationScore(sentences.join(' '));
  
  return Math.round(
    spellingScore * 0.4 + 
    grammarScore * 0.4 + 
    punctuationScore * 0.2
  );
};

const calculateClarityScore = (text: string, words: string[], sentences: string[]): number => {
  const complexity = analyzeTextComplexity(text);
  const variety = analyzeSentenceVariety(sentences);
  const structure = countTransitionWords(text);
  
  return Math.round(
    (100 - complexity) * 0.4 + 
    variety * 0.3 + 
    structure * 0.3
  );
};

const calculateEngagementScore = (words: string[]): number => {
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
  const wordVariety = (uniqueWords / words.length) * 100;
  const sentenceStarters = countTransitionWords(words.join(' '));
  
  return Math.round(
    wordVariety * 0.6 + 
    sentenceStarters * 0.4
  );
};

const calculateDeliveryScore = (text: string): number => {
  const punctuationVariety = analyzePunctuationVariety(text);
  const transitionScore = countTransitionWords(text);
  
  return Math.round(
    punctuationVariety * 0.5 + 
    transitionScore * 0.5
  );
};