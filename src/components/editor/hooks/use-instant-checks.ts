"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { replaceSource, textBlocks, type Suggestion } from "../extensions/suggestions";
import type { WorkerRequest, WorkerResponse } from "@/workers/checks-protocol";
import type { StyleRule } from "@/shared/schemas";

const IGNORE_KEY = "gm:dictionary";

export function readIgnoredWords(): string[] {
  try {
    return JSON.parse(localStorage.getItem(IGNORE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeIgnoredWords(words: string[]) {
  try {
    localStorage.setItem(IGNORE_KEY, JSON.stringify([...new Set(words)].slice(-2000)));
  } catch {
    /* storage unavailable: the word is ignored for this session only */
  }
}

/** Spelling, phrase rules and style-guide terms, computed in a Web Worker on every pause in typing. */
export function useInstantChecks(editor: Editor | null, rules: StyleRule[]) {
  const worker = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [ready, setReady] = useState(false);
  const [lastMs, setLastMs] = useState<number | null>(null);
  // The editor only mounts client-side (after the document loads), so reading storage here is safe.
  const [ignored, setIgnored] = useState<string[]>(() => (typeof window === "undefined" ? [] : readIgnoredWords()));

  const run = useCallback(() => {
    if (!editor || !worker.current || editor.isDestroyed) return;
    const blocks = textBlocks(editor.state.doc).map(({ index, text }) => ({ index, text }));
    worker.current.postMessage({ type: "check", requestId: ++requestId.current, blocks } satisfies WorkerRequest);
  }, [editor]);

  useEffect(() => {
    const w = new Worker(new URL("../../../workers/checks.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "ready") {
        setReady(true);
        return;
      }
      // Ignore stale results: only the newest request may paint underlines.
      if (msg.requestId !== requestId.current || !editor || editor.isDestroyed) return;
      setLastMs(msg.ms);
      const current = textBlocks(editor.state.doc);
      const list: Suggestion[] = [];
      for (const r of msg.blocks) {
        const block = current[r.index];
        if (!block || block.text !== r.text) continue; // block changed since the request
        r.hits.forEach((h, i) =>
          list.push({
            id: `${h.kind}:${r.index}:${h.from}:${i}:${h.original}`,
            source: h.kind,
            from: block.pos + 1 + h.from,
            to: block.pos + 1 + h.to,
            original: h.original,
            replacements: h.replacements,
            category: h.category,
            title: h.title,
            message: h.message,
          }),
        );
      }
      replaceSource(editor, "spelling", list.filter((s) => s.source === "spelling"));
      replaceSource(editor, "rule", list.filter((s) => s.source === "rule"));
      replaceSource(editor, "style", list.filter((s) => s.source === "style"));
    };
    return () => {
      w.terminate();
      worker.current = null;
      setReady(false);
    };
  }, [editor]);

  useEffect(() => {
    worker.current?.postMessage({ type: "config", rules, ignoredWords: ignored, dictionaryBase: "/dictionaries" } satisfies WorkerRequest);
    run();
  }, [rules, ignored, run, ready]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (!transaction.docChanged) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(run, 250);
    };
    editor.on("transaction", onUpdate);
    return () => {
      editor.off("transaction", onUpdate);
      clearTimeout(timer.current);
    };
  }, [editor, run]);

  const addToDictionary = useCallback((word: string) => {
    const next = [...readIgnoredWords(), word];
    writeIgnoredWords(next);
    setIgnored(next);
  }, []);

  return { ready, lastMs, addToDictionary };
}
