"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

export type SaveState = "idle" | "saving" | "saved" | "offline" | "conflict" | "error";

type Patch = { title?: string; content?: unknown; language?: string };

const KEEPALIVE_LIMIT = 60_000; // browsers cap keepalive bodies at about 64 KB

/**
 * Saves edits with the version they were based on. The server applies a save only
 * if nobody saved in between (409 otherwise), so a stale tab can never silently
 * overwrite newer text. Nothing is saved until the real document has loaded.
 */
export function useAutosave(docId: string, initialVersion: number | null, getPatch: () => Patch) {
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const version = useRef<number | null>(initialVersion);
  const dirty = useRef<Set<keyof Patch>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saving = useRef<Promise<void> | null>(null);
  const flushRef = useRef<(opts?: { keepalive?: boolean }) => Promise<void>>(async () => {});
  const loaded = initialVersion !== null;

  useEffect(() => {
    version.current = initialVersion;
  }, [initialVersion]);

  const flush = useCallback(
    async (opts: { keepalive?: boolean } = {}): Promise<void> => {
      if (!loaded || version.current === null || !dirty.current.size) return;
      if (saving.current) {
        await saving.current; // one save at a time, in order
        return flushRef.current(opts);
      }
      const fields = [...dirty.current];
      dirty.current.clear();
      const full = getPatch();
      const body: Patch & { baseVersion: number } = { baseVersion: version.current };
      for (const f of fields) (body as Record<string, unknown>)[f] = full[f];
      const json = JSON.stringify(body);
      setState("saving");
      const run = (async () => {
        try {
          const res = await fetch(`/api/documents/${docId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: json,
            keepalive: Boolean(opts.keepalive && json.length < KEEPALIVE_LIMIT),
          });
          if (res.status === 409) {
            setState("conflict");
            return;
          }
          if (!res.ok) throw new ApiError("INTERNAL", `Save failed (${res.status})`, res.status);
          version.current = ((await res.json()) as { version: number }).version;
          setSavedAt(new Date());
          setState(dirty.current.size ? "idle" : "saved");
        } catch {
          // Keep it dirty so the next edit, the online event or a retry saves it.
          fields.forEach((f) => dirty.current.add(f));
          setState(navigator.onLine ? "error" : "offline");
        }
      })();
      saving.current = run;
      await run;
      saving.current = null;
    },
    [docId, getPatch, loaded],
  );

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const markDirty = useCallback(
    (field: keyof Patch) => {
      if (!loaded) return; // never save before the document has loaded
      dirty.current.add(field);
      setState((s) => (s === "conflict" ? s : "idle"));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 1000);
    },
    [flush, loaded],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush({ keepalive: true });
    };
    const onOnline = () => void flush();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size || saving.current) {
        void flush({ keepalive: true });
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimeout(timer.current);
    };
  }, [flush]);

  // Retry failed saves with a gentle backoff while the tab stays open.
  useEffect(() => {
    if (state !== "error" && state !== "offline") return;
    const t = setTimeout(() => void flush(), state === "offline" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [state, flush]);

  /** After a conflict: take the server's latest version (discarding local changes). */
  const reloadFromServer = useCallback(async () => {
    const { document } = await api<{ document: { version: number } }>(`/api/documents/${docId}`);
    dirty.current.clear();
    version.current = document.version;
    setState("idle");
    return document;
  }, [docId]);

  return { state, savedAt, markDirty, flush, reloadFromServer, isDirty: () => dirty.current.size > 0 };
}
