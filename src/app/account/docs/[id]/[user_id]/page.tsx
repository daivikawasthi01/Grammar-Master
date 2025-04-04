"use client";

import React, { useRef, useEffect, useState } from "react";

import styles from "./docs.module.scss";

import useDocument from "@/app/hooks/useDocument";

import Loading from "@/app/components/Loading";

import { HandleSaveDocument } from "@/app/helpers/SaveDocument";

import ContentEditable from "react-contenteditable";

import TextCustomBar from "./components/TextCustomBar";

import Link from "next/link";

import SidebarDocument from "./components/SidebarDocument";

import { AnimatePresence } from "framer-motion";

import { HandleCheckText } from "@/app/helpers/CheckText";

import CorrectText from "./components/CorrectText";

import CircularProgress from "@mui/material/CircularProgress";

import {
  HandleCheckWord,
  replaceSelectedWord,
} from "@/app/helpers/CheckSynonyms";

import SynonymsWords from "./components/SynonymsWords";

import { DocumentContext } from "./context/DocumentContext";

import { HandleTranslateText } from "@/app/helpers/TranslateText";

import TranslateText from "./components/TranslateText";

import useAuth from "@/app/hooks/useAuth";

import { HandleCheckTone } from "@/app/helpers/CheckTone";

import ToneCorrection from "./components/ToneCorrection";

import SelectionMenu from "./components/SelectionMenu";

import AIAssistant from "./components/AIAssistant";

import { HandleAITextModify } from "@/app/helpers/AITextModify";

import TextProgress from "./components/TextProgress";

import { calculateTextMetrics } from "@/app/helpers/CalculateTextMetrics";

import TextEditor from "./components/TextEditor";

import WritingGoals from "./components/WritingGoals";

import BestVersion from "./components/BestVersion";

import SuggestionPanel from "./components/SuggestionPanel";

interface DocsProps {
  params: {
    id: string;
    user_id: string;
  };
}

