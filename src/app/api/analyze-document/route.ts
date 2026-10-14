export const dynamic = "force-dynamic";

import "@/lib/polyfill";
import { NextResponse } from "next/server";
import { GROQ_MODELS, getGroqClient } from "@/lib/ai-config";
import { requireAuthOrDemo } from "@/lib/api-auth";
import {
  getLexicalStyleRules,
  buildStyleRAGPrompt,
  extractStyleRuleSuggestions,
  StyleSuggestionItem,
} from "@/lib/rag-style";

interface AnalyzeRequest {
  text: string;
  language?: string;
  _id?: string;
  documentId?: string;
  requestId?: string;
}

export type SuggestionItem = StyleSuggestionItem;

export interface ToneItem {
  name: string;
  score: number;
  color: string;
}

const COMMON_REPLACEMENTS: Array<{
  pattern: RegExp;
  category: "correctness" | "clarity" | "engagement" | "delivery";
  title: string;
  replacement: string;
  explanation: string;
}> = [
  { pattern: /\bteh\b/gi, category: "correctness", title: "Typo", replacement: "the", explanation: "'teh' is a common typo for 'the'." },
  { pattern: /\bdefinately\b/gi, category: "correctness", title: "Spelling", replacement: "definitely", explanation: "Correct spelling is 'definitely'." },
  { pattern: /\brecieve\b/gi, category: "correctness", title: "Spelling", replacement: "receive", explanation: "'i' before 'e' except after 'c'." },
  { pattern: /\bseperate\b/gi, category: "correctness", title: "Spelling", replacement: "separate", explanation: "Correct spelling is 'separate'." },
  { pattern: /\birregardless\b/gi, category: "clarity", title: "Word Choice", replacement: "regardless", explanation: "'Regardless' is preferred in formal writing." },
  { pattern: /\bdue to the fact that\b/gi, category: "clarity", title: "Conciseness", replacement: "because", explanation: "'because' is more concise." },
  { pattern: /\bin order to\b/gi, category: "clarity", title: "Conciseness", replacement: "to", explanation: "'to' is shorter and clearer." },
  { pattern: /\bat this point in time\b/gi, category: "clarity", title: "Conciseness", replacement: "now", explanation: "'now' is more direct." },
  { pattern: /\bfor the purpose of\b/gi, category: "clarity", title: "Conciseness", replacement: "to", explanation: "Simplify phrase to 'to'." },
  { pattern: /\bmake a decision\b/gi, category: "clarity", title: "Strong Verbs", replacement: "decide", explanation: "Use the active verb 'decide'." },
  { pattern: /\butilize\b/gi, category: "engagement", title: "Vocabulary", replacement: "use", explanation: "'use' is simpler and more engaging." },
  { pattern: /\bvery unique\b/gi, category: "engagement", title: "Word Choice", replacement: "unique", explanation: "'Unique' is absolute and does not need 'very'." },
  { pattern: /\breally good\b/gi, category: "engagement", title: "Vocabulary", replacement: "excellent", explanation: "Use a stronger adjective like 'excellent'." },
  { pattern: /\b(\w+)\s+\1\b/gi, category: "correctness", title: "Repeated Word", replacement: "$1", explanation: "Remove duplicate word." },
];

function runRuleBasedAnalysis(text: string): SuggestionItem[] {
  const suggestions: SuggestionItem[] = [];
  let count = 1;

  for (const rule of COMMON_REPLACEMENTS) {
    const matches = Array.from(text.matchAll(rule.pattern));
    for (const match of matches) {
      const matchStr = match[0];
      const startIndex = match.index ?? -1;
      const endIndex = startIndex !== -1 ? startIndex + matchStr.length : undefined;
      const replacement = matchStr.replace(rule.pattern, rule.replacement);

      suggestions.push({
        id: `rule-${Date.now()}-${count++}-${Math.random().toString(36).substring(2, 6)}`,
        category: rule.category,
        title: rule.title,
        description: `Consider replacing "${matchStr}" with "${replacement}".`,
        originalText: matchStr,
        replacementText: replacement,
        explanation: rule.explanation,
        startIndex: startIndex !== -1 ? startIndex : undefined,
        endIndex,
      });
    }
  }

  return suggestions;
}

