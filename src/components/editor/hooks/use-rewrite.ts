"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useQueryClient } from "@tanstack/react-query";
import { apiStream, ApiError, errorMessage } from "@/lib/api";
import { keys } from "@/hooks/queries";
import { applyRules, droppedProtected } from "@/shared/checks/style-rules";
import type { Language, RewriteAction as AnyAction, StyleRule } from "@/shared/schemas";

type RewriteAction = Exclude<AnyAction, "translate">;

export type RewriteState =
  | { status: "idle" }
  | { status: "streaming" | "done"; action: RewriteAction; original: string; text: string; dropped?: string[]; from: number; to: number }
  | { status: "error"; action: RewriteAction; original: string; message: string; code?: string; from: number; to: number };

/**
 * Streams a rewrite of the selection into a preview. The selected range is mapped
 * through every edit made meanwhile, and accepting replaces only that range, in
 * one undoable step. Nothing outside the selection is touched.
 */
export function useRewrite(editor: Editor | null, language: Language, rules: StyleRule[] = []) {
  const qc = useQueryClient();
  const [state, setState] = useState<RewriteState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const range = useRef<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const onTx = ({ transaction }: { transaction: { docChanged: boolean; mapping: { map: (p: number, a?: number) => number } } }) => {
      if (!transaction.docChanged || !range.current) return;
      range.current = { from: transaction.mapping.map(range.current.from, 1), to: transaction.mapping.map(range.current.to, -1) };
    };
    editor.on("transaction", onTx);
    return () => {
      editor.off("transaction", onTx);
    };
  }, [editor]);

  const start = useCallback(
    async (action: RewriteAction) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      const original = editor.state.doc.textBetween(from, to, "\n\n", "\n");
      if (!original.trim()) return;
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      range.current = { from, to };
      setState({ status: "streaming", action, original, text: "", from, to });
      let text = "";
      try {
        for await (const chunk of apiStream("/api/rewrite", { method: "POST", body: { text: original, action, language }, signal: ctrl.signal })) {
          text += chunk;
          setState((s) => (s.status === "streaming" ? { ...s, text } : s));
        }
        // Code, not the model, keeps the writer's rules: replace rules are applied to the result, and a result that lost a protected word can't be accepted.
        const final = applyRules(rules, text.trim());
        const dropped = droppedProtected(rules, original, final);
        setState((s) => (s.status === "streaming" ? { ...s, status: "done", text: final, dropped } : s));
        qc.invalidateQueries({ queryKey: keys.me });
      } catch (err) {
        if (err instanceof ApiError && err.code === "ABORTED") return;
        setState({ status: "error", action, original, message: errorMessage(err), code: err instanceof ApiError ? err.code : undefined, from, to });
      }
    },
    [editor, language, qc, rules],
  );

  const cancel = useCallback(() => {
    controller.current?.abort();
    range.current = null;
    setState({ status: "idle" });
    editor?.commands.focus();
  }, [editor]);

  const accept = useCallback(() => {
    if (!editor || state.status !== "done" || state.dropped?.length || !range.current) return false;
    const { from, to } = range.current;
    // Refuse if the selected text itself was edited while the rewrite streamed.
    if (editor.state.doc.textBetween(from, to, "\n\n", "\n") !== state.original) {
      setState({ ...state, status: "error", message: "The selected text changed while the rewrite was running. Select it again." });
      return false;
    }
    const paragraphs = state.text.split(/\n{2,}/).filter(Boolean);
    const content = paragraphs.length > 1 ? paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })) : state.text;
    editor.chain().focus().insertContentAt({ from, to }, content).run();
    range.current = null;
    setState({ status: "idle" });
    return true;
  }, [editor, state]);

  return { state, start, cancel, accept };
}
