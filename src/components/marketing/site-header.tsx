"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const { scrollY } = useScroll();
  const border = useTransform(scrollY, [0, 40], ["rgba(0,0,0,0)", "var(--border)"]);
  return (
    <motion.header style={{ borderBottomColor: border }} className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex" aria-label="Site">
          <Link href="/#demo" className="hover:text-foreground">Demo</Link>
          <Link href="/#features" className="hover:text-foreground">Features</Link>
          <Link href="/how-it-works" className="hover:text-foreground">How it works</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Button asChild size="sm">
              <Link href="/app">Open app</Link>
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
    </motion.header>
  );
}
