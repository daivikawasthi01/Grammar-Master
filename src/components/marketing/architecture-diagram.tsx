"use client";

import { motion } from "motion/react";

type Box = { x: number; y: number; w: number; h: number; title: string; sub: string; accent?: boolean };

const BOXES: Box[] = [
  { x: 20, y: 40, w: 200, h: 64, title: "Editor (TipTap)", sub: "document as JSON" },
  { x: 20, y: 150, w: 200, h: 64, title: "Instant checks", sub: "Web Worker · no network", accent: true },
  { x: 20, y: 260, w: 200, h: 64, title: "Autosave", sub: "PATCH with base version" },
  { x: 330, y: 40, w: 210, h: 64, title: "/api/check", sub: "one paragraph · cached" },
  { x: 330, y: 150, w: 210, h: 64, title: "/api/rewrite", sub: "selection · streamed" },
  { x: 330, y: 260, w: 210, h: 64, title: "/api/documents", sub: "409 on stale versions" },
  { x: 650, y: 40, w: 190, h: 64, title: "Redis", sub: "cache · rate limits" },
  { x: 650, y: 150, w: 190, h: 64, title: "Groq", sub: "gpt-oss 20b / 120b" },
  { x: 650, y: 260, w: 190, h: 64, title: "MongoDB", sub: "users · documents · usage" },
];

const EDGES: Array<{ d: string; label: string; lx: number; ly: number }> = [
  { d: "M220 72 H330", label: "paragraph", lx: 275, ly: 64 },
  { d: "M120 104 V150", label: "every edit", lx: 160, ly: 132 },
  { d: "M220 86 C 280 86, 280 182, 330 182", label: "selection", lx: 268, ly: 140 },
  { d: "M220 292 H330", label: "save", lx: 275, ly: 284 },
  { d: "M540 72 H650", label: "cache", lx: 595, ly: 64 },
  { d: "M540 86 C 600 86, 600 170, 650 170", label: "20b · strict JSON", lx: 610, ly: 118 },
  { d: "M540 190 H650", label: "120b · stream", lx: 595, ly: 210 },
  { d: "M540 292 H650", label: "documents", lx: 595, ly: 284 },
];

/** The request-flow diagram, drawn as SVG so it scales and follows the theme. */
export function ArchitectureDiagram() {
  return (
    <figure className="rounded-2xl border bg-card p-4 sm:p-6">
      <div className="overflow-x-auto">
        <svg viewBox="0 0 860 350" className="h-auto w-full min-w-[720px]" role="img" aria-labelledby="arch-title">
          <title id="arch-title">Request flow: the browser runs instant checks locally; only changed paragraphs and selections reach the API, which uses Redis, Groq and MongoDB.</title>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="var(--muted-foreground)" />
            </marker>
          </defs>
          {[
            { x: 20, label: "Browser" },
            { x: 330, label: "Route handlers · session, zod, rate limit" },
            { x: 650, label: "Services" },
          ].map((c) => (
            <text key={c.x} x={c.x} y={22} fontSize={12} fill="var(--muted-foreground)" fontWeight={500}>
              {c.label}
            </text>
          ))}
          {EDGES.map((e, i) => (
            <g key={i}>
              <motion.path
                d={e.d}
                fill="none"
                stroke="var(--muted-foreground)"
                strokeOpacity={0.6}
                strokeWidth={1.25}
                markerEnd="url(#arrow)"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
              />
              <text x={e.lx} y={e.ly} fontSize={10.5} textAnchor="middle" fill="var(--muted-foreground)">
                {e.label}
              </text>
            </g>
          ))}
          {BOXES.map((b, i) => (
            <motion.g key={b.title} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={12} fill={b.accent ? "color-mix(in oklch, var(--primary) 12%, var(--card))" : "var(--background)"} stroke={b.accent ? "var(--primary)" : "var(--border)"} strokeWidth={b.accent ? 1.5 : 1} />
              <text x={b.x + 16} y={b.y + 28} fontSize={14} fontWeight={600} fill="var(--foreground)">
                {b.title}
              </text>
              <text x={b.x + 16} y={b.y + 48} fontSize={11.5} fill="var(--muted-foreground)">
                {b.sub}
              </text>
            </motion.g>
          ))}
        </svg>
      </div>
      <figcaption className="mt-3 text-xs text-muted-foreground">Instant checks never touch the network. The check route sees one changed paragraph; rewrites act only on the selection.</figcaption>
    </figure>
  );
}
