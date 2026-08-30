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

interface ToneCheckRequests {
  text: string;
  targetTone: string;
  _id: string;
}

export async function POST(req: Request) {
  const { text, targetTone, _id }: ToneCheckRequests = await req.json();
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const promptTone: string = `You are a tone adjustment expert. Rewrite the following text to match a ${targetTone} tone while preserving all HTML formatting. Keep the core message but adjust the language and style to match the requested tone. Maintain all HTML tags exactly as they appear. Don't Tell me any suggestions just give the final Resulti`;

  const user = await User.findOne({ _id: _id });
  const plan = normalizePlan(user?.plan);
  const limit = getPromptLimit(plan);
  const cacheKey = buildCacheKey('tone-check', _id, targetTone, text);
  const cached = promptCache.get(cacheKey);

  if (cached) {
    return NextResponse.json(cached);
  }

  const rate = await enforceRateLimit(limiter, `tone:${_id}`);

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
              content: promptTone,
            },
            {
              role: "user",
              content: text,
            },
          ],
          model: "openai/gpt-oss-120b",
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
