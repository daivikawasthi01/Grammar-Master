/** Minimal TipTap/ProseMirror JSON shape, enough to derive plain text without loading the editor. */
export type PMNode = { type?: string; text?: string; content?: PMNode[]; attrs?: Record<string, unknown> };

const BLOCKS = new Set(["paragraph", "heading", "blockquote", "listItem", "codeBlock", "horizontalRule"]);

/** One line per block, so paragraph offsets in plainText match what the editor shows. */
export function docToPlainText(doc: PMNode | null | undefined): string {
  const lines: string[] = [];
  const walk = (node: PMNode, into: string[]) => {
    if (node.type === "text") {
      into.push(node.text ?? "");
      return;
    }
    if (node.type === "hardBreak") {
      into.push("\n");
      return;
    }
    if (node.type && BLOCKS.has(node.type) && node.type !== "listItem" && node.type !== "blockquote") {
      const parts: string[] = [];
      node.content?.forEach((c) => walk(c, parts));
      lines.push(parts.join(""));
      return;
    }
    node.content?.forEach((c) => walk(c, into));
  };
  if (doc) walk(doc, []);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Builds a TipTap doc from plain text: blank lines separate paragraphs, single newlines become hard breaks. */
export function plainTextToDoc(text: string): PMNode {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paragraphs.length) return { type: "doc", content: [{ type: "paragraph" }] };
  return {
    type: "doc",
    content: paragraphs.map((p) => {
      const lines = p.split("\n");
      const content: PMNode[] = [];
      lines.forEach((line, i) => {
        if (i > 0) content.push({ type: "hardBreak" });
        if (line) content.push({ type: "text", text: line });
      });
      return content.length ? { type: "paragraph", content } : { type: "paragraph" };
    }),
  };
}

/** Markdown-lite import: # headings, - / * / 1. lists, > quotes; everything else as paragraphs. */
export function markdownToDoc(md: string): PMNode {
  const blocks = md.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  const content: PMNode[] = [];
  const inline = (s: string): PMNode[] => (s ? [{ type: "text", text: s.replace(/\*\*(.+?)\*\*|__(.+?)__/g, "$1$2") }] : []);
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    const heading = lines[0].match(/^(#{1,3})\s+(.*)$/);
    if (heading && lines.length === 1) {
      content.push({ type: "heading", attrs: { level: heading[1].length }, content: inline(heading[2].trim()) });
    } else if (lines.every((l) => /^\s*[-*+]\s+/.test(l))) {
      content.push({ type: "bulletList", content: lines.map((l) => ({ type: "listItem", content: [{ type: "paragraph", content: inline(l.replace(/^\s*[-*+]\s+/, "")) }] })) });
    } else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      content.push({ type: "orderedList", content: lines.map((l) => ({ type: "listItem", content: [{ type: "paragraph", content: inline(l.replace(/^\s*\d+[.)]\s+/, "")) }] })) });
    } else if (lines.every((l) => /^>\s?/.test(l))) {
      content.push({ type: "blockquote", content: [{ type: "paragraph", content: inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" ")) }] });
    } else {
      content.push({ type: "paragraph", content: inline(lines.join(" ")) });
    }
  }
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

export function snippetOf(plainText: string, length = 160): string {
  const flat = plainText.replace(/\s+/g, " ").trim();
  return flat.length > length ? flat.slice(0, length - 1).trimEnd() + "…" : flat;
}
