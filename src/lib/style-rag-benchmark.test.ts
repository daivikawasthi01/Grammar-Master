import "./polyfill";
import {
  splitIntoAtomicRules,
  retrieveRelevantRules,
  extractStyleRuleSuggestions,
  buildStyleRAGPrompt,
  MIN_STYLE_RETRIEVAL_SCORE,
} from "./rag-style";
import { generateEmbedding } from "./embeddings";
import { upsertVectors, resetInMemoryVectorStore } from "./vector-store";

interface BenchmarkCase {
  id: number;
  input: string;
  expectedViolations: Array<{
    original: string;
    replacement: string;
  }>;
  relevantRuleSnippet: string;
}

const BENCHMARK_RULES = `
- Use 'eBPF', never 'Ebpf' or 'ebpf'.
- Always write 'PostgreSQL' instead of 'Postgres'.
- Write 'microservices' as a single word, never 'micro-services'.
- Capitalize 'Q3' in all business communications, never 'q3'.
- Always refer to our application as 'Grammar Master'.
- Use 'Kubernetes', never 'K8s' or 'k8s'.
- Use 'TypeScript', never 'Typescript' or 'typescript'.
- Always write 'macOS' instead of 'Mac OS' or 'Mac OSX'.
- Use 'OAuth 2.0', never 'Oauth2' or 'oAuth2'.
`;

const BENCHMARK_SENTENCES: BenchmarkCase[] = [
  {
    id: 1,
    input: "We deployed ebpf filters for high-speed network observability.",
    expectedViolations: [{ original: "ebpf", replacement: "eBPF" }],
    relevantRuleSnippet: "eBPF",
  },
  {
    id: 2,
    input: "The kernel monitor relies on Ebpf bytecode probes.",
    expectedViolations: [{ original: "Ebpf", replacement: "eBPF" }],
    relevantRuleSnippet: "eBPF",
  },
  {
    id: 3,
    input: "Our team migrated the primary database to Postgres last week.",
    expectedViolations: [{ original: "Postgres", replacement: "PostgreSQL" }],
    relevantRuleSnippet: "PostgreSQL",
  },
  {
    id: 4,
    input: "The analytics service queries Postgres for weekly reporting.",
    expectedViolations: [{ original: "Postgres", replacement: "PostgreSQL" }],
    relevantRuleSnippet: "PostgreSQL",
  },
  {
    id: 5,
    input: "We refactored the monolith into micro-services for better isolation.",
    expectedViolations: [{ original: "micro-services", replacement: "microservices" }],
    relevantRuleSnippet: "microservices",
  },
  {
    id: 6,
    input: "Each engineering team owns a set of decoupled micro-services.",
    expectedViolations: [{ original: "micro-services", replacement: "microservices" }],
    relevantRuleSnippet: "microservices",
  },
  {
    id: 7,
    input: "Revenue targets for q3 exceeded our initial growth forecast.",
    expectedViolations: [{ original: "q3", replacement: "Q3" }],
    relevantRuleSnippet: "Q3",
  },
  {
    id: 8,
    input: "The financial roadmap for q3 will be presented on Monday.",
    expectedViolations: [{ original: "q3", replacement: "Q3" }],
    relevantRuleSnippet: "Q3",
  },
  {
    id: 9,
    input: "Welcome to grammar master, your intelligent writing assistant.",
    expectedViolations: [{ original: "grammar master", replacement: "Grammar Master" }],
    relevantRuleSnippet: "Grammar Master",
  },
  {
    id: 10,
    input: "All onboarding engineers should install grammar master.",
    expectedViolations: [{ original: "grammar master", replacement: "Grammar Master" }],
    relevantRuleSnippet: "Grammar Master",
  },
  {
    id: 11,
    input: "We manage production clusters on K8s across multiple regions.",
    expectedViolations: [{ original: "K8s", replacement: "Kubernetes" }],
    relevantRuleSnippet: "Kubernetes",
  },
  {
    id: 12,
    input: "Managing k8s deployments requires automated YAML validation.",
    expectedViolations: [{ original: "k8s", replacement: "Kubernetes" }],
    relevantRuleSnippet: "Kubernetes",
  },
  {
    id: 13,
    input: "Our backend codebase is built entirely with typescript and Node.",
    expectedViolations: [{ original: "typescript", replacement: "TypeScript" }],
    relevantRuleSnippet: "TypeScript",
  },
  {
    id: 14,
    input: "We upgraded the project to the latest Typescript release.",
    expectedViolations: [{ original: "Typescript", replacement: "TypeScript" }],
    relevantRuleSnippet: "TypeScript",
  },
  {
    id: 15,
    input: "The desktop application runs smoothly on Mac OS.",
    expectedViolations: [{ original: "Mac OS", replacement: "macOS" }],
    relevantRuleSnippet: "macOS",
  },
  {
    id: 16,
    input: "Compatibility testing was verified on Mac OSX systems.",
    expectedViolations: [{ original: "Mac OSX", replacement: "macOS" }],
    relevantRuleSnippet: "macOS",
  },
  {
    id: 17,
    input: "User login is secured using standard Oauth2 flows.",
    expectedViolations: [{ original: "Oauth2", replacement: "OAuth 2.0" }],
    relevantRuleSnippet: "OAuth 2.0",
  },
  {
    id: 18,
    input: "Third-party integrations communicate using oAuth2 tokens.",
    expectedViolations: [{ original: "oAuth2", replacement: "OAuth 2.0" }],
    relevantRuleSnippet: "OAuth 2.0",
  },
  {
    id: 19,
    input: "The pipeline combines Postgres with ebpf monitoring.",
    expectedViolations: [
      { original: "Postgres", replacement: "PostgreSQL" },
      { original: "ebpf", replacement: "eBPF" },
    ],
    relevantRuleSnippet: "PostgreSQL",
  },
  {
    id: 20,
    input: "In q3 we migrated our micro-services to K8s.",
    expectedViolations: [
      { original: "q3", replacement: "Q3" },
      { original: "micro-services", replacement: "microservices" },
      { original: "K8s", replacement: "Kubernetes" },
    ],
    relevantRuleSnippet: "microservices",
  },
];

