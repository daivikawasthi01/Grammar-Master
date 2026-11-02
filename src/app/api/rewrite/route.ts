import { authed, parseJson } from "@/server/http";
import { rewriteRequestSchema } from "@/shared/schemas";
import { rewriteStream } from "@/server/services/ai";

export const POST = authed(
  async ({ req, user }) => {
    const input = await parseJson(req, rewriteRequestSchema);
    const stream = await rewriteStream({ userId: user.id, ...input, signal: req.signal });
    return new Response(stream, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
    });
  },
  { rateLimit: "ai" },
);
