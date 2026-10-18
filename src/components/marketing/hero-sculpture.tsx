"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import SculptureHero from "@/components/ui/liquid-sculpture-hero";

/**
 * Landing hero: the liquid particle sculpture, wired to our theme, fonts and copy.
 * Colours come from our CSS variables (so the first paint is already in the right
 * theme); the resolved theme only picks the light/dark sculpture image and the
 * engine's tint once it is known on the client.
 */
export function HeroSculpture() {
  const { resolvedTheme } = useTheme();
  // The server cannot know the visitor's theme; render the light image first, then switch after mount
  // (the stage stays hidden for that first moment so a wrong-theme sculpture never flashes).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";

  return (
    <SculptureHero
      theme={theme}
      className={mounted ? "hero-sculpture" : "hero-sculpture sh-pending"}
      showNav={false}
      themeToggle={false}
      loadFonts={false}
      height="calc(100svh - 4rem)"
      background="#F6F6F4"
      darkBackground="#0B0B0B"
      headingFont="var(--font-geist-sans), system-ui, sans-serif"
      bodyFont="var(--font-geist-sans), system-ui, sans-serif"
      accentFont="var(--font-serif), Georgia, serif"
      eyebrow="Instant checks · AI that edits, not rewrites"
      headline={"Write clearly.\nInstantly."}
      headlineAccent="Instantly."
      body="A focused writing workspace that underlines mistakes as you type, enforces your team’s terminology, and rewrites a selection when you ask, without touching the rest."
      primaryCta={{ label: "Start writing free", href: "/register" }}
      secondaryCta={{ label: "Try the live demo", href: "#demo" }}
      backdropText="write"
      hint="Move across the form"
      hintTouch="Touch the form"
      style={
        {
          "--sh-bg": "var(--background)",
          "--sh-fg": "var(--foreground)",
          "--sh-acc": "var(--primary)",
        } as React.CSSProperties
      }
    />
  );
}
