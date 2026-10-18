import { z } from "zod";
import { authed, json, parseJson } from "@/server/http";
import { updateProfileSchema } from "@/shared/schemas";
import { deleteAccount, getUser, updateProfile } from "@/server/services/users";
import { getUsage } from "@/server/quota";
import { endSession } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/rate-limit";

export const GET = authed(async ({ user }) => {
  const [profile, usage] = await Promise.all([getUser(user.id), getUsage(user.id)]);
  return json({ user: profile, usage });
});

export const PATCH = authed(async ({ req, user }) => {
  const input = await parseJson(req, updateProfileSchema);
  return json({ user: await updateProfile(user.id, input) });
});

export const DELETE = authed(async ({ req, user, log }) => {
  await enforceRateLimit("password", `password:${user.id}`);
  const { currentPassword } = await parseJson(req, z.object({ currentPassword: z.string().min(1).max(128) }));
  await deleteAccount(user.id, currentPassword);
  log.info("account deleted");
  return endSession(json({ ok: true }));
});
