import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import Groq from "groq-sdk";

interface GrammarCheckRequests {
  text: string;
  language: string;
  _id: string;
}

export async function POST(req: Request) {
  const { text, language, _id }: GrammarCheckRequests = await req.json();
  const groq = new Groq({
    apiKey: "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",
  });

  const promptGrammar: string = `You are a professional grammar and writing expert. Review the following text in ${language} and:
1. Fix any grammatical errors
2. Correct spelling mistakes
3. Improve punctuation where needed
4. Preserve all HTML formatting exactly as is
5. If no corrections are needed, return the exact same text
6. Focus only on grammar, spelling, and punctuation - do not change the writing style or tone`;

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
