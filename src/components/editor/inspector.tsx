"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { BookMarked, CheckCheck, Gauge, Loader2, ScanText, Sparkles, Wand2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { readingEaseLabel, textStats } from "@/shared/checks/readability";
import type { ToneResponse } from "@/shared/schemas";
import type { Suggestion } from "./extensions/suggestions";
import { CATEGORY_STYLE, SuggestionBody } from "./suggestion-card";
import type { AiStatus } from "./hooks/use-ai-check";

type Props = {
  suggestions: Suggestion[];
  plainText: string;
  activeId: string | null;
  aiStatus: AiStatus;
  pendingParagraphs: number;
  styleRuleCount: number;
  onFocus: (s: Suggestion) => void;
  onAccept: (s: Suggestion, r?: string) => void;
  onDismiss: (s: Suggestion) => void;
  onAddWord: (s: Suggestion) => void;
  onAcceptAll: (list: Suggestion[]) => void;
  onCheckAll: () => void;
};

const GROUPS: Array<{ key: string; label: string; match: (s: Suggestion) => boolean }> = [
  { key: "correctness", label: "Correctness", match: (s) => s.category === "correctness" || s.category === "spelling" },
  { key: "clarity", label: "Clarity", match: (s) => s.category === "clarity" },
  { key: "style", label: "Style guide", match: (s) => s.category === "style" },
  { key: "engagement", label: "Engagement & delivery", match: (s) => s.category === "engagement" || s.category === "delivery" },
];

