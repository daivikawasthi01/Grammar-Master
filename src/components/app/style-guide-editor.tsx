"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, FileUp, Plus, Save, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/app/error-state";
import { useSaveStyleGuide, useStyleGuide } from "@/hooks/queries";
import { api, errorMessage } from "@/lib/api";
import { compileRules, matchRules } from "@/shared/checks/style-rules";
import type { StyleRule } from "@/shared/schemas";

const newId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function StyleGuideEditor() {
  const guide = useStyleGuide();
  if (guide.isLoading)
    return (
      <Page>
        <Skeleton className="h-64 rounded-xl" />
      </Page>
    );
  if (guide.isError)
    return (
      <Page>
        <ErrorState error={guide.error} onRetry={() => guide.refetch()} title="Couldn’t load your style guide" />
      </Page>
    );
  return <Loaded key={guide.data!.updatedAt ?? "new"} initial={guide.data!.rules} />;
}

function Page({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Terminology and house style</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">Style guide</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Rules here are checked instantly in your browser as you type, and the ones that apply are passed to the AI so its suggestions follow your terms too.
          </p>
        </div>
        {actions}
      </header>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function Loaded({ initial }: { initial: StyleRule[] }) {
  const save = useSaveStyleGuide();
  const [rules, setRules] = useState<StyleRule[]>(initial);
  const [importing, setImporting] = useState(false);
  const dirty = JSON.stringify(rules) !== JSON.stringify(initial);

  const update = (id: string, patch: Partial<StyleRule>) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <Page
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImporting(true)}>
            <FileUp /> Import
          </Button>
          <Button onClick={() => save.mutate({ rules })} disabled={!dirty || save.isPending}>
            {save.isPending ? <Spinner /> : <Save />} Save changes
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Rules</CardTitle>
              <CardDescription>{rules.length ? `${rules.length} rule${rules.length === 1 ? "" : "s"}` : "No rules yet"}</CardDescription>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setRules((rs) => [{ id: newId(), preferred: "", forbidden: [], caseSensitive: true }, ...rs])}>
              <Plus /> Add rule
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!rules.length && (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Add a rule like <span className="font-medium text-foreground">PostgreSQL</span>, never <span className="font-medium text-foreground">Postgres</span>, or import an existing guide.
              </div>
            )}
            <AnimatePresence initial={false}>
              {rules.map((r) => (
                <motion.div key={r.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="rounded-lg border bg-background p-3">
                  <RuleRow rule={r} onChange={(p) => update(r.id, p)} onRemove={() => setRules((rs) => rs.filter((x) => x.id !== r.id))} />
                </motion.div>
              ))}
            </AnimatePresence>
            {dirty && (
              <p className="pt-2 text-xs text-amber-600 dark:text-amber-400" role="status">
                Unsaved changes
              </p>
            )}
          </CardContent>
        </Card>
        <Tester rules={rules.filter((r) => r.preferred.trim())} />
      </div>
      <ImportDialog
        open={importing}
        onOpenChange={setImporting}
        onAdd={(added) => {
          setRules((rs) => [...added, ...rs]);
          toast.success(`Added ${added.length} rule${added.length === 1 ? "" : "s"}. Review and save.`);
        }}
      />
    </Page>
  );
}

function RuleRow({ rule, onChange, onRemove }: { rule: StyleRule; onChange: (p: Partial<StyleRule>) => void; onRemove: () => void }) {
  const [forbiddenText, setForbiddenText] = useState(rule.forbidden.join(", "));
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor={`p-${rule.id}`} className="text-xs text-muted-foreground">
          Always write
        </Label>
        <Input id={`p-${rule.id}`} value={rule.preferred} placeholder="PostgreSQL" maxLength={100} onChange={(e) => onChange({ preferred: e.target.value })} />
      </div>
      <ArrowRight className="mb-2.5 hidden size-4 rotate-180 text-muted-foreground sm:block" />
      <div className="grid gap-1.5">
        <Label htmlFor={`f-${rule.id}`} className="text-xs text-muted-foreground">
          Instead of (comma separated)
        </Label>
        <Input
          id={`f-${rule.id}`}
          value={forbiddenText}
          placeholder="Postgres, postgres db"
          onChange={(e) => {
            setForbiddenText(e.target.value);
            onChange({ forbidden: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20) });
          }}
        />
      </div>
      <div className="flex items-center gap-3 sm:pb-1.5">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={rule.caseSensitive} onCheckedChange={(v) => onChange({ caseSensitive: v })} aria-label="Match exact casing" />
          Exact case
        </label>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label="Remove rule">
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

