import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { ArchitectureDiagram } from "@/components/marketing/architecture-diagram";

export const metadata: Metadata = { title: "How it works", description: "Architecture, the three tiers of checks, and how the grammar checker is evaluated." };

const TIERS = [
  {
    n: "01",
    title: "Instant checks, on your device",
    body: "A Web Worker runs a Hunspell dictionary (nspell), the phrase rules and your compiled style-guide matcher on every pause. Results arrive in milliseconds and never leave the browser.",
  },
  {
    n: "02",
    title: "Paragraph checks, cached",
    body: "When a paragraph settles, only that paragraph is sent to /api/check. A fast model returns minimal edits in a strict JSON schema; each edit is verified against the text before it is shown. Identical paragraphs are served from cache.",
  },
  {
    n: "03",
    title: "Rewrites, on request",
    body: "Select text and choose a rewrite. The larger model streams a preview; accepting replaces only the selection, as one undoable step.",
  },
];

const EVALS = [
  { date: "2026-09-08", mode: "Live route", n: 150, gleu: "0.765", f05: "0.516", p: "0.518", r: "0.567", p50: "2811 ms" },
  { date: "2026-09-08", mode: "Live route", n: 30, gleu: "0.703", f05: "0.333", p: "0.329", r: "0.371", p50: "788 ms" },
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
      <Reveal className="max-w-2xl">
        <p className="text-sm font-medium text-primary">How it works</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Fast where it can be, careful where it counts</h1>
        <p className="mt-4 text-lg text-muted-foreground">Most feedback never needs a server. The AI only sees the paragraph you just changed, and every suggestion is checked against your text before it is underlined.</p>
      </Reveal>

      <Reveal delay={0.1} className="mt-12">
        <ArchitectureDiagram />
      </Reveal>

      <section className="mt-20 grid gap-4 md:grid-cols-3">
        {TIERS.map((t, i) => (
          <Reveal key={t.n} delay={i * 0.08}>
            <div className="h-full rounded-2xl border bg-card p-6">
              <span className="font-mono text-xs text-primary">{t.n}</span>
              <h2 className="mt-3 font-medium">{t.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="mt-20">
        <Reveal>
          <h2 className="font-serif text-3xl tracking-tight">Evaluation</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The checker is scored on CoNLL-2014 sentences with multiple human references, using GLEU and ERRANT F0.5 (precision weighted, because a wrong edit costs a writer more than a missed one).
          </p>
        </Reveal>
        <Reveal delay={0.08} className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                {["Date", "Mode", "Sentences", "GLEU", "F0.5", "Precision", "Recall", "p50 latency"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {EVALS.map((e) => (
                <tr key={e.n} className="border-t">
                  <td className="px-4 py-3">{e.date}</td>
                  <td className="px-4 py-3">{e.mode}</td>
                  <td className="px-4 py-3">{e.n}</td>
                  <td className="px-4 py-3">{e.gleu}</td>
                  <td className="px-4 py-3 font-medium">{e.f05}</td>
                  <td className="px-4 py-3">{e.p}</td>
                  <td className="px-4 py-3">{e.r}</td>
                  <td className="px-4 py-3">{e.p50}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <Reveal delay={0.12}>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <li>These runs measured the previous whole-sentence prompt. The current check asks for minimal edits and has not been re-run yet; the harness now records the model and prompt version so results stay comparable.</li>
            <li>Only the 150-sentence run is large enough to quote. A pinned 250-sentence set with clean control sentences is included for the next run.</li>
          </ul>
        </Reveal>
      </section>
    </div>
  );
}
