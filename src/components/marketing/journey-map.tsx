"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type NodeId = "editor" | "checker" | "autosave" | "limits" | "grammar" | "rewrite" | "documents" | "model" | "database" | "memory";
type Layer = "browser" | "server" | "outside";

const LAYERS: Array<{ id: Layer; label: string }> = [
  { id: "browser", label: "Your browser" },
  { id: "server", label: "Our server" },
  { id: "outside", label: "Outside services" },
];

const NODES: Array<{ id: NodeId; layer: Layer; title: string }> = [
  { id: "editor", layer: "browser", title: "Editor" },
  { id: "checker", layer: "browser", title: "Instant checker" },
  { id: "autosave", layer: "browser", title: "Autosave" },
  { id: "limits", layer: "server", title: "Sign-in and limits" },
  { id: "grammar", layer: "server", title: "Grammar check" },
  { id: "rewrite", layer: "server", title: "Rewrite" },
  { id: "documents", layer: "server", title: "Documents" },
  { id: "model", layer: "outside", title: "Language model" },
  { id: "memory", layer: "outside", title: "Short-term memory" },
  { id: "database", layer: "outside", title: "Database" },
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
      { node: "checker", what: "Your browser checks it against a dictionary, some phrasing rules and your style guide. If something is off, it gets a wavy underline.", payload: "the words, in your browser only" },
    ],
  },
  {
    id: "pausing",
    label: "Pausing",
    when: "About 1 second after you stop typing",
    never: "The whole document is never sent for checking.",
    steps: [
      { node: "editor", what: "You stop typing for a moment. We pick out the paragraph you were just in.", payload: "one paragraph" },
      { node: "limits", what: "Our server makes sure it is really you, and that nobody is sending requests too fast.", payload: "your session cookie" },
      { node: "memory", what: "Have we checked this exact paragraph recently? If so, the saved answer comes straight back and nothing else happens.", payload: "a fingerprint of the paragraph" },
      { node: "grammar", what: "If not, we get the paragraph ready, along with your style rules.", payload: "this paragraph + your style rules" },
      { node: "model", what: "The language model suggests a few small edits.", payload: "the same paragraph" },
      { node: "grammar", what: "We check every edit against your actual text, and throw away any that do not fit.", payload: "edits only" },
      { node: "editor", what: "What is left shows up as underlines. You accept or dismiss each one.", payload: "suggestions" },
    ],
  },
  {
    id: "rewriting",
    label: "Rewriting",
    when: "Only when you ask",
    never: "Text you did not select is never part of a rewrite.",
    steps: [
      { node: "editor", what: "You select a sentence and choose Shorter, Simpler, Formal or Friendlier.", payload: "your selection" },
      { node: "limits", what: "Same quick check that it is you, and that things are not going too fast.", payload: "your session cookie" },
      { node: "rewrite", what: "Only the passage you selected is passed along.", payload: "the selection only" },
      { node: "model", what: "A larger model writes the new version, one word at a time.", payload: "the new version, streamed back" },
      { node: "editor", what: "The new version appears next to the old one. Accept swaps in just that selection, and Undo brings it back.", payload: "nothing, this is the preview" },
    ],
  },
  {
    id: "saving",
    label: "Saving",
    when: "A moment after you stop typing",
    never: "A save never silently overwrites a newer copy.",
    steps: [
      { node: "autosave", what: "Your browser sends the document, along with the version number it started from.", payload: "the document + its version number" },
      { node: "limits", what: "We check it is you, and that the document is yours.", payload: "your session cookie" },
      { node: "documents", what: "If the saved copy still matches the one you started from, the save goes through. If another tab got there first, we ask you which version to keep.", payload: "version check" },
      { node: "database", what: "The document is written to storage.", payload: "the document" },
    ],
  },
];

export function JourneyMap() {
  const [id, setId] = useState("pausing");
  const journey = JOURNEYS.find((j) => j.id === id)!;
  const touched = new Set(journey.steps.map((s) => s.node));
  const layerOf = (n: NodeId) => LAYERS.find((l) => l.id === NODES.find((x) => x.id === n)!.layer)!;

  return (
    <div>
      <ToggleGroup type="single" value={id} onValueChange={(v) => v && setId(v)} variant="outline" aria-label="Choose a moment" className="max-w-full flex-wrap">
        {JOURNEYS.map((j) => (
          <ToggleGroupItem key={j.id} value={j.id} className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {j.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="mt-4 text-[15px] text-muted-foreground">{journey.when}</p>

      <div className="mt-10 space-y-6">
        {LAYERS.map((layer) => (
          <div key={layer.id} className="sm:grid sm:grid-cols-[9.5rem_1fr] sm:items-baseline sm:gap-6">
            <p className="text-[13px] text-muted-foreground">{layer.label}</p>
            <ul className="mt-2 flex flex-wrap gap-2 sm:mt-0">
              {NODES.filter((n) => n.layer === layer.id).map((n) => (
                <motion.li
                  key={n.id}
                  animate={{ opacity: touched.has(n.id) ? 1 : 0.4 }}
                  transition={{ duration: 0.25 }}
                  className={`rounded-full border px-3 py-1 text-[14px] ${touched.has(n.id) ? "border-primary bg-card" : ""}`}
                >
                  {n.title}
                </motion.li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ol aria-live="polite" className="mt-14 space-y-9 border-t pt-12">
        {journey.steps.map((s, i) => {
          const node = NODES.find((n) => n.id === s.node)!;
          return (
            <li key={`${journey.id}-${i}`} className="grid grid-cols-[2rem_1fr] gap-x-3">
              <span aria-hidden className="pt-1 font-serif text-xl leading-none text-muted-foreground">
                {i + 1}
              </span>
              <div>
                <p className="text-[13px] text-muted-foreground">
                  {node.title} · {layerOf(s.node).label.toLowerCase()}
                </p>
                <p className="mt-1.5 text-[17px] leading-relaxed">{s.what}</p>
                <p className="mt-2 text-[14px] text-muted-foreground">Sent: {s.payload}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-14 font-serif text-2xl leading-snug tracking-tight text-balance">{journey.never}</p>
    </div>
  );
}
