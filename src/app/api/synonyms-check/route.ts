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

interface SynonymsRequests {
  word: string;
  language?: string;
  _id?: string;
}

export async function POST(req: Request) {
  try {
    const body: SynonymsRequests = await req.json().catch(() => ({ word: "" }));
    const { word, language = "English", _id } = body;

    const authCheck = await requireAuthOrDemo(req, _id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;

    if (!word || !word.trim()) {
      return NextResponse.json({ error: "No content" }, { status: 400 });
    }

    const cacheKey = buildCacheKey("synonyms-check", userId, language, word);
    const cached = promptCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const rate = await enforceRateLimit(limiter, `synonyms:${userId}`);
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

    const promptSynonyms = `As a language expert, provide synonyms for the word "${word}" in ${language}. Requirements:
1. Return exactly 5 synonyms
2. Only include words that match the original word's part of speech and context
3. Order from most common to least common
4. Format response as a comma-separated list
5. Ensure each synonym can be used as a direct replacement
6. Do not include any explanations or additional text`;

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: promptSynonyms },
        { role: "user", content: word },
      ],
      model: GROQ_MODELS.FAST,
      temperature: 0.3,
    });

    if (!isDemo) {
      await User.findByIdAndUpdate(userId, { $inc: { prompts: 1 } });
    }

    const response = completion.choices[0]?.message?.content || "";
    const payload = { success: { words: response } };

    promptCache.set(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Synonyms check error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to find synonyms" },
      { status: 500 }
    );
  }
}
