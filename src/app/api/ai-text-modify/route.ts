import { NextResponse } from "next/server";
import User from "@/app/db/schema";
import Groq from "groq-sdk";

interface TextModifyRequest {
  text: string;
  action: string;
  customPrompt?: string;
  _id: string;
}

export async function POST(req: Request) {
  try {
    const { text, action, customPrompt, _id } = await req.json() as TextModifyRequest;
    
    if (!text?.trim() || !action) {
      return NextResponse.json({ error: "Missing required fields" });
    }

    const user = await User.findById(_id);
    if (!user) {
      return NextResponse.json({ error: "User not found" });
    }

    if (user.aiPrompts > 0) {
      const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
      });

      let prompt = "";
      switch (action) {
        case 'improve':
          prompt = `Improve the following text while maintaining its meaning and context: "${text}"`;
          break;
        case 'shorten':
          prompt = `Make this text more concise while keeping the main points: "${text}"`;
          break;
        case 'professional':
          prompt = `Rewrite this text in a professional tone: "${text}"`;
          break;
        case 'casual':
          prompt = `Rewrite this text in a casual, conversational tone: "${text}"`;
          break;
        case 'friendly':
          prompt = `Rewrite this text in a friendly, approachable tone: "${text}"`;
          break;
        case 'formal':
          prompt = `Rewrite this text in a formal tone: "${text}"`;
          break;
        case 'custom':
          prompt = `${customPrompt}: "${text}"`;
          break;
        default:
          return NextResponse.json({ error: "Invalid action" });
      }

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful writing assistant. Provide direct text modifications without explanations or additional context."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "mixtral-8x7b-32768",
        temperature: 0.7,
        max_tokens: 1024,
      });

      const modifiedText = completion.choices[0]?.message?.content;

      // Update user's AI prompts count
      await User.findByIdAndUpdate(_id, { $inc: { aiPrompts: -1 } });

      return NextResponse.json({ 
        success: { 
          text: modifiedText,
          remainingPrompts: user.aiPrompts - 1
        } 
      });
    } else {
      return NextResponse.json({
        error: "You have used all your AI prompts"
      });
    }
  } catch (error) {
    console.error('AI text modification error:', error);
    return NextResponse.json({ error: "Failed to process text" });
  }
} 