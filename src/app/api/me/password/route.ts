import { authed, json, parseJson } from "@/server/http";
import { changePasswordSchema } from "@/shared/schemas";
import { changePassword } from "@/server/services/users";
import { enforceRateLimit } from "@/server/rate-limit";

export const POST = authed(async ({ req, user, log }) => {
  await enforceRateLimit("password", `password:${user.id}`);
  const { currentPassword, newPassword } = await parseJson(req, changePasswordSchema);
  await changePassword(user.id, currentPassword, newPassword, user.sessionId);
  log.info("password changed; other sessions revoked");
  return json({ ok: true });
});
