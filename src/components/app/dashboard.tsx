"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FilePlus2, FileText, MoreHorizontal, PenLine, RotateCcw, Search, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/app/error-state";
import { useCreateDocument, useDeleteForever, useDocuments, useEmptyTrash, useMe, useRenameDocument, useRestoreDocument, useTrashDocument } from "@/hooks/queries";
import { useDebounced } from "@/hooks/use-debounced";
import { daysUntilPurge, timeAgo } from "@/lib/format";
import type { DocumentSummary } from "@/lib/types";
import { MAX_UPLOAD_BYTES, UPLOAD_EXTENSIONS } from "@/shared/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "trashed">("active");
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim(), 250);
  const docs = useDocuments(tab, q);
  const me = useMe();
  const create = useCreateDocument();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const newDocument = useCallback(async () => {
    const { document } = await create.mutateAsync({ title: "Untitled document" });
    router.push(`/app/d/${document.id}`);
  }, [create, router]);

  const upload = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const ext = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
      if (ext === ".doc") return toast.error("Old .doc files aren’t supported. Save it as .docx and try again.");
      if (!(UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) return toast.error("Upload a .docx, .txt or .md file.");
      if (file.size > MAX_UPLOAD_BYTES) return toast.error("Files can be at most 5 MB.");
      const { document } = await create.mutateAsync({ file });
      toast.success(`Imported “${document.title}”`);
      router.push(`/app/d/${document.id}`);
    },
    [create, router],
  );

  const firstName = me.data?.user.name.split(" ")[0];

  return (
    <div
      className="relative mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void upload(e.dataTransfer.files[0]);
      }}
    >
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur-sm"
          >
            <div className="rounded-2xl border-2 border-dashed border-primary px-12 py-10 text-center">
              <Upload className="mx-auto size-8 text-primary" />
              <p className="mt-3 font-medium">Drop to import</p>
              <p className="text-sm text-muted-foreground">.docx, .txt or .md, up to 5 MB</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()}{firstName ? `, ${firstName}` : ""}</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-4xl">Your documents</h1>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={create.isPending}>
            <Upload /> Import
          </Button>
          <Button onClick={newDocument} disabled={create.isPending}>
            {create.isPending ? <Spinner /> : <FilePlus2 />} New document
          </Button>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "trashed")}>
          <TabsList>
            <TabsTrigger value="active">
              <FileText /> Documents
            </TabsTrigger>
            <TabsTrigger value="trashed">
              <Trash2 /> Trash
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          {tab === "trashed" && !!docs.data?.length && <EmptyTrashButton />}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles and text" className="pr-9 pl-9" aria-label="Search documents" />
            {query && (
              <button onClick={() => setQuery("")} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="mt-6" aria-live="polite" aria-busy={docs.isLoading}>
        {docs.isLoading ? (
          <Grid>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </Grid>
        ) : docs.isError ? (
          <ErrorState error={docs.error} onRetry={() => docs.refetch()} title="Couldn’t load your documents" />
        ) : !docs.data?.length ? (
          <EmptyList tab={tab} searching={!!q} onCreate={newDocument} onImport={() => fileInput.current?.click()} />
        ) : (
          <Grid>
            <AnimatePresence initial={false} mode="popLayout">
              {docs.data.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: Math.min(i, 8) * 0.03, type: "spring", stiffness: 300, damping: 26 } }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                >
                  {tab === "active" ? <DocumentCard doc={doc} /> : <TrashCard doc={doc} />}
                </motion.div>
              ))}
            </AnimatePresence>
          </Grid>
        )}
      </section>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function EmptyList({ tab, searching, onCreate, onImport }: { tab: "active" | "trashed"; searching: boolean; onCreate: () => void; onImport: () => void }) {
  if (searching)
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Search /></EmptyMedia>
          <EmptyTitle>No matches</EmptyTitle>
          <EmptyDescription>Nothing in your {tab === "active" ? "documents" : "trash"} matches that search.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  if (tab === "trashed")
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Trash2 /></EmptyMedia>
          <EmptyTitle>Trash is empty</EmptyTitle>
          <EmptyDescription>Deleted documents stay here for 30 days before they are removed for good.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <Empty className="border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon"><PenLine /></EmptyMedia>
        <EmptyTitle>Start your first document</EmptyTitle>
        <EmptyDescription>Write from scratch, or import a .docx, .txt or .md file. You can also drop a file anywhere on this page.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button onClick={onCreate}><FilePlus2 /> New document</Button>
        <Button variant="outline" onClick={onImport}><Upload /> Import</Button>
      </EmptyContent>
    </Empty>
  );
}

