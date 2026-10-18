import { authed, json, parseJson } from "@/server/http";
import { importStyleGuideSchema } from "@/shared/schemas";
import { parseStyleGuideText } from "@/shared/checks/style-rules";

/** Parses a pasted or uploaded guide into structured rules for review. Nothing is saved until PUT /api/style-guide. */
export const POST = authed(async ({ req }) => {
  const { text } = await parseJson(req, importStyleGuideSchema);
  return json(parseStyleGuideText(text));
});