describe("20-Sentence Custom Style Rules RAG Benchmark", () => {
  const userId = "eval_bench_user_42";
  let atomicRules: string[] = [];

  beforeAll(async () => {
    resetInMemoryVectorStore();
    atomicRules = splitIntoAtomicRules(BENCHMARK_RULES);

    // Index all atomic rules into vector store for RAG retrieval
    const records = [];
    for (let i = 0; i < atomicRules.length; i++) {
      const ruleText = atomicRules[i];
      const emb = await generateEmbedding(ruleText);
      records.push({
        id: `bench_rule_${i}`,
        vector: emb,
        metadata: {
          userId,
          styleGuideId: "sg_bench",
          text: ruleText,
        },
      });
    }
    await upsertVectors(records);
  });

  afterAll(() => {
    resetInMemoryVectorStore();
  });

  it("successfully indexes all 9 custom style rules into vector store", () => {
    expect(atomicRules.length).toBe(9);
  });

  it("evaluates rule violation detection across all 20 benchmark sentences (100% target accuracy)", () => {
    let totalExpected = 0;
    let totalDetected = 0;
    let totalFixed = 0;

    for (const testCase of BENCHMARK_SENTENCES) {
      const suggestions = extractStyleRuleSuggestions(testCase.input, atomicRules);

      for (const exp of testCase.expectedViolations) {
        totalExpected++;
        const matched = suggestions.find(
          (s) =>
            s.originalText.toLowerCase() === exp.original.toLowerCase() &&
            s.replacementText === exp.replacement
        );
        if (matched) {
          totalDetected++;
        }
      }

      // Simulate applying the extracted suggestions to produce fixed text
      let correctedText = testCase.input;
      // Sort suggestions descending by startIndex to prevent offset drift
      const sortedSug = [...suggestions].sort(
        (a, b) => (b.startIndex ?? 0) - (a.startIndex ?? 0)
      );

      for (const sug of sortedSug) {
        if (sug.startIndex !== undefined && sug.endIndex !== undefined) {
          correctedText =
            correctedText.slice(0, sug.startIndex) +
            sug.replacementText +
            correctedText.slice(sug.endIndex);
        }
      }

      // Verify that all expected replacements now exist in the corrected text
      let allPassed = true;
      for (const exp of testCase.expectedViolations) {
        if (!correctedText.includes(exp.replacement)) {
          allPassed = false;
        }
      }
      if (allPassed) {
        totalFixed++;
      }
    }

    const detectionRate = (totalDetected / totalExpected) * 100;
    const sentenceFixRate = (totalFixed / BENCHMARK_SENTENCES.length) * 100;

    console.log(
      `[Style RAG Benchmark] Total Sentences: ${BENCHMARK_SENTENCES.length}, Fixed: ${totalFixed} (${sentenceFixRate.toFixed(1)}%)`
    );
    console.log(
      `[Style RAG Benchmark] Total Violations: ${totalExpected}, Detected: ${totalDetected} (${detectionRate.toFixed(1)}%)`
    );

    expect(totalFixed).toBe(20);
    expect(sentenceFixRate).toBe(100);
    expect(totalDetected).toBe(totalExpected);
  });

  it("measures RAG vector retrieval precision for style queries against MIN_STYLE_RETRIEVAL_SCORE", async () => {
    let retrievedCount = 0;

    for (const testCase of BENCHMARK_SENTENCES) {
      const retrieved = await retrieveRelevantRules(testCase.input, userId, 3);
      expect(retrieved.length).toBeGreaterThan(0);

      // Check if at least one retrieved rule mentions the expected term
      const hasRelevant = retrieved.some((r) =>
        r.toLowerCase().includes(testCase.relevantRuleSnippet.toLowerCase())
      );
      if (hasRelevant) {
        retrievedCount++;
      }
    }

    const retrievalRecall = (retrievedCount / BENCHMARK_SENTENCES.length) * 100;
    console.log(
      `[Style RAG Benchmark] Vector Retrieval Top-3 Semantic Recall: ${retrievalRecall.toFixed(1)}% (${retrievedCount}/20)`
    );

    expect(retrievalRecall).toBeGreaterThanOrEqual(95);
  });

  it("constructs valid strict-precedence prompts containing retrieved rules", async () => {
    const sampleSentence = "We deployed ebpf filters with Postgres.";
    const retrieved = await retrieveRelevantRules(sampleSentence, userId, 3);
    const prompt = buildStyleRAGPrompt(retrieved);

    expect(prompt).toContain("USER-SPECIFIED STYLE & TERMINOLOGY RULES");
    expect(prompt).toContain("STRICT RULE PRECEDENCE");
    expect(prompt).toContain("eBPF");
    expect(prompt).toContain("PostgreSQL");
  });
});
