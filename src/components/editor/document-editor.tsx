"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Download, FileDown, FileText, Languages, PanelRightClose, PanelRightOpen, Printer, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorState } from "@/components/app/error-state";
import { keys, useDocument, useStyleGuide } from "@/hooks/queries";
import { isApiError } from "@/lib/api";
import type { DocumentDetail } from "@/lib/types";
import { LANGUAGES, type Language } from "@/shared/schemas";
import { docToPlainText, type PMNode } from "@/shared/tiptap-text";
import { download, safeFilename } from "@/lib/export/download";
import { cn } from "@/lib/utils";
import {
  Suggestions,
  acceptSuggestion,
  dismissSuggestion,
  getSuggestions,
  setActiveSuggestion,
  suggestionAt,
  suggestionsKey,
  type Suggestion,
} from "./extensions/suggestions";
import { useAutosave } from "./hooks/use-autosave";
import { useInstantChecks } from "./hooks/use-instant-checks";
import { useAiCheck } from "./hooks/use-ai-check";
import { useRewrite } from "./hooks/use-rewrite";
import { BubbleToolbar } from "./bubble-toolbar";
import { RewritePanel } from "./rewrite-panel";
import { SuggestionCard } from "./suggestion-card";
import { Inspector } from "./inspector";
import { SaveIndicator, StatusBar } from "./status-bar";

export function DocumentEditor({ id }: { id: string }) {
  const doc = useDocument(id);
  if (doc.isLoading) return <EditorSkeleton />;
  if (doc.isError) {
    if (isApiError(doc.error, "NOT_FOUND"))
      return (
        <div className="grid min-h-[70dvh] place-items-center px-4 text-center">
          <div>
            <FileText className="mx-auto size-10 text-muted-foreground" />
            <h1 className="mt-4 text-xl font-semibold">Document not found</h1>
            <p className="mt-1 text-sm text-muted-foreground">It may have been deleted, or it belongs to another account.</p>
            <Button asChild className="mt-6">
              <Link href="/app">Back to documents</Link>
            </Button>
          </div>
        </div>
      );
    return (
      <div className="px-4 py-16">
        <ErrorState error={doc.error} onRetry={() => doc.refetch()} title="Couldn’t open this document" />
      </div>
    );
  }
  // The editor (and autosave) only mount once the real document is here, so placeholder text can never be saved over it.
  return <LoadedEditor key={id} initial={doc.data!} />;
}

function EditorSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12" aria-busy="true" aria-label="Loading document">
      <Skeleton className="h-10 w-2/3" />
      <div className="mt-10 space-y-3">
        {[100, 94, 97, 60, 0, 98, 91, 75].map((w, i) => (w ? <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} /> : <div key={i} className="h-4" />))}
      </div>
    </div>
  );
}

