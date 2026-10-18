import { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun, type IRunOptions } from "docx";
import type { PMNode } from "@/shared/tiptap-text";

type Mark = { type: string };
type Node = PMNode & { marks?: Mark[] };

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4] as const;

function runs(nodes: Node[] = [], extra: Partial<IRunOptions> = {}): TextRun[] {
  return nodes.map((n) => {
    if (n.type === "hardBreak") return new TextRun({ text: "", break: 1, ...extra });
    const marks = new Set((n.marks ?? []).map((m) => m.type));
    return new TextRun({
      text: n.text ?? "",
      bold: marks.has("bold") || undefined,
      italics: marks.has("italic") || extra.italics || undefined,
      underline: marks.has("underline") ? {} : undefined,
      strike: marks.has("strike") || undefined,
      font: marks.has("code") ? "Consolas" : undefined,
    });
  });
}

function blocks(nodes: Node[] = [], ctx: { list?: "bullet" | "number"; level: number; quote?: boolean } = { level: 0 }): Paragraph[] {
  const out: Paragraph[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case "heading": {
        const level = Math.min(4, Math.max(1, Number(n.attrs?.level ?? 1)));
        out.push(new Paragraph({ heading: HEADINGS[level - 1], children: runs(n.content as Node[]) }));
        break;
      }
      case "paragraph":
        out.push(
          new Paragraph({
            children: runs(n.content as Node[], ctx.quote ? { italics: true } : {}),
            ...(ctx.list ? (ctx.list === "bullet" ? { bullet: { level: ctx.level } } : { numbering: { reference: "numbered", level: ctx.level } }) : {}),
            ...(ctx.quote ? { indent: { left: 720 } } : {}),
            spacing: { after: 160 },
          }),
        );
        break;
      case "bulletList":
      case "orderedList":
        for (const item of (n.content as Node[]) ?? []) {
          out.push(...blocks(item.content as Node[], { list: n.type === "bulletList" ? "bullet" : "number", level: ctx.list ? ctx.level + 1 : 0, quote: ctx.quote }));
        }
        break;
      case "blockquote":
        out.push(...blocks(n.content as Node[], { ...ctx, quote: true }));
        break;
      case "codeBlock":
        out.push(new Paragraph({ children: [new TextRun({ text: (n.content as Node[] | undefined)?.map((c) => c.text).join("") ?? "", font: "Consolas" })] }));
        break;
      case "horizontalRule":
        out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("* * *")] }));
        break;
      default:
        if (n.content) out.push(...blocks(n.content as Node[], ctx));
    }
  }
  return out;
}

/** A real .docx (Office Open XML) built from the editor's JSON, not plain text with a .docx extension. */
export async function toDocx(title: string, doc: PMNode): Promise<Blob> {
  const document = new Document({
    title,
    creator: "Grammar Master",
    styles: { default: { document: { run: { font: "Georgia", size: 24 } } } },
    numbering: {
      config: [
        {
          reference: "numbered",
          levels: [0, 1, 2, 3].map((level) => ({ level, format: LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } } })),
        },
      ],
    },
    sections: [{ children: [new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title)] }), ...blocks(doc.content as Node[])] }],
  });
  return Packer.toBlob(document);
}