function computeMetrics(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      wordCount: 0,
      charCount: 0,
      sentenceCount: 0,
      readingTimeMin: 0,
      speakingTimeMin: 0,
      readabilityScore: 100,
      readabilityGrade: "Very Easy",
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = text.length;
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 225));
  const speakingTimeMin = Math.max(1, Math.ceil(wordCount / 140));

  // Compute syllables for real Flesch-Kincaid
  let syllableCount = 0;
  for (const word of words) {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (w.length <= 3) {
      syllableCount += 1;
      continue;
    }
    const syllables = w.replace(/(?:[^laeiouy]|ed|es|e)$/, "")
      .replace(/^y/, "")
      .match(/[aeiouy]{1,2}/g);
    syllableCount += syllables ? syllables.length : 1;
  }

  // Flesch Reading Ease: 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  const asl = wordCount / sentenceCount;
  const asw = syllableCount / Math.max(1, wordCount);
  const rawScore = 206.835 - (1.015 * asl) - (84.6 * asw);
  const readabilityScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let readabilityGrade = "Grade 8-9";
  if (readabilityScore >= 90) readabilityGrade = "Very Easy";
  else if (readabilityScore >= 80) readabilityGrade = "Easy";
  else if (readabilityScore >= 70) readabilityGrade = "Fairly Easy";
  else if (readabilityScore >= 60) readabilityGrade = "Standard";
  else if (readabilityScore >= 50) readabilityGrade = "Fairly Difficult";
  else if (readabilityScore >= 30) readabilityGrade = "Difficult";
  else readabilityGrade = "Very Difficult";

  return {
    wordCount,
    charCount,
    sentenceCount,
    readingTimeMin,
    speakingTimeMin,
    readabilityScore,
    readabilityGrade,
  };
}

function computeTones(text: string): ToneItem[] {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const totalWords = Math.max(1, words.length);

  const formalKeywords = [
    "therefore", "furthermore", "however", "consequently", "regarding",
    "sincerely", "regards", "moreover", "subsequently", "accordingly",
    "demonstrates", "indicates", "established", "further", "perspective"
  ];
  const confidentKeywords = [
    "definitely", "certainly", "will", "guarantee", "proven", "confident",
    "surely", "clearly", "conclude", "decisive", "undoubtedly", "essential"
  ];
  const friendlyKeywords = [
    "thanks", "welcome", "please", "happy", "great", "excited", "friendly",
    "glad", "appreciate", "warmly", "cheers", "helpful", "delighted"
  ];

  const formalMatches = formalKeywords.reduce((count, k) => count + (lower.split(k).length - 1), 0);
  const confidentMatches = confidentKeywords.reduce((count, k) => count + (lower.split(k).length - 1), 0);
  const friendlyMatches = friendlyKeywords.reduce((count, k) => count + (lower.split(k).length - 1), 0);

  const formalDensity = (formalMatches / totalWords) * 100;
  const confidentDensity = (confidentMatches / totalWords) * 100;
  const friendlyDensity = (friendlyMatches / totalWords) * 100;

  const formalScore = Math.min(95, Math.max(20, Math.round(30 + formalDensity * 15)));
  const confidentScore = Math.min(95, Math.max(20, Math.round(25 + confidentDensity * 14)));
  const friendlyScore = Math.min(95, Math.max(20, Math.round(20 + friendlyDensity * 15)));

  return [
    { name: "Formal", score: formalScore, color: "#2563EB" },
    { name: "Confident", score: confidentScore, color: "#059669" },
    { name: "Friendly", score: friendlyScore, color: "#D97706" },
  ];
}

const editsSchema = {
  type: "object",
  properties: {
    edits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          replacement: { type: "string" },
          category: {
            type: "string",
            enum: ["correctness", "clarity", "engagement", "delivery"],
          },
          reason: { type: "string" },
          occurrence: { type: "integer" },
        },
        required: ["original", "replacement", "category", "reason", "occurrence"],
        additionalProperties: false,
      },
    },
  },
  required: ["edits"],
  additionalProperties: false,
};

