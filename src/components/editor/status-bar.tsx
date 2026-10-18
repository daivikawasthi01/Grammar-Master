"use client";

import { AlertTriangle, Check, CloudOff, Loader2, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { timeAgo } from "@/lib/format";
import type { SaveState } from "./hooks/use-autosave";

export function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: Date | null }) {
  const view = {
    idle: { icon: null, text: savedAt ? `Saved ${timeAgo(savedAt.toISOString())}` : "All changes saved", tone: "text-muted-foreground" },
    saving: { icon: <Loader2 className="size-3.5 animate-spin" />, text: "Saving…", tone: "text-muted-foreground" },
    saved: { icon: <Check className="size-3.5" />, text: "Saved", tone: "text-muted-foreground" },
    offline: { icon: <CloudOff className="size-3.5" />, text: "Offline · will retry", tone: "text-amber-600 dark:text-amber-400" },
    error: { icon: <AlertTriangle className="size-3.5" />, text: "Not saved · retrying", tone: "text-destructive" },
    conflict: { icon: <AlertTriangle className="size-3.5" />, text: "Changed elsewhere", tone: "text-destructive" },
  }[state];
  return (
    <span role="status" aria-live="polite" className={`inline-flex min-w-0 items-center gap-1.5 truncate text-xs whitespace-nowrap ${view.tone}`}>
      {view.icon}
      {view.text}
    </span>
  );
}

export function StatusBar({ words, chars, instantMs, spellingReady }: { words: number; chars: number; instantMs: number | null; spellingReady: boolean }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="tabular-nums">{words.toLocaleString()} words</span>
      <span className="hidden tabular-nums sm:inline">{chars.toLocaleString()} characters</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="ml-auto inline-flex items-center gap-1">
            <Zap className={`size-3.5 ${spellingReady ? "text-emerald-500" : ""}`} />
            {spellingReady ? (instantMs !== null ? `${Math.max(1, Math.round(instantMs))} ms` : "Instant checks on") : "Loading dictionary…"}
          </span>
        </TooltipTrigger>
        <TooltipContent>Spelling, style and phrasing checks run in your browser. No network.</TooltipContent>
      </Tooltip>
    </div>
  );
}
