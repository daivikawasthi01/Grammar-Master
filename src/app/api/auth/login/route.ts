import { json, parseJson, publicRoute } from "@/server/http";
import { loginSchema } from "@/shared/schemas";
import { clientIp, enforceRateLimit } from "@/server/rate-limit";
import { authenticate } from "@/server/services/users";
import { setSessionCookie, startSession } from "@/server/auth/session";

export const POST = publicRoute(async ({ req, log }) => {
  const input = await parseJson(req, loginSchema);
  // Limit per IP and per account, so neither spraying one password nor hammering one account works.
  await enforceRateLimit("login", `ip:${clientIp(req)}`);
  await enforceRateLimit("login", `email:${input.email}`);
  const user = await authenticate(input.email, input.password);
  const session = await startSession(user.id, req);
  log.info({ userId: user.id }, "user signed in");
  return setSessionCookie(json({ user }), session);
});
