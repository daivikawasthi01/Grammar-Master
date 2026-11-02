"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { DocumentDetail, DocumentSummary, StyleGuide, Usage, User } from "@/lib/types";
import type { StyleRule, UpdateProfileInput } from "@/shared/schemas";

export const keys = {
  me: ["me"] as const,
  documents: (status: "active" | "trashed", q = "") => ["documents", status, q] as const,
  allDocuments: ["documents"] as const,
  document: (id: string) => ["document", id] as const,
  styleGuide: ["style-guide"] as const,
};

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => api<{ user: User; usage: Usage }>("/api/me") });
}

export function useDocuments(status: "active" | "trashed", q = "") {
  return useQuery({
    queryKey: keys.documents(status, q),
    queryFn: ({ signal }) => api<{ documents: DocumentSummary[] }>(`/api/documents?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}`, { signal }).then((r) => r.documents),
    placeholderData: (prev) => prev,
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: keys.document(id),
    queryFn: () => api<{ document: DocumentDetail }>(`/api/documents/${id}`).then((r) => r.document),
    // The editor owns the document once loaded; refetching would fight local edits.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: (count, err) => count < 2 && !(err as { status?: number }).status?.toString().startsWith("4"),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title?: string } | { file: File }) => {
      if ("file" in input) {
        const form = new FormData();
        form.set("file", input.file);
        return api<{ document: DocumentDetail }>("/api/documents", { method: "POST", form });
      }
      return api<{ document: DocumentDetail }>("/api/documents", { method: "POST", body: input });
    },
    onSuccess: ({ document }) => {
      qc.setQueryData(keys.document(document.id), document);
      qc.invalidateQueries({ queryKey: keys.allDocuments });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

type ListSnapshot = [readonly unknown[], DocumentSummary[] | undefined][];

/**
 * Moves a document between lists optimistically and rolls back on failure:
 * the row disappears at once, and reappears with an error toast if the server says no.
 */
function useListMutation<V extends { id: string }>(opts: {
  mutationFn: (v: V) => Promise<unknown>;
  from: "active" | "trashed";
  success: string;
  undo?: (v: V) => void;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: opts.mutationFn,
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: keys.allDocuments });
      const snapshot: ListSnapshot = qc.getQueriesData<DocumentSummary[]>({ queryKey: ["documents", opts.from] });
      qc.setQueriesData<DocumentSummary[]>({ queryKey: ["documents", opts.from] }, (list) => list?.filter((d) => d.id !== v.id));
      return { snapshot };
    },
    onError: (err, _v, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(errorMessage(err));
    },
    onSuccess: (_d, v) => {
      toast.success(opts.success, opts.undo ? { action: { label: "Undo", onClick: () => opts.undo!(v) } } : undefined);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.allDocuments }),
  });
}

export function useRestoreDocument() {
  return useListMutation<{ id: string }>({
    mutationFn: ({ id }) => api(`/api/documents/${id}/restore`, { method: "POST" }),
    from: "trashed",
    success: "Document restored",
  });
}

export function useTrashDocument() {
  const restore = useRestoreDocument();
  return useListMutation<{ id: string; title?: string }>({
    mutationFn: ({ id }) => api(`/api/documents/${id}`, { method: "DELETE" }),
    from: "active",
    success: "Moved to trash",
    undo: (v) => restore.mutate({ id: v.id }),
  });
}

export function useDeleteForever() {
  return useListMutation<{ id: string }>({
    mutationFn: ({ id }) => api(`/api/documents/${id}?permanent=1`, { method: "DELETE" }),
    from: "trashed",
    success: "Deleted permanently",
  });
}

export function useEmptyTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ deleted: number }>("/api/documents/trash", { method: "DELETE" }),
    onSuccess: ({ deleted }) => toast.success(`Deleted ${deleted} document${deleted === 1 ? "" : "s"}`),
    onError: (err) => toast.error(errorMessage(err)),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.allDocuments }),
  });
}

export function useRenameDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, version }: { id: string; title: string; version: number }) =>
      api<{ version: number }>(`/api/documents/${id}`, { method: "PATCH", body: { title, baseVersion: version } }),
    onError: (err) => toast.error(errorMessage(err)),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.allDocuments }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api<{ user: User }>("/api/me", { method: "PATCH", body: input }),
    onSuccess: ({ user }) => {
      qc.setQueryData<{ user: User; usage: Usage }>(keys.me, (prev) => (prev ? { ...prev, user } : prev));
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export function useStyleGuide() {
  return useQuery({ queryKey: keys.styleGuide, queryFn: () => api<{ styleGuide: StyleGuide }>("/api/style-guide").then((r) => r.styleGuide) });
}

export function useSaveStyleGuide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; rules: StyleRule[]; guidanceNotes: string[] }) =>
      api<{ styleGuide: StyleGuide }>("/api/style-guide", { method: "PUT", body: input }).then((r) => r.styleGuide),
    onSuccess: (guide) => {
      qc.setQueryData(keys.styleGuide, guide);
      toast.success("Style guide saved");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

/**
 * "Add to dictionary": the word becomes a protect rule in the style guide, so the browser stops
 * underlining it, the AI is told to leave it alone, and the server drops any AI edit to it.
 * Joins an existing protect rule while it has room, so the guide doesn't fill with one-word rules.
 */
export function useProtectWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | string[]) => {
      const cached = qc.getQueryData<StyleGuide>(keys.styleGuide);
      const current: StyleGuide = cached ?? (await api<{ styleGuide: StyleGuide }>("/api/style-guide")).styleGuide;
      const known = new Set(current.rules.flatMap((r) => (r.kind === "protect" ? [r.preferred, ...r.forbidden] : [])).map((t) => t.toLowerCase()));
      const terms = (Array.isArray(input) ? input : [input]).map((w) => w.trim().slice(0, 100)).filter((t) => t && !known.has(t.toLowerCase()) && known.add(t.toLowerCase()));
      if (!terms.length) return current;
      let rules = current.rules;
      for (const term of terms) {
        const home = rules.find((r) => r.kind === "protect" && r.forbidden.length < 19);
        rules = home
          ? rules.map((r) => (r === home ? { ...r, forbidden: [...r.forbidden, term] } : r))
          : [{ id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind: "protect" as const, preferred: term, forbidden: [], caseSensitive: false }, ...rules];
      }
      return api<{ styleGuide: StyleGuide }>("/api/style-guide", { method: "PUT", body: { name: current.name, rules, guidanceNotes: current.guidanceNotes } }).then((r) => r.styleGuide);
    },
    onSuccess: (guide, input) => {
      qc.setQueryData(keys.styleGuide, guide);
      toast.success(Array.isArray(input) ? "Your saved dictionary moved into your style guide." : "Word protected. It won't be flagged or changed.");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}
