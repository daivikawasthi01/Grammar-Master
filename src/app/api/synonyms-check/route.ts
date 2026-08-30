export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import Groq from "groq-sdk";
import {
  normalizePlan,
  getPromptLimit,
  PromptCache,
  buildCacheKey,
  enforceRateLimit,
  getRouteLimiter,
} from "@/lib/free-plan";

const limiter = getRouteLimiter(20, 60 * 1000);
const promptCache = new PromptCache<any>(60 * 1000);

interface TextCheckRequests {
  word: string;
  language: string;
  _id: string;
}

export async function POST(req: Request) {
  const { word, language, _id }: TextCheckRequests = await req.json();
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const promptSynonyms: string = `As a language expert, provide synonyms for the word "${word}" in ${language}. Requirements:
1. Return exactly 5 synonyms
2. Only include words that match the original word's part of speech and context
3. Order from most common to least common
4. Format response as a comma-separated list
5. Ensure each synonym can be used as a direct replacement
6. Do not include any explanations or additional text`;

  const user = await User.findOne({ _id: _id });
  const plan = normalizePlan(user?.plan);
  const limit = getPromptLimit(plan);
  const cacheKey = buildCacheKey('synonyms-check', _id, language, word);
  const cached = promptCache.get(cacheKey);

  if (cached) {
    return NextResponse.json(cached);
  }

  const rate = await enforceRateLimit(limiter, `synonyms:${_id}`);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  if (plan === "free") {
    if ((user?.prompts ?? 0) < limit) {
      if (word) {
        await User.findByIdAndUpdate(
          { _id: _id },
          { prompts: (user?.prompts ?? 0) + 1 }
        );
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: promptSynonyms,
            },
            {
              role: "user",
              content: word,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.3,
        });

        const response = completion.choices[0]?.message?.content || "";
        const payload = { success: { words: response } };
        promptCache.set(cacheKey, payload);
        return NextResponse.json(payload);
      } else {
        return NextResponse.json({ error: "No content" });
      }
    } else {
      return NextResponse.json({ error: "You have used your free plan AI prompt limit." });
    }
  }

  return NextResponse.json({ error: "This app is free-only." });
}
