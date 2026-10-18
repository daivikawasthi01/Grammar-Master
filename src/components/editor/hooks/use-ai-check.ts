"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useQueryClient } from "@tanstack/react-query";
import { rangeIn, replaceSource, textBlocks, type Suggestion, type TextBlock } from "../extensions/suggestions";
import { api, ApiError } from "@/lib/api";
import { keys } from "@/hooks/queries";
import type { CheckResponse, Edit, Language } from "@/shared/schemas";
import { MAX_PARAGRAPH_CHARS } from "@/shared/schemas";

export type AiStatus =
  | { state: "idle" }
  | { state: "checking"; pending: number }
  | { state: "error"; code: ApiError["code"]; message: string; resetAt?: string };

const MIN_WORDS = 4;
const DEBOUNCE_MS = 800;
const MAX_CONCURRENT = 2;

const words = (s: string) => s.match(/\S+/g)?.length ?? 0;

/**
 * Paragraph-level AI check. After a pause, only paragraphs whose text has not been
 * checked yet are sent. Each paragraph has at most one request in flight: typing
 * again aborts it, and a response is applied only if the paragraph still has
 * exactly the text that was checked.
 */
export function useAiCheck(editor: Editor | null, opts: { documentId: string; language: Language; enabled: boolean }) {
  const qc = useQueryClient();
  const results = useRef(new Map<string, Edit[]>()); // paragraph text -> edits
  const inflight = useRef(new Map<number, { text: string; controller: AbortController }>());
  const queue = useRef<TextBlock[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const seq = useRef(0);
  const [status, setStatus] = useState<AiStatus>({ state: "idle" });
  const blocked = useRef<{ until: number } | null>(null);
  const pumpRef = useRef<() => void>(() => {});

  const paint = useCallback(
    (block: TextBlock, edits: Edit[]) => {
      if (!editor || editor.isDestroyed) return;
      const node = editor.state.doc.nodeAt(block.pos);
      if (!node) return;
      const list: Suggestion[] = [];
      edits.forEach((e, i) => {
        const range = rangeIn(block, e.original, e.occurrence);
        if (!range) return;
        list.push({
          id: `ai:${block.index}:${i}:${e.original}`,
          source: "ai",
          ...range,
          original: e.original,
          replacements: [e.replacement],
          category: e.category,
          title: e.category === "correctness" ? "Correctness" : e.category === "clarity" ? "Clarity" : e.category === "engagement" ? "Engagement" : "Delivery",
          message: e.reason,
        });
      });
      replaceSource(editor, "ai", list, [[block.pos, block.pos + node.nodeSize]]);
    },
    [editor],
  );

  const pump = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    while (inflight.current.size < MAX_CONCURRENT && queue.current.length) {
      const block = queue.current.shift()!;
      const controller = new AbortController();
      inflight.current.set(block.index, { text: block.text, controller });
      setStatus({ state: "checking", pending: inflight.current.size + queue.current.length });
      const requestId = `${++seq.current}`;
      api<CheckResponse>("/api/check", {
        method: "POST",
        body: { documentId: opts.documentId, blockId: String(block.index), requestId, text: block.text, language: opts.language },
        signal: controller.signal,
      })
        .then((res) => {
          results.current.set(block.text, res.edits);
          // Ignore stale: apply only if the paragraph still holds exactly this text.
          const current = textBlocks(editor.state.doc)[block.index];
          if (current && current.text === block.text) paint(current, res.edits);
          if (!res.meta.cached) qc.invalidateQueries({ queryKey: keys.me });
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.code === "ABORTED") return;
          if (err instanceof ApiError && (err.code === "QUOTA_EXCEEDED" || err.code === "RATE_LIMITED")) {
            const resetAt = err.details?.resetAt as string | undefined;
            blocked.current = { until: resetAt ? new Date(resetAt).getTime() : Date.now() + 60_000 };
            queue.current = [];
            setStatus({ state: "error", code: err.code, message: err.message, resetAt });
            return;
          }
          if (err instanceof ApiError) setStatus({ state: "error", code: err.code, message: err.message });
        })
        .finally(() => {
          if (inflight.current.get(block.index)?.controller === controller) inflight.current.delete(block.index);
          if (!inflight.current.size && !queue.current.length) setStatus((s) => (s.state === "checking" ? { state: "idle" } : s));
          pumpRef.current();
        });
    }
  }, [editor, opts.documentId, opts.language, paint, qc]);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const schedule = useCallback(
    (all = false) => {
      if (!editor || editor.isDestroyed || !opts.enabled) return;
      if (blocked.current && Date.now() < blocked.current.until) return;
      blocked.current = null;
      const blocks = textBlocks(editor.state.doc);
      const { from } = editor.state.selection;
      const next: TextBlock[] = [];
      for (const b of blocks) {
        const text = b.text.trim();
        if (words(text) < MIN_WORDS || b.text.length > MAX_PARAGRAPH_CHARS) continue;
        const cached = results.current.get(b.text);
        if (cached) {
          paint(b, cached);
          continue;
        }
        const running = inflight.current.get(b.index);
        if (running?.text === b.text) continue;
        running?.controller.abort(); // this paragraph changed: the old answer is useless
        // Typing mode: only paragraphs the caret has left or that end a sentence, so we don't check half-words.
        const node = editor.state.doc.nodeAt(b.pos);
        const caretInside = node ? from > b.pos && from < b.pos + node.nodeSize : false;
        if (!all && caretInside && !/[.!?…]["”’)]?\s*$/.test(text)) continue;
        next.push(b);
      }
      // Paragraph near the caret first.
      next.sort((a, b) => Math.abs(a.pos - from) - Math.abs(b.pos - from));
      queue.current = next;
      if (next.length) pump();
    },
    [editor, opts.enabled, paint, pump],
  );

  useEffect(() => {
    if (!editor) return;
    const onTx = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (!transaction.docChanged) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => schedule(false), DEBOUNCE_MS);
    };
    const onBlur = () => schedule(false);
    editor.on("transaction", onTx);
    editor.on("blur", onBlur);
    return () => {
      editor.off("transaction", onTx);
      editor.off("blur", onBlur);
      clearTimeout(timer.current);
    };
  }, [editor, schedule]);

  useEffect(() => {
    const inflightMap = inflight.current;
    return () => inflightMap.forEach(({ controller }) => controller.abort());
  }, []);

  const pendingParagraphs = useCallback(() => {
    if (!editor) return 0;
    return textBlocks(editor.state.doc).filter((b) => words(b.text) >= MIN_WORDS && b.text.length <= MAX_PARAGRAPH_CHARS && !results.current.has(b.text)).length;
  }, [editor]);

  return { status, checkAll: () => schedule(true), pendingParagraphs, dismissError: () => setStatus({ state: "idle" }) };
}
