import { authed, json, parseJson } from "@/server/http";
import { toneRequestSchema } from "@/shared/schemas";
import { detectTone } from "@/server/services/ai";

export const POST = authed(
  async ({ req, user }) => {
    const { text } = await parseJson(req, toneRequestSchema);
    return json({ tone: await detectTone({ userId: user.id, text }) });
  },
  { rateLimit: "ai" },
);
