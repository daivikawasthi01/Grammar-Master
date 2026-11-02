import { authed, json, parseJson } from "@/server/http";
import { putStyleGuideSchema } from "@/shared/schemas";
import { getStyleGuide, saveStyleGuide } from "@/server/services/style-guide";

export const GET = authed(async ({ user }) => json({ styleGuide: await getStyleGuide(user.id) }));

export const PUT = authed(async ({ req, user }) => {
  const input = await parseJson(req, putStyleGuideSchema);
  return json({ styleGuide: await saveStyleGuide(user.id, input) });
});