const stripHtml = (html: string) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const Doc: React.FC<DocsProps> = ({ params }) => {
  const { isLogged } = useAuth();

  const { document, error, isLoading, setDocument } = useDocument(
    params.user_id,
    params.id
  );

  const [text, setText] = useState<string>("");

  const [textSuggest, setTextSuggest] = useState<string | undefined>();

  const [wordSuggest, setWordSuggest]: [
    undefined | string,
    React.Dispatch<React.SetStateAction<undefined | string>>
  ] = useState();

  const [wordToCheck, setWordToCheck]: [
    undefined | string,
    React.Dispatch<React.SetStateAction<undefined | string>>
  ] = useState();

  const [translateLoading, setTranslateLoading] = useState<boolean>(false);

  const [translateText, setTranslateText] = useState<string | undefined>();

  const [originalText, setOriginalText] = useState<string>("");

  const [correct, setCorrect]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>
  ] = useState(true);

  const [correctLoading, setCorrectLoading]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>
  ] = useState(false);

  const [synonymsLoading, setSynonymsLoading]: [
    boolean,
    React.Dispatch<React.SetStateAction<boolean>>
  ] = useState(false);

  const [title, setTitle] = useState<string>("");

  const textRef = useRef<HTMLDivElement>(null);

  const [isSidebar, setIsSidebar] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);

  const [toneSuggest, setToneSuggest] = useState<string | undefined>();

  const [toneCorrection, setToneCorrection] = useState<boolean>(true);

  const [toneLoading, setToneLoading] = useState<boolean>(false);

  const [mistakeToneText, setMistakeToneText] = useState<string | undefined>();

  const [mistakeText, setMistakeText] = useState<string | undefined>();

  const [selectionPosition, setSelectionPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [selectedText, setSelectedText] = useState<string>("");

  const [showToneModal, setShowToneModal] = useState<boolean>(false);

  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const [aiModifiedText, setAiModifiedText] = useState<string | undefined>();
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const [textMetrics, setTextMetrics] = useState({
    correctness: 0,
    clarity: 0,
    engagement: 0,
    delivery: 0,
  });

  const [isCompactMode, setIsCompactMode] = useState(false);

  const [suggestions, setSuggestions] = useState<
    Array<{
      type: "grammar" | "clarity" | "engagement" | "delivery";
      start: number;
      end: number;
      suggestion: string;
    }>
  >([]);

  const [writingGoals, setWritingGoals] = useState([
    {
      id: "intent",
      label: "Intent",
      options: ["Inform", "Describe", "Convince", "Tell a Story"],
      selected: "Inform",
    },
    {
      id: "audience",
      label: "Audience",
      options: ["General", "Expert", "Student", "Professional"],
      selected: "General",
    },
    {
      id: "style",
      label: "Style",
      options: ["Formal", "Casual", "Neutral", "Confident"],
      selected: "Neutral",
    },
    {
      id: "emotion",
      label: "Emotion",
      options: ["Mild", "Strong", "Neutral", "Optimistic"],
      selected: "Neutral",
    },
  ]);

  const [bestVersionSuggestions, setBestVersionSuggestions] = useState<
    Array<{
      text: string;
      improvement: string;
      score: number;
    }>
  >([]);

  const [detailedSuggestions, setDetailedSuggestions] = useState<
    Array<{
      type: "grammar" | "clarity" | "engagement" | "delivery";
      text: string;
      suggestion: string;
      explanation: string;
    }>
  >([]);

  useEffect(() => {
    if (text) {
      const newSuggestions = detailedSuggestions.map((suggestion, index) => ({
        ...suggestion,
        start: text.indexOf(suggestion.text),
        end: text.indexOf(suggestion.text) + suggestion.text.length,
      }));
      setSuggestions(newSuggestions);
    }
  }, [text, detailedSuggestions]);

  const handleGoalChange = (goalId: string, value: string) => {
    setWritingGoals((goals) =>
      goals.map((goal) =>
        goal.id === goalId ? { ...goal, selected: value } : goal
      )
    );
  };

  useEffect(() => {
    if (document) {
      setText(document.text || "");

      setTitle(document.title || "");
    }
  }, [document]);

  useEffect(() => {
    const saveTimeout = setTimeout(async () => {
      if (!document || (!text && !title)) return;

      if (text !== document.text || title !== document.title) {
        setIsSaving(true);

        setSaveError(null);

        try {
          const success = await HandleSaveDocument(
            params.user_id,

            params.id,

            title || document.title,

            text || document.text
          );

          if (!success) {
            setSaveError("Failed to save changes");
          }
        } catch (err) {
          setSaveError("Error saving document");

          console.error("Save error:", err);
        } finally {
          setIsSaving(false);
        }
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [text, title, document, params.user_id, params.id]);

  const handleCorrection = (): void => {
    if (text) {
      setMistakeText(text);

      HandleCheckText(
        text,

        document?.language as string,

        setTextSuggest,

        setCorrect,

        setCorrectLoading,

        params.user_id
      );
    }
  };

  const handleSynonyms = (): void => {
    HandleCheckWord(
      wordToCheck as string,
      document?.language as string,
      setWordSuggest,
      setSynonymsLoading,
      params.user_id
    );
  };

  const handleTranslate = (): void => {
    const selection = window.getSelection();

    const selectedText = selection?.toString().trim();

    const textToTranslate = selectedText || text;

    if (textToTranslate) {
      setOriginalText(textToTranslate);

      HandleTranslateText(
        textToTranslate,

        document?.language || "English",

        setTranslateLoading,

        setText,

        setTranslateText,

        params.user_id
      );
    }
  };

  const handleChange = async (newText: string) => {
    setText(newText);
    
    // Only calculate metrics if there's actual text
    if (newText && newText.trim().length > 0) {
      try {
        const metrics = await calculateTextMetrics(newText);
        setTextMetrics(metrics);
      } catch (error) {
        console.error('Error calculating metrics:', error);
      }
    } else {
      // Reset metrics if text is empty
      setTextMetrics({
        correctness: 0,
        clarity: 0,
        engagement: 0,
        delivery: 0
      });
    }

    if (document) {
      const timeoutId = setTimeout(() => {
        HandleSaveDocument(
          document._id,
          newText,
          title,
          setIsSaving,
          setSaveError
        );
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    if (document?.text) {
      handleChange(document.text);
    }
  }, [document]);

  const handleDoubleClick = (): void => {
    const selection = window.getSelection();

    const selectedText = selection?.toString().trim();

    if (selectedText) {
      setWordToCheck(selectedText);

      HandleCheckWord(
        selectedText,
        document?.language || "English",
        setWordSuggest,
        setSynonymsLoading,
        params.user_id
      );
    }
  };

  const handleToneCorrection = (targetTone: string): void => {
    const selection = window.getSelection();

    const selectedText = selection?.toString();

    if (!selectedText) {
      return;
    }

    setMistakeToneText(selectedText);

    HandleCheckTone(
      selectedText,

      targetTone,

      setToneSuggest,

      setToneLoading,

      params.user_id
    );

    setToneCorrection(false);
  };

  const handleSynonymReplace = (newWord: string) => {
    if (textRef.current && wordToCheck) {
      const currentHtml = textRef.current.innerHTML;

      const updatedHtml = currentHtml.replace(wordToCheck, newWord);

      setText(updatedHtml);

      setWordSuggest(undefined);
    }
  };

  const handleTextSelection = () => {
    if (typeof window === "undefined") return;

    const selection = window.getSelection();

    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);

      const rect = range.getBoundingClientRect();

      setSelectionPosition({
        x: rect.left + rect.width / 2,

        y: rect.top,
      });

      setSelectedText(selection.toString());
    } else {
      setSelectionPosition(null);

      setSelectedText("");
    }
  };

  const handleImprove = () => {
    if (selectedText) {
      HandleCheckText(
        selectedText,

        document?.language as string,

        setTextSuggest,

        setCorrect,

        setCorrectLoading,

        params.user_id
      );

      setSelectionPosition(null);
    }
  };

  const handleToneSelect = () => {
    setShowToneModal(true);

    setSelectionPosition(null);
  };

  useEffect(() => {
    let mounted = true;

    const handleMouseUp = () => {
      if (mounted) {
        handleTextSelection();
      }
    };

    if (typeof window !== "undefined") {
      window.document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.document.removeEventListener("mouseup", handleMouseUp);
      }
    };
  }, []);

  const handleAIAction = async (
    type: string,
    text: string,
    prompt?: string
  ) => {
    setAiLoading(true);
    try {
      const goals = writingGoals
        .map((g) => `${g.label}: ${g.selected}`)
        .join(", ");
      const enhancedPrompt =
        prompt ||
        `Modify the text to be ${type}, considering these goals: ${goals}`;

      const modifiedText = await HandleAITextModify(
        text,
        enhancedPrompt,
        params.user_id
      );

      setAiModifiedText(modifiedText);
    } catch (error) {
      console.error("AI modification error:", error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleBestVersion = async () => {
    if (!selectedText) return;

    try {
      // You'll need to implement this API endpoint
      const response = await fetch("/api/best-version", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selectedText,
          goals: writingGoals,
        }),
      });

      const suggestions = await response.json();
      setBestVersionSuggestions(suggestions);
    } catch (error) {
      console.error("Error getting best versions:", error);
    }
  };

  const handleAcceptBestVersion = (newText: string) => {
    const updatedText = text.replace(selectedText, newText);
    setText(updatedText);
    setBestVersionSuggestions([]);
  };

  const handleDismissBestVersion = () => {
    setBestVersionSuggestions([]);
  };

  const handleApplySuggestion = async (newText: string) => {
    const updatedText = text.replace(selectedText, newText);
    setText(updatedText);

    try {
      const newMetrics = await calculateTextMetrics(updatedText);
      setTextMetrics(newMetrics);
    } catch (error) {
      console.error("Error calculating metrics:", error);
    }
  };

  const handleDismissSuggestion = (index: number) => {
    setDetailedSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (text) {
      // Clear existing suggestions when text changes
      setDetailedSuggestions([]);
      setSuggestions([]);
      
      const calculateMetrics = async () => {
        try {
          const cleanText = stripHtml(text);
          const newMetrics = await calculateTextMetrics(cleanText);
          setTextMetrics(newMetrics);
          
          // Generate suggestions based on metrics
          const newSuggestions = [];
          
          // Split text into sentences for better suggestions
          const sentences = cleanText.split(/(?<=[.!?])\s+/);
          
          if (newMetrics.correctness < 70) {
            // Find problematic sentences for grammar
            sentences.forEach(sentence => {
              if (sentence.trim()) {
                newSuggestions.push({
                  type: 'grammar',
                  text: sentence.trim(),
                  suggestion: 'Review and correct the grammar in this sentence.',
                  explanation: 'This sentence might have grammatical or spelling issues.',
                  start: cleanText.indexOf(sentence),
                  end: cleanText.indexOf(sentence) + sentence.length
                });
              }
            });
          }
          
          if (newMetrics.clarity < 70) {
            // Find complex sentences for clarity
            sentences.forEach(sentence => {
              if (sentence.split(' ').length > 20) { // Long sentences
                newSuggestions.push({
                  type: 'clarity',
                  text: sentence.trim(),
                  suggestion: 'Consider breaking this into shorter sentences.',
                  explanation: 'Long sentences can be harder to understand.',
                  start: cleanText.indexOf(sentence),
                  end: cleanText.indexOf(sentence) + sentence.length
                });
              }
            });
          }
          
          setSuggestions(newSuggestions);
          setDetailedSuggestions(newSuggestions);
        } catch (error) {
          console.error('Error calculating metrics:', error);
        }
      };

      calculateMetrics();
    }
  }, [text]);

  if (isLoading && !document) return <Loading />;

  if (error) return <div className={styles.error}>{error}</div>;

  if (!isLogged)
    return <div className={styles.error}>You are not authorized</div>;

  if (document)
    return (
      <div className={styles.doc}>
        <DocumentContext.Provider
          value={{ document: document, setDocument: setDocument }}
        >
          <div className={styles.doc__main}>
            <div className={styles.doc__content}>
              <div className={styles.doc__editor}>
                <TextEditor
                  text={text}
                  onChange={handleChange}
                  onSelect={handleTextSelection}
                  suggestions={suggestions}
                />
              </div>

              <div className={styles.format_bar}>
                <div className={styles.format_group}>
                  <button title="Bold">B</button>
                  <button title="Italic"><i>I</i></button>
                  <button title="Underline"><u>U</u></button>
                </div>
                
                <div className={styles.format_group}>
                  <button title="Heading">H</button>
                  <button title="Link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                
                <div className={styles.format_group}>
                  <button title="Bullet List">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button title="Numbered List">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h1M4 16h1v4M4 20h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.doc__suggestions}>
              <div className={styles.doc__suggestions__container}>
                <TextProgress
                  correctness={textMetrics.correctness}
                  clarity={textMetrics.clarity}
                  engagement={textMetrics.engagement}
                  delivery={textMetrics.delivery}
                  suggestionCount={detailedSuggestions.length}
                />
                <WritingGoals
                  goals={writingGoals}
                  onGoalChange={handleGoalChange}
                />
                <SuggestionPanel
                  suggestions={suggestions}
                  onApply={handleApplySuggestion}
                  onDismiss={handleDismissSuggestion}
                />
                {bestVersionSuggestions.length > 0 && (
                  <BestVersion
                    originalText={selectedText}
                    suggestions={bestVersionSuggestions}
                    onAccept={handleAcceptBestVersion}
                    onDismiss={handleDismissBestVersion}
                  />
                )}
                <button
                  title="Get Best Version Suggestions"
                  onClick={handleBestVersion}
                  className={styles.doc__suggestions__btn__blue}
                  disabled={!selectedText}
                >
                  Get Best Version
                </button>
              </div>
            </div>
          </div>

          <SelectionMenu
            position={selectionPosition}
            onImprove={() => setShowAIAssistant(true)}
          />

          <AIAssistant
            isOpen={showAIAssistant}
            onClose={() => setShowAIAssistant(false)}
            selectedText={selectedText}
            onAction={handleAIAction}
            writingGoals={writingGoals}
          />
        </DocumentContext.Provider>
      </div>
    );
};

export default Doc;
