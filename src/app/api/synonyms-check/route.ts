import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import Groq from "groq-sdk";

interface TextCheckRequests {
  word: string;
  language: string;
  _id: string;
}

export async function POST(req: Request) {
  const { word, language, _id }: TextCheckRequests = await req.json();
  const groq = new Groq({
    apiKey: "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",
  });

  const promptSynonyms: string = `As a language expert, provide synonyms for the word "${word}" in ${language}. Requirements:
1. Return exactly 5 synonyms
2. Only include words that match the original word's part of speech and context
3. Order from most common to least common
4. Format response as a comma-separated list
5. Ensure each synonym can be used as a direct replacement
6. Do not include any explanations or additional text`;

  const user = await User.findOne({ _id: _id });

  if (user.plan == "free") {
    if (user.prompts <= 1000) {
      if (word) {
        await User.findByIdAndUpdate(
          { _id: _id },
          { prompts: user.prompts + 1 }
        );
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: promptSynonyms,
            },
            {
              role: "user",
              content: word,
            },
          ],
          model: "llama-3.2-90b-text-preview",
          temperature: 0.3, // Lower temperature for more focused synonym generation
        });

        const response = completion.choices[0]?.message?.content || "";
        return NextResponse.json({ success: { words: response } });
      } else {
        return NextResponse.json({ error: "No content" });
      }
    } else {
      return NextResponse.json({ error: "You used your free plan ai prompts" });
    }
  }
  if (user.plan == "premiun") {
    if (user.prompts <= 10000) {
      if (word) {
        await User.findByIdAndUpdate(
          { _id: _id },
          { prompts: user.prompts + 1 }
        );
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: promptSynonyms,
            },
            {
              role: "user",
              content: word,
            },
          ],
          model: "llama-3.2-90b-text-preview",
          temperature: 0.3, // Lower temperature for more focused synonym generation
        });

        const response = completion.choices[0]?.message?.content || "";

        return NextResponse.json({ success: { words: response } });
      } else {
        return NextResponse.json({ error: "No content" });
      }
    } else {
      return NextResponse.json({
        error: "You used your premium plan ai prompts",
      });
    }
  }
  if (user.plan == "buisness") {
    if (user.prompts <= 20000) {
      if (word) {
        await User.findByIdAndUpdate(
          { _id: _id },
          { prompts: user.prompts + 1 }
        );
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: promptSynonyms,
            },
            {
              role: "user",
              content: word,
            },
          ],
          model: "llama-3.2-90b-text-preview",
          temperature: 0.3, // Lower temperature for more focused synonym generation
        });

        const response = completion.choices[0]?.message?.content || "";

        return NextResponse.json({ success: { words: response } });
      } else {
        return NextResponse.json({ error: "No content" });
      }
    } else {
      return NextResponse.json({
        error: "You used your buisness plan ai prompts",
      });
    }
  }
}
