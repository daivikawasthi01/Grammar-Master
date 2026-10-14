"use client";

import React from "react";
import { Suggestion, acceptSuggestion, dismissSuggestion } from "../extensions/Suggestions";
import { Editor } from "@tiptap/react";

interface SuggestionPopoverProps {
  editor: Editor;
  suggestion: Suggestion | null;
  position: { top: number; left: number } | null;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  correctness: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
  clarity: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  engagement: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  delivery: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  style: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
};

export const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({
  editor,
  suggestion,
  position,
  onClose,
}) => {
  if (!suggestion || !position) return null;

  const colorConfig = CATEGORY_COLORS[suggestion.category] || CATEGORY_COLORS.correctness;

  const handleAccept = () => {
    acceptSuggestion(editor, suggestion.id);
    onClose();
  };

  const handleDismiss = () => {
    dismissSuggestion(editor, suggestion.id);
    onClose();
  };

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2 mt-2 w-80 bg-surface-container-high/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
        <span
          className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}
        >
          {suggestion.category}
        </span>
        <button
          onClick={onClose}
          className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg text-xs"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-on-surface">{suggestion.title}</h4>
        {suggestion.explanation && (
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {suggestion.explanation}
          </p>
        )}

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2 text-xs font-mono">
          <span className="line-through text-rose-400/80">{suggestion.original}</span>
          <span className="text-on-surface-variant">→</span>
          <span className="text-emerald-400 font-bold">{suggestion.replacement}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-white/5">
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 text-xs rounded-xl hover:bg-white/5 text-on-surface-variant transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={handleAccept}
          className="px-4 py-1.5 text-xs rounded-xl bg-primary text-on-primary font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          Accept
        </button>
      </div>
    </div>
  );
};
