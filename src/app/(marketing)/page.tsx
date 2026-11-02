import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveDemo } from "@/components/marketing/live-demo";
import { AnnotatedEditor } from "@/components/marketing/annotated-editor";

/*
 * Type on this page, deliberately few roles:
 *   display  serif 40/56px  (h1)
 *   title    serif 26px     (section headings)
 *   body     sans 15px      (everything else; 17px for the one lead paragraph)
 *   small    sans 13px      (labels, numbers)
 */

/** A proofreader's correction: the wrong word struck through in red, the right one written above it. */
function Correction({ wrong, right }: { wrong: string; right: string }) {
  return (
    <span className="relative inline-block">
      <span className="text-muted-foreground line-through decoration-sg-correctness decoration-[0.06em]">{wrong}</span>
      <span className="absolute -top-[0.72em] left-1/2 -translate-x-1/2 font-serif text-[0.5em] leading-none whitespace-nowrap text-sg-correctness italic">
        {right}
      </span>
    </span>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-8">
      <section className="pt-20 pb-14 sm:pt-28">
        <h1
          aria-label="Catch every typo, clumsy phrase and off-brand word while you write."
          className="max-w-[22ch] font-serif text-[40px] leading-[1.18] font-normal tracking-[-0.02em] text-balance sm:text-[56px]"
        >
          <span aria-hidden>
            Catch every <Correction wrong="tpyo" right="typo" />, clumsy phrase and off‑brand word while you write.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
          Grammar Master is a document editor. Corrections are underlined in place as you type and accepted with one click.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href="/register">Start writing</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="#demo">Try it</Link>
          </Button>
        </div>
      </section>

      <section id="demo" aria-label="Try the checker" className="pb-20">
        <LiveDemo />
        <p className="mt-3 text-[13px] text-muted-foreground">
          Spelling and style checks run in your browser. Only the paragraph you just edited is sent for grammar checking.
        </p>
      </section>

      <section id="features" className="scroll-mt-8 border-t py-16">
        <h2 className="font-serif text-[26px] leading-tight tracking-tight">What it does</h2>
        <p className="mt-2 mb-10 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          The checks above run as you type. Here is the rest of the editor, with each part numbered.
        </p>
        <AnnotatedEditor />
      </section>

      <section className="border-t py-16">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <p className="max-w-lg font-serif text-[26px] leading-snug tracking-tight">Create an account and start a document.</p>
          <Button asChild size="lg">
            <Link href="/register">Start writing</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
