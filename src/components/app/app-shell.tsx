"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookMarked, FileText, LogOut, Menu, Settings } from "lucide-react";
import { motion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { useMe } from "@/hooks/queries";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Documents", icon: FileText, match: (p: string) => p === "/app" || p.startsWith("/app/d/") },
  { href: "/app/style-guide", label: "Style guide", icon: BookMarked, match: (p: string) => p.startsWith("/app/style-guide") },
  { href: "/app/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/app/settings") },
];

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-0.5" aria-label="Main">
      {NAV.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              active ? "text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-sidebar-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <Icon className="relative size-4" />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UsageMeter() {
  const { data } = useMe();
  if (!data) return <div className="h-14" />;
  const { used, limit, resetAt } = data.usage;
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">AI checks</span>
        <span className="tabular-nums text-muted-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <Progress value={pct} className="mt-2 h-1.5" aria-label="AI checks used this month" />
      <p className="mt-2 text-[11px] text-muted-foreground">Resets {new Date(resetAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}. Instant checks are unlimited.</p>
    </div>
  );
}

function UserMenu({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useMe();
  const current = data?.user ?? user;
  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    qc.clear();
    router.replace("/login");
    router.refresh();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-sidebar-accent/60">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/15 text-xs font-medium text-primary">{initials(current.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{current.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{current.email}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{current.name}</span>
          <span className="block text-xs text-muted-foreground">{current.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings">
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarBody({ user, onNavigate }: { user: { name: string; email: string }; onNavigate?: () => void }) {
  return (
    <div className="flex h-full min-w-0 flex-col gap-6 p-3">
      <div className="flex items-center justify-between px-1.5 pt-1">
        <Logo href="/app" />
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto grid grid-cols-[minmax(0,1fr)] gap-3">
        <UsageMeter />
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <UserMenu user={user} />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isEditor = pathname.startsWith("/app/d/");
  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <aside className={cn("sticky top-0 hidden h-dvh w-60 shrink-0 border-r bg-sidebar md:block", isEditor && "md:hidden xl:block")}>
        <SidebarBody user={user} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className={cn("sticky top-0 z-30 flex items-center gap-2 border-b bg-background/90 px-3 py-2 backdrop-blur md:hidden", isEditor && "hidden")}>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarBody user={user} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Logo href="/app" className="text-sm" />
        </div>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
