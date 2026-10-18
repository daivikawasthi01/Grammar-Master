import Link from "next/link";
import { Logo } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-8">
        <Logo />
        <nav className="flex flex-wrap gap-5" aria-label="Footer">
          <Link href="/how-it-works" className="hover:text-foreground">How it works</Link>
          <Link href="/login" className="hover:text-foreground">Sign in</Link>
          <a href="https://github.com/daivikawasthi01/Grammar-Master" className="hover:text-foreground">Source</a>
        </nav>
        <p className="sm:ml-auto">MIT licensed · Built with Next.js, MongoDB and Groq</p>
      </div>
    </footer>
  );
}
