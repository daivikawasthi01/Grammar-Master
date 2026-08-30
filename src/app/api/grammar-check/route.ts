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

interface GrammarCheckRequests {
  text: string;
  language: string;
  _id: string;
}

export async function POST(req: Request) {
  const { text, language, _id }: GrammarCheckRequests = await req.json();
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const promptGrammar: string = `You are a professional grammar and writing expert. Review the following text in ${language} and:
1. Fix any grammatical errors
2. Correct spelling mistakes
3. Improve punctuation where needed
4. Preserve all HTML formatting exactly as is
5. If no corrections are needed, return the exact same text
6. Focus only on grammar, spelling, and punctuation - do not change the writing style or tone`;

  const user = await User.findOne({ _id: _id });
  const plan = normalizePlan(user?.plan);
  const limit = getPromptLimit(plan);
  const cacheKey = buildCacheKey('grammar-check', _id, language, text);
  const cached = promptCache.get(cacheKey);

  if (cached) {
    return NextResponse.json(cached);
  }

  const rate = await enforceRateLimit(limiter, `grammar:${_id}`);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  if (plan === "free") {
    if (user.prompts < limit) {
      if (text) {
        await User.findByIdAndUpdate(
          { _id: _id },
          { prompts: user.prompts + 1 }
        );
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: promptGrammar,
            },
            {
              role: "user",
              content: text,
            },
          ],
          model: "openai/gpt-oss-120b",
        });

        const response = completion.choices[0]?.message?.content || text;
        const payload = response === text
          ? { success: { correct: true, text: response } }
          : { success: { correct: false, text: response } };

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
