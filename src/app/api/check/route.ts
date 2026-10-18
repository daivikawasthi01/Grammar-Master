import { authed, json, parseJson } from "@/server/http";
import { checkRequestSchema } from "@/shared/schemas";
import { checkParagraph } from "@/server/services/ai";

export const POST = authed(
  async ({ req, user, log }) => {
    const input = await parseJson(req, checkRequestSchema);
    const isEval = process.env.NODE_ENV !== "production" && req.headers.get("x-eval-runner") === "true";
    const started = Date.now();
    const result = await checkParagraph({ userId: user.id, text: input.text, language: input.language, requestId: input.requestId, isEval });
    log.info({ ms: Date.now() - started, edits: result.edits.length, cached: result.meta.cached, chars: input.text.length }, "paragraph checked");
    return json(result);
  },
  // Eval runs send hundreds of sentences; they are dev-only and skip quota, so use the general limit there.
  { rateLimit: process.env.NODE_ENV === "production" ? "ai" : "api" },
);
