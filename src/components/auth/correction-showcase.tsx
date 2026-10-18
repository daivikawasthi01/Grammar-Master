"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";

const SAMPLES = [
  { before: "Their going to recieve the report", fix: "They're going to receive the report", tag: "Spelling · Grammar" },
  { before: "We need to make a decision in order to ship", fix: "We need to decide to ship", tag: "Clarity" },
  { before: "Deploy the ebpf probe to postgres", fix: "Deploy the eBPF probe to PostgreSQL", tag: "Style guide" },
];

/** The right-hand panel on the auth screens: a sentence fixing itself, on a loop. */
export function CorrectionShowcase() {
  const [i, setI] = useState(0);
  const [fixed, setFixed] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFixed(true), 1600);
    const t2 = setTimeout(() => {
      setFixed(false);
      setI((n) => (n + 1) % SAMPLES.length);
    }, 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [i]);

  const s = SAMPLES[i];
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border bg-card p-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="relative">
        <p className="text-sm font-medium text-muted-foreground">Writing, but clearer</p>
        <h2 className="mt-2 max-w-sm font-serif text-3xl leading-tight tracking-tight">
          Instant checks in your browser. <em className="text-primary">Smarter</em> ones a moment later.
        </h2>
      </div>

      <div className="relative">
        <div className="rounded-xl border bg-background/80 p-5 shadow-sm backdrop-blur-sm">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            <AnimatePresence mode="wait">
              <motion.span key={s.tag} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                {s.tag}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="min-h-16 font-serif text-xl leading-relaxed">
            <AnimatePresence mode="wait">
              {fixed ? (
                <motion.p key={`f${i}`} initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                  {s.fix}
                </motion.p>
              ) : (
                <motion.p key={`b${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: "blur(4px)" }} transition={{ duration: 0.25 }}>
                  <span className="sg sg-correctness">{s.before}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <motion.div
            className="mt-4 flex items-center gap-2 text-sm"
            animate={{ opacity: fixed ? 1 : 0.35 }}
          >
            <span className={`grid size-5 place-items-center rounded-full transition-colors ${fixed ? "bg-emerald-500 text-white" : "bg-muted"}`}>
              <Check className="size-3" />
            </span>
            <span className="text-muted-foreground">{fixed ? "Accepted · Ctrl+Z to undo" : "Suggestion ready"}</span>
          </motion.div>
        </div>
        <div className="mt-6 flex gap-1.5">
          {SAMPLES.map((_, n) => (
            <span key={n} className={`h-1 rounded-full transition-all duration-500 ${n === i ? "w-8 bg-primary" : "w-3 bg-border"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
