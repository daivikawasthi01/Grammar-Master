import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { JourneyMap } from "@/components/marketing/journey-map";

export const metadata: Metadata = { title: "How it works", description: "Where your text goes, and when: follow a keystroke, a pause, a rewrite and a save, and see how the checker is scored." };

const EVALS = [
  { date: "2026-09-08", mode: "Live route", n: 150, gleu: "0.765", f05: "0.516", p: "0.518", r: "0.567", p50: "2811 ms" },
  { date: "2026-09-08", mode: "Live route", n: 30, gleu: "0.703", f05: "0.333", p: "0.329", r: "0.371", p50: "788 ms" },
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
      <Reveal className="max-w-2xl">
        <p className="text-sm font-medium text-primary">How it works</p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Where your text goes, and when</h1>
        <p className="mt-4 text-lg text-muted-foreground">Pick a moment below. The parts it touches light up, in order, with exactly what each one is sent.</p>
      </Reveal>

      <Reveal delay={0.1} className="mt-12">
        <JourneyMap />
      </Reveal>

      <section className="mt-20">
        <Reveal>
          <h2 className="font-serif text-3xl tracking-tight">Evaluation</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The checker is scored on CoNLL-2014 sentences with multiple human references, using GLEU and ERRANT F0.5 (precision weighted, because a wrong edit costs a writer more than a missed one). In short: both measure how closely the suggested edits match human editors, and higher is better.
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
