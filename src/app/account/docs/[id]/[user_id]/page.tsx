"use client";

import React, { useEffect, useState, use, useCallback, useRef } from "react";
import useDocument from "@/app/hooks/useDocument";
import { HandleSaveDocument } from "@/app/helpers/SaveDocument";
import useAuth from "@/app/hooks/useAuth";
import axios from "axios";

import { GrammarlyHeader } from "./components/GrammarlyHeader";
import { GrammarlyInspector } from "./components/GrammarlyInspector";
import { AIAssistantDrawer } from "./components/AIAssistantDrawer";
import { SuggestionItem, ToneItem } from "@/app/api/analyze-document/route";

interface DocsProps {
  params: Promise<{
    id: string;
    user_id: string;
  }>;
}

const stripHtml = (html: string) => {
  if (typeof window === "undefined") return html;
  const tmp = window.document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  {
    id: "sug-1",
    originalText: "teh",
    replacementText: "the",
    category: "correctness",
    title: "Spelling",
    description: "Change teh to the.",
    explanation: "'teh' is a common typo for 'the'.",
  },
  {
    id: "sug-2",
    originalText: "due to the fact that",
    replacementText: "because",
    category: "clarity",
    title: "Wordiness",
    description: "Simplify due to the fact that to because.",
    explanation: "'because' is more concise.",
  },
];

