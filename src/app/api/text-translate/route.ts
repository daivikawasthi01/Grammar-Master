export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { GROQ_MODELS, getGroqClient } from "@/lib/ai-config";
import { requireAuthOrDemo } from "@/lib/api-auth";
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

interface TextTranslateRequests {
  text: string;
  language: string;
  _id?: string;
}

export async function POST(req: Request) {
  try {
    const body: TextTranslateRequests = await req.json().catch(() => ({ text: "", language: "Spanish" }));
    const { text, language = "Spanish", _id } = body;

    const authCheck = await requireAuthOrDemo(req, _id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "No content" }, { status: 400 });
    }

    const cacheKey = buildCacheKey("text-translate", userId, language, text);
    const cached = promptCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const rate = await enforceRateLimit(limiter, `translate:${userId}`);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    let promptsUsed = 0;
    let plan = authUser.plan || "free";

    if (!isDemo) {
      await dbConnect();
      const dbUser = await User.findById(userId);
      if (dbUser) {
        plan = normalizePlan(dbUser.plan);
        promptsUsed = dbUser.prompts || 0;
      }
    }

    const normalizedPlan = normalizePlan(plan);
    const limit = getPromptLimit(normalizedPlan);

    if (promptsUsed >= limit) {
      return NextResponse.json({
        error: "You have used your free plan AI prompt limit.",
      });
    }

    const promptTranslate = `Translate the following text to ${language}. Requirements:
1. Maintain the exact meaning and tone
2. Preserve all HTML formatting and tags
3. Ensure natural, fluent translation
4. Keep proper nouns and technical terms unchanged unless they have official translations
5. Return only the translated text without explanations
6. Maintain document structure and formatting`;

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: promptTranslate },
        { role: "user", content: text },
      ],
      model: GROQ_MODELS.PRIMARY,
      temperature: 0.2,
    });

    if (!isDemo) {
      await User.findByIdAndUpdate(userId, { $inc: { prompts: 1 } });
    }

    const response = completion.choices[0]?.message?.content || text;
    const payload = { success: { text: response } };

    promptCache.set(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to translate text" },
      { status: 500 }
    );
  }
}
