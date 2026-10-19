"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InstantHit, WorkerRequest, WorkerResponse } from "@/workers/checks-protocol";
import type { StyleRule } from "@/shared/schemas";

const DEMO_RULES: StyleRule[] = [
  { id: "pg", preferred: "PostgreSQL", forbidden: ["Postgres"], caseSensitive: true },
  { id: "js", preferred: "JavaScript", forbidden: ["Javascript", "JS"], caseSensitive: true },
];

const START = "Teh team will make a decision about the the launch in order to ship on time. We definately use Postgres and Javascript.";

type Hit = InstantHit & { line: number; lineStart: number };

/** The landing page demo: the real in-browser checker (same Web Worker as the editor), no account and no network. */
export function LiveDemo() {
  const [text, setText] = useState(START);
  const [hits, setHits] = useState<Hit[]>([]);
  const [ms, setMs] = useState<number | null>(null);
  const worker = useRef<Worker | null>(null);
  const seq = useRef(0);
  const overlay = useRef<HTMLDivElement>(null);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    const w = new Worker(new URL("../../workers/checks.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "ready") {
        seq.current++;
        const lines = textRef.current.split("\n");
        w.postMessage({ type: "check", requestId: seq.current, blocks: lines.map((t, index) => ({ index, text: t })) } satisfies WorkerRequest);
        return;
      }
      if (msg.requestId !== seq.current) return;
      setMs(msg.ms);
      let offset = 0;
      const lines = textRef.current.split("\n");
      const starts = lines.map((l) => {
        const s = offset;
        offset += l.length + 1;
        return s;
      });
      setHits(msg.blocks.flatMap((b) => b.hits.map((h) => ({ ...h, line: b.index, lineStart: starts[b.index] ?? 0 }))));
    };
    w.postMessage({ type: "config", rules: DEMO_RULES, ignoredWords: [], dictionaryBase: "/dictionaries" } satisfies WorkerRequest);
    return () => w.terminate();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      seq.current++;
      worker.current?.postMessage({ type: "check", requestId: seq.current, blocks: text.split("\n").map((t, index) => ({ index, text: t })) } satisfies WorkerRequest);
    }, 120);
    return () => clearTimeout(t);
  }, [text]);

  const segments = useMemo(() => {
    const abs = hits.map((h) => ({ ...h, a: h.lineStart + h.from, b: h.lineStart + h.to })).sort((x, y) => x.a - y.a);
    const out: Array<{ t: string; hit?: (typeof abs)[number] }> = [];
    let i = 0;
    for (const h of abs) {
      if (h.a < i) continue;
      out.push({ t: text.slice(i, h.a) });
      out.push({ t: text.slice(h.a, h.b), hit: h });
      i = h.b;
    }
    out.push({ t: text.slice(i) + "\n" });
    return out;
  }, [hits, text]);

  function apply(h: Hit) {
    const a = h.lineStart + h.from;
    const b = h.lineStart + h.to;
    if (text.slice(a, b) !== h.original) return;
    setText(text.slice(0, a) + (h.replacements[0] ?? "") + text.slice(b));
  }

  const font = "font-serif text-[19px] leading-[1.75]";
  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-2.5 text-[13px] text-muted-foreground">
        <span>Try it: edit the text. These are the editor’s own checks, running in your browser.</span>
        <span className="shrink-0 tabular-nums">{ms === null ? "Loading dictionary…" : `${Math.max(1, Math.round(ms))} ms`}</span>
      </div>
      <div className="grid md:grid-cols-[1fr_17rem]">
        <div className="relative px-5 py-5 sm:px-6">
          <div ref={overlay} aria-hidden className={`pointer-events-none absolute inset-x-5 inset-y-5 overflow-hidden break-words whitespace-pre-wrap text-transparent sm:inset-x-6 ${font}`}>
            {segments.map((s, i) =>
              s.hit ? (
                <span key={i} className={`sg sg-${s.hit.category}`}>
                  {s.t}
                </span>
              ) : (
                <span key={i}>{s.t}</span>
              ),
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onScroll={(e) => {
              if (overlay.current) overlay.current.scrollTop = e.currentTarget.scrollTop;
            }}
            spellCheck={false}
            aria-label="Demo text"
            rows={5}
            className={`relative block w-full resize-none bg-transparent caret-foreground outline-none ${font}`}
          />
        </div>
        <div className="border-t md:border-t-0 md:border-l">
          <p className="border-b px-4 py-2.5 text-[13px] text-muted-foreground">
            {hits.length ? `${hits.length} suggestion${hits.length === 1 ? "" : "s"}` : ms === null ? "Checking…" : "No suggestions"}
          </p>
          <ul aria-live="polite" className="divide-y">
            {hits.slice(0, 6).map((h) => (
              <li key={`${h.line}:${h.from}:${h.original}`}>
                <button onClick={() => apply(h)} className="group flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-muted/60">
                  <span aria-hidden className={`mt-[7px] size-1.5 shrink-0 rounded-full ${MARK[h.category] ?? "bg-sg-correctness"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-muted-foreground">{h.title}</span>
                    <span className="mt-0.5 block">
                      <span className="text-muted-foreground line-through decoration-1">{h.original}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">{h.replacements[0] || "remove"}</span>
                    </span>
                  </span>
                  <span className="mt-[18px] text-[13px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">Apply</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const MARK: Record<string, string> = {
  correctness: "bg-sg-correctness",
  spelling: "bg-sg-correctness",
  clarity: "bg-sg-clarity",
  style: "bg-sg-style",
  engagement: "bg-sg-engagement",
  delivery: "bg-sg-engagement",
};
