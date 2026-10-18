import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  // Gradient via CSS, not an SVG <defs> id: a duplicate id inside a hidden copy (e.g. the desktop sidebar on mobile) blanks the fill.
  return (
    <span aria-hidden className={cn("grid size-7 shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-[#8fa596] to-[#4f6758] shadow-sm shadow-primary/30", className)}>
      <svg viewBox="0 0 32 32" className="size-full">
        <path d="M9.5 20.5c2.2-6.2 4.4-9.3 6.5-9.3 1.6 0 2.1 1.6 1.4 4.3-.7 2.7-.4 4.4 1 4.4 1.2 0 2.5-1.2 4.1-3.6" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="22.6" cy="11.4" r="1.6" fill="white" />
      </svg>
    </span>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>Grammar Master</span>
    </Link>
  );
}