export function Inspector(p: Props) {
  return (
    <Tabs defaultValue="suggestions" className="flex h-full flex-col gap-0">
      <div className="border-b px-4 pt-3 pb-3">
        <TabsList className="w-full">
          <TabsTrigger value="suggestions" className="gap-1.5">
            Suggestions
            {p.suggestions.length > 0 && <Badge className="h-4.5 min-w-4.5 rounded-full px-1 text-[10px] tabular-nums">{p.suggestions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="tone">Tone</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="suggestions" className="min-h-0 flex-1">
        <SuggestionsTab {...p} />
      </TabsContent>
      <TabsContent value="stats" className="min-h-0 flex-1">
        <StatsTab text={p.plainText} issues={p.suggestions.length} />
      </TabsContent>
      <TabsContent value="tone" className="min-h-0 flex-1">
        <ToneTab text={p.plainText} />
      </TabsContent>
    </Tabs>
  );
}

function SuggestionsTab(p: Props) {
  const [filter, setFilter] = useState<string | null>(null);
  const groups = GROUPS.map((g) => ({ ...g, items: p.suggestions.filter(g.match) }));
  const visible = filter ? groups.find((g) => g.key === filter)?.items ?? [] : p.suggestions;
  const bulk = p.suggestions.filter((s) => s.source !== "ai" && s.source !== "spelling" && s.replacements.length === 1);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-4 gap-1.5">
          {groups.map((g) => (
            <button
              key={g.key}
              onClick={() => setFilter((f) => (f === g.key ? null : g.key))}
              aria-pressed={filter === g.key}
              className={cn("rounded-lg border p-2 text-left transition-colors hover:bg-muted", filter === g.key && "border-primary/50 bg-primary/5")}
            >
              <span className="block text-lg font-semibold tabular-nums">{g.items.length}</span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", CATEGORY_STYLE[g.key === "engagement" ? "engagement" : (g.key as Suggestion["category"])].dot)} />
                <span className="truncate">{g.label.split(" ")[0]}</span>
              </span>
            </button>
          ))}
        </div>

        <AiStatusRow status={p.aiStatus} pending={p.pendingParagraphs} onCheckAll={p.onCheckAll} />

        {bulk.length > 1 && !filter && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => p.onAcceptAll(bulk)}>
            <CheckCheck /> Accept {bulk.length} rule and style fixes
          </Button>
        )}

        {visible.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCheck className="size-5" />
            </div>
            <p className="mt-3 text-sm font-medium">{filter ? "Nothing in this category" : "No suggestions right now"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Keep writing. Underlines appear as you type.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {visible.map((s) => (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
                  className={cn("cursor-pointer rounded-lg border bg-card p-3 transition-colors hover:border-primary/40", p.activeId === s.id && "border-primary/60 ring-2 ring-primary/15")}
                  onClick={() => p.onFocus(s)}
                >
                  <SuggestionBody s={s} compact onAccept={(r) => p.onAccept(s, r)} onDismiss={() => p.onDismiss(s)} onAddWord={() => p.onAddWord(s)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <Link href="/app/style-guide" className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted">
          <BookMarked className="size-4" />
          {p.styleRuleCount ? `${p.styleRuleCount} style guide rule${p.styleRuleCount === 1 ? "" : "s"} active` : "Add terminology rules in your style guide"}
        </Link>
      </div>
    </ScrollArea>
  );
}

function AiStatusRow({ status, pending, onCheckAll }: { status: AiStatus; pending: number; onCheckAll: () => void }) {
  if (status.state === "checking")
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> AI is checking {status.pending} paragraph{status.pending === 1 ? "" : "s"}…
      </div>
    );
  if (status.state === "error")
    return (
      <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
        {status.code === "QUOTA_EXCEEDED"
          ? `You've used this month's AI checks. They reset ${status.resetAt ? new Date(status.resetAt).toLocaleDateString(undefined, { month: "long", day: "numeric" }) : "next month"}. Instant checks keep working.`
          : status.code === "RATE_LIMITED"
            ? "AI checks are paused for a minute. Instant checks keep working."
            : `AI suggestions are unavailable right now (${status.message}). Instant checks keep working.`}
      </div>
    );
  if (pending > 0)
    return (
      <Button variant="secondary" size="sm" className="w-full" onClick={onCheckAll}>
        <Sparkles /> AI-check {pending} paragraph{pending === 1 ? "" : "s"}
      </Button>
    );
  return null;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function StatsTab({ text, issues }: { text: string; issues: number }) {
  const s = useMemo(() => textStats(text), [text]);
  const ease = s.fleschReadingEase;
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Gauge className="size-4" /> Readability (Flesch reading ease)
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums">{ease === null ? "—" : Math.round(ease)}</span>
            <span className="text-sm text-muted-foreground">{readingEaseLabel(ease)}</span>
          </div>
          <Progress value={ease === null ? 0 : Math.max(0, Math.min(100, ease))} className="mt-3 h-1.5" aria-label="Reading ease" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {s.fleschKincaidGrade === null ? "Write at least 30 words for a score." : `About grade ${Math.max(0, Math.round(s.fleschKincaidGrade))} (Flesch–Kincaid). Higher ease is easier to read.`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Words" value={s.words.toLocaleString()} />
          <Stat label="Reading time" value={s.readingMinutes < 1 ? "<1 min" : `${Math.round(s.readingMinutes)} min`} />
          <Stat label="Sentences" value={s.sentences.toLocaleString()} hint={`${s.avgWordsPerSentence} words avg`} />
          <Stat label="Long sentences" value={String(s.longSentences)} hint="over 30 words" />
          <Stat label="Characters" value={s.characters.toLocaleString()} hint="excluding spaces" />
          <Stat label="Open issues" value={s.words ? ((issues / s.words) * 100).toFixed(1) : "0"} hint="per 100 words" />
        </div>
      </div>
    </ScrollArea>
  );
}

function ToneTab({ text }: { text: string }) {
  const [state, setState] = useState<{ loading: boolean; result?: ToneResponse; error?: string; forText?: string }>({ loading: false });
  const stale = state.result && state.forText !== text;
  async function detect() {
    setState({ loading: true });
    try {
      const { tone } = await api<{ tone: ToneResponse }>("/api/tone", { method: "POST", body: { text } });
      setState({ loading: false, result: tone, forText: text });
    } catch (err) {
      setState({ loading: false, error: errorMessage(err) });
    }
  }
  return (
    <div className="space-y-4 p-4">
      <p className="text-sm text-muted-foreground">An AI reading of the overall tone. It is an estimate, not a measurement, and uses one AI check.</p>
      <Button onClick={detect} disabled={state.loading || text.trim().length < 20} className="w-full">
        {state.loading ? <Loader2 className="animate-spin" /> : <Wand2 />} {state.result ? "Detect again" : "Detect tone"}
      </Button>
      {text.trim().length < 20 && <p className="text-xs text-muted-foreground">Write a little more first.</p>}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <AnimatePresence>
        {state.result && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <ScanText className="size-4 text-primary" />
              <span className="text-lg font-semibold capitalize">{state.result.tone}</span>
              <Badge variant="outline" className="ml-auto">estimated · {state.result.confidence} confidence</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{state.result.explanation}</p>
            {stale && <p className="mt-2 text-xs text-muted-foreground">The text changed since this reading.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
