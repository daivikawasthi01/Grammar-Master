import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-10 font-serif text-7xl tracking-tight text-muted-foreground/40">404</p>
        <h1 className="mt-2 text-xl font-semibold">This page doesn’t exist</h1>
        <p className="mt-1 text-sm text-muted-foreground">Check the address, or head back.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild>
            <Link href="/app">Your documents</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
