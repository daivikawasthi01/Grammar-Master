import { json, publicRoute } from "@/server/http";
import { endSession, getSessionUser } from "@/server/auth/session";

// Public so a stale cookie can always be cleared; the session row is deleted when it exists.
export const POST = publicRoute(async ({ req }) => {
  const user = await getSessionUser(req).catch(() => null);
  return endSession(json({ ok: true }), user?.sessionId);
});
