import type { PMNode } from "@/shared/tiptap-text";

type Node = PMNode & { marks?: { type: string }[] };

function inline(nodes: Node[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "  \n";
      let t = n.text ?? "";
      const marks = new Set((n.marks ?? []).map((m) => m.type));
      if (marks.has("code")) t = `\`${t}\``;
      if (marks.has("bold")) t = `**${t}**`;
      if (marks.has("italic")) t = `_${t}_`;
      if (marks.has("strike")) t = `~~${t}~~`;
      return t;
    })
    .join("");
}

function block(n: Node, depth = 0): string {
  const pad = "  ".repeat(depth);
  switch (n.type) {
    case "heading":
      return `${"#".repeat(Number(n.attrs?.level ?? 1))} ${inline(n.content as Node[])}`;
    case "paragraph":
      return inline(n.content as Node[]);
    case "blockquote":
      return ((n.content as Node[]) ?? []).map((c) => `> ${block(c)}`).join("\n>\n");
    case "codeBlock":
      return "```\n" + inline(n.content as Node[]) + "\n```";
    case "horizontalRule":
      return "---";
    case "bulletList":
    case "orderedList":
      return ((n.content as Node[]) ?? [])
        .map((item, i) => {
          const [first, ...rest] = (item.content as Node[]) ?? [];
          const marker = n.type === "bulletList" ? "-" : `${i + 1}.`;
          return [`${pad}${marker} ${first ? block(first, depth + 1) : ""}`, ...rest.map((r) => block(r, depth + 1))].join("\n");
        })
        .join("\n");
    default:
      return ((n.content as Node[]) ?? []).map((c) => block(c, depth)).join("\n\n");
  }
}

export const toMarkdown = (title: string, doc: PMNode) => `# ${title}\n\n` + ((doc.content as Node[]) ?? []).map((n) => block(n)).join("\n\n") + "\n";