export async function POST(req: Request) {
  try {
    const { text, language = "American English", _id, requestId }: AnalyzeRequest =
      await req.json().catch(() => ({ text: "" }));

    const authCheck = await requireAuthOrDemo(req, _id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser } = authCheck.auth;
    const userId = authUser.id;

    if (!text || !text.trim()) {
      return NextResponse.json({
        requestId,
        overallScore: 100,
        metrics: computeMetrics(""),
        tones: [],
        categories: { correctness: 0, clarity: 0, engagement: 0, delivery: 0 },
        suggestions: [],
      });
    }

    const metrics = computeMetrics(text);
    const tones = computeTones(text);

    // 1. Fast lexical style rules retrieval (zero embedding latency on hot path)
    const styleRules = await getLexicalStyleRules(userId);
    const styleSuggestions = extractStyleRuleSuggestions(text, styleRules);

    // 2. Rule-based static grammar checks
    const staticSuggestions = runRuleBasedAnalysis(text);

    let suggestions: SuggestionItem[] = [...styleSuggestions, ...staticSuggestions];
    let aiStatus: "ok" | "unavailable" = "ok";

    // 3. AI-powered check with Groq FAST model & strict schema
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = getGroqClient();
        const styleRAGPrompt = buildStyleRAGPrompt(styleRules);

        const systemPrompt = `You are Grammar Master AI, an advanced writing assistant. Analyze the text in ${language} and provide minimal, precise edits.
${styleRAGPrompt}
Return JSON conforming strictly to the requested schema. Do not rewrite sentences unless there is an error.
Only propose edits where original is the exact substring to replace.`;

        const completion = await groq.chat.completions.create({
          model: GROQ_MODELS.FAST,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.1,
          max_completion_tokens: 2048,
          // @ts-ignore
          reasoning_effort: "low",
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "edits",
              strict: true,
              schema: editsSchema,
            },
          } as any,
        } as any);

        const rawContent = completion.choices[0]?.message?.content;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          if (Array.isArray(parsed.edits)) {
            // Keep only edits whose original text really exists in the document
            const validEdits = parsed.edits.filter(
              (e: any) =>
                e.original &&
                e.original !== e.replacement &&
                text.includes(e.original)
            );

            const aiSuggestions: SuggestionItem[] = validEdits.map((item: any, idx: number) => {
              const orig = item.original;
              let sIndex: number | undefined = undefined;
              let eIndex: number | undefined = undefined;

              const foundIdx = text.indexOf(orig);
              if (foundIdx !== -1) {
                sIndex = foundIdx;
                eIndex = foundIdx + orig.length;
              }

              return {
                id: `ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
                category: item.category || "correctness",
                title: item.category === "correctness" ? "Grammar" : "Style & Clarity",
                description: item.reason || `Replace with "${item.replacement}"`,
                originalText: orig,
                replacementText: item.replacement,
                explanation: item.reason || "",
                startIndex: sIndex,
                endIndex: eIndex,
              };
            });

            suggestions = [...suggestions, ...aiSuggestions];
          }
        }
      } catch (aiErr) {
        console.warn("Groq AI check unavailable, falling back to rule-based engine:", aiErr);
        aiStatus = "unavailable";
      }
    }

    // Deduplicate suggestions covering the exact same span/text
    const seenSpans = new Set<string>();
    const deduplicatedSuggestions: SuggestionItem[] = [];

    for (const sug of suggestions) {
      const key = `${sug.originalText.toLowerCase()}:${sug.replacementText.toLowerCase()}`;
      if (!seenSpans.has(key)) {
        seenSpans.add(key);
        deduplicatedSuggestions.push(sug);
      }
    }

    const categories = {
      correctness: deduplicatedSuggestions.filter((s) => s.category === "correctness").length,
      clarity: deduplicatedSuggestions.filter((s) => s.category === "clarity").length,
      engagement: deduplicatedSuggestions.filter((s) => s.category === "engagement").length,
      delivery: deduplicatedSuggestions.filter((s) => s.category === "delivery").length,
    };

    const overallScore = Math.max(40, Math.min(100, 100 - deduplicatedSuggestions.length * 6));

    return NextResponse.json({
      requestId,
      overallScore,
      metrics,
      tones,
      categories,
      suggestions: deduplicatedSuggestions,
      aiStatus,
    });
  } catch (error) {
    console.error("Analyze document top-level error:", error);
    return NextResponse.json(
      { error: "Failed to analyze document" },
      { status: 500 }
    );
  }
}
