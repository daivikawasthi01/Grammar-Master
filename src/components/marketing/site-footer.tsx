import Link from "next/link";
import { Logo } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-8">
        <Logo className="text-foreground" />
        <nav className="flex flex-wrap gap-5" aria-label="Footer">
          <Link href="/how-it-works" className="hover:text-foreground">How it works</Link>
          <Link href="/login" className="hover:text-foreground">Sign in</Link>
          <a href="https://github.com/daivikawasthi01/Grammar-Master" className="hover:text-foreground">Source</a>
        </nav>
        <p className="sm:ml-auto">Open source, MIT licensed</p>
      </div>
    </footer>
  );
}
