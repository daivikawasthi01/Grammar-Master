export const dynamic = "force-dynamic";

import "@/lib/polyfill";
import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import { GROQ_MODELS, getGroqClient } from "@/lib/ai-config";
import { requireAuthOrDemo } from "@/lib/api-auth";
import { normalizePlan, getPromptLimit } from "@/lib/free-plan";
import { retrieveRelevantRules, buildStyleRAGPrompt } from "@/lib/rag-style";

interface TextModifyRequest {
  text: string;
  action: string;
  customPrompt?: string;
  _id?: string;
}

export async function POST(req: Request) {
  try {
    const { text, action, customPrompt, _id } = (await req.json().catch(() => ({}))) as TextModifyRequest;

    if (!text?.trim() || !action) {
      return NextResponse.json({ error: "Missing required text or action" }, { status: 400 });
    }

    const authCheck = await requireAuthOrDemo(req, _id);
    if ("response" in authCheck) {
      return authCheck.response;
    }

    const { user: authUser, isDemo } = authCheck.auth;
    const userId = authUser.id;

    let plan = authUser.plan || "free";
    let promptsUsed = 0;

    if (!isDemo) {
      await dbConnect();
      const dbUser = await User.findById(userId);
      if (dbUser) {
        plan = normalizePlan(dbUser.plan);
        promptsUsed = dbUser.prompts || 0;
      }
    }

    const limit = getPromptLimit(normalizePlan(plan));
    if (promptsUsed >= limit) {
      return NextResponse.json({
        error: "You have used your free plan AI prompt limit.",
      });
    }

    // Retrieve relevant custom style rules via RAG
    const relevantRules = await retrieveRelevantRules(text, userId, 3);
    const ragStylePrompt = buildStyleRAGPrompt(relevantRules);

    let prompt = "";
    switch (action) {
      case "improve":
      case "fix_all":
        prompt = `Fix all grammar, spelling, punctuation, and improve flow of this text while preserving meaning: "${text}"`;
        break;
      case "shorten":
      case "simplify":
        prompt = `Make this text concise, clear, and direct while preserving core points: "${text}"`;
        break;
      case "expand":
        prompt = `Elaborate on this text with more details and descriptive language: "${text}"`;
        break;
      case "professional":
      case "formal":
        prompt = `Rewrite this text in a clear, executive, professional tone: "${text}"`;
        break;
      case "casual":
      case "friendly":
        prompt = `Rewrite this text in a warm, approachable, conversational tone: "${text}"`;
        break;
      case "make_persuasive":
        prompt = `Make this text compelling, persuasive, and impact-driven: "${text}"`;
        break;
      case "summarize":
        prompt = `Provide a concise 2-sentence summary of this text: "${text}"`;
        break;
      case "custom":
        prompt = `${customPrompt || "Improve"}: "${text}"`;
        break;
      default:
        prompt = `Improve the clarity and flow of this text: "${text}"`;
    }

    let modifiedText = text;

    if (process.env.GROQ_API_KEY) {
      try {
        const groq = getGroqClient();
        const baseSystemPrompt =
          "You are an expert Grammarly AI writing assistant. Return ONLY the final modified text without quotes, introductory remarks, or explanations.";
        const fullSystemPrompt = ragStylePrompt
          ? `${baseSystemPrompt}\n\n${ragStylePrompt}`
          : baseSystemPrompt;

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: fullSystemPrompt,
            },
            { role: "user", content: prompt },
          ],
          model: GROQ_MODELS.PRIMARY,
          temperature: 0.5,
          max_tokens: 1024,
        });

        modifiedText = completion.choices[0]?.message?.content?.trim() || text;
      } catch (err) {
        console.error("Groq AI API error in text modify:", err);
      }
    } else {
      // Fallback heuristics when API key is missing
      if (action === "shorten" || action === "simplify") {
        modifiedText = text.replace(/\bdue to the fact that\b/gi, "because").replace(/\bin order to\b/gi, "to");
      } else if (action === "fix_all") {
        modifiedText = text.replace(/\bteh\b/gi, "the").replace(/\bdefinately\b/gi, "definitely");
      }
    }

    if (!isDemo) {
      try {
        await User.findByIdAndUpdate(userId, { $inc: { prompts: 1 } });
      } catch (e) {
        // non-blocking
      }
    }

    return NextResponse.json({
      success: {
        text: modifiedText,
        action,
        appliedRules: relevantRules,
      },
    });
  } catch (error: any) {
    console.error("AI text modification error:", error);
    return NextResponse.json({ error: "Failed to modify text" }, { status: 500 });
  }
}