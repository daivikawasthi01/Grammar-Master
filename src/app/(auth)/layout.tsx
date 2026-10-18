import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { CorrectionShowcase } from "@/components/auth/correction-showcase";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="text-xs text-muted-foreground">Your documents are private to your account.</footer>
      </div>
      <aside className="hidden p-4 lg:block">
        <CorrectionShowcase />
      </aside>
    </div>
  );
}
