"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type NodeId = "editor" | "checker" | "autosave" | "limits" | "grammar" | "rewrite" | "documents" | "model" | "database" | "memory";
type Layer = "browser" | "server" | "outside";

const LAYERS: Array<{ id: Layer; label: string; note: string }> = [
  { id: "browser", label: "Your browser", note: "Runs on your device" },
  { id: "server", label: "Our server", note: "Checks every request" },
  { id: "outside", label: "Outside services", note: "Only ever see what they are handed" },
];

const NODES: Array<{ id: NodeId; layer: Layer; title: string; body: string }> = [
  { id: "editor", layer: "browser", title: "Editor", body: "Your document lives here while you write." },
  { id: "checker", layer: "browser", title: "Instant checker", body: "A dictionary, phrasing rules and your style guide, running on your device. Nothing is sent." },
  { id: "autosave", layer: "browser", title: "Autosave", body: "Sends your changes a moment after you stop typing." },
  { id: "limits", layer: "server", title: "Sign-in and limits", body: "Confirms it is you, and that requests stay within fair use." },
  { id: "grammar", layer: "server", title: "Grammar check", body: "Takes one paragraph, asks for specific edits, and throws away any edit that does not match your text." },
  { id: "rewrite", layer: "server", title: "Rewrite", body: "Takes only the passage you selected and streams the new version back." },
  { id: "documents", layer: "server", title: "Documents", body: "Saves versions, and refuses to overwrite a newer copy." },
  { id: "model", layer: "outside", title: "Language model", body: "Reads the paragraph or selection it is handed, and nothing else." },
  { id: "memory", layer: "outside", title: "Short-term memory", body: "Remembers recent answers for an hour, so a repeated paragraph is instant. It stores a fingerprint, not your text." },
  { id: "database", layer: "outside", title: "Database", body: "Your account and your documents." },
];

type Step = { node: NodeId; what: string; payload: string };
type Journey = { id: string; label: string; when: string; never: string; steps: Step[] };

const JOURNEYS: Journey[] = [
  {
    id: "typing",
    label: "Typing",
    when: "Every keystroke · under 50 ms",
    never: "Nothing you type here leaves your device.",
    steps: [
      { node: "editor", what: "You type a word.", payload: "stays in the page" },
      { node: "checker", what: "It is checked against the dictionary, phrasing rules and your style guide. A wavy underline appears if something is off.", payload: "the words, in your browser only" },
    ],
  },
  {
    id: "pausing",
    label: "Pausing",
    when: "About 1 second after you stop typing",
    never: "The whole document is never sent for checking.",
    steps: [
      { node: "editor", what: "You stop typing. The paragraph you were in is picked out.", payload: "one paragraph" },
      { node: "limits", what: "The server confirms your session and counts the request.", payload: "your session cookie" },
      { node: "memory", what: "Has this exact paragraph been checked recently? If so, the saved answer comes straight back.", payload: "a fingerprint of the paragraph" },
      { node: "grammar", what: "If not, the paragraph and your style rules are prepared for the model.", payload: "this paragraph + your style rules" },
      { node: "model", what: "The model suggests small edits.", payload: "the same paragraph" },
      { node: "grammar", what: "Each edit is checked against your text. Any that do not match exactly are dropped.", payload: "edits only" },
      { node: "editor", what: "The surviving edits appear as underlines. You accept or dismiss each one.", payload: "suggestions" },
    ],
  },
  {
    id: "rewriting",
    label: "Rewriting",
    when: "Only when you ask",
    never: "Text you did not select is never part of a rewrite.",
    steps: [
      { node: "editor", what: "You select a sentence and choose Shorter, Simpler, Formal or Friendlier.", payload: "your selection" },
      { node: "limits", what: "Your session and fair-use limits are checked.", payload: "your session cookie" },
      { node: "rewrite", what: "The selected passage is handed on.", payload: "the selection only" },
      { node: "model", what: "A larger model writes the new version, word by word.", payload: "streamed back" },
      { node: "editor", what: "The new version appears beside the old one. Accept replaces only the selection, as one undoable step.", payload: "preview" },
    ],
  },
  {
    id: "saving",
    label: "Saving",
    when: "A moment after you stop typing",
    never: "A save never silently overwrites a newer copy.",
    steps: [
      { node: "autosave", what: "Your document and the version it was based on are sent.", payload: "the document + its version number" },
      { node: "limits", what: "Your session is checked, and the document must belong to you.", payload: "your session cookie" },
      { node: "documents", what: "If the stored version still matches yours, the save goes through. If another tab saved first, you are asked which version to keep.", payload: "version check" },
      { node: "database", what: "The document is written.", payload: "the document" },
    ],
  },
];

export function JourneyMap() {
  const [id, setId] = useState("pausing");
  const journey = JOURNEYS.find((j) => j.id === id)!;

  const badges = new Map<NodeId, number[]>();
  journey.steps.forEach((s, i) => badges.set(s.node, [...(badges.get(s.node) ?? []), i + 1]));

  return (
    <div>
      <ToggleGroup type="single" value={id} onValueChange={(v) => v && setId(v)} variant="outline" aria-label="Choose a moment" className="max-w-full flex-wrap">
        {JOURNEYS.map((j) => (
          <ToggleGroupItem key={j.id} value={j.id} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {j.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="mt-3 text-sm text-muted-foreground">{journey.when}</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          {LAYERS.map((layer) => (
            <section key={layer.id} aria-label={layer.label} className="rounded-md border bg-card p-4">
              <header className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <h3 className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{layer.label}</h3>
                <span className="text-xs text-muted-foreground/80">{layer.note}</span>
              </header>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {NODES.filter((n) => n.layer === layer.id).map((n) => {
                  const nums = badges.get(n.id);
                  const active = Boolean(nums);
                  return (
                    <motion.div
                      key={n.id}
                      animate={{ opacity: active ? 1 : 0.45 }}
                      transition={{ duration: 0.25 }}
                      className={`relative rounded-md border p-3 pr-10 ${active ? "border-primary bg-background" : "bg-background/50"}`}
                    >
                      <p className="text-[14px] font-medium">{n.title}</p>
                      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{n.body}</p>
                      {nums && (
                        <span aria-hidden className="absolute top-2 right-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 font-serif text-[11px] leading-none text-primary-foreground">
                          {nums.join("·")}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div>
          <ol aria-live="polite" className="space-y-4">
            {journey.steps.map((s, i) => (
              <li key={`${journey.id}-${i}`} className="grid grid-cols-[1.75rem_1fr] gap-x-2">
                <span aria-hidden className="grid size-5 translate-y-0.5 place-items-center rounded-full bg-primary font-serif text-[11px] leading-none text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[14px] leading-relaxed">
                    <span className="font-medium">{NODES.find((n) => n.id === s.node)!.title}.</span> {s.what}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">sends: {s.payload}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t pt-4 text-[14px] font-medium">{journey.never}</p>
        </div>
      </div>
    </div>
  );
}
