import "./polyfill";
import { generateEmbedding } from "./embeddings";
import { queryVectors, upsertVectors } from "./vector-store";
import dbConnect from "./mongodb";
import { StyleGuideChunk } from "@/models/StyleGuide";

export const DEFAULT_STYLE_RULES = [
  "Use 'eBPF', never 'Ebpf' or 'ebpf'.",
  "Always write 'PostgreSQL' instead of 'Postgres'.",
  "Write 'microservices' as a single word, never 'micro-services'.",
  "Capitalize 'Q3' in all business communications, never 'q3'.",
  "Always refer to our application as 'Grammar Master'.",
];

/**
 * Splits raw style guide or glossary text into atomic rules.
 * Each bullet, list item, or line is treated as an isolated rule chunk.
 */
export function splitIntoAtomicRules(content: string): string[] {
  if (!content || !content.trim()) return [];

  // Split by line breaks first
  const lines = content.split(/\r?\n/);
  const rules: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip pure markdown headings without rules, e.g. "# Style Guide" or "---"
    if (/^#{1,6}\s+[^:]+$/.test(trimmed) && !trimmed.includes(":") && !trimmed.includes("-")) {
      continue;
    }
    if (/^[-*_]{3,}$/.test(trimmed)) {
      continue;
    }

    // Strip leading bullet markers like "-", "*", "•", "1.", "1)", "[ ]"
    const cleaned = trimmed
      .replace(/^[\*\-•]\s+/, "")
      .replace(/^\d+[\.\)]\s+/, "")
      .replace(/^\[[ xX]\]\s+/, "")
      .trim();

    if (cleaned.length >= 3) {
      rules.push(cleaned);
    }
  }

  // If no newlines were present or single block text, split by semicolon or period if appropriate
  if (rules.length <= 1 && content.includes(";")) {
    const semiChunks = content
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length >= 3);
    if (semiChunks.length > 1) {
      return semiChunks;
    }
  }

  return rules;
}

/**
 * Retrieves the top-K relevant custom style rules for the given input text and user ID.
 */
export async function retrieveRelevantRules(
  text: string,
  userId: string,
  topK = 5
): Promise<string[]> {
  if (!text || !text.trim()) {
    return [];
  }

  try {
    const effectiveUserId = userId || "demo_user";
    const queryEmb = await generateEmbedding(text);
    let results = await queryVectors(queryEmb, effectiveUserId, topK);

    // If no vectors found in store, check MongoDB if user has chunks, or use default rules
    if (results.length === 0) {
      if (
        effectiveUserId === "demo_user" ||
        effectiveUserId === "demo123" ||
        effectiveUserId === "null" ||
        effectiveUserId === "undefined"
      ) {
        return DEFAULT_STYLE_RULES;
      }

      try {
        await dbConnect();
        const chunks = await StyleGuideChunk.find({ userId: effectiveUserId });
        if (chunks.length > 0) {
          const vectorRecords = [];
          for (const c of chunks) {
            const emb = await generateEmbedding(c.text);
            vectorRecords.push({
              id: c.vectorId || `chunk_${c._id}`,
              vector: emb,
              metadata: {
                userId: String(effectiveUserId),
                styleGuideId: String(c.styleGuideId),
                text: c.text,
              },
            });
          }
          await upsertVectors(vectorRecords);
          results = await queryVectors(queryEmb, effectiveUserId, topK);
        } else {
          return DEFAULT_STYLE_RULES;
        }
      } catch (dbErr) {
        return DEFAULT_STYLE_RULES;
      }
    }

    const matched = results
      .filter((r) => r.metadata?.text && r.score > 0.05)
      .map((r) => r.metadata!.text);

    return matched.length > 0 ? matched : DEFAULT_STYLE_RULES;
  } catch (err) {
    console.error("Error retrieving style guide rules:", err);
    return DEFAULT_STYLE_RULES;
  }
}

/**
 * Builds the strict precedence prompt injection for retrieved style rules.
 */