function DocumentCard({ doc }: { doc: DocumentSummary }) {
  const trash = useTrashDocument();
  const [renaming, setRenaming] = useState(false);
  return (
    <div className="group relative flex h-44 flex-col rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-within:ring-2 focus-within:ring-ring/50">
      <Link href={`/app/d/${doc.id}`} className="absolute inset-0 rounded-xl" aria-label={`Open ${doc.title}`} />
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-1 font-medium">{doc.title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative -mt-1.5 -mr-2 size-8 opacity-60 group-hover:opacity-100" aria-label={`Actions for ${doc.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/app/d/${doc.id}`}><PenLine /> Open</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRenaming(true)}><FileText /> Rename</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => trash.mutate({ id: doc.id, title: doc.title })}>
              <Trash2 /> Move to trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="mt-2 line-clamp-3 font-serif text-[15px] leading-relaxed text-muted-foreground">{doc.snippet || <span className="italic">Empty document</span>}</p>
      <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-muted-foreground">
        <span>{timeAgo(doc.updatedAt)}</span>
        <span aria-hidden>·</span>
        <span>{doc.wordCount.toLocaleString()} words</span>
      </div>
      <RenameDialog doc={doc} open={renaming} onOpenChange={setRenaming} />
    </div>
  );
}

function RenameDialog({ doc, open, onOpenChange }: { doc: DocumentSummary; open: boolean; onOpenChange: (o: boolean) => void }) {
  const rename = useRenameDocument();
  const [title, setTitle] = useState(doc.title);
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) setTitle(doc.title); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename document</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await rename.mutateAsync({ id: doc.id, title: title.trim() || "Untitled document", version: doc.version });
            onOpenChange(false);
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus aria-label="Title" />
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={rename.isPending}>{rename.isPending && <Spinner />} Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TrashCard({ doc }: { doc: DocumentSummary }) {
  const restore = useRestoreDocument();
  const destroy = useDeleteForever();
  const [confirming, setConfirming] = useState(false);
  const days = doc.deletedAt ? daysUntilPurge(doc.deletedAt) : 30;
  return (
    <div className="flex h-44 flex-col rounded-xl border border-dashed bg-card/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-1 font-medium text-muted-foreground">{doc.title}</h3>
        <Badge variant="outline" className={cn("shrink-0", days <= 3 && "border-destructive/40 text-destructive")}>{days}d left</Badge>
      </div>
      <p className="mt-2 line-clamp-2 font-serif text-[15px] text-muted-foreground/80">{doc.snippet || "Empty document"}</p>
      <div className="mt-auto flex gap-2 pt-3">
        <Button size="sm" variant="outline" onClick={() => restore.mutate({ id: doc.id })}><RotateCcw /> Restore</Button>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}><Trash2 /> Delete</Button>
      </div>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{doc.title}” forever?</AlertDialogTitle>
            <AlertDialogDescription>This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => destroy.mutate({ id: doc.id })}>Delete forever</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyTrashButton() {
  const empty = useEmptyTrash();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>Empty trash</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty the trash?</AlertDialogTitle>
            <AlertDialogDescription>Every document in the trash will be deleted permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => empty.mutate()}>Empty trash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
