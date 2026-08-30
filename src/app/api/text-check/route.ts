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
  text: string;
  language: string;
  _id: string;
}

export async function POST(req: Request) {
  const { text, language, _id }: TextCheckRequests = await req.json();
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const promptGrammar: string = `You are a grammar checker. Analyze and correct the provided text in ${language}. Requirements:

1. Correct ALL errors found - including grammar, spelling, punctuation, and style
2. Format each correction as follows:
   - First show the incorrect text wrapped in <del>incorrect text</del>
   - Immediately follow it with <ins>correct text</ins>
   - Example: "<del>incorrect word</del><ins>correct word</ins>"
3. Preserve ALL HTML formatting and tags exactly as they appear
4. Do not include any explanations or comments
5. If the text is correct, return it unchanged
6. Be thorough - correct every error regardless of context
7. Return only the corrected text with del/ins tags - no other output
8. Always place <del> and <ins> tags next to each other for each correction`;

  const user = await User.findOne({ _id: _id });
  const plan = normalizePlan(user?.plan);
  const limit = getPromptLimit(plan);
  const cacheKey = buildCacheKey('text-check', _id, language, text);
  const cached = promptCache.get(cacheKey);

  if (cached) {
    return NextResponse.json(cached);
  }

  const rate = await enforceRateLimit(limiter, `text-check:${_id}`);

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
