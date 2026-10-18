"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const } } };

export function HeroCopy() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 py-6 lg:py-20">
      <motion.p variants={item} className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-emerald-500" /> Instant checks run on your device
      </motion.p>
      <motion.h1 variants={item} className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl">
        Write clearly.
        <br />
        <span className="bg-gradient-to-r from-primary via-[oklch(0.62_0.18_270)] to-[oklch(0.62_0.15_240)] bg-clip-text text-transparent italic">Instantly.</span>
      </motion.h1>
      <motion.p variants={item} className="mt-6 max-w-lg text-lg text-pretty text-muted-foreground">
        A focused writing workspace that underlines mistakes as you type, enforces your team’s terminology, and rewrites a selection when you ask, without touching the rest.
      </motion.p>
      <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" className="group">
          <Link href="/register">
            Start writing free <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="#demo">Try the demo</Link>
        </Button>
      </motion.div>
      <motion.ul variants={item} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {["No card needed", "Real .docx export", "Undo every fix"].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <Check className="size-4 text-primary" /> {t}
          </li>
        ))}
      </motion.ul>
    </motion.div>
  );
}
