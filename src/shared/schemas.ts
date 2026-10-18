import { z } from "zod";

/** Request schemas shared by the API (validation) and the forms (react-hook-form resolver). */

export const MAX_TEXT_CHARS = 20_000;
export const MAX_PARAGRAPH_CHARS = 4_000;
export const MAX_SELECTION_CHARS = 6_000;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_EXTENSIONS = [".docx", ".txt", ".md"] as const;

export const LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-AU", label: "English (Australia)" },
] as const;
export const languageSchema = z.enum(["en-US", "en-GB", "en-CA", "en-AU"]);
export type Language = z.infer<typeof languageSchema>;

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(254));
const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use at most 128 characters");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email,
  password,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    language: languageSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(128),
  newPassword: password,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(128),
  email,
});
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

/** TipTap JSON. Validated structurally (a doc node) and by size; the editor schema does the rest. */
export const tiptapDocSchema = z.looseObject({
  type: z.literal("doc"),
  content: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().max(200).optional(),
  content: tiptapDocSchema.optional(),
  language: languageSchema.optional(),
});

export const updateDocumentSchema = z
  .object({
    baseVersion: z.number().int().positive(),
    title: z.string().trim().max(200).optional(),
    content: tiptapDocSchema.optional(),
    language: languageSchema.optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined || v.language !== undefined, "Nothing to update");
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export const listDocumentsSchema = z.object({
  status: z.enum(["active", "trashed"]).default("active"),
  q: z.string().trim().max(200).optional(),
});

export const styleRuleSchema = z.object({
  id: z.string().min(1).max(64),
  preferred: z.string().trim().min(1).max(100),
  forbidden: z.array(z.string().trim().min(1).max(100)).max(20),
  caseSensitive: z.boolean().default(true),
  note: z.string().trim().max(300).optional(),
});
export type StyleRule = z.infer<typeof styleRuleSchema>;

export const putStyleGuideSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  rules: z.array(styleRuleSchema).max(500),
});

export const importStyleGuideSchema = z.object({
  text: z.string().max(100_000),
});

export const checkRequestSchema = z.object({
  documentId: z.string().max(64).optional(),
  blockId: z.string().max(64).optional(),
  requestId: z.string().max(64).optional(),
  text: z.string().min(1, "Nothing to check").max(MAX_PARAGRAPH_CHARS, "Paragraph is too long to check"),
  language: languageSchema.default("en-US"),
});
export type CheckRequest = z.infer<typeof checkRequestSchema>;

export const EDIT_CATEGORIES = ["correctness", "clarity", "engagement", "delivery"] as const;
export type EditCategory = (typeof EDIT_CATEGORIES)[number];

export type Edit = {
  original: string;
  replacement: string;
  category: EditCategory;
  reason: string;
  occurrence: number;
};

export type CheckResponse = {
  requestId?: string;
  edits: Edit[];
  meta: { model: string; promptVersion: string; cached: boolean; usage: { promptTokens: number | null; completionTokens: number | null } };
};

export const REWRITE_ACTIONS = ["improve", "concise", "formal", "friendly", "confident", "expand", "simplify"] as const;
export type RewriteAction = (typeof REWRITE_ACTIONS)[number];

export const rewriteRequestSchema = z.object({
  text: z.string().trim().min(1, "Select some text").max(MAX_SELECTION_CHARS, "Selection is too long"),
  action: z.enum(REWRITE_ACTIONS),
  language: languageSchema.default("en-US"),
});
export type RewriteRequest = z.infer<typeof rewriteRequestSchema>;

export const toneRequestSchema = z.object({
  text: z.string().trim().min(20, "Write a little more first").max(MAX_TEXT_CHARS),
});
export type ToneResponse = { tone: string; confidence: "low" | "medium" | "high"; explanation: string };
