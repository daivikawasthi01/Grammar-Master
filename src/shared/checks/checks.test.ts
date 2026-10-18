import { runPhraseRules } from "./rules";
import { countSyllables, textStats } from "./readability";

describe("runPhraseRules", () => {
  it("finds repeated words and keeps one", () => {
    expect(runPhraseRules("This is the the end")).toEqual([
      expect.objectContaining({ original: "the the", replacement: "the", from: 8 }),
    ]);
  });

  it("keeps sentence-initial capitals", () => {
    expect(runPhraseRules("In order to win, practise.")[0]).toMatchObject({ original: "In order to", replacement: "To" });
  });

  it("fixes a/an before a vowel sound but not before a consonant sound", () => {
    expect(runPhraseRules("a apple, a hour, a user, a umbrella").map((m) => m.original)).toEqual(["a ", "a ", "a "]);
  });

  it("does not match inside longer words", () => {
    expect(runPhraseRules("Reutilizes alotment")).toEqual([]);
  });
});

describe("readability", () => {
  it.each([
    ["cat", 1],
    ["water", 2],
    ["readability", 5],
    ["the", 1],
  ])("syllables(%s) = %i", (w, n) => expect(countSyllables(w)).toBe(n));

  it("returns null scores for short text instead of a made-up number", () => {
    expect(textStats("Hello there.").fleschReadingEase).toBeNull();
  });

  it("scores simple prose as easier than dense prose", () => {
    const simple = "The cat sat on the mat. It was a warm day. The dog ran to the park. We had fun in the sun. ".repeat(3);
    const dense =
      "Notwithstanding considerable institutional deliberation, the organisational restructuring initiative necessitated comprehensive reconsideration of interdepartmental communication methodologies and administrative responsibilities. ".repeat(3);
    expect(textStats(simple).fleschReadingEase!).toBeGreaterThan(textStats(dense).fleschReadingEase!);
    expect(textStats(dense).fleschKincaidGrade!).toBeGreaterThan(14);
  });
});
