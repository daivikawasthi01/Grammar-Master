import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import Groq from "groq-sdk";

interface ToneCheckRequests {
  text: string;
  targetTone: string;
  _id: string;
}

export async function POST(req: Request) {
  const { text, targetTone, _id }: ToneCheckRequests = await req.json();
  const groq = new Groq({
    apiKey: "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",
  });

  const promptTone: string = `You are a tone adjustment expert. Rewrite the following text to match a ${targetTone} tone while preserving all HTML formatting. Keep the core message but adjust the language and style to match the requested tone. Maintain all HTML tags exactly as they appear. Don't Tell me any suggestions just give the final Resulti`;

  const user = await User.findOne({ _id: _id });

  if (user.plan == "free") {
    if (user.prompts <= 1000) {
      if (text) {
        await User.findByIdAndUpdate(
          { _id: _id },
          { prompts: user.prompts + 1 }
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
          model: "llama-3.2-90b-text-preview",
        });

        const response = completion.choices[0]?.message?.content || text;
        return NextResponse.json({ success: { text: response } });
      } else {
        return NextResponse.json({ error: "No content" });
      }
    } else {
      return NextResponse.json({ error: "You used your free plan ai prompts" });
    }
  }
  if (user.plan == "premium") {
    if (user.prompts <= 10000) {
      if (text) {
        await User.findByIdAndUpdate(
          { _id: _id },
          { prompts: user.prompts + 1 }
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
          model: "llama-3.2-90b-text-preview",
        });

        const response = completion.choices[0]?.message?.content || text;
        return NextResponse.json({ success: { text: response } });
      } else {
        return NextResponse.json({ error: "No content" });
      }
    } else {
      return NextResponse.json({
        error: "You used your premium plan ai prompts",
      });
    }
  }
}
