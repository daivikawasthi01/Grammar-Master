import { json, parseJson, publicRoute } from "@/server/http";
import { registerSchema } from "@/shared/schemas";
import { clientIp, enforceRateLimit } from "@/server/rate-limit";
import { registerUser } from "@/server/services/users";
import { setSessionCookie, startSession } from "@/server/auth/session";

export const POST = publicRoute(async ({ req, log }) => {
  await enforceRateLimit("register", `ip:${clientIp(req)}`);
  const input = await parseJson(req, registerSchema);
  const user = await registerUser(input);
  const session = await startSession(user.id, req);
  log.info({ userId: user.id }, "user registered");
  return setSessionCookie(json({ user }, 201), session);
});
