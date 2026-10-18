import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

/**
 * Suggestions are ProseMirror decorations. On every edit their positions are
 * mapped through the transaction, so underlines stay glued to their words while
 * the user types; a suggestion whose text no longer matches is dropped.
 */
export type SuggestionSource = "spelling" | "rule" | "style" | "ai";
export type SuggestionCategory = "correctness" | "clarity" | "engagement" | "delivery" | "style" | "spelling";

export type Suggestion = {
  id: string;
  source: SuggestionSource;
  from: number; // ProseMirror positions, not text offsets
  to: number;
  original: string;
  replacements: string[]; // first is the default; spelling can offer several
  category: SuggestionCategory;
  title: string;
  message: string;
};

type PluginState = { list: Suggestion[]; decorations: DecorationSet; activeId: string | null };

type Meta =
  | { type: "replace-source"; source: SuggestionSource; list: Suggestion[]; withinBlocks?: Array<[number, number]> }
  | { type: "remove"; id: string }
  | { type: "set-active"; id: string | null }
  | { type: "clear" };

export const suggestionsKey = new PluginKey<PluginState>("suggestions");

function build(doc: PMNode, list: Suggestion[], activeId: string | null): DecorationSet {
  return DecorationSet.create(
    doc,
    list.map((s) =>
      Decoration.inline(
        s.from,
        s.to,
        {
          class: `sg sg-${s.category}`,
          "data-suggestion-id": s.id,
          ...(s.id === activeId ? { "data-active": "true" } : {}),
        },
        { id: s.id },
      ),
    ),
  );
}

const valid = (doc: PMNode, s: Suggestion) => s.from < s.to && s.to <= doc.content.size && doc.textBetween(s.from, s.to, "\n", "\n") === s.original;

function overlapsAny(s: Suggestion, ranges: Array<[number, number]>) {
  return ranges.some(([a, b]) => s.from >= a && s.to <= b);
}

/** Within one position range, only one suggestion per span: AI > style > rule > spelling. */
const PRIORITY: Record<SuggestionSource, number> = { ai: 3, style: 2, rule: 1, spelling: 0 };
function dedupe(list: Suggestion[]): Suggestion[] {
  const sorted = [...list].sort((a, b) => a.from - b.from || PRIORITY[b.source] - PRIORITY[a.source]);
  const out: Suggestion[] = [];
  for (const s of sorted) {
    const prev = out[out.length - 1];
    if (prev && s.from < prev.to) {
      if (PRIORITY[s.source] > PRIORITY[prev.source]) out[out.length - 1] = s;
      continue;
    }
    out.push(s);
  }
  return out;
}

function apply(tr: Transaction, prev: PluginState, dismissed: Set<string>): PluginState {
  const meta = tr.getMeta(suggestionsKey) as Meta | undefined;
  let list = prev.list;
  let activeId = prev.activeId;

  if (tr.docChanged) {
    list = list
      .map((s) => ({ ...s, from: tr.mapping.map(s.from, 1), to: tr.mapping.map(s.to, -1) }))
      .filter((s) => valid(tr.doc, s));
  }

  if (meta?.type === "replace-source") {
    const keep = list.filter((s) => s.source !== meta.source || (meta.withinBlocks && !overlapsAny(s, meta.withinBlocks)));
    list = dedupe([...keep, ...meta.list.filter((s) => valid(tr.doc, s) && !dismissed.has(dismissKey(s)))]);
  } else if (meta?.type === "remove") {
    list = list.filter((s) => s.id !== meta.id);
  } else if (meta?.type === "clear") {
    list = [];
  } else if (meta?.type === "set-active") {
    activeId = meta.id;
  }

  if (activeId && !list.some((s) => s.id === activeId)) activeId = null;
  if (list === prev.list && activeId === prev.activeId) return prev;
  return { list, activeId, decorations: build(tr.doc, list, activeId) };
}

/** Dismissing hides every identical suggestion in this document, including future recomputes. */
export const dismissKey = (s: Pick<Suggestion, "original" | "replacements">) => `${s.original}\u0000${s.replacements[0] ?? ""}`;