function LoadedEditor({ initial }: { initial: DocumentDetail }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(initial.title === "Untitled document" ? "" : initial.title);
  const [language, setLanguage] = useState<Language>((LANGUAGES.find((l) => l.value === initial.language)?.value ?? "en-US") as Language);
  const [plainText, setPlainText] = useState(() => docToPlainText(initial.content));
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [mobileInspector, setMobileInspector] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const titleRef = useRef(title);
  const languageRef = useRef(language);
  useLayoutEffect(() => {
    titleRef.current = title;
    languageRef.current = language;
  }, [title, language]);

  const getPatch = useCallback(
    () => ({ title: titleRef.current.trim() || "Untitled document", content: editorRef.current?.getJSON(), language: languageRef.current }),
    [],
  );
  const save = useAutosave(initial.id, initial.version, getPatch);


  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder: "Start writing, or paste something in…" }),
      Suggestions,
    ],
    content: initial.content as object,
    editorProps: {
      attributes: {
        class: "prose-editor",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Document text",
        spellcheck: "false", // our checker replaces the browser's, so one set of underlines
      },
      handleClick: (view, pos) => {
        const s = suggestionAt(view.state, pos);
        view.dispatch(view.state.tr.setMeta(suggestionsKey, { type: "set-active", id: s?.id ?? null }).setMeta("addToHistory", false));
        return false;
      },
    },
    onUpdate: ({ transaction }) => {
      if (!transaction.docChanged) return;
      save.markDirty("content");
    },
    onSelectionUpdate: ({ editor: e }) => {
      // The caret entering an underline opens its card, so keyboard users get it too.
      const { from, empty } = e.state.selection;
      const s = empty ? suggestionAt(e.state, from) : undefined;
      const active = suggestionsKey.getState(e.state)?.activeId ?? null;
      if ((s?.id ?? null) !== active) setActiveSuggestion(e, s?.id ?? null);
    },
  });
  useLayoutEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Plain text for stats and the inspector, at most a few times a second.
  useEffect(() => {
    if (!editor) return;
    let t: ReturnType<typeof setTimeout>;
    const onUpdate = () => {
      clearTimeout(t);
      t = setTimeout(() => setPlainText(docToPlainText(editor.getJSON() as PMNode)), 300);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      clearTimeout(t);
    };
  }, [editor]);

  const styleGuide = useStyleGuide();
  const rules = useMemo(() => styleGuide.data?.rules ?? [], [styleGuide.data]);
  const instant = useInstantChecks(editor, rules);
  const ai = useAiCheck(editor, { documentId: initial.id, language, enabled: save.state !== "conflict" });
  const rewrite = useRewrite(editor, language);

  const { suggestions, activeId } = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      suggestions: e ? getSuggestions(e.state) : [],
      activeId: e ? suggestionsKey.getState(e.state)?.activeId ?? null : null,
    }),
    equalityFn: (a, b) => !!b && a.suggestions === b.suggestions && a.activeId === b.activeId,
  }) ?? { suggestions: [] as Suggestion[], activeId: null };

  const active = suggestions.find((s) => s.id === activeId) ?? null;

  const accept = useCallback(
    (s: Suggestion, replacement?: string) => {
      if (!editor) return;
      if (!acceptSuggestion(editor, s.id, replacement)) toast.message("That text changed, so the suggestion no longer applies.");
      editor.commands.focus();
    },
    [editor],
  );
  const dismiss = useCallback((s: Suggestion) => editor && dismissSuggestion(editor, s), [editor]);
  const focusSuggestion = useCallback(
    (s: Suggestion) => {
      if (!editor) return;
      editor.chain().focus().setTextSelection(s.from).scrollIntoView().run();
      setActiveSuggestion(editor, s.id);
    },
    [editor],
  );


  // Announce new suggestion counts to screen readers, politely and not on every keystroke.
  const [announcement, setAnnouncement] = useState("");
  const lastCount = useRef(0);
  useEffect(() => {
    const t = setTimeout(() => {
      if (suggestions.length !== lastCount.current) {
        const diff = suggestions.length - lastCount.current;
        setAnnouncement(diff > 0 ? `${diff} new suggestion${diff === 1 ? "" : "s"}. ${suggestions.length} in total. Press Alt and Down Arrow to go to the next one.` : `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} remaining.`);
        lastCount.current = suggestions.length;
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [suggestions.length]);

  useEffect(() => {
    setCanvasEl(canvasRef.current);
  }, []);

  // Keep the dashboard list fresh when leaving the editor.
  useEffect(() => () => void qc.invalidateQueries({ queryKey: keys.allDocuments }), [qc]);

  const words = plainText.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
  const aiDisabled = ai.status.state === "error" && ai.status.code === "QUOTA_EXCEEDED" ? "Monthly AI limit reached" : undefined;

  async function exportAs(kind: "docx" | "md" | "txt" | "print") {
    if (!editor) return;
    const name = safeFilename(title);
    const json = editor.getJSON() as PMNode;
    if (kind === "print") return window.print();
    if (kind === "docx") {
      const { toDocx } = await import("@/lib/export/to-docx");
      download(await toDocx(title || "Untitled document", json), `${name}.docx`);
    } else if (kind === "md") {
      const { toMarkdown } = await import("@/lib/export/to-markdown");
      download(new Blob([toMarkdown(title || "Untitled document", json)], { type: "text/markdown" }), `${name}.md`);
    } else {
      download(new Blob([docToPlainText(json)], { type: "text/plain" }), `${name}.txt`);
    }
  }

  async function resolveConflict(choice: "reload" | "overwrite") {
    if (choice === "reload") {
      // Drop local edits (so the unload guard stays quiet) and remount with the server's copy.
      await save.reloadFromServer();
      qc.removeQueries({ queryKey: keys.document(initial.id) });
      window.location.reload();
    } else {
      await save.reloadFromServer();
      save.markDirty("content");
      save.markDirty("title");
      await save.flush();
    }
  }

  const inspector = editor && (
    <Inspector
      suggestions={suggestions}
      plainText={plainText}
      activeId={activeId}
      aiStatus={ai.status}
      pendingParagraphs={ai.pendingParagraphs()}
      styleRuleCount={rules.length}
      onFocus={(s) => {
        focusSuggestion(s);
        setMobileInspector(false);
      }}
      onAccept={accept}
      onDismiss={dismiss}
      onAddWord={(s) => {
        instant.addToDictionary(s.original);
        dismiss(s);
      }}
      onAcceptAll={(list) => {
        // Last to first, so earlier positions stay valid; each is its own undo step.
        [...list].sort((a, b) => b.from - a.from).forEach((s) => editor && acceptSuggestion(editor, s.id));
      }}
      onCheckAll={ai.checkAll}
    />
  );

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-1 border-b bg-background/95 px-2 py-2 backdrop-blur sm:gap-2 sm:px-4 print:hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon" aria-label="Back to documents">
              <Link href="/app">
                <ArrowLeft />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>All documents</TooltipContent>
        </Tooltip>
        <SaveIndicator state={save.state} savedAt={save.savedAt} />
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Languages /> <span className="hidden sm:inline">{LANGUAGES.find((l) => l.value === language)?.label}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Document language</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={language}
                onValueChange={(v) => {
                  setLanguage(v as Language);
                  save.markDirty("language");
                }}
              >
                {LANGUAGES.map((l) => (
                  <DropdownMenuRadioItem key={l.value} value={l.value}>
                    {l.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Download /> <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => exportAs("docx")}>
                <FileDown /> Word (.docx)
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FileText /> Text formats
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={() => exportAs("md")}>Markdown (.md)</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportAs("txt")}>Plain text (.txt)</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => exportAs("print")}>
                <Printer /> Print or save as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setInspectorOpen((o) => !o)} aria-label={inspectorOpen ? "Hide suggestions panel" : "Show suggestions panel"} aria-pressed={inspectorOpen}>
            {inspectorOpen ? <PanelRightClose /> : <PanelRightOpen />}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 lg:hidden" onClick={() => setMobileInspector(true)} aria-label={`Suggestions (${suggestions.length})`}>
            <span className="hidden sm:inline">Suggestions</span>
            <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground tabular-nums">{suggestions.length}</span>
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {save.state === "conflict" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-destructive/30 bg-destructive/10 print:hidden" role="alert">
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="font-medium text-destructive">This document was changed in another tab or device.</span>
              <span className="text-muted-foreground">Your recent edits here have not been saved.</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => resolveConflict("reload")}>
                  <RefreshCw /> Load latest
                </Button>
                <Button size="sm" variant="destructive" onClick={() => resolveConflict("overwrite")}>
                  Keep mine
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto" id="editor-scroll">
          <div className="print-area relative mx-auto max-w-[46rem] px-5 pt-10 pb-40 sm:px-10 sm:pt-16" ref={canvasRef}>
            <label htmlFor="doc-title" className="sr-only">
              Title
            </label>
            <textarea
              id="doc-title"
              value={title}
              rows={1}
              maxLength={200}
              placeholder="Untitled document"
              onChange={(e) => {
                setTitle(e.target.value.replace(/\n/g, ""));
                save.markDirty("title");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  editor?.commands.focus("start");
                }
              }}
              className="field-sizing-content w-full resize-none bg-transparent font-serif text-4xl leading-tight font-medium tracking-tight outline-none placeholder:text-muted-foreground/50 sm:text-5xl"
            />
            <div className="mt-8">
              <EditorContent editor={editor} />
            </div>
            {editor && (
              <>
                <BubbleToolbar editor={editor} onRewrite={rewrite.start} aiDisabled={aiDisabled} />
                <SuggestionCard
                  editor={editor}
                  container={canvasEl}
                  suggestion={rewrite.state.status === "idle" ? active : null}
                  onAccept={(r) => active && accept(active, r)}
                  onDismiss={() => active && dismiss(active)}
                  onAddWord={() => {
                    if (!active) return;
                    instant.addToDictionary(active.original);
                    dismiss(active);
                  }}
                />
                <RewritePanel
                  editor={editor}
                  state={rewrite.state}
                  container={canvasEl}
                  onAccept={rewrite.accept}
                  onCancel={rewrite.cancel}
                  onRetry={() => rewrite.state.status !== "idle" && rewrite.start(rewrite.state.action)}
                />
              </>
            )}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {inspectorOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="hidden shrink-0 overflow-hidden border-l bg-sidebar lg:block print:hidden"
              aria-label="Suggestions and stats"
            >
              <div className="h-full w-[360px]">{inspector}</div>
            </motion.aside>
          )}
        </AnimatePresence>
        <Sheet open={mobileInspector} onOpenChange={setMobileInspector}>
          <SheetContent side="right" className="w-full p-0 sm:max-w-sm">
            <SheetTitle className="sr-only">Suggestions</SheetTitle>
            <div className="h-full pt-10">{inspector}</div>
          </SheetContent>
        </Sheet>
      </div>

      <footer className={cn("border-t px-4 py-1.5 print:hidden")}>
        <StatusBar words={words} chars={plainText.replace(/\s/g, "").length} instantMs={instant.lastMs} spellingReady={instant.ready} />
      </footer>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
