import { useState, useRef, useCallback, useEffect } from "react";

export type SaveState = "idle" | "saving" | "saved" | "offline" | "conflict" | "error";

interface UseAutosaveProps {
  docId: string;
  getContent: () => Record<string, any>;
  getPlainText: () => string;
  getTitle: () => string;
  loaded: boolean;
  initialVersion?: number;
}

export function useAutosave({
  docId,
  getContent,
  getPlainText,
  getTitle,
  loaded,
  initialVersion = 1,
}: UseAutosaveProps) {
  const [state, setState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const version = useRef<number>(initialVersion);
  const dirty = useRef<boolean>(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const flush = useCallback(async () => {
    if (!loaded || !dirty.current || !docId) return;
    dirty.current = false;
    setState("saving");

    try {
      const content = getContent();
      const plainText = getPlainText();
      const title = getTitle();

      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          plainText,
          title,
          baseVersion: version.current,
        }),
        keepalive: true,
      });

      if (res.status === 409) {
        setState("conflict");
        return;
      }

      if (!res.ok) {
        throw new Error(`Save failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      if (typeof data.version === "number") {
        version.current = data.version;
      }

      setState("saved");
      setLastSavedAt(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      dirty.current = true; // Retry on next event
      setState(navigator.onLine ? "error" : "offline");
    }
  }, [docId, getContent, getPlainText, getTitle, loaded]);

  const markDirty = useCallback(() => {
    if (!loaded) return;
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1000);
  }, [flush, loaded]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    const onOnline = () => {
      if (dirty.current) flush();
    };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("online", onOnline);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  return {
    state,
    lastSavedAt,
    markDirty,
    flush,
    setBaseVersion: (v: number) => {
      version.current = v;
    },
  };
}
