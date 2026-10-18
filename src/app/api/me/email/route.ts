import { authed, json, parseJson } from "@/server/http";
import { changeEmailSchema } from "@/shared/schemas";
import { changeEmail } from "@/server/services/users";
import { enforceRateLimit } from "@/server/rate-limit";

export const POST = authed(async ({ req, user }) => {
  await enforceRateLimit("password", `password:${user.id}`);
  const { currentPassword, email } = await parseJson(req, changeEmailSchema);
  return json({ user: await changeEmail(user.id, currentPassword, email) });
});
