import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { JourneyMap } from "@/components/marketing/journey-map";

export const metadata: Metadata = { title: "How it works", description: "Where your text goes, and when: follow a keystroke, a pause, a rewrite and a save." };

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-16 pb-28 sm:px-8 sm:pt-24">
      <Reveal>
        <h1 className="font-serif text-4xl leading-[1.15] tracking-tight text-balance sm:text-5xl">Where your text goes, and when</h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
          Most of the checking happens on your own device. Pick a moment below to see exactly what leaves it, and where it goes.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-14">
        <JourneyMap />
      </Reveal>
    </div>
  );
}
