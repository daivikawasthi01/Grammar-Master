import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark: the name in the serif, with the editor's own spelling squiggle under the first word. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-baseline font-serif text-[20px] font-medium tracking-tight whitespace-nowrap", className)} aria-label="Grammar Master, home">
      <span className="relative">
        Grammar
        <svg aria-hidden viewBox="0 0 60 4" preserveAspectRatio="none" className="absolute -bottom-[3px] left-0 h-[4px] w-full text-sg-correctness">
          <path d="M0 2 Q 2.5 0 5 2 T 10 2 T 15 2 T 20 2 T 25 2 T 30 2 T 35 2 T 40 2 T 45 2 T 50 2 T 55 2 T 60 2" fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
      </span>
      <span>&nbsp;Master</span>
    </Link>
  );
}
