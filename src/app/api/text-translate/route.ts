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

  const promptTranslate: string = `Translate the following text to ${language}. Requirements:
1. Maintain the exact meaning and tone
2. Preserve all HTML formatting and tags
3. Ensure natural, fluent translation
4. Keep proper nouns and technical terms unchanged unless they have official translations
5. Return only the translated text without explanations
6. Maintain document structure and formatting`;

  const user = await User.findOne({ _id: _id });
  const plan = normalizePlan(user?.plan);
  const limit = getPromptLimit(plan);
  const cacheKey = buildCacheKey('text-translate', _id, language, text);
  const cached = promptCache.get(cacheKey);

  if (cached) {
    return NextResponse.json(cached);
  }

  const rate = await enforceRateLimit(limiter, `translate:${_id}`);

  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  if (plan === "free") {
    if ((user?.prompts ?? 0) < limit) {
      if (text) {
        await User.findByIdAndUpdate(
          { _id: _id },
          { prompts: (user?.prompts ?? 0) + 1 }
        );
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: promptTranslate,
            },
            {
              role: "user",
              content: text,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.2,
        });

        const response = completion.choices[0]?.message?.content || text;
        const payload = { success: { text: response } };
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
