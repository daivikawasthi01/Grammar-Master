import Link from "next/link";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-8 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex" aria-label="Site">
          <Link href="/#features" className="hover:text-foreground">Features</Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {signedIn ? (
            <Button asChild size="sm">
              <Link href="/app">Open documents</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Start writing</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
