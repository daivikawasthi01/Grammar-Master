"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Square, Languages } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { keys, useStyleGuide } from "@/hooks/queries";
import { apiStream, ApiError, errorMessage } from "@/lib/api";
import { droppedProtected } from "@/shared/checks/style-rules";
import { MAX_SELECTION_CHARS, TRANSLATE_TARGETS, type TranslateTarget } from "@/shared/schemas";

/** A scratchpad for translating text. It is separate from the editor on purpose: translated text is not English, so it never gets grammar checks. */
export function Translator() {
  const qc = useQueryClient();
  const rules = useStyleGuide().data?.rules;
  const [source, setSource] = useState("");
  const [target, setTarget] = useState<TranslateTarget>("Spanish");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => () => ctrl.current?.abort(), []);

  const dropped = useMemo(() => (busy || !result || !rules ? [] : droppedProtected(rules, source, result)), [busy, result, rules, source]);

  async function run() {
    if (!source.trim() || busy) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setBusy(true);
    setError(null);
    setResult("");
    let text = "";
    try {
      for await (const chunk of apiStream("/api/rewrite", { method: "POST", body: { text: source, action: "translate", target }, signal: c.signal })) {
        text += chunk;
        setResult(text);
      }
      setResult(text.trim());
      qc.invalidateQueries({ queryKey: keys.me });
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "ABORTED")) setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      <header>
        <p className="text-sm text-muted-foreground">Kept apart from your documents</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">Translate</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Paste text, pick a language and copy the result. Words in your style guide&rsquo;s protected list stay as you wrote them.
        </p>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="grid content-start gap-2">
          <Label htmlFor="source">Your text</Label>
          <Textarea
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            maxLength={MAX_SELECTION_CHARS}
            placeholder="Paste or type what you want translated"
            className="min-h-64 font-serif text-base leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="target">Translate into</label>
            <select
              id="target"
              value={target}
              onChange={(e) => setTarget(e.target.value as TranslateTarget)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              {TRANSLATE_TARGETS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {busy ? (
              <Button variant="outline" onClick={() => ctrl.current?.abort()}>
                <Square /> Stop
              </Button>
            ) : (
              <Button onClick={run} disabled={!source.trim()}>
                <Languages /> Translate
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {source.length.toLocaleString()} / {MAX_SELECTION_CHARS.toLocaleString()}
            </span>
          </div>
        </section>

        <section className="grid content-start gap-2">
          <Label>{target}</Label>
          <div
            aria-live="polite"
            className="min-h-64 rounded-md border bg-muted/30 p-3 font-serif text-base leading-relaxed whitespace-pre-wrap"
          >
            {error ? <p className="font-sans text-sm text-destructive">{error}</p> : result || <span className="font-sans text-sm text-muted-foreground">{busy ? "Translating…" : "The translation appears here."}</span>}
          </div>
          {dropped.length > 0 && (
            <p className="text-sm text-destructive">
              The translation dropped your protected {dropped.length === 1 ? "word" : "words"}: {dropped.join(", ")}. Try again.
            </p>
          )}
          <div>
            <Button variant="outline" onClick={copy} disabled={!result || busy}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
