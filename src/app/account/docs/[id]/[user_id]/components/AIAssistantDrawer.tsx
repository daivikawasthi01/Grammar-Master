"use client";

import React, { useState } from "react";

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAction: (action: string, customPrompt?: string) => Promise<void>;
  isLoading: boolean;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  onApplyAction,
  isLoading,
}) => {
  const [customPrompt, setCustomPrompt] = useState("");

  if (!isOpen) return null;

  const handlePresetClick = (action: string) => {
    onApplyAction(action);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      onApplyAction("custom", customPrompt.trim());
      setCustomPrompt("");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-surface/90 border-l border-white/10 backdrop-blur-2xl h-full p-6 flex flex-col justify-between shadow-2xl z-50 text-on-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">auto_awesome</span>
              <h3 className="text-xl font-bold text-on-surface tracking-tight">writ.ai Copilot</h3>
            </div>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>

          <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
            Select a quick transformation action or type a custom prompt to rewrite, simplify, or rephrase your document text.
          </p>

          {/* Quick Action Chips */}
          <div className="space-y-3 mb-8">
            <h4 className="font-mono text-xs text-on-surface-variant/80 uppercase tracking-widest font-semibold">
              Quick AI Actions
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-primary-container/20 border border-white/5 hover:border-primary/30 text-sm font-medium text-on-surface transition-all flex items-center gap-3 group"
                onClick={() => handlePresetClick("fix_all")}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
                <span>Fix All Grammar & Typos</span>
              </button>

              <button
                className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-secondary/20 border border-white/5 hover:border-secondary/30 text-sm font-medium text-on-surface transition-all flex items-center gap-3 group"
                onClick={() => handlePresetClick("shorten")}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined text-secondary text-[18px]">content_cut</span>
                <span>Make Concise & Direct</span>
              </button>

              <button
                className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-tertiary/20 border border-white/5 hover:border-tertiary/30 text-sm font-medium text-on-surface transition-all flex items-center gap-3 group"
                onClick={() => handlePresetClick("professional")}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined text-tertiary text-[18px]">work</span>
                <span>Rewrite in Executive Tone</span>
              </button>

              <button
                className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 text-sm font-medium text-on-surface transition-all flex items-center gap-3 group"
                onClick={() => handlePresetClick("friendly")}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">handshake</span>
                <span>Warm & Friendly Tone</span>
              </button>

              <button
                className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-amber-500/20 border border-white/5 hover:border-amber-500/30 text-sm font-medium text-on-surface transition-all flex items-center gap-3 group"
                onClick={() => handlePresetClick("make_persuasive")}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined text-amber-400 text-[18px]">ads_click</span>
                <span>Make Persuasive</span>
              </button>

              <button
                className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-purple-500/20 border border-white/5 hover:border-purple-500/30 text-sm font-medium text-on-surface transition-all flex items-center gap-3 group"
                onClick={() => handlePresetClick("summarize")}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined text-purple-400 text-[18px]">summarize</span>
                <span>Summarize Document</span>
              </button>
            </div>
          </div>
        </div>

        {/* Custom Prompt Form */}
        <form onSubmit={handleCustomSubmit} className="pt-4 border-t border-white/5">
          <h4 className="font-mono text-xs text-on-surface-variant/80 uppercase tracking-widest font-semibold mb-2">
            Custom AI Prompt
          </h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="e.g. Make this sound like a tech press release..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full bg-surface-container-low/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-inverse-primary to-primary-container text-white py-3 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(160,120,255,0.3)] hover:opacity-90 transition-all border border-white/10 disabled:opacity-50"
              disabled={isLoading || !customPrompt.trim()}
            >
              {isLoading ? "Generating..." : "Apply AI Rewrite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
