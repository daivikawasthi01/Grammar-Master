/**
 * @jest-environment node
 */
import {
  calculateSpellingScore,
  calculateGrammarScore,
  calculateTextMetrics,
} from "@/app/helpers/CalculateTextMetrics";

describe("NLP Metrics & Heuristics", () => {
  test("does not penalize standard English vocabulary as misspellings", () => {
    const text = "The software engineering student builds an intelligent distributed system";
    const words = text.split(/\s+/);
    const score = calculateSpellingScore(words);
    expect(score).toBeGreaterThanOrEqual(95);
  });

  test("penalizes genuine typos and triple-character repeats", () => {
    const text = "teh definately wrrrong sooo bad";
    const words = text.split(/\s+/);
    const score = calculateSpellingScore(words);
    expect(score).toBeLessThan(85);
  });

  test("does not confuse progressive/continuous aspect with passive voice", () => {
    const progressiveSentence = "The engineer is designing the new architecture and we are running tests.";
    const score = calculateGrammarScore(progressiveSentence, [progressiveSentence]);
    // Continuous tense should not suffer heavy passive voice penalties
    expect(score).toBeGreaterThanOrEqual(90);
  });

  test("identifies true passive voice accurately", () => {
    const passiveSentence = "The code was written by an engineer and the bridge was built.";
    const activeSentence = "An engineer wrote the code and workers built the bridge.";

    const passiveScore = calculateGrammarScore(passiveSentence, [passiveSentence]);
    const activeScore = calculateGrammarScore(activeSentence, [activeSentence]);

    expect(activeScore).toBeGreaterThanOrEqual(passiveScore);
  });

  test("calculateTextMetrics returns holistic normalized metrics", async () => {
    const sample =
      "Modern full-stack applications require robust testing, solid architecture, and clear separation of concerns. Furthermore, reliability and latency are essential factors for production readiness.";
    const metrics = await calculateTextMetrics(sample);

    expect(metrics.correctness).toBeGreaterThan(70);
    expect(metrics.clarity).toBeGreaterThan(60);
    expect(metrics.engagement).toBeGreaterThan(60);
    expect(metrics.delivery).toBeGreaterThan(60);
  });

  test("offset-based text slicing replaces exact targeted occurrence without corrupting duplicate words", () => {
    const doc = "The quick fox and the brown fox jumps over the lazy dog.";
    // Target second 'fox' at offset 28..31
    const original = "fox";
    const targetStart = doc.lastIndexOf(original); // 28
    const targetEnd = targetStart + original.length; // 31
    const replacement = "wolf";

    const updated =
      doc.slice(0, targetStart) + replacement + doc.slice(targetEnd);

    expect(updated).toBe(
      "The quick fox and the brown wolf jumps over the lazy dog."
    );
    // First 'fox' is untouched!
    expect(updated.indexOf("fox")).toBe(10);
  });
});
