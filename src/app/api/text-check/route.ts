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

interface TextCheckRequests {
  text: string;
  language?: string;
  _id?: string;
}

export async function POST(req: Request) {
  try {
    const body: TextCheckRequests = await req.json().catch(() => ({ text: "" }));
    const { text, language = "English", _id } = body;

    const authCheck = await requireAuthOrDemo(req, _id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "No content" }, { status: 400 });
    }

    const cacheKey = buildCacheKey("text-check", userId, language, text);
    const cached = promptCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const rate = await enforceRateLimit(limiter, `text-check:${userId}`);
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

    const promptGrammar = `You are a grammar checker. Analyze and correct the provided text in ${language}. Requirements:

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

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: promptGrammar },
        { role: "user", content: text },
      ],
      model: GROQ_MODELS.PRIMARY,
    });

    if (!isDemo) {
      await User.findByIdAndUpdate(userId, { $inc: { prompts: 1 } });
    }

    const response = completion.choices[0]?.message?.content || text;
    const payload =
      response === text
        ? { success: { correct: true, text: response } }
        : { success: { correct: false, text: response } };

    promptCache.set(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Text check error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to check text" },
      { status: 500 }
    );
  }
}
