import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export type SuggestionCategory = "correctness" | "clarity" | "engagement" | "delivery" | "style";

export interface Suggestion {
  id: string;
  from: number; // ProseMirror document position
  to: number;
  original: string;
  replacement: string;
  category: SuggestionCategory;
  title: string;
  message: string;
  explanation?: string;
}

export const suggestionsKey = new PluginKey<{ decorations: DecorationSet }>("suggestions");

const buildDecorations = (doc: PMNode, list: Suggestion[]) => {
  const decorations = list
    .filter((s) => s.from >= 0 && s.to <= doc.content.size && s.from < s.to)
    .map((s) =>
      Decoration.inline(
        s.from,
        s.to,
        {
          class: `sg sg-${s.category}`,
          "data-suggestion-id": s.id,
        },
        { s }
      )
    );
  return DecorationSet.create(doc, decorations);
};

export const SuggestionsExtension = Extension.create({
  name: "suggestions",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: suggestionsKey,
        state: {
          init: () => ({ decorations: DecorationSet.empty }),
          apply(tr, prev) {
            const next = tr.getMeta(suggestionsKey) as Suggestion[] | undefined;
            if (next !== undefined) {
              return { decorations: buildDecorations(tr.doc, next) };
            }
            if (tr.docChanged) {
              return {
                decorations: prev.decorations.map(tr.mapping, tr.doc),
              };
            }
            return prev;
          },
        },
        props: {
          decorations: (state) => suggestionsKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});

export const setEditorSuggestions = (editor: Editor, list: Suggestion[]) => {
  if (!editor || editor.isDestroyed) return;
  editor.view.dispatch(editor.state.tr.setMeta(suggestionsKey, list));
};

export const findSuggestion = (state: EditorState, id: string) => {
  const decos = suggestionsKey.getState(state)?.decorations;
  if (!decos) return undefined;
  const found = decos.find(
    undefined,
    undefined,
    (spec: any) => spec.s && spec.s.id === id
  )[0];
  return found;
};

/**
 * Accepts a suggestion non-destructively: executes a single transaction so native Undo/Redo works.
 */
export const acceptSuggestion = (editor: Editor, id: string): boolean => {
  if (!editor || editor.isDestroyed) return false;
  const deco = findSuggestion(editor.state, id);
  if (!deco) return false;

  const { s } = deco.spec as { s: Suggestion };
  const currentText = editor.state.doc.textBetween(deco.from, deco.to);
  if (currentText !== s.original) {
    // Text was altered since analysis
    return false;
  }

  editor
    .chain()
    .focus()
    .insertContentAt({ from: deco.from, to: deco.to }, s.replacement)
    .run();

  return true;
};

/**
 * Dismisses a suggestion by removing it from the decoration set.
 */
export const dismissSuggestion = (editor: Editor, id: string) => {
  if (!editor || editor.isDestroyed) return;
  const decos = suggestionsKey.getState(editor.state)?.decorations;
  if (!decos) return;

  const currentList: Suggestion[] = [];
  decos.find(undefined, undefined, (spec: any) => {
    if (spec.s && spec.s.id !== id) {
      currentList.push(spec.s);
    }
    return false;
  });

  setEditorSuggestions(editor, currentList);
};

/**
 * Converts a paragraph-level match offset into an absolute ProseMirror document range.
 */
export function toProseMirrorRange(
  blockPos: number,
  blockText: string,
  original: string,
  occurrence = 0
): { from: number; to: number } | null {
  let idx = -1;
  for (let i = 0; i <= occurrence; i++) {
    idx = blockText.indexOf(original, idx + 1);
    if (idx === -1) break;
  }

  if (idx === -1) return null;
  const from = blockPos + 1 + idx; // +1 steps over opening tag of block
  return { from, to: from + original.length };
}
