"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[60dvh] place-items-center px-6 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page hit an unexpected error.{error.digest ? ` Reference: ${error.digest}` : ""}
        </p>
        <Button className="mt-6" variant="outline" onClick={reset}>
          <RotateCw /> Try again
        </Button>
      </div>
    </div>
  );
}
