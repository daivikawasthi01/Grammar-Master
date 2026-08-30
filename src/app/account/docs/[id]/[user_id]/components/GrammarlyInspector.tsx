"use client";

import React, { useState } from "react";
import { SuggestionItem, ToneItem } from "@/app/api/analyze-document/route";

interface GrammarlyInspectorProps {
  overallScore: number;
  suggestions: SuggestionItem[];
  metrics: {
    wordCount: number;
    charCount: number;
    sentenceCount: number;
    readingTimeMin: number;
    speakingTimeMin: number;
    readabilityScore: number;
    readabilityGrade: string;
  };
  tones: ToneItem[];
  categories: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
  onApplySuggestion: (suggestion: SuggestionItem) => void;
  onDismissSuggestion: (id: string) => void;
}

export const GrammarlyInspector: React.FC<GrammarlyInspectorProps> = ({
  overallScore,
  suggestions,
  metrics,
  tones,
  categories,
  onApplySuggestion,
  onDismissSuggestion,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredSuggestions =
    activeCategory === "all"
      ? suggestions
      : suggestions.filter((s) => s.category === activeCategory);

  return (
    <aside className="w-[380px] bg-surface/40 border-l border-white/5 backdrop-blur-3xl shadow-2xl flex flex-col h-full flex-shrink-0 z-30">
      {/* Inspector Header */}
      <div className="p-6 border-b border-white/5">
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-4">Inspector</h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-[3px] border-primary flex items-center justify-center font-bold text-xl text-primary shadow-[0_0_15px_rgba(208,188,255,0.2)]">
            {overallScore}
          </div>
          <div>
            <span className="text-on-surface-variant font-medium text-sm block">Performance Score</span>
            <span className="text-xs text-on-surface-variant/70 block mt-0.5">
              {suggestions.length === 0 ? "Document looks great!" : `${suggestions.length} issue${suggestions.length > 1 ? "s" : ""} detected`}
            </span>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex border-b border-white/5 px-4 overflow-x-auto gap-2 py-3 scrollbar-none">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 rounded-full font-medium whitespace-nowrap text-sm transition-colors ${
            activeCategory === "all" ? "bg-white/10 text-on-surface" : "text-on-surface-variant hover:bg-white/5"
          }`}
        >
          All Issues
        </button>
        <button
          onClick={() => setActiveCategory("correctness")}
          className={`px-4 py-2 rounded-full font-medium whitespace-nowrap flex items-center gap-1.5 text-sm transition-colors ${
            activeCategory === "correctness" ? "bg-error/20 text-error border border-error/20" : "text-on-surface-variant hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Correctness
        </button>
        <button
          onClick={() => setActiveCategory("clarity")}
          className={`px-4 py-2 rounded-full font-medium whitespace-nowrap flex items-center gap-1.5 text-sm transition-colors ${
            activeCategory === "clarity" ? "bg-secondary/20 text-secondary border border-secondary/20" : "text-on-surface-variant hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          Clarity
        </button>
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-4xl text-primary opacity-60 mb-2">auto_awesome</span>
            <p className="text-on-surface-variant text-sm">No issues found. Excellent writing!</p>
          </div>
        ) : (
          filteredSuggestions.map((sug) => {
            const isCorrectness = sug.category === "correctness";
            return (
              <div
                key={sug.id}
                className="bg-white/[0.02] backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden flex flex-col transition-all hover:bg-white/[0.04]"
              >
                <div className="p-5 relative">
                  <div className="flex justify-between items-center mb-3">
                    <span
                      className={`text-xs font-mono font-semibold uppercase tracking-widest flex items-center gap-1.5 ${
                        isCorrectness ? "text-error" : "text-secondary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isCorrectness ? "spellcheck" : "visibility"}
                      </span>
                      {isCorrectness ? "Spelling" : "Wordiness"}
                    </span>
                    <button
                      onClick={() => onDismissSuggestion(sug.id)}
                      className="text-outline-variant hover:text-on-surface transition-colors p-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                  <p className="text-on-surface-variant mb-4 text-sm leading-relaxed">
                    {isCorrectness ? "Change " : "Simplify "}
                    <span className="line-through text-outline">{sug.originalText}</span> to{" "}
                    <strong className="text-on-surface font-semibold">{sug.replacementText}</strong>.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => onDismissSuggestion(sug.id)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-on-surface py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => onApplySuggestion(sug)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${
                        isCorrectness
                          ? "bg-error/10 hover:bg-error/20 text-error border-error/10"
                          : "bg-secondary/10 hover:bg-secondary/20 text-secondary border-secondary/10"
                      }`}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Document Stats */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <h3 className="text-xs font-mono uppercase tracking-widest text-outline-variant font-semibold mb-4">
            Document Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 p-4 rounded-2xl">
              <div className="text-on-surface-variant text-sm mb-1">Words</div>
              <div className="font-headline text-2xl font-bold text-on-surface">{metrics.wordCount || 452}</div>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 p-4 rounded-2xl">
              <div className="text-on-surface-variant text-sm mb-1">Readability</div>
              <div className="font-headline text-2xl font-bold text-on-surface">{metrics.readabilityGrade || "Grade 10"}</div>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 p-4 rounded-2xl col-span-2">
              <div className="text-on-surface-variant text-sm mb-3">Detected Tone</div>
              <div className="flex flex-wrap gap-2">
                {tones.map((t, idx) => (
                  <span
                    key={idx}
                    className="bg-white/5 px-4 py-1.5 rounded-full text-sm border border-white/5 text-on-surface"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
