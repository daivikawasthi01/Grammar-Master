"use client";

import { useLayoutEffect } from "react";
import type { Editor } from "@tiptap/core";
import { AnimatePresence, motion } from "motion/react";
import { Check, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { REWRITE_LABELS } from "./bubble-toolbar";
import type { RewriteState } from "./hooks/use-rewrite";

/** Floating preview under the selection: the rewrite streams in, then Accept (Enter) or Discard (Esc). */
export function RewritePanel({ editor, state, onAccept, onCancel, onRetry, container }: {
  editor: Editor;
  state: RewriteState;
  onAccept: () => void;
  onCancel: () => void;
  onRetry: () => void;
  container: HTMLElement | null;
}) {
  const open = state.status !== "idle";
  let pos: { top: number; left: number; width: number } | null = null;
  if (open && container) {
    try {
      const end = editor.view.coordsAtPos(Math.min(state.to, editor.state.doc.content.size));
      const box = container.getBoundingClientRect();
      pos = { top: end.bottom - box.top + 10, left: 0, width: box.width };
    } catch {
      pos = null;
    }
  }

  useLayoutEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter" && !e.shiftKey && state.status === "done") {
        e.preventDefault();
        onAccept();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, state.status, onAccept, onCancel]);

  return (
    <AnimatePresence>
      {open && pos && (
        <motion.div
          role="dialog"
          aria-label="Rewrite preview"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="absolute z-20 rounded-xl border bg-popover p-4 shadow-2xl shadow-black/10"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            {REWRITE_LABELS[state.action].label}
            {state.status === "streaming" && (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Writing…
              </span>
            )}
          </div>
          <div aria-live="polite" className="mt-3 max-h-72 overflow-y-auto font-serif text-[17px] leading-relaxed whitespace-pre-wrap">
            {state.status === "error" ? (
              <p className="text-sm text-destructive">{state.message}</p>
            ) : (
              <>
                {state.text}
                {state.status === "streaming" && <span className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 animate-pulse bg-primary" />}
              </>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            {state.status === "error" ? (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RotateCcw /> Try again
              </Button>
            ) : (
              <Button size="sm" onClick={onAccept} disabled={state.status !== "done"}>
                <Check /> Replace selection <Kbd className="ml-1 bg-primary-foreground/20 text-primary-foreground">↵</Kbd>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X /> Discard <Kbd className="ml-1">Esc</Kbd>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
