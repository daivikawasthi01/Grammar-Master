"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  SuggestionsExtension,
  setEditorSuggestions,
  Suggestion,
  findSuggestion,
  toProseMirrorRange,
} from "./extensions/Suggestions";
import { useAutosave, SaveState } from "./hooks/useAutosave";
import { EditorBubbleMenu } from "./components/EditorBubbleMenu";
import { SuggestionPopover } from "./components/SuggestionPopover";

interface TipTapEditorProps {
  docId: string;
  initialTitle: string;
  initialContent: Record<string, any>;
  initialVersion: number;
  onTitleChange: (newTitle: string) => void;
  onAnalysisUpdate?: (data: {
    overallScore: number;
    metrics: any;
    tones: any[];
    categories: any;
    suggestions: Suggestion[];
  }) => void;
  onAcceptAll?: () => void;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  docId,
  initialTitle,
  initialContent,
  initialVersion,
  onTitleChange,
  onAnalysisUpdate,
}) => {
  const [title, setTitle] = useState(initialTitle || "Untitled Document");
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const isLoadedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start typing or drafting your document...",
      }),
      SuggestionsExtension,
    ],
    content: initialContent && initialContent.type ? initialContent : {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "" }],
        },
      ],
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[500px] text-on-surface leading-relaxed text-base font-body",
      },
      handleClick(view, pos, event) {
        const target = event.target as HTMLElement | null;
        if (target && target.classList.contains("sg")) {
          const sugId = target.getAttribute("data-suggestion-id");
          if (sugId && view.state) {
            const deco = findSuggestion(view.state, sugId);
            if (deco && (deco.spec as any)?.s) {
              const rect = target.getBoundingClientRect();
              setActiveSuggestion((deco.spec as any).s);
              setPopoverPos({
                top: rect.bottom + window.scrollY,
                left: rect.left + rect.width / 2,
              });
              return true;
            }
          }
        }
        setActiveSuggestion(null);
        return false;
      },
    },
    onUpdate({ editor: currentEditor }) {
      markDirty();
      triggerAnalysis(currentEditor.getText());
    },
  });

  const { state: saveState, lastSavedAt, markDirty } = useAutosave({
    docId,
    getContent: () => editor?.getJSON() || {},
    getPlainText: () => editor?.getText() || "",
    getTitle: () => title,
    loaded: isLoadedRef.current,
    initialVersion,
  });

  const triggerAnalysis = useCallback(
    async (text: string) => {
      if (!editor || !text.trim()) {
        if (editor) setEditorSuggestions(editor, []);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentReqId = ++requestIdRef.current;

      try {
        const res = await fetch("/api/analyze-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            _id: docId,
            requestId: String(currentReqId),
          }),
          signal: controller.signal,
        });

        if (currentReqId !== requestIdRef.current) return;

        if (res.ok) {
          const data = await res.json();
          const rawSuggestions: any[] = data.suggestions || [];

          // Map raw suggestions into absolute ProseMirror positions
          const mapped: Suggestion[] = [];
          editor.state.doc.descendants((node, pos) => {
            if (node.isTextblock) {
              const blockText = node.textContent;
              for (const s of rawSuggestions) {
                if (s.originalText && blockText.includes(s.originalText)) {
                  const range = toProseMirrorRange(pos, blockText, s.originalText, 0);
                  if (range) {
                    mapped.push({
                      id: s.id,
                      from: range.from,
                      to: range.to,
                      original: s.originalText,
                      replacement: s.replacementText,
                      category: s.category || "correctness",
                      title: s.title || "Suggestion",
                      message: s.description || "",
                      explanation: s.explanation || "",
                    });
                  }
                }
              }
            }
          });

          setEditorSuggestions(editor, mapped);

          if (onAnalysisUpdate) {
            onAnalysisUpdate({
              overallScore: data.overallScore || 100,
              metrics: data.metrics || {},
              tones: data.tones || [],
              categories: data.categories || {},
              suggestions: mapped,
            });
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Editor analysis error:", err);
      }
    },
    [docId, editor, onAnalysisUpdate]
  );

  // Initial analysis on mount once editor is ready
  useEffect(() => {
    if (editor && editor.getText().trim()) {
      triggerAnalysis(editor.getText());
    }
  }, [editor, triggerAnalysis]);

  const handleTitleBlur = () => {
    onTitleChange(title);
    markDirty();
  };

  const getSaveBadge = (status: SaveState) => {
    switch (status) {
      case "saving":
        return (
          <span className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            Saving...
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
            <span className="material-symbols-outlined text-[14px]">check</span>
            {lastSavedAt ? `Saved ${lastSavedAt}` : "Saved"}
          </span>
        );
      case "conflict":
        return (
          <span className="flex items-center gap-1 text-xs text-amber-400 font-mono font-semibold">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            Version Conflict (Reload to sync)
          </span>
        );
      case "offline":
        return (
          <span className="flex items-center gap-1 text-xs text-on-surface-variant font-mono">
            <span className="material-symbols-outlined text-[14px]">cloud_off</span>
            Offline
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1 text-xs text-rose-400 font-mono">
            <span className="material-symbols-outlined text-[14px]">error</span>
            Save error (retrying...)
          </span>
        );
      default:
        return (
          <span className="text-xs text-on-surface-variant/50 font-mono">
            {lastSavedAt ? `Saved ${lastSavedAt}` : "Saved"}
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col relative">
      {/* Title & Save State Bar */}
      <div className="flex items-center justify-between gap-4 pb-6 border-b border-white/5 mb-8">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Untitled Document"
          className="bg-transparent text-3xl md:text-4xl font-bold font-headline text-on-surface tracking-tight focus:outline-none w-full placeholder:text-on-surface-variant/30"
        />
        <div className="shrink-0">{getSaveBadge(saveState)}</div>
      </div>

      {/* Formatting Toolbar */}
      {editor && (
        <div className="sticky top-20 z-20 bg-surface-container/80 backdrop-blur-xl border border-white/5 rounded-2xl p-1.5 mb-6 flex items-center gap-1 flex-wrap shadow-lg">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-xl text-xs font-bold transition-colors ${
              editor.isActive("bold") ? "bg-primary text-on-primary" : "text-on-surface hover:bg-white/5"
            }`}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-xl text-xs italic transition-colors ${
              editor.isActive("italic") ? "bg-primary text-on-primary" : "text-on-surface hover:bg-white/5"
            }`}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              editor.isActive("heading", { level: 1 }) ? "bg-primary text-on-primary" : "text-on-surface hover:bg-white/5"
            }`}
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              editor.isActive("heading", { level: 2 }) ? "bg-primary text-on-primary" : "text-on-surface hover:bg-white/5"
            }`}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-xl text-xs transition-colors flex items-center ${
              editor.isActive("bulletList") ? "bg-primary text-on-primary" : "text-on-surface hover:bg-white/5"
            }`}
            title="Bullet List"
          >
            <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded-xl text-xs transition-colors flex items-center ${
              editor.isActive("blockquote") ? "bg-primary text-on-primary" : "text-on-surface hover:bg-white/5"
            }`}
            title="Quote"
          >
            <span className="material-symbols-outlined text-[16px]">format_quote</span>
          </button>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded-xl text-xs text-on-surface hover:bg-white/5 disabled:opacity-30 transition-colors flex items-center"
            title="Undo (Ctrl+Z)"
          >
            <span className="material-symbols-outlined text-[16px]">undo</span>
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded-xl text-xs text-on-surface hover:bg-white/5 disabled:opacity-30 transition-colors flex items-center"
            title="Redo (Ctrl+Y)"
          >
            <span className="material-symbols-outlined text-[16px]">redo</span>
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="relative min-h-[500px]">
        {editor && <EditorBubbleMenu editor={editor} />}
        <EditorContent editor={editor} />
        {editor && (
          <SuggestionPopover
            editor={editor}
            suggestion={activeSuggestion}
            position={popoverPos}
            onClose={() => setActiveSuggestion(null)}
          />
        )}
      </div>
    </div>
  );
};
