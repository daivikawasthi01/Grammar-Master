import "./polyfill";
import {
  splitIntoAtomicRules,
  retrieveRelevantRules,
  buildStyleRAGPrompt,
  extractStyleRuleSuggestions,
} from "./rag-style";
import { generateEmbedding, cosineSimilarity } from "./embeddings";
import {
  upsertVectors,
  queryVectors,
  deleteVectors,
  resetInMemoryVectorStore,
} from "./vector-store";

describe("Style Guide RAG Pipeline", () => {
  beforeEach(() => {
    resetInMemoryVectorStore();
  });

  describe("splitIntoAtomicRules", () => {
    it("correctly segments markdown bullet points and strips formatting", () => {
      const markdown = `
# Engineering Style Guide
- Use 'eBPF', never 'Ebpf' or 'ebpf'.
* Always write 'PostgreSQL' instead of 'Postgres'.
• Prefer active voice in documentation.
1. Use Oxford comma in all technical lists.
      `;

      const rules = splitIntoAtomicRules(markdown);
      expect(rules).toEqual([
        "Use 'eBPF', never 'Ebpf' or 'ebpf'.",
        "Always write 'PostgreSQL' instead of 'Postgres'.",
        "Prefer active voice in documentation.",
        "Use Oxford comma in all technical lists.",
      ]);
    });

    it("handles semicolon-separated glossary items", () => {
      const glossary = "Use 'Kubernetes' for K8s; Spell out 'Authentication' in titles; Use 'Node.js'";
      const rules = splitIntoAtomicRules(glossary);
      expect(rules).toEqual([
        "Use 'Kubernetes' for K8s",
        "Spell out 'Authentication' in titles",
        "Use 'Node.js'",
      ]);
    });

    it("returns empty array on empty input", () => {
      expect(splitIntoAtomicRules("")).toEqual([]);
      expect(splitIntoAtomicRules("   \n\n  ")).toEqual([]);
    });
  });

  describe("Embeddings & Vector Cosine Similarity", () => {
    it("generates normalized 384-dimensional vectors", async () => {
      const emb = await generateEmbedding("Use 'eBPF' for kernel tracing");
      expect(Array.isArray(emb)).toBe(true);
      expect(emb.length).toBe(384);

      // Verify L2 norm is ~1.0
      const norm = Math.sqrt(emb.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 3);
    });

    it("measures higher similarity between semantically related phrases", async () => {
      const embTarget = await generateEmbedding("eBPF kernel programs");
      const embRelated = await generateEmbedding("Tracing Linux kernels with eBPF");
      const embUnrelated = await generateEmbedding("Baking sourdough chocolate chip cookies");

      const simRelated = cosineSimilarity(embTarget, embRelated);
      const simUnrelated = cosineSimilarity(embTarget, embUnrelated);

      expect(simRelated).toBeGreaterThan(simUnrelated);
    });
  });

  describe("Vector Store & Retrieval", () => {
    it("stores vectors and retrieves them isolated by userId", async () => {
      const user1 = "user_abc";
      const user2 = "user_xyz";

      const emb1 = await generateEmbedding("Use 'eBPF', never 'Ebpf'");
      const emb2 = await generateEmbedding("Always refer to company as 'GrammarMaster AI'");
      const embOtherUser = await generateEmbedding("Confidential internal project Apollo");

      await upsertVectors([
        {
          id: "v1",
          vector: emb1,
          metadata: { userId: user1, styleGuideId: "sg1", text: "Use 'eBPF', never 'Ebpf'" },
        },
        {
          id: "v2",
          vector: emb2,
          metadata: {
            userId: user1,
            styleGuideId: "sg1",
            text: "Always refer to company as 'GrammarMaster AI'",
          },
        },
        {
          id: "v3",
          vector: embOtherUser,
          metadata: {
            userId: user2,
            styleGuideId: "sg2",
            text: "Confidential internal project Apollo",
          },
        },
      ]);

      const queryEmb = await generateEmbedding("Ebpf performance monitoring");
      const resultsUser1 = await queryVectors(queryEmb, user1, 2);

      expect(resultsUser1.length).toBeGreaterThan(0);
      expect(resultsUser1[0].metadata?.text).toBe("Use 'eBPF', never 'Ebpf'");

      // Verify user isolation: user1 query should never return user2 chunks
      const user1All = await queryVectors(queryEmb, user1, 10);
      expect(user1All.some((r) => r.metadata?.userId === user2)).toBe(false);
    });

    it("deletes vectors correctly", async () => {
      const user = "user_1";
      const emb = await generateEmbedding("Rule to delete");
      await upsertVectors([
        {
          id: "del_1",
          vector: emb,
          metadata: { userId: user, styleGuideId: "sg_del", text: "Rule to delete" },
        },
      ]);

      const beforeDelete = await queryVectors(emb, user, 1);
      expect(beforeDelete.length).toBe(1);

      await deleteVectors(["del_1"]);

      const afterDelete = await queryVectors(emb, user, 1);
      expect(afterDelete.length).toBe(0);
    });
  });

  describe("retrieveRelevantRules & buildStyleRAGPrompt", () => {
    it("retrieves top relevant rules for a given input sentence", async () => {
      const userId = "writer_42";
      const ruleText = "Always capitalize 'TypeScript' and 'JavaScript'.";
      const emb = await generateEmbedding(ruleText);

      await upsertVectors([
        {
          id: "rule_ts",
          vector: emb,
          metadata: { userId, styleGuideId: "sg_code", text: ruleText },
        },
      ]);

      const retrieved = await retrieveRelevantRules("We write typescript apps", userId, 2);
      expect(retrieved).toContain(ruleText);
    });

    it("assembles prompt with strict precedence and non-interference clauses", () => {
      const rules = [
        "Use 'eBPF', never 'Ebpf'",
        "Always spell 'PostgreSQL' completely",
      ];
      const prompt = buildStyleRAGPrompt(rules);

      expect(prompt).toContain("USER-SPECIFIED STYLE & TERMINOLOGY RULES");
      expect(prompt).toContain("STRICT RULE PRECEDENCE");
      expect(prompt).toContain("- Use 'eBPF', never 'Ebpf'");
      expect(prompt).toContain("- Always spell 'PostgreSQL' completely");
      expect(prompt).toContain("Apply standard grammar, punctuation, and clarity conventions for everything else.");
    });

    it("returns empty string if no rules are provided", () => {
      expect(buildStyleRAGPrompt([])).toBe("");
    });
  });

  describe("extractStyleRuleSuggestions", () => {
    it("extracts eBPF suggestion when 'ebpf' or 'Ebpf' is written", () => {
      const rules = ["Use 'eBPF', never 'Ebpf' or 'ebpf'."];
      const text = "We deployed ebpf for kernel tracing and Ebpf filters.";
      const suggestions = extractStyleRuleSuggestions(text, rules);

      expect(suggestions.length).toBe(2);
      expect(suggestions[0].originalText).toBe("ebpf");
      expect(suggestions[0].replacementText).toBe("eBPF");
      expect(suggestions[0].category).toBe("correctness");
      expect(suggestions[0].title).toBe("Style Guide");

      expect(suggestions[1].originalText).toBe("Ebpf");
      expect(suggestions[1].replacementText).toBe("eBPF");
    });

    it("extracts PostgreSQL suggestion when 'Postgres' is written", () => {
      const rules = ["Always write 'PostgreSQL' instead of 'Postgres'."];
      const text = "Connecting to Postgres database on cluster.";
      const suggestions = extractStyleRuleSuggestions(text, rules);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].originalText).toBe("Postgres");
      expect(suggestions[0].replacementText).toBe("PostgreSQL");
    });

    it("extracts microservices suggestion when 'micro-services' is written", () => {
      const rules = ["Write 'microservices' as a single word, never 'micro-services'."];
      const text = "Our architecture uses micro-services for scaling.";
      const suggestions = extractStyleRuleSuggestions(text, rules);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].originalText).toBe("micro-services");
      expect(suggestions[0].replacementText).toBe("microservices");
    });
  });
});
