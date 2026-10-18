import type { PMNode } from "@/shared/tiptap-text";
import type { StyleRule } from "@/shared/schemas";

export type User = { id: string; email: string; name: string; language: string; createdAt: string };
export type Usage = { used: number; limit: number; period: string; resetAt: string };

export type DocumentSummary = {
  id: string;
  title: string;
  snippet: string;
  wordCount: number;
  language: string;
  status: "active" | "trashed";
  version: number;
  updatedAt: string;
  deletedAt: string | null;
};
export type DocumentDetail = DocumentSummary & { content: PMNode };

export type StyleGuide = { name: string; rules: StyleRule[]; updatedAt: string | null };
