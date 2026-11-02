"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, FileUp, Plus, Save, ShieldCheck, Trash2, Wand2, X } from "lucide-react";
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
import { compileRules, matchRules, protectedSpans } from "@/shared/checks/style-rules";
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
  return <Loaded key={guide.data!.updatedAt ?? "new"} initialRules={guide.data!.rules} initialGuidance={guide.data!.guidanceNotes} />;
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

function Loaded({ initialRules, initialGuidance }: { initialRules: StyleRule[]; initialGuidance: string[] }) {
  const save = useSaveStyleGuide();
  const [rules, setRules] = useState<StyleRule[]>(initialRules);
  const [guidanceNotes, setGuidanceNotes] = useState<string[]>(initialGuidance);
  const [noteDraft, setNoteDraft] = useState("");
  const [importing, setImporting] = useState(false);
  const dirty = JSON.stringify(rules) !== JSON.stringify(initialRules) || JSON.stringify(guidanceNotes) !== JSON.stringify(initialGuidance);

  const update = (id: string, patch: Partial<StyleRule>) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addNote = (note: string) => {
    const trimmed = note.trim();
    if (trimmed) setGuidanceNotes((ns) => [trimmed, ...ns]);
  };

  return (
    <Page
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImporting(true)}>
            <FileUp /> Import
          </Button>
          <Button onClick={() => save.mutate({ rules, guidanceNotes })} disabled={!dirty || save.isPending}>
            {save.isPending ? <Spinner /> : <Save />} Save changes
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Rules</CardTitle>
                <CardDescription>{rules.length ? `${rules.length} rule${rules.length === 1 ? "" : "s"}` : "No rules yet"}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setRules((rs) => [{ id: newId(), kind: "protect", preferred: "", forbidden: [], caseSensitive: false }, ...rs])}>
                  <ShieldCheck /> Protect words
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setRules((rs) => [{ id: newId(), preferred: "", forbidden: [], caseSensitive: true }, ...rs])}>
                  <Plus /> Add rule
                </Button>
              </div>
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>General guidance</CardTitle>
              <CardDescription>
                Guidance that isn&apos;t a simple word swap (e.g. &ldquo;keep sentences short&rdquo;). Matched by meaning against what you&apos;re writing, not exact words, so only the notes relevant to
                each paragraph are sent to the AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {!guidanceNotes.length && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No guidance notes yet.</div>}
              <AnimatePresence initial={false}>
                {guidanceNotes.map((note, i) => (
                  <motion.div
                    key={`${note}-${i}`}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 rounded-lg border bg-background p-2.5 text-sm"
                  >
                    <span className="flex-1">{note}</span>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setGuidanceNotes((ns) => ns.filter((_, j) => j !== i))} aria-label="Remove guidance note">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="flex gap-2 pt-1">
                <Input
                  value={noteDraft}
                  placeholder="Keep sentences under 20 words"
                  maxLength={300}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addNote(noteDraft);
                      setNoteDraft("");
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    addNote(noteDraft);
                    setNoteDraft("");
                  }}
                  disabled={!noteDraft.trim()}
                >
                  <Plus /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
          {dirty && (
            <p className="text-xs text-amber-600 dark:text-amber-400" role="status">
              Unsaved changes
            </p>
          )}
        </div>
        <Tester rules={rules.filter((r) => r.preferred.trim())} />
      </div>
      <ImportDialog
        open={importing}
        onOpenChange={setImporting}
        existing={rules}
        onAdd={({ rules: added, terms, guidance }) => {
          setRules((rs) => withProtectedTerms([...added, ...rs], terms));
          setGuidanceNotes((ns) => [...new Set([...guidance, ...ns])]);
          const parts = [added.length && `${added.length} swap${added.length === 1 ? "" : "s"}`, terms.length && `${terms.length} protected word${terms.length === 1 ? "" : "s"}`, guidance.length && `${guidance.length} note${guidance.length === 1 ? "" : "s"}`].filter(Boolean);
          toast.success(`Added ${parts.join(", ")}. Review and save.`);
        }}
      />
    </Page>
  );
}

