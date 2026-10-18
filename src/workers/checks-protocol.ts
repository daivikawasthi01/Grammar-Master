import type { StyleRule } from "@/shared/schemas";
import type { SuggestionCategory } from "@/components/editor/extensions/suggestions";

export type InstantHit = {
  kind: "spelling" | "rule" | "style";
  from: number; // offsets within the block text
  to: number;
  original: string;
  replacements: string[];
  category: SuggestionCategory;
  title: string;
  message: string;
};

export type CheckBlockResult = { index: number; text: string; hits: InstantHit[] };

export type WorkerRequest =
  | { type: "config"; rules: StyleRule[]; ignoredWords: string[]; dictionaryBase: string }
  | { type: "check"; requestId: number; blocks: { index: number; text: string }[] };

export type WorkerResponse = { type: "ready"; spelling: boolean } | { type: "result"; requestId: number; blocks: CheckBlockResult[]; ms: number };
