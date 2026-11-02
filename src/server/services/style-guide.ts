import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/server/db";
import { StyleGuide } from "@/server/models/StyleGuide";
import type { StyleRule } from "@/shared/schemas";
import { compileRules, matchRules } from "@/shared/checks/style-rules";

export type StyleGuideDto = {
  name: string;
  rules: StyleRule[];
  guidanceNotes: string[];
  updatedAt: string | null;
};

export async function getStyleGuide(ownerId: string): Promise<StyleGuideDto> {
  await connectDb();
  const guide = await StyleGuide.findOne({
    ownerId: new Types.ObjectId(ownerId),
  }).lean();
  return {
    name: guide?.name ?? "My style guide",
    rules: (guide?.rules ?? []).map((r) => ({
      id: r.id,
      preferred: r.preferred,
      forbidden: r.forbidden ?? [],
      caseSensitive: r.caseSensitive ?? true,
      kind: r.kind ?? "replace",
      note: r.note ?? undefined,
    })),
    guidanceNotes: guide?.guidanceNotes ?? [],
    updatedAt: guide?.updatedAt
      ? new Date(guide.updatedAt).toISOString()
      : null,
  };
}

export async function saveStyleGuide(
  ownerId: string,
  input: { name?: string; rules: StyleRule[]; guidanceNotes?: string[] },
): Promise<StyleGuideDto> {
  await connectDb();
  // Duplicate ids would make accept/dismiss ambiguous in the editor.
  const seen = new Set<string>();
  const rules = input.rules.filter((r) => !seen.has(r.id) && seen.add(r.id));
  const guidanceNotes = [
    ...new Set(
      (input.guidanceNotes ?? []).map((n) => n.trim()).filter(Boolean),
    ),
  ];
  await StyleGuide.updateOne(
    { ownerId: new Types.ObjectId(ownerId) },
    {
      $set: {
        rules,
        guidanceNotes,
        ...(input.name ? { name: input.name } : {}),
      },
    },
    { upsert: true, runValidators: true },
  );
  return getStyleGuide(ownerId);
}

/** Only the rules that actually occur in the text go into the LLM prompt. */
export function rulesRelevantTo(rules: StyleRule[], text: string): string[] {
  if (!rules.length) return [];
  const hits = matchRules(compileRules(rules), text);
  const ids = new Set(hits.map((h) => h.ruleId));
  return rules
    .filter((r) => ids.has(r.id))
    .map(
      (r) =>
        `Use "${r.preferred}"${r.forbidden.length ? `, never ${r.forbidden.map((f) => `"${f}"`).join(" or ")}` : ""}.`,
    );
}