function RuleRow({ rule, onChange, onRemove }: { rule: StyleRule; onChange: (p: Partial<StyleRule>) => void; onRemove: () => void }) {
  const [forbiddenText, setForbiddenText] = useState(rule.forbidden.join(", "));
  const [protectedText, setProtectedText] = useState([rule.preferred, ...rule.forbidden].filter(Boolean).join(", "));
  if (rule.kind === "protect") {
    return (
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor={`p-${rule.id}`} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Never change these words (comma separated, any casing)
          </Label>
          <Input
            id={`p-${rule.id}`}
            value={protectedText}
            placeholder="wdym, gtg, yaar"
            onChange={(e) => {
              setProtectedText(e.target.value);
              const [first = "", ...rest] = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
              onChange({ preferred: first.slice(0, 100), forbidden: rest.slice(0, 20) });
            }}
          />
        </div>
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive sm:mb-0.5" onClick={onRemove} aria-label="Remove rule">
          <Trash2 />
        </Button>
      </div>
    );
  }
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
  const kept = useMemo(() => protectedSpans(rules, text), [rules, text]);
  const parts = useMemo(() => {
    const out: Array<{ t: string; hit?: (typeof hits)[number]; kept?: boolean }> = [];
    let i = 0;
    const marks = [
      ...hits.map((h) => ({ from: h.from, to: h.to, hit: h, kept: false })),
      ...kept.map((k) => ({ from: k.from, to: k.to, hit: undefined, kept: true })),
    ].sort((a, b) => a.from - b.from);
    for (const h of marks) {
      if (h.from < i) continue;
      if (h.from > i) out.push({ t: text.slice(i, h.from) });
      out.push({ t: text.slice(h.from, h.to), hit: h.hit, kept: h.kept });
      i = h.to;
    }
    out.push({ t: text.slice(i) });
    return out;
  }, [hits, kept, text]);
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
            p.kept ? (
              <mark key={i} className="rounded bg-transparent text-inherit underline decoration-dotted decoration-primary underline-offset-4" title="Protected: never flagged or changed">
                {p.t}
              </mark>
            ) : p.hit ? (
              <mark key={i} className="sg sg-style rounded bg-transparent text-inherit" title={`Use “${p.hit.replacement}”`}>
                {p.t}
              </mark>
            ) : (
              <span key={i}>{p.t}</span>
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {kept.length > 0 && (
            <Badge variant="outline" className="font-normal">
              {kept.length} protected word{kept.length === 1 ? "" : "s"} left alone
            </Badge>
          )}
          {hits.length ? (
            hits.map((h, i) => (
              <Badge key={i} variant="secondary" className="font-normal">
                {h.original} → {h.replacement}
              </Badge>
            ))
          ) : (
            !kept.length && <span className="text-xs text-muted-foreground">No matches.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type CompileResult = { rules: StyleRule[]; protectTerms: { term: string; named: boolean }[]; guidance: string[] };

/** Adds terms to the writer's protect rules, filling an existing rule before starting a new one (a rule holds at most 20). */
function withProtectedTerms(rules: StyleRule[], terms: string[]): StyleRule[] {
  const known = new Set(rules.filter((r) => r.kind === "protect").flatMap((r) => [r.preferred, ...r.forbidden]).map((t) => t.toLowerCase()));
  let out = rules;
  for (const term of terms) {
    if (known.has(term.toLowerCase())) continue;
    known.add(term.toLowerCase());
    const home = out.find((r) => r.kind === "protect" && r.preferred && r.forbidden.length < 19);
    out = home
      ? out.map((r) => (r === home ? { ...r, forbidden: [...r.forbidden, term] } : r))
      : [{ id: newId(), kind: "protect" as const, preferred: term, forbidden: [], caseSensitive: false }, ...out];
  }
  return out;
}

type Accepted = { rules: StyleRule[]; terms: string[]; guidance: string[] };

function ImportDialog({ open, onOpenChange, existing, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; existing: StyleRule[]; onAdd: (a: Accepted) => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<CompileResult | null>(null);
  const [useRules, setUseRules] = useState<Record<string, boolean>>({});
  const [terms, setTerms] = useState<string[]>([]);
  const [keepAsGuidance, setKeepAsGuidance] = useState(true);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  async function compile() {
    setBusy(true);
    try {
      const res = await api<CompileResult>("/api/style-guide/compile", { method: "POST", body: { text, rules: existing } });
      setUseRules(Object.fromEntries(res.rules.map((r) => [r.id, true])));
      setTerms(res.protectTerms.filter((t) => t.named).map((t) => t.term));
      setResult(res);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const reset = () => {
    setResult(null);
    setUseRules({});
    setTerms([]);
    setText("");
    setKeepAsGuidance(true);
  };

  const acceptedRules = (result?.rules ?? []).filter((r) => useRules[r.id]);
  const guidance = keepAsGuidance ? (result?.guidance ?? []) : [];
  const total = acceptedRules.length + (terms.length ? 1 : 0) + guidance.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add rules in your own words</DialogTitle>
          <DialogDescription>Type a line or paste your whole guide, in any wording. It becomes exact rules (swaps and protected words) plus notes for the AI; you review before anything is added.</DialogDescription>
        </DialogHeader>
        {!result ? (
          <div className="space-y-3">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={"- Use 'eBPF', never 'Ebpf'\n- Don't correct short forms like wdym, gtg\n- Keep my Hinglish as is"} aria-label="Style guide text" />
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
          <div className="max-h-80 space-y-4 overflow-y-auto">
            {result.rules.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Word swaps</p>
                {result.rules.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Switch checked={Boolean(useRules[r.id])} onCheckedChange={(v) => setUseRules((p) => ({ ...p, [r.id]: v }))} aria-label="Use this rule" />
                    <span className="font-medium">{r.preferred}</span>
                    <span className="text-muted-foreground">instead of {r.forbidden.join(", ")}</span>
                  </label>
                ))}
              </div>
            )}
            {result.protectTerms.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <ShieldCheck className="size-4 text-muted-foreground" /> Never change
                </p>
                <p className="text-xs text-muted-foreground">The app enforces these exactly. Ticked words came from your text; the others are the AI&apos;s examples of the same kind, so tick any you use.</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.protectTerms.map(({ term, named }) => {
                    const on = terms.includes(term);
                    return (
                      <button
                        key={term}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTerms((ts) => (on ? ts.filter((t) => t !== term) : [...ts, term]))}
                        className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground"}`}
                      >
                        {term}
                        {!named && <span className="ml-1 opacity-60">suggested</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {result.guidance.length > 0 && (
              <div className="space-y-2 text-sm">
                <p className="font-medium">Notes for the AI</p>
                <p className="text-xs text-muted-foreground">The AI reads these on every check. Best effort, not enforced.</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {result.guidance.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
                <label className="flex items-center gap-2">
                  <Switch checked={keepAsGuidance} onCheckedChange={setKeepAsGuidance} aria-label="Add these as notes for the AI" />
                  Add these as notes for the AI
                </label>
              </div>
            )}
            {!result.rules.length && !result.protectTerms.length && !result.guidance.length && <p className="text-sm text-muted-foreground">Nothing new to add.</p>}
          </div>
        )}
        <DialogFooter>
          {result ? (
            <>
              <Button variant="ghost" onClick={() => setResult(null)}>
                <X /> Back
              </Button>
              <Button
                disabled={!total}
                onClick={() => {
                  onAdd({ rules: acceptedRules, terms, guidance });
                  onOpenChange(false);
                  reset();
                }}
              >
                <Plus /> Add to my guide
              </Button>
            </>
          ) : (
            <Button onClick={compile} disabled={!text.trim() || busy}>
              {busy && <Spinner />} Find rules
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
