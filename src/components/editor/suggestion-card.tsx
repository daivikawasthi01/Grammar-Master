"use client";

import type { Editor } from "@tiptap/core";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import type { Suggestion } from "./extensions/suggestions";

export const CATEGORY_STYLE: Record<Suggestion["category"], { label: string; dot: string }> = {
  correctness: { label: "Correctness", dot: "bg-sg-correctness" },
  spelling: { label: "Spelling", dot: "bg-sg-correctness" },
  clarity: { label: "Clarity", dot: "bg-sg-clarity" },
  engagement: { label: "Engagement", dot: "bg-sg-engagement" },
  delivery: { label: "Delivery", dot: "bg-sg-engagement" },
  style: { label: "Style guide", dot: "bg-sg-style" },
};

export function SuggestionBody({ s, onAccept, onDismiss, onAddWord, compact }: { s: Suggestion; onAccept: (r?: string) => void; onDismiss: () => void; onAddWord?: () => void; compact?: boolean }) {
  const style = CATEGORY_STYLE[s.category];
  const [first, ...more] = s.replacements;
  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn("size-2 rounded-full", style.dot)} />
        <span className="font-medium">{s.title}</span>
        {s.source === "ai" && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">AI</span>}
      </div>
      <div className={cn("mt-2 flex flex-wrap items-center gap-x-2 gap-y-1", compact ? "text-sm" : "text-[15px]")}>
        <span className="text-muted-foreground line-through decoration-sg-correctness/60">{s.original || "∅"}</span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
        <button onClick={() => onAccept(first)} className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary transition-colors hover:bg-primary/20">
          {first === "" ? "Remove" : first ?? "—"}
        </button>
        {more.map((r) => (
          <button key={r} onClick={() => onAccept(r)} className="rounded-md px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            {r}
          </button>
        ))}
      </div>
      {!compact && <p className="mt-2 text-sm text-muted-foreground">{s.message}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1">
        {first !== undefined && (
          <Button size="sm" className="h-7" onClick={() => onAccept(first)}>
            Accept {!compact && <Kbd className="ml-1 bg-primary-foreground/20 text-primary-foreground">Alt ↵</Kbd>}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7" onClick={onDismiss}>
          <X /> Dismiss
        </Button>
        {s.source === "spelling" && onAddWord && (
          <Button size="sm" variant="ghost" className="h-7" onClick={onAddWord}>
            <BookPlus /> Add to dictionary
          </Button>
        )}
      </div>
    </div>
  );
}

function anchorFor(editor: Editor, s: Suggestion, container: HTMLElement): { top: number; left: number } | null {
  try {
    const start = editor.view.coordsAtPos(s.from);
    const end = editor.view.coordsAtPos(s.to);
    const box = container.getBoundingClientRect();
    return { top: end.bottom - box.top + 8, left: Math.max(0, Math.min(start.left - box.left, box.width - 380)) };
  } catch {
    return null;
  }
}

/** Card that opens on an underline (click, or the caret entering it). */
export function SuggestionCard({ editor, suggestion, container, ...actions }: {
  editor: Editor;
  suggestion: Suggestion | null;
  container: HTMLElement | null;
  onAccept: (r?: string) => void;
  onDismiss: () => void;
  onAddWord: () => void;
}) {
  const pos = suggestion && container ? anchorFor(editor, suggestion, container) : null;

  return (
    <AnimatePresence>
      {suggestion && pos && (
        <motion.div
          key={suggestion.id}
          role="dialog"
          aria-label={`${suggestion.title} suggestion`}
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className="absolute z-20 w-[min(380px,100%)] rounded-xl border bg-popover p-4 shadow-xl shadow-black/10"
          style={{ top: pos.top, left: pos.left }}
          onMouseDown={(e) => e.preventDefault()} // keep the editor focused
        >
          <SuggestionBody s={suggestion} {...actions} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