const Doc: React.FC<DocsProps> = ({ params }) => {
  const { id, user_id } = use(params);
  const { isLogged } = useAuth();
  const { document: docData, error, isLoading } = useDocument(user_id, id);

  const [text, setText] = useState<string>(
    "The integration of generative models into the core workflow has yielded significant productivity gains. However, teh initial rollout faced some resistance due to the fact that comprehensive training materials were delayed.\n\nMoving forward, our strategy relies on leveraging these tools not just for efficiency, but for enhancing creative output. We must ensure that the human element remains central to our operations."
  );
  const [title, setTitle] = useState<string>("Quarterly_AI_Report.docx");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");

  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Analysis State
  const [overallScore, setOverallScore] = useState<number>(85);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>(DEFAULT_SUGGESTIONS);
  const [metrics, setMetrics] = useState({
    wordCount: 452,
    charCount: 2840,
    sentenceCount: 24,
    readingTimeMin: 2,
    speakingTimeMin: 3,
    readabilityScore: 88,
    readabilityGrade: "Grade 10",
  });
  const [tones, setTones] = useState<ToneItem[]>([
    { name: "Professional", score: 85, color: "#d0bcff" },
    { name: "Direct", score: 75, color: "#adc6ff" },
  ]);
  const [categories, setCategories] = useState({
    correctness: 1,
    clarity: 1,
    engagement: 0,
    delivery: 0,
  });

  // Track applied/dismissed items to prevent re-suggesting or looping AI calls
  const handledItemsRef = useRef<Set<string>>(new Set());
  const isAcceptingRef = useRef<boolean>(false);

const cleanHtmlTags = (raw: string): string => {
  if (!raw) return "";
  if (!raw.includes("<") || !raw.includes(">")) return raw;
  return raw
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

  // Load document
  useEffect(() => {
    if (docData) {
      if (docData.text) setText(cleanHtmlTags(docData.text));
      if (docData.title) setTitle(docData.title);
    }
  }, [docData]);

  // Auto-save logic
  useEffect(() => {
    const saveTimeout = setTimeout(async () => {
      if (!docData || (!text && !title)) return;
      if (text !== docData.text || title !== docData.title) {
        setIsSaving(true);
        try {
          const success = await HandleSaveDocument(user_id, id, title, text);
          if (success) {
            setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          }
        } catch (err) {
          console.error("Save document error:", err);
        } finally {
          setIsSaving(false);
        }
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [text, title, docData, user_id, id]);

  // Document Analysis Engine trigger
  const runAnalysis = useCallback(async (currentText: string) => {
    // If we just accepted a suggestion, skip full AI re-trigger to prevent score drop reset
    if (isAcceptingRef.current) {
      isAcceptingRef.current = false;
      return;
    }

    try {
      const cleanText = stripHtml(currentText);
      const res = await axios.post("/api/analyze-document", {
        text: cleanText,
        language: docData?.language || "American English",
        _id: id,
      });

      if (res.data) {
        // Filter out any suggestions the user already fixed or dismissed
        const rawSuggestions: SuggestionItem[] = res.data.suggestions || [];
        const filtered = rawSuggestions.filter(
          (s) =>
            s.originalText &&
            cleanText.includes(s.originalText) &&
            !handledItemsRef.current.has(s.originalText.toLowerCase()) &&
            !handledItemsRef.current.has(s.id)
        );

        setSuggestions(filtered);

        if (filtered.length === 0) {
          setOverallScore(100);
        } else {
          setOverallScore(res.data.overallScore || Math.max(60, 100 - filtered.length * 8));
        }

        if (res.data.metrics) setMetrics(res.data.metrics);
        if (res.data.tones) setTones(res.data.tones);
        if (res.data.categories) setCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Analysis route error:", err);
    }
  }, [docData, id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      runAnalysis(text);
    }, 600);

    return () => clearTimeout(timeout);
  }, [text, runAnalysis]);

  // Handle Suggestion Actions (Accept / Dismiss)
  const handleApplySuggestion = (sug: SuggestionItem) => {
    if (!sug.originalText) return;
    isAcceptingRef.current = true;
    handledItemsRef.current.add(sug.originalText.toLowerCase());
    handledItemsRef.current.add(sug.replacementText.toLowerCase());
    handledItemsRef.current.add(sug.id);

    const cleanText = stripHtml(text);
    const newText = cleanText.replace(sug.originalText, sug.replacementText);
    setText(newText);

    setSuggestions((prev) => {
      const updated = prev.filter((item) => item.id !== sug.id && item.originalText !== sug.originalText);
      const remainingCount = updated.length;
      setOverallScore(remainingCount === 0 ? 100 : Math.max(50, Math.min(99, 100 - remainingCount * 8)));
      return updated;
    });
  };

  const handleDismissSuggestion = (sugId: string) => {
    isAcceptingRef.current = true;
    handledItemsRef.current.add(sugId);

    setSuggestions((prev) => {
      const sug = prev.find((s) => s.id === sugId);
      if (sug?.originalText) {
        handledItemsRef.current.add(sug.originalText.toLowerCase());
      }
      const updated = prev.filter((item) => item.id !== sugId);
      const remainingCount = updated.length;
      setOverallScore(remainingCount === 0 ? 100 : Math.max(50, Math.min(99, 100 - remainingCount * 8)));
      return updated;
    });
  };

  // AI Drawer Action handler
  const handleAIAction = async (action: string, customPrompt?: string) => {
    setAiLoading(true);
    try {
      const cleanText = stripHtml(text);
      const res = await axios.post("/api/ai-text-modify", {
        text: cleanText,
        action,
        customPrompt,
        _id: user_id,
      });

      if (res.data?.success?.text) {
        setText(res.data.success.text);
      }
    } catch (err) {
      console.error("AI action error:", err);
    } finally {
      setAiLoading(false);
      setShowAIAssistant(false);
    }
  };

  // Export Document Handler
  const handleExport = (format: "docx" | "pdf" | "txt") => {
    const cleanText = stripHtml(text);
    const filename = `${title || "document"}.${format === "docx" ? "docx" : format === "pdf" ? "pdf" : "txt"}`;

    if (format === "pdf") {
      window.print();
      return;
    }

    const mime = format === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "text/plain";
    const blob = new Blob([cleanText], { type: `${mime};charset=utf-8` });
    const link = window.document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Split paragraphs and render with interactive highlights
  const paragraphs = text.split("\n\n");

  return (
    <div className="bg-background text-on-surface h-screen overflow-hidden flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary-container relative">
      {/* TopAppBar */}
      <GrammarlyHeader
        title={title}
        onTitleChange={setTitle}
        isSaving={isSaving}
        lastSaved={lastSaved}
        overallScore={overallScore}
        onToggleAIAssistant={() => setShowAIAssistant(true)}
        onExport={handleExport}
        userId={user_id}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex mt-16 h-[calc(100vh-64px)] relative">
        {/* Spatially Layered Background Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary-container/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[20%] right-[30%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />
        </div>

        {/* Left Canvas (Editor) */}
        <section className="flex-1 flex justify-center overflow-y-auto relative p-12 z-10">
          <div className="w-full max-w-[800px] text-body-lg text-on-surface-variant leading-[1.8] relative pb-32 mt-8">
            {/* Title Editable */}
            <h1
              className="text-4xl md:text-5xl font-bold font-headline mb-10 outline-none text-on-surface tracking-tight"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setTitle(e.currentTarget.innerText)}
            >
              {title.replace(/\.[^/.]+$/, "") || "Quarterly AI Impact Assessment"}
            </h1>

            {/* Paragraphs with live interactive suggestion pills */}
            <div className="space-y-8 min-h-[400px]">
              {paragraphs.map((para, pIdx) => {
                // Find applicable suggestions in this paragraph
                let elements: React.ReactNode[] = [para];

                suggestions.forEach((sug) => {
                  if (!sug.originalText || !para.includes(sug.originalText)) return;
                  const newElements: React.ReactNode[] = [];
                  elements.forEach((el) => {
                    if (typeof el === "string") {
                      const parts = el.split(sug.originalText);
                      parts.forEach((part, i) => {
                        newElements.push(part);
                        if (i < parts.length - 1) {
                          const isError = sug.category === "correctness";
                          newElements.push(
                            <span
                              key={`${sug.id}-${i}`}
                              onClick={() => handleApplySuggestion(sug)}
                              className={`px-1.5 py-0.5 rounded cursor-pointer relative group transition-colors inline-block font-medium ${
                                isError
                                  ? "bg-error/10 text-error hover:bg-error/20"
                                  : "bg-secondary/10 text-secondary hover:bg-secondary/20"
                              }`}
                            >
                              {sug.originalText}
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-surface-container-high border border-white/10 p-3 rounded-xl text-sm whitespace-nowrap shadow-2xl z-20 text-on-surface pointer-events-none">
                                {isError ? "Change to: " : "Simplify to: "}
                                <strong className={isError ? "text-error font-bold" : "text-secondary font-bold"}>
                                  {sug.replacementText}
                                </strong>
                              </span>
                            </span>
                          );
                        }
                      });
                    } else {
                      newElements.push(el);
                    }
                  });
                  elements = newElements;
                });

                return (
                  <p
                    key={pIdx}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => {
                      // User actively typing: clear handled items ref for fresh analysis
                      handledItemsRef.current.clear();
                      const newParas = [...paragraphs];
                      newParas[pIdx] = e.currentTarget.innerText;
                      setText(newParas.join("\n\n"));
                    }}
                    className="outline-none text-lg text-on-surface-variant leading-[1.8]"
                  >
                    {elements}
                  </p>
                );
              })}
            </div>

            {/* Floating Rich Formatting Toolbar */}
            <div className="fixed bottom-10 left-[32.5%] -translate-x-1/2 bg-gradient-to-b from-white/[0.08] to-transparent backdrop-blur-3xl border border-white/10 p-2 rounded-full flex items-center gap-2 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] z-40">
              <button
                className="p-2 rounded-full hover:bg-white/10 text-on-surface transition-colors"
                title="Bold"
                onClick={() => document.execCommand("bold")}
              >
                <span className="material-symbols-outlined text-[20px]">format_bold</span>
              </button>
              <button
                className="p-2 rounded-full hover:bg-white/10 text-on-surface transition-colors"
                title="Italic"
                onClick={() => document.execCommand("italic")}
              >
                <span className="material-symbols-outlined text-[20px]">format_italic</span>
              </button>
              <button
                className="p-2 rounded-full hover:bg-white/10 text-on-surface transition-colors"
                title="Underline"
                onClick={() => document.execCommand("underline")}
              >
                <span className="material-symbols-outlined text-[20px]">format_underlined</span>
              </button>

              <div className="w-px h-6 bg-white/10 self-center mx-1" />

              <button
                className="p-2 rounded-full hover:bg-white/10 text-on-surface transition-colors"
                title="Bullet List"
                onClick={() => document.execCommand("insertUnorderedList")}
              >
                <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
              </button>
              <button
                className="p-2 rounded-full hover:bg-white/10 text-on-surface transition-colors"
                title="Numbered List"
                onClick={() => document.execCommand("insertOrderedList")}
              >
                <span className="material-symbols-outlined text-[20px]">format_list_numbered</span>
              </button>

              <div className="w-px h-6 bg-white/10 self-center mx-1" />

              <button
                onClick={() => setShowAIAssistant(true)}
                className="p-2 rounded-full hover:bg-white/10 text-primary transition-colors pulse-glow flex items-center justify-center"
                title="Ask writ.ai Copilot"
              >
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              </button>
            </div>
          </div>
        </section>

        {/* Right Inspector Panel */}
        <GrammarlyInspector
          overallScore={overallScore}
          suggestions={suggestions}
          metrics={metrics}
          tones={tones}
          categories={categories}
          onApplySuggestion={handleApplySuggestion}
          onDismissSuggestion={handleDismissSuggestion}
        />
      </main>

      {/* Slide-out AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        onApplyAction={handleAIAction}
        isLoading={aiLoading}
      />
    </div>
  );
};

export default Doc;
