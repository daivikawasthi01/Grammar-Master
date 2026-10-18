"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Zap } from "lucide-react";
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

  const font = "font-serif text-lg leading-[1.8] sm:text-xl";
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-primary/5">
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </span>
        <span className="ml-2">Try it, it is the real checker</span>
        <span className="ml-auto inline-flex items-center gap-1 tabular-nums">
          <Zap className="size-3.5 text-primary" /> {ms === null ? "loading dictionary…" : `${Math.max(1, Math.round(ms))} ms · no network`}
        </span>
      </div>
      <div className="grid md:grid-cols-[1fr_280px]">
        <div className="relative p-5 sm:p-6">
          <div ref={overlay} aria-hidden className={`pointer-events-none absolute inset-5 overflow-hidden break-words whitespace-pre-wrap text-transparent sm:inset-6 ${font}`}>
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
            className={`relative block w-full resize-none bg-transparent caret-primary outline-none ${font}`}
          />
        </div>
        <div className="border-t bg-muted/30 p-4 md:border-t-0 md:border-l">
          <p className="mb-3 text-xs font-medium text-muted-foreground">{hits.length ? `${hits.length} suggestion${hits.length === 1 ? "" : "s"}` : "All clear"}</p>
          <ul className="space-y-2" aria-live="polite">
            <AnimatePresence initial={false} mode="popLayout">
              {hits.slice(0, 6).map((h) => (
                <motion.li key={`${h.line}:${h.from}:${h.original}`} layout initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <button onClick={() => apply(h)} className="group w-full rounded-lg border bg-background p-2.5 text-left text-sm transition-colors hover:border-primary/40">
                    <span className="block text-[11px] text-muted-foreground">{h.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground line-through">{h.original}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium text-primary">{h.replacements[0] || "remove"}</span>
                      <Check className="ml-auto size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {!hits.length && ms !== null && (
            <div className="grid place-items-center py-6 text-center text-sm text-muted-foreground">
              <Check className="mb-2 size-6 text-primary" />
              Nothing to fix. Try typing a mistake.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
