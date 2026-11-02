import { authed, json, parseJson } from "@/server/http";
import { compileStyleGuideSchema } from "@/shared/schemas";
import { compileGuide } from "@/server/services/guide-compile";

/**
 * Turns pasted or typed guide text into rules with one LLM call, for the writer to review.
 * Nothing is saved until PUT /api/style-guide.
 */
export const POST = authed(
  async ({ req, user }) => {
    const { text, rules } = await parseJson(req, compileStyleGuideSchema);
    return json(await compileGuide(user.id, text, rules));
  },
  { rateLimit: "ai" },
);
