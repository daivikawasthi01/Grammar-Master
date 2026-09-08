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

interface GrammarCheckRequests {
  text: string;
  language?: string;
  _id?: string;
}

export async function POST(req: Request) {
  try {
    const body: GrammarCheckRequests = await req.json().catch(() => ({ text: "" }));
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

    const cacheKey = buildCacheKey("grammar-check", userId, language, text);
    const cached = promptCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const rate = await enforceRateLimit(limiter, `grammar:${userId}`);
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

    const promptGrammar = `You are a professional grammar and writing expert. Review the following text in ${language} and:
1. Fix any grammatical errors
2. Correct spelling mistakes
3. Improve punctuation where needed
4. Preserve all HTML formatting exactly as is
5. If no corrections are needed, return the exact same text
6. Focus only on grammar, spelling, and punctuation - do not change the writing style or tone`;

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
    console.error("Grammar check error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process grammar check" },
      { status: 500 }
    );
  }
}
