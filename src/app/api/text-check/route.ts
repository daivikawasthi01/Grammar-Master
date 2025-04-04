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

  const promptGrammar: string = `You are a grammar checker. Analyze and correct the provided text in ${language}. Requirements:

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
              content: promptGrammar,
            },
            {
              role: "user",
              content: text,
            },
          ],
          model: "llama-3.2-90b-text-preview",
        });

        const response = completion.choices[0]?.message?.content || text;

        if (response === text) {
          return NextResponse.json({
            success: { correct: true, text: response },
          });
        } else {
          return NextResponse.json({
            success: { correct: false, text: response },
          });
        }
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
              content: promptGrammar,
            },
            {
              role: "user",
              content: text,
            },
          ],
          model: "llama-3.2-90b-text-preview",
        });

        const response = completion.choices[0]?.message?.content || text;

        if (response === text) {
          return NextResponse.json({
            success: { correct: true, text: response },
          });
        } else {
          return NextResponse.json({
            success: { correct: false, text: response },
          });
        }
      } else {
        return NextResponse.json({ error: "No content" });
      }
    } else {
      return NextResponse.json({
        error: "You used your premium plan ai prompts",
      });
    }
  }
  if (user.plan == "business") {
    if (user.prompts <= 20000) {
      if (text) {
        await User.findByIdAndUpdate(
          { _id: _id },
          { prompts: user.prompts + 1 }
        );
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: promptGrammar,
            },
            {
              role: "user",
              content: text,
            },
          ],
          model: "llama-3.2-90b-text-preview",
        });

        const response = completion.choices[0]?.message?.content || text;

        if (response === text) {
          return NextResponse.json({
            success: { correct: true, text: response },
          });
        } else {
          return NextResponse.json({
            success: { correct: false, text: response },
          });
        }
      } else {
        return NextResponse.json({ error: "No content" });
      }
    } else {
      return NextResponse.json({
        error: "You used your business plan ai prompts",
      });
    }
  }
}