export function buildStyleRAGPrompt(rules: string[]): string {
  if (!rules || rules.length === 0) {
    return "";
  }

  const ruleBullets = rules.map((r) => `- ${r}`).join("\n");

  return `
USER-SPECIFIED STYLE & TERMINOLOGY RULES:
The user has defined custom style and glossary rules that override standard conventions when applicable:
${ruleBullets}

STRICT RULE PRECEDENCE:
1. Apply the user's custom style rules above whenever they are relevant to the input text.
2. If a custom rule specifies exact casing, spelling, or preferred wording (e.g. 'eBPF', 'PostgreSQL', product names, brand vocabulary), preserve or convert to that exact form.
3. If a custom rule does not apply to the current text, ignore it.
4. Apply standard grammar, punctuation, and clarity conventions for everything else.
`;
}

export interface StyleSuggestionItem {
  id: string;
  category: "correctness" | "clarity" | "engagement" | "delivery";
  title: string;
  description: string;
  originalText: string;
  replacementText: string;
  explanation: string;
  startIndex?: number;
  endIndex?: number;
}

/**
 * Directly analyzes text against atomic style rules to generate deterministic suggestion cards.
 */
export function extractStyleRuleSuggestions(text: string, rules: string[]): StyleSuggestionItem[] {
  const items: StyleSuggestionItem[] = [];
  const seenMatches = new Set<string>();

  for (const rule of rules) {
    const match1 = rule.match(/use\s+['"]([^'"]+)['"],?\s+never\s+(.+)/i);
    const match2 = rule.match(/(?:always\s+)?(?:write|use)\s+['"]([^'"]+)['"]\s+instead\s+of\s+['"]([^'"]+)['"]/i);
    const match3 = rule.match(/write\s+['"]([^'"]+)['"]\s+as\s+a\s+single\s+word,?\s+never\s+['"]([^'"]+)['"]/i);
    const match4 = rule.match(/capitalize\s+['"]([^'"]+)['"][^,]*,?\s*never\s+['"]([^'"]+)['"]/i);
    const match5 = rule.match(/always\s+refer\s+to\s+(?:our\s+)?([^'"]+)\s+as\s+['"]([^'"]+)['"]/i);

    let preferred = "";
    let forbidden: string[] = [];

    if (match1) {
      preferred = match1[1];
      const rest = match1[2];
      const quoted = rest.match(/['"]([^'"]+)['"]/g);
      if (quoted && quoted.length > 0) {
        forbidden = quoted.map((q) => q.replace(/['"]/g, ""));
      } else {
        forbidden = rest.split(/\s+or\s+|\s*,\s*/i).map((w) => w.replace(/['".]/g, "").trim()).filter(Boolean);
      }
    } else if (match2) {
      preferred = match2[1];
      forbidden = [match2[2]];
    } else if (match3) {
      preferred = match3[1];
      forbidden = [match3[2]];
    } else if (match4) {
      preferred = match4[1];
      forbidden = [match4[2]];
    } else if (match5) {
      preferred = match5[2];
      forbidden = [match5[1]];
    } else {
      const allQuoted = rule.match(/['"]([^'"]+)['"]/g);
      if (allQuoted && allQuoted.length >= 2) {
        preferred = allQuoted[0].replace(/['"]/g, "");
        forbidden = allQuoted.slice(1).map((q) => q.replace(/['"]/g, ""));
      }
    }

    for (const badWord of forbidden) {
      if (!badWord.trim()) continue;
      const escaped = badWord.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "gi");
      let m;
      while ((m = regex.exec(text)) !== null) {
        const found = m[0];
        const matchKey = `${m.index}:${found}->${preferred}`;
        if (found !== preferred && !seenMatches.has(matchKey)) {
          seenMatches.add(matchKey);
          items.push({
            id: `style-${Date.now()}-${items.length}-${Math.random().toString(36).substring(2, 7)}`,
            category: "correctness",
            title: "Style Guide",
            description: `Change '${found}' to '${preferred}'`,
            originalText: found,
            replacementText: preferred,
            explanation: `Custom Style Rule: ${rule}`,
            startIndex: m.index,
            endIndex: m.index + found.length,
          });
        }
      }
    }
  }

  return items;
}


