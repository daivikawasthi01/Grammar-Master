"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";

/** Shown whenever data fails to load. Never falls back to placeholder content. */
export function ErrorState({ error, onRetry, title = "Couldn’t load this" }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <h2 className="mt-4 font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
      )}
    </div>
  );
}
