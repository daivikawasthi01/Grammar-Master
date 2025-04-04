import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import Groq from "groq-sdk";

interface TextCheckRequests {
  text: string;
  language: string;
  _id: string;
}

export async function POST(req: Request) {
  const { text, language, _id }: TextCheckRequests = await req.json();
  const groq = new Groq({
    apiKey: "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",
  });

  const promptTranslate: string = `Translate the following text to ${language}. Requirements:
1. Maintain the exact meaning and tone
2. Preserve all HTML formatting and tags
3. Ensure natural, fluent translation
4. Keep proper nouns and technical terms unchanged unless they have official translations
5. Return only the translated text without explanations
6. Maintain document structure and formatting`;

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
              content: promptTranslate,
            },
            {
              role: "user",
              content: text,
            },
          ],
          model: "llama-3.2-90b-text-preview",
          temperature: 0.2, // Lower temperature for more accurate translations
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
              content: promptTranslate,
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
