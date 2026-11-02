import { applyRules, droppedProtected, compileRules, matchRules, protectedSpans } from "./style-rules";
import type { StyleRule } from "../schemas";

const rule = (preferred: string, forbidden: string[], caseSensitive = true): StyleRule => ({
  id: preferred,
  preferred,
  forbidden,
  caseSensitive,
});

describe("matchRules", () => {
  it("flags forbidden terms on word boundaries only", () => {
    const m = compileRules([rule("PostgreSQL", ["Postgres"])]);
    const hits = matchRules(m, "We run Postgres. PostgreSQL is fine; Postgresish is not a match.");
    expect(hits).toEqual([expect.objectContaining({ from: 7, to: 15, original: "Postgres", replacement: "PostgreSQL" })]);
  });

  it("catches wrong casing of the preferred term when case-sensitive", () => {
    const m = compileRules([rule("eBPF", [])]);
    const hits = matchRules(m, "EBPF and ebpf, but eBPF is fine");
    expect(hits.map((h) => h.original)).toEqual(["EBPF", "ebpf"]);
  });

  it("ignores casing when the rule is case-insensitive", () => {
    const m = compileRules([rule("email", ["e-mail"], false)]);
    expect(matchRules(m, "Send an E-Mail or Email").map((h) => h.original)).toEqual(["E-Mail"]);
  });

  it("handles terms with regex characters and multi-word terms", () => {
    const m = compileRules([rule("C++", ["c plus plus"]), rule("Node.js", ["NodeJS", "node js"])]);
    expect(matchRules(m, "I like c plus plus and NodeJS and node js").map((h) => h.replacement)).toEqual([
      "C++",
      "Node.js",
      "Node.js",
    ]);
  });

  it("returns non-overlapping hits in document order", () => {
    const m = compileRules([rule("front end", ["frontend"]), rule("front-end developer", ["frontend developer"])]);
    const hits = matchRules(m, "a frontend developer");
    expect(hits).toHaveLength(1);
    expect(hits[0].from).toBe(2);
  });
});

describe("protect rules", () => {
  const protect = (preferred: string, forbidden: string[]): StyleRule => ({ id: preferred, kind: "protect", preferred, forbidden, caseSensitive: false });

  it("finds protected spans of every grouped term, case-insensitively on word boundaries", () => {
    expect(protectedSpans([protect("wdym", ["gtg"])], "WDYM? wdymx GTG").map((s) => [s.from, s.to])).toEqual([[0, 4], [12, 15]]);
  });

  it("never turns a protect rule into a replacement hit", () => {
    expect(matchRules(compileRules([protect("yaar", ["bhai"])]), "YAAR bhai")).toEqual([]);
  });
});

describe("applyRules and droppedProtected", () => {
  const rules = [
    { id: "r", kind: "replace" as const, preferred: "PostgreSQL", forbidden: ["Postgres"], caseSensitive: true },
    { id: "p", kind: "protect" as const, preferred: "yaar", forbidden: [], caseSensitive: false },
  ];
  it("fixes forbidden spellings and leaves everything else", () => {
    expect(applyRules(rules, "We run Postgres, yaar.")).toBe("We run PostgreSQL, yaar.");
  });
  it("reports protected words the result lost", () => {
    expect(droppedProtected(rules, "Hi yaar", "Hi friend")).toEqual(["yaar"]);
    expect(droppedProtected(rules, "Hi yaar", "Hello Yaar")).toEqual([]);
  });
});
