import Link from "next/link";
import { ArrowRight, BookMarked, FileDown, Gauge, History, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSculpture } from "@/components/marketing/hero-sculpture";
import { LiveDemo } from "@/components/marketing/live-demo";
import { Reveal } from "@/components/marketing/reveal";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant, in your browser",
    body: "Spelling, phrasing and your style guide are checked in a Web Worker as you type. Milliseconds, no network, no limit.",
    className: "lg:col-span-2",
  },
  { icon: Sparkles, title: "AI that edits, not rewrites", body: "Only the paragraph you changed is sent, and only minimal, verifiable edits come back." },
  { icon: BookMarked, title: "Your terms, enforced", body: "“PostgreSQL, never Postgres.” Paste your guide; rules apply everywhere, instantly." },
  { icon: History, title: "Undo just works", body: "Accepting a fix is one step. Ctrl+Z puts your word back. Underlines follow your text while you type.", className: "sm:col-span-2" },
  { icon: ShieldCheck, title: "Never loses your work", body: "Versioned autosave: a stale tab gets a conflict notice instead of overwriting newer text." },
  { icon: Gauge, title: "Honest numbers", body: "Real Flesch–Kincaid readability. No inflated scores, and tone is labelled as an estimate." },
  { icon: FileDown, title: "Real Word export", body: "Export a proper .docx with headings and lists, or Markdown, text or PDF." },
];

export default function Home() {
  return (
    <>
      <HeroSculpture />

      <section id="demo" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Live demo</p>
          <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Mistakes, caught before you finish the sentence</h2>
          <p className="mt-3 text-muted-foreground">This box runs the exact checker the editor uses, with two sample style rules. Edit it.</p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10">
          <LiveDemo />
        </Reveal>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Why it feels fast</p>
          <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Three tiers of help, each where it belongs</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.06} className={f.className}>
              <div className="group h-full rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110 group-hover:-rotate-6">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-5 font-medium">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-8 md:flex-row md:items-center">
          <Reveal className="max-w-xl">
            <h2 className="font-serif text-3xl tracking-tight">Measured, not guessed</h2>
            <p className="mt-2 text-muted-foreground">
              The grammar checker is benchmarked on CoNLL-2014 with GLEU and ERRANT F0.5, and every report records the model and prompt version it measured.
            </p>
          </Reveal>
          <div className="flex gap-3 md:ml-auto">
            <Button asChild variant="outline">
              <Link href="/how-it-works">How it works</Link>
            </Button>
            <Button asChild>
              <Link href="/register">
                Start writing <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
