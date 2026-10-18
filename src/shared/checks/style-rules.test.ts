import { compileRules, matchRules, parseRuleLine, parseStyleGuideText } from "./style-rules";
import type { StyleRule } from "../schemas";

const rule = (preferred: string, forbidden: string[], caseSensitive = true): StyleRule => ({
  id: preferred,
  preferred,
  forbidden,
  caseSensitive,
});

describe("parseRuleLine", () => {
  it.each([
    ["Use 'eBPF', never 'Ebpf' or 'ebpf'.", "eBPF", ["Ebpf", "ebpf"]],
    ["Always write 'PostgreSQL' instead of 'Postgres'.", "PostgreSQL", ["Postgres"]],
    ["Write 'microservices' as a single word, never 'micro-services'.", "microservices", ["micro-services"]],
    ["Capitalize 'Q3' in all business communications, never 'q3'.", "Q3", ["q3"]],
    ["Always refer to our app as 'Grammar Master'.", "Grammar Master", ["our app"]],
    ["'e-mail' -> 'email'", "email", ["e-mail"]],
    ["login => log in", "log in", ["login"]],
    ["Prefer 'sign in' over 'login' and 'log-in'", "sign in", ["login", "log-in"]],
  ])("%s", (line, preferred, forbidden) => {
    const parsed = parseRuleLine(line);
    expect(parsed?.preferred).toBe(preferred);
    expect(parsed?.forbidden).toEqual(forbidden);
  });

  it("returns null for prose it cannot structure", () => {
    expect(parseRuleLine("Be concise and friendly.")).toBeNull();
  });
});

describe("parseStyleGuideText", () => {
  it("parses bullets, skips headings and reports lines it could not use", () => {
    const { rules, skipped } = parseStyleGuideText("# Terms\n- Use 'eBPF', never 'ebpf'\n- Keep it short\n\n1. 'JS' -> 'JavaScript'");
    expect(rules.map((r) => r.preferred)).toEqual(["eBPF", "JavaScript"]);
    expect(skipped).toEqual(["Keep it short"]);
  });
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