const SAMPLE = "Our microservices run on postgres and use ebpf probes. The Postgres team ships in q3.";

function Tester({ rules }: { rules: StyleRule[] }) {
  const [text, setText] = useState(SAMPLE);
  const hits = useMemo(() => matchRules(compileRules(rules), text), [rules, text]);
  const parts = useMemo(() => {
    const out: Array<{ t: string; hit?: (typeof hits)[number] }> = [];
    let i = 0;
    for (const h of hits) {
      if (h.from > i) out.push({ t: text.slice(i, h.from) });
      out.push({ t: text.slice(h.from, h.to), hit: h });
      i = h.to;
    }
    out.push({ t: text.slice(i) });
    return out;
  }, [hits, text]);
  return (
    <Card className="h-fit lg:sticky lg:top-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="size-4 text-primary" /> Try it
        </CardTitle>
        <CardDescription>Matches update as you type, using the same matcher as the editor.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} aria-label="Sample text" />
        <div className="rounded-lg bg-muted/50 p-3 font-serif leading-relaxed" aria-live="polite">
          {parts.map((p, i) =>
            p.hit ? (
              <mark key={i} className="sg sg-style rounded bg-transparent text-inherit" title={`Use “${p.hit.replacement}”`}>
                {p.t}
              </mark>
            ) : (
              <span key={i}>{p.t}</span>
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hits.length ? (
            hits.map((h, i) => (
              <Badge key={i} variant="secondary" className="font-normal">
                {h.original} → {h.replacement}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No matches.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ImportDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (r: StyleRule[]) => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ rules: StyleRule[]; skipped: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function parse() {
    setBusy(true);
    try {
      setResult(await api<{ rules: StyleRule[]; skipped: string[] }>("/api/style-guide/import", { method: "POST", body: { text } }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setResult(null);
          setText("");
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import a style guide</DialogTitle>
          <DialogDescription>Paste your guide or upload a .txt or .md file. Lines like “Use ‘eBPF’, never ‘ebpf’” or “e-mail → email” become rules; you review them before saving.</DialogDescription>
        </DialogHeader>
        {!result ? (
          <div className="space-y-3">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={"- Use 'eBPF', never 'Ebpf'\n- Always write 'PostgreSQL' instead of 'Postgres'\n- e-mail -> email"} aria-label="Style guide text" />
            <input
              ref={file}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setText(await f.text());
                e.target.value = "";
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => file.current?.click()}>
              <FileUp /> Choose a file
            </Button>
          </div>
        ) : (
          <div className="max-h-80 space-y-3 overflow-y-auto">
            <p className="text-sm">
              Found <span className="font-medium">{result.rules.length}</span> rule{result.rules.length === 1 ? "" : "s"}.
            </p>
            <ul className="space-y-1.5">
              {result.rules.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium">{r.preferred}</span>
                  {r.forbidden.length > 0 && <span className="text-muted-foreground">instead of {r.forbidden.join(", ")}</span>}
                </li>
              ))}
            </ul>
            {result.skipped.length > 0 && (
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer">{result.skipped.length} line{result.skipped.length === 1 ? "" : "s"} could not be turned into a rule</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {result.skipped.slice(0, 50).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        <DialogFooter>
          {result ? (
            <>
              <Button variant="ghost" onClick={() => setResult(null)}>
                <X /> Back
              </Button>
              <Button
                disabled={!result.rules.length}
                onClick={() => {
                  onAdd(result.rules);
                  onOpenChange(false);
                  setResult(null);
                  setText("");
                }}
              >
                <Plus /> Add {result.rules.length} rule{result.rules.length === 1 ? "" : "s"}
              </Button>
            </>
          ) : (
            <Button onClick={parse} disabled={!text.trim() || busy}>
              {busy && <Spinner />} Find rules
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
