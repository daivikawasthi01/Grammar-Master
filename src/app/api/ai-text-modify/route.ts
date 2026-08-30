export const dynamic = "force-dynamic";

import "@/lib/polyfill";
import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import dbConnect from "@/lib/mongodb";
import Groq from "groq-sdk";

interface TextModifyRequest {
  text: string;
  action: string;
  customPrompt?: string;
  _id?: string;
}

export async function POST(req: Request) {
  try {
    const { text, action, customPrompt, _id } = (await req.json()) as TextModifyRequest;

    if (!text?.trim() || !action) {
      return NextResponse.json({ error: "Missing required text or action" }, { status: 400 });
    }

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
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are an expert Grammarly AI writing assistant. Return ONLY the final modified text without quotes, introductory remarks, or explanations.",
            },
            { role: "user", content: prompt },
          ],
          model: "openai/gpt-oss-120b",
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

    if (_id && _id !== "demo123") {
      try {
        await dbConnect();
        await User.findByIdAndUpdate(_id, { $inc: { prompts: 1 } });
      } catch (e) {
        // non-blocking
      }
    }

    return NextResponse.json({
      success: {
        text: modifiedText,
        action,
      },
    });
  } catch (error: any) {
    console.error("AI text modification error:", error);
    return NextResponse.json({ error: "Failed to modify text" }, { status: 500 });
  }
}