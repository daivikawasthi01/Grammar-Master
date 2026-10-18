"use client";

import React, { useState, use } from "react";
import useDocument from "@/app/hooks/useDocument";
import useAuth from "@/app/hooks/useAuth";
import { EditorHeader } from "./components/EditorHeader";
import { EditorInspector } from "./components/EditorInspector";
import { AIAssistantDrawer } from "./components/AIAssistantDrawer";
import { SuggestionItem, ToneItem } from "@/app/api/analyze-document/route";
import { TipTapEditor } from "@/components/editor/TipTapEditor";
import Loading from "@/app/components/Loading";

interface DocsProps {
  params: Promise<{
    id: string;
    user_id: string;
  }>;
}

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  {
    id: "sug-init-1",
    originalText: "teh",
    replacementText: "the",
    category: "correctness",
    title: "Spelling",
    description: "Change teh to the.",
    explanation: "'teh' is a common typo for 'the'.",
  },
  {
    id: "sug-init-2",
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
  const { document: docData, error, isLoading, isLoaded } = useDocument(user_id, id);

  const [title, setTitle] = useState<string>("Untitled Document");
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Analysis State
  const [overallScore, setOverallScore] = useState<number>(85);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>(DEFAULT_SUGGESTIONS);
  const [metrics, setMetrics] = useState({
    wordCount: 0,
    charCount: 0,
    sentenceCount: 0,
    readingTimeMin: 1,
    speakingTimeMin: 1,
    readabilityScore: 88,
    readabilityGrade: "Grade 8-9",
  });
  const [tones, setTones] = useState<ToneItem[]>([
    { name: "Professional", score: 85, color: "#d0bcff" },
    { name: "Direct", score: 75, color: "#adc6ff" },
  ]);
  const [categories, setCategories] = useState({
    correctness: 0,
    clarity: 0,
    engagement: 0,
    delivery: 0,
  });

  const handleAnalysisUpdate = (data: {
    overallScore: number;
    metrics: any;
    tones: any[];
    categories: any;
    suggestions: any[];
  }) => {
    setOverallScore(data.overallScore);
    if (data.metrics) setMetrics(data.metrics);
    if (data.tones) setTones(data.tones);
    if (data.categories) setCategories(data.categories);
    if (data.suggestions) {
      const items: SuggestionItem[] = data.suggestions.map((s) => ({
        id: s.id,
        originalText: s.original,
        replacementText: s.replacement,
        category: s.category,
        title: s.title,
        description: s.message,
        explanation: s.explanation,
        startIndex: s.from,
        endIndex: s.to,
      }));
      setSuggestions(items);
    }
  };

  const handleExport = (format: "docx" | "pdf" | "txt") => {
    if (format === "pdf") {
      window.print();
      return;
    }
    const plain = (docData as any)?.text || "";
    const blob = new Blob([plain], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "document"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !isLoaded) {
    return <Loading />;
  }

  if (error && !docData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
        <span className="material-symbols-outlined text-4xl text-rose-400">error</span>
        <h2 className="text-xl font-bold text-on-surface">Document Unavailable</h2>
        <p className="text-sm text-on-surface-variant max-w-md">{error}</p>
        <a
          href="/account"
          className="px-5 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-xs font-semibold"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  const initialContent =
    docData?.content && docData.content.type
      ? docData.content
      : {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: docData?.text || "" }],
            },
          ],
        };

  return (
    <div className="bg-background text-on-surface h-screen overflow-hidden flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary-container relative">
      {/* TopAppBar */}
      <EditorHeader
        title={title}
        onTitleChange={setTitle}
        isSaving={false}
        lastSaved="auto"
        overallScore={overallScore}
        onToggleAIAssistant={() => setShowAIAssistant(true)}
        onExport={handleExport}
        userId={user_id}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex mt-16 h-[calc(100vh-64px)] relative">
        {/* Left Canvas (TipTap Editor) */}
        <section className="flex-1 flex justify-center overflow-y-auto relative p-8 md:p-12 z-10">
          <div className="w-full max-w-[800px] text-on-surface-variant relative pb-32">
            <TipTapEditor
              docId={id}
              initialTitle={docData?.title || "Untitled Document"}
              initialContent={initialContent}
              initialVersion={docData?.version || 1}
              onTitleChange={setTitle}
              onAnalysisUpdate={handleAnalysisUpdate}
            />
          </div>
        </section>

        {/* Right Inspector Panel */}
        <EditorInspector
          overallScore={overallScore}
          suggestions={suggestions}
          metrics={metrics}
          tones={tones}
          categories={categories}
          onApplySuggestion={() => {}}
          onDismissSuggestion={() => {}}
        />
      </main>

      {/* Slide-out AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        onApplyAction={async () => {}}
        isLoading={aiLoading}
      />
    </div>
  );
};

export default Doc;
