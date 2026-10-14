export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { GROQ_MODELS, getGroqClient } from "@/lib/ai-config";
import { z } from "zod";

const rewriteSchema = z.object({
  text: z.string().min(1, "Text selection required").max(10000, "Selection too long"),
  action: z.enum([
    "concise",
    "formal",
    "casual",
    "confident",
    "expand",
    "fix_grammar",
    "explain",
  ]),
  context: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json().catch(() => null);
    const parsed = rewriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid rewrite request" },
        { status: 400 }
      );
    }

    const { text, action, context } = parsed.data;

    let instruction = "";
    switch (action) {
      case "concise":
        instruction = "Make the text more concise and direct. Eliminate wordiness and fluff while retaining core meaning.";
        break;
      case "formal":
        instruction = "Rewrite the text in an authoritative, professional, and formal business tone.";
        break;
      case "casual":
        instruction = "Rewrite the text in a friendly, approachable, conversational tone.";
        break;
      case "confident":
        instruction = "Rewrite the text to sound confident, decisive, and persuasive, removing hedging phrases.";
        break;
      case "expand":
        instruction = "Elaborate and provide greater depth and clarity while preserving the original intent.";
        break;
      case "fix_grammar":
        instruction = "Fix all grammatical errors, typos, and punctuation issues with minimal necessary alteration.";
        break;
      case "explain":
        instruction = "Explain why this text might be confusing or awkward and suggest the best way to rephrase it.";
        break;
    }

    const groq = getGroqClient();

    const stream = await groq.chat.completions.create({
      model: GROQ_MODELS.PRIMARY,
      messages: [
        {
          role: "system",
          content: `You are Grammar Master AI writing assistant. ${instruction}
Return ONLY the rewritten text without markdown fences, quotes, or meta commentary unless specifically requested to explain.`,
        },
        ...(context ? [{ role: "user" as const, content: `Document context: ${context}` }] : []),
        { role: "user", content: text },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      stream: true,
    });

    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || "";
            if (token) {
              controller.enqueue(encoder.encode(token));
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(customReadable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Rewrite error:", error);
    return NextResponse.json(
      { error: "Failed to generate rewrite" },
      { status: 500 }
    );
  }
}
