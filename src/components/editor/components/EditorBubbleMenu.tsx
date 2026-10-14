"use client";

import React, { useState } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { type Editor } from "@tiptap/react";

interface EditorBubbleMenuProps {
  editor: Editor | null;
}

export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedResult, setStreamedResult] = useState<string>("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  if (!editor) return null;

  const handleRewrite = async (action: string) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    if (!selectedText || selectedText.trim().length === 0) return;

    setActiveAction(action);
    setStreamedResult("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectedText,
          action,
        }),
      });

      if (!res.ok) {
        throw new Error("Rewrite failed");
      }

      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamedResult(fullText);
      }
    } catch (err) {
      console.error("Rewrite stream error:", err);
      setStreamedResult("Failed to generate rewrite. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAcceptRewrite = () => {
    if (!streamedResult || !editor) return;
    const { from, to } = editor.state.selection;
    editor.chain().focus().insertContentAt({ from, to }, streamedResult).run();
    setStreamedResult("");
    setActiveAction(null);
  };

  const handleCancelRewrite = () => {
    setStreamedResult("");
    setActiveAction(null);
  };

  return (
    <BubbleMenu
      editor={editor}
      className="z-50"
    >
      <div className="bg-surface-container-high/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-2 max-w-sm">
        {/* Action Buttons Toolbar */}
        {!streamedResult && !isStreaming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleRewrite("concise")}
              className="px-2.5 py-1 text-xs rounded-xl hover:bg-white/10 text-on-surface flex items-center gap-1 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-[14px] text-primary">compress</span>
              Concise
            </button>
            <button
              onClick={() => handleRewrite("formal")}
              className="px-2.5 py-1 text-xs rounded-xl hover:bg-white/10 text-on-surface flex items-center gap-1 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-[14px] text-secondary">business_center</span>
              Formal
            </button>
            <button
              onClick={() => handleRewrite("confident")}
              className="px-2.5 py-1 text-xs rounded-xl hover:bg-white/10 text-on-surface flex items-center gap-1 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-[14px] text-amber-400">bolt</span>
              Confident
            </button>
            <button
              onClick={() => handleRewrite("fix_grammar")}
              className="px-2.5 py-1 text-xs rounded-xl hover:bg-white/10 text-on-surface flex items-center gap-1 transition-colors font-medium"
            >
              <span className="material-symbols-outlined text-[14px] text-emerald-400">spellcheck</span>
              Fix
            </button>
          </div>
        ) : (
          /* Streamed Result Preview Container */
          <div className="p-3 space-y-3 min-w-[280px]">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                AI Rewrite ({activeAction})
              </span>
              {isStreaming && (
                <span className="text-[10px] text-on-surface-variant font-mono">Generating...</span>
              )}
            </div>

            <p className="text-xs text-on-surface leading-relaxed max-h-48 overflow-y-auto">
              {streamedResult}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
              <button
                onClick={handleCancelRewrite}
                className="px-2.5 py-1 text-xs rounded-lg hover:bg-white/10 text-on-surface-variant transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptRewrite}
                disabled={isStreaming || !streamedResult}
                className="px-3 py-1 text-xs rounded-lg bg-primary text-on-primary font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Replace
              </button>
            </div>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
};
