export const dynamic = "force-dynamic";

import "@/lib/polyfill";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";

interface AnalyzeRequest {
  text: string;
  language?: string;
  _id?: string;
}

export interface SuggestionItem {
  id: string;
  category: "correctness" | "clarity" | "engagement" | "delivery";
  title: string;
  description: string;
  originalText: string;
  replacementText: string;
  explanation: string;
}

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
  { pattern: /\b(\w+)\s+\1\b/gi, category: "correctness", title: "Repeated Word", replacement: "$1", explanation: "Remove duplicate word." }
];

function runRuleBasedAnalysis(text: string): SuggestionItem[] {
  const suggestions: SuggestionItem[] = [];
  let count = 1;

  for (const rule of COMMON_REPLACEMENTS) {
    const matches = Array.from(text.matchAll(rule.pattern));
    for (const match of matches) {
      const matchStr = match[0];
      const replacement = matchStr.replace(rule.pattern, rule.replacement);
      suggestions.push({
        id: `rule-${count++}`,
        category: rule.category,
        title: rule.title,
        description: `Consider replacing "${matchStr}" with "${replacement}".`,
        originalText: matchStr,
        replacementText: replacement,
        explanation: rule.explanation,
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

  const avgWordsPerSentence = wordCount / sentenceCount;
  const readingTimeMin = Math.ceil(wordCount / 200);
  const speakingTimeMin = Math.ceil(wordCount / 130);

  // Simplified Flesch Reading Ease approximation
  const readabilityScore = Math.max(
    20,
    Math.min(100, Math.round(206.835 - 1.015 * avgWordsPerSentence - 15))
  );

  let readabilityGrade = "Standard";
  if (readabilityScore > 80) readabilityGrade = "Easy to read";
  else if (readabilityScore > 60) readabilityGrade = "Standard";
  else if (readabilityScore > 40) readabilityGrade = "Fairly Difficult";
  else readabilityGrade = "Advanced / Complex";

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
  const tones: ToneItem[] = [];

  const formalKeywords = ["therefore", "furthermore", "however", "consequently", "regarding", "sincerely", "regards"];
  const confidentKeywords = ["definitely", "certainly", "will", "guarantee", "proven", "confident", "surely"];
  const friendlyKeywords = ["thanks", "welcome", "please", "happy", "great", "excited", "friendly", "glad"];

  const formalCount = formalKeywords.filter((k) => lower.includes(k)).length;
  const confidentCount = confidentKeywords.filter((k) => lower.includes(k)).length;
  const friendlyCount = friendlyKeywords.filter((k) => lower.includes(k)).length;

  tones.push({ name: "Formal", score: Math.min(95, 60 + formalCount * 10), color: "#2563EB" });
  tones.push({ name: "Confident", score: Math.min(90, 55 + confidentCount * 10), color: "#059669" });
  tones.push({ name: "Friendly", score: Math.min(85, 50 + friendlyCount * 10), color: "#D97706" });

  return tones;
}

export async function POST(req: Request) {
  try {
    const { text, language = "American English", _id }: AnalyzeRequest = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({
        overallScore: 100,
        metrics: computeMetrics(""),
        tones: [],
        categories: { correctness: 0, clarity: 0, engagement: 0, delivery: 0 },
        suggestions: [],
      });
    }

    const metrics = computeMetrics(text);
    const tones = computeTones(text);
    let suggestions: SuggestionItem[] = runRuleBasedAnalysis(text);

    // AI-powered deep analysis if API key is present
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const systemPrompt = `You are Grammarly AI. Analyze the text in ${language} and provide structured suggestions in JSON format.
Return ONLY valid JSON with a "suggestions" array. Each suggestion item must have:
- "category": one of ["correctness", "clarity", "engagement", "delivery"]
- "title": short title (e.g., "Grammar", "Spelling", "Conciseness", "Tone")
- "description": brief summary
- "originalText": exact substring from text to replace
- "replacementText": suggested replacement
- "explanation": reason for suggestion

Example output:
{
  "suggestions": [
    {
      "category": "correctness",
      "title": "Grammar",
      "description": "Fix subject-verb agreement",
      "originalText": "they is",
      "replacementText": "they are",
      "explanation": "Use plural verb 'are' with 'they'."
    }
  ]
}`;

        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
            const aiSuggestions: SuggestionItem[] = parsed.suggestions.map((item: any, idx: number) => ({
              id: `ai-${idx + 1}`,
              category: ["correctness", "clarity", "engagement", "delivery"].includes(item.category)
                ? item.category
                : "correctness",
              title: item.title || "Improvement",
              description: item.description || "Suggested edit",
              originalText: item.originalText || "",
              replacementText: item.replacementText || "",
              explanation: item.explanation || "",
            }));

            // Merge AI suggestions with rule-based ones without exact duplicates
            const existingKeys = new Set(suggestions.map((s) => `${s.originalText}->${s.replacementText}`));
            for (const aiSug of aiSuggestions) {
              if (aiSug.originalText && !existingKeys.has(`${aiSug.originalText}->${aiSug.replacementText}`)) {
                suggestions.push(aiSug);
              }
            }
          }
        }
      } catch (err) {
        console.error("Groq AI analysis fallback to rule-based engine:", err);
      }
    }

    // Count categories
    const categories = {
      correctness: suggestions.filter((s) => s.category === "correctness").length,
      clarity: suggestions.filter((s) => s.category === "clarity").length,
      engagement: suggestions.filter((s) => s.category === "engagement").length,
      delivery: suggestions.filter((s) => s.category === "delivery").length,
    };

    const totalIssues = suggestions.length;
    const overallScore = Math.max(45, Math.min(100, 100 - totalIssues * 6));

    // Update document score in DB if _id is provided
    if (_id && _id !== "demo123") {
      try {
        await dbConnect();
        await User.updateOne(
          { "documents._id": _id },
          { $set: { "documents.$.version": Date.now(), "documents.$.lastSaved": new Date() } }
        );
      } catch (e) {
        // non-blocking db update
      }
    }

    return NextResponse.json({
      overallScore,
      metrics,
      tones,
      categories,
      suggestions,
    });
  } catch (error: any) {
    console.error("Document analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze document" },
      { status: 500 }
    );
  }
}