export const Suggestions = Extension.create<object, { dismissed: Set<string> }>({
  name: "suggestions",
  addStorage() {
    return { dismissed: new Set<string>() };
  },
  /** Alt+Enter accepts the suggestion at the caret, Alt+Backspace dismisses it, Alt+↓/↑ jumps between them. */
  addKeyboardShortcuts() {
    const jump = (dir: 1 | -1) => {
      const list = getSuggestions(this.editor.state);
      if (!list.length) return false;
      const pos = this.editor.state.selection.from;
      const next = dir === 1 ? list.find((x) => x.from > pos) ?? list[0] : [...list].reverse().find((x) => x.to < pos) ?? list[list.length - 1];
      this.editor.chain().setTextSelection(next.from).scrollIntoView().run();
      setActiveSuggestion(this.editor, next.id);
      return true;
    };
    return {
      "Alt-Enter": () => {
        const s = activeSuggestion(this.editor.state);
        return s ? acceptSuggestion(this.editor, s.id) : false;
      },
      "Alt-Backspace": () => {
        const s = activeSuggestion(this.editor.state);
        if (!s) return false;
        dismissSuggestion(this.editor, s);
        return true;
      },
      "Alt-ArrowDown": () => jump(1),
      "Alt-ArrowUp": () => jump(-1),
    };
  },
  addProseMirrorPlugins() {
    const dismissed = this.storage.dismissed;
    return [
      new Plugin<PluginState>({
        key: suggestionsKey,
        state: {
          init: () => ({ list: [], activeId: null, decorations: DecorationSet.empty }),
          apply: (tr, prev) => apply(tr, prev, dismissed),
        },
        props: {
          decorations: (state) => suggestionsKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});

export const getSuggestions = (state: EditorState): Suggestion[] => suggestionsKey.getState(state)?.list ?? [];

const activeSuggestion = (state: EditorState) => {
  const st = suggestionsKey.getState(state);
  return st?.list.find((x) => x.id === st.activeId);
};

const dispatch = (editor: Editor, meta: Meta) => {
  if (editor.isDestroyed) return;
  editor.view.dispatch(editor.state.tr.setMeta(suggestionsKey, meta).setMeta("addToHistory", false));
};

export const replaceSource = (editor: Editor, source: SuggestionSource, list: Suggestion[], withinBlocks?: Array<[number, number]>) =>
  dispatch(editor, { type: "replace-source", source, list, withinBlocks });
export const removeSuggestion = (editor: Editor, id: string) => dispatch(editor, { type: "remove", id });

export function dismissSuggestion(editor: Editor, s: Suggestion) {
  (editor.storage as unknown as { suggestions: { dismissed: Set<string> } }).suggestions.dismissed.add(dismissKey(s));
  removeSuggestion(editor, s.id);
}
export const setActiveSuggestion = (editor: Editor, id: string | null) => dispatch(editor, { type: "set-active", id });

/** One transaction, so Ctrl+Z restores the original word. Refuses if the text changed since the check. */
export function acceptSuggestion(editor: Editor, id: string, replacement?: string): boolean {
  const s = getSuggestions(editor.state).find((x) => x.id === id);
  if (!s || !valid(editor.state.doc, s)) return false;
  const text = replacement ?? s.replacements[0] ?? "";
  const tr = editor.state.tr;
  if (text) tr.insertText(text, s.from, s.to);
  else tr.delete(s.from, s.to);
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export function suggestionAt(state: EditorState, pos: number): Suggestion | undefined {
  return getSuggestions(state).find((s) => pos >= s.from && pos <= s.to);
}

// ---------------------------------------------------------------------------
// Text blocks: the unit for checks. Offsets in `text` map 1:1 to positions.
// ---------------------------------------------------------------------------

export type TextBlock = { index: number; pos: number; text: string };

/** Each textblock with a text where every inline leaf (hard break, etc.) counts as one char, so pos = block.pos + 1 + offset. */
export function textBlocks(doc: PMNode): TextBlock[] {
  const blocks: TextBlock[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = "";
    node.forEach((child) => {
      text += child.isText ? child.text ?? "" : "\n".repeat(child.nodeSize);
    });
    blocks.push({ index: blocks.length, pos, text });
    return false;
  });
  return blocks;
}

/** Position range for the n-th occurrence of `original` inside a block, or null. */
export function rangeIn(block: TextBlock, original: string, occurrence = 0): { from: number; to: number } | null {
  let idx = -1;
  for (let i = 0; i <= occurrence; i++) {
    idx = block.text.indexOf(original, idx + 1);
    if (idx === -1) return null;
  }
  const from = block.pos + 1 + idx;
  return { from, to: from + original.length };
}
