"use client";

import React, { useState } from "react";
import Link from "next/link";

interface GrammarlyHeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  isSaving: boolean;
  lastSaved: string;
  overallScore: number;
  onToggleAIAssistant: () => void;
  onExport: (format: "docx" | "pdf" | "txt") => void;
  userId: string;
}

export const GrammarlyHeader: React.FC<GrammarlyHeaderProps> = ({
  title,
  onTitleChange,
  isSaving,
  lastSaved,
  overallScore,
  onToggleAIAssistant,
  onExport,
  userId,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim() && tempTitle !== title) {
      onTitleChange(tempTitle.trim());
    }
  };

  return (
    <header className="bg-surface/50 font-body-md text-body-md docked full-width top-0 h-16 border-b border-white/5 backdrop-blur-2xl flex justify-between items-center px-6 w-full fixed top-0 z-50">
      <div className="flex items-center gap-4">
        <Link
          href="/account"
          className="text-on-surface-variant hover:bg-white/5 transition-colors p-2 rounded-full flex items-center justify-center"
          title="Back to Dashboard"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>

        <div className="font-headline text-2xl font-bold text-on-surface flex items-center gap-2 tracking-tight">
          <span className="material-symbols-outlined text-primary text-[24px]">auto_awesome</span>
          <span>writ.ai</span>
        </div>

        <div className="h-6 w-px bg-white/10 mx-2" />

        <div className="flex items-center gap-3">
          {isEditingTitle ? (
            <input
              type="text"
              className="bg-surface-container-high/80 border border-white/20 rounded-lg px-3 py-1 text-sm text-on-surface focus:outline-none focus:border-primary"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
              autoFocus
            />
          ) : (
            <span
              className="text-on-surface-variant font-medium text-sm cursor-pointer hover:text-on-surface flex items-center gap-1.5 transition-colors"
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename"
            >
              {title || "Quarterly_AI_Report.docx"}
              <span className="material-symbols-outlined text-[14px] opacity-40">edit</span>
            </span>
          )}

          <span className="text-xs text-on-surface-variant/50">
            {isSaving ? "Saving..." : lastSaved ? `Saved (${lastSaved})` : "Saved"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Performance Score Badge */}
        <div className="flex items-center gap-2 bg-white/[0.03] px-3.5 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
          <span className="text-primary font-bold text-base">{overallScore}</span>
          <span className="text-on-surface-variant text-sm">Score</span>
        </div>

        {/* Export Button */}
        <div className="relative">
          <button
            className="text-on-surface-variant hover:bg-white/5 transition-colors px-4 py-2 rounded-full font-medium text-sm border border-white/5 flex items-center gap-1"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <span>Export</span>
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-surface-container-high border border-white/10 rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-xl">
              <button
                className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2"
                onClick={() => {
                  onExport("docx");
                  setShowExportMenu(false);
                }}
              >
                <span className="material-symbols-outlined text-[18px]">description</span>
                Word (.docx)
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2"
                onClick={() => {
                  onExport("pdf");
                  setShowExportMenu(false);
                }}
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                PDF (.pdf)
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2"
                onClick={() => {
                  onExport("txt");
                  setShowExportMenu(false);
                }}
              >
                <span className="material-symbols-outlined text-[18px]">text_snippet</span>
                Plain Text (.txt)
              </button>
            </div>
          )}
        </div>

        {/* Primary AI Button */}
        <button
          onClick={onToggleAIAssistant}
          className="bg-primary-container text-on-primary-container px-4 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(160,120,255,0.3)] hover:scale-95 duration-200 transition-all flex items-center gap-2 border border-white/10 text-sm"
        >
          ✨ Ask writ.ai
        </button>
      </div>
    </header>
  );
};
