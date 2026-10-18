"use client";

import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEditorState } from "@tiptap/react";
import { Bold, ChevronDown, Code, Heading2, Italic, List, ListOrdered, Quote, Sparkles, Strikethrough, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import type { RewriteAction } from "@/shared/schemas";

export const REWRITE_LABELS: Record<RewriteAction, { label: string; hint: string }> = {
  improve: { label: "Improve writing", hint: "Clearer, same voice" },
  concise: { label: "Make concise", hint: "Shorter and direct" },
  simplify: { label: "Simplify", hint: "Plain language" },
  formal: { label: "More formal", hint: "Professional register" },
  friendly: { label: "More friendly", hint: "Warm and conversational" },
  confident: { label: "More confident", hint: "Remove hedging" },
  expand: { label: "Expand", hint: "Add useful detail" },
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

function Mark({ editor, mark, icon: Icon, label, shortcut }: { editor: Editor; mark: string; icon: typeof Bold; label: string; shortcut: string }) {
  const active = useEditorState({ editor, selector: ({ editor: e }) => e.isActive(mark) });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle size="sm" pressed={active} onPressedChange={() => editor.chain().focus().toggleMark(mark).run()} aria-label={label}>
          <Icon />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        {label} <Kbd>{shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

export function BubbleToolbar({ editor, onRewrite, aiDisabled }: { editor: Editor; onRewrite: (a: RewriteAction) => void; aiDisabled?: string }) {
  const block = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 10 }}
      shouldShow={({ editor: e, from, to }) => from !== to && e.isEditable && e.state.doc.textBetween(from, to).trim().length > 0}
      className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-xl shadow-black/10 animate-in fade-in-0 zoom-in-95"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-1.5 text-primary" disabled={!!aiDisabled} title={aiDisabled}>
            <Sparkles /> Rewrite <ChevronDown className="size-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Rewrite the selection</DropdownMenuLabel>
          {(Object.keys(REWRITE_LABELS) as RewriteAction[]).map((a) => (
            <DropdownMenuItem key={a} onSelect={() => onRewrite(a)} className="flex-col items-start gap-0">
              <span>{REWRITE_LABELS[a].label}</span>
              <span className="text-xs text-muted-foreground">{REWRITE_LABELS[a].hint}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <Mark editor={editor} mark="bold" icon={Bold} label="Bold" shortcut={`${mod}B`} />
      <Mark editor={editor} mark="italic" icon={Italic} label="Italic" shortcut={`${mod}I`} />
      <Mark editor={editor} mark="underline" icon={Underline} label="Underline" shortcut={`${mod}U`} />
      <Mark editor={editor} mark="strike" icon={Strikethrough} label="Strikethrough" shortcut={`${mod}⇧S`} />
      <Mark editor={editor} mark="code" icon={Code} label="Code" shortcut={`${mod}E`} />
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <Toggle size="sm" pressed={block.h2} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading">
        <Heading2 />
      </Toggle>
      <Toggle size="sm" pressed={block.bullet} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bulleted list">
        <List />
      </Toggle>
      <Toggle size="sm" pressed={block.ordered} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list">
        <ListOrdered />
      </Toggle>
      <Toggle size="sm" pressed={block.quote} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Quote">
        <Quote />
      </Toggle>
    </BubbleMenu>
  );
}
