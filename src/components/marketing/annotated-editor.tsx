import { ArrowRight, Check, Download, Zap } from "lucide-react";

const NOTES = [
  { title: "Grammar, one paragraph at a time", body: "When you pause, only that paragraph is checked. Each suggestion is a small edit, verified against your text before it appears." },
  { title: "Rewrite a selection", body: "Select a sentence and make it shorter, simpler, more formal or friendlier. The new version sits next to the old one; only the selection changes." },
  { title: "Your style guide", body: "Write rules like “PostgreSQL, not Postgres”, or import an existing guide and keep the rules you want. They apply in every document." },
  { title: "Readability", body: "Reading ease, grade level, long sentences and reading time, from the standard formulas." },
  { title: "Autosave without overwrites", body: "Work saves as you go. If another tab changed the same document, you choose which version to keep." },
  { title: "Export", body: "Word with headings and lists intact, Markdown, plain text, or print to PDF." },
];

/** A numbered marker, the same numeral appears beside the matching note. */
function Pin({ n }: { n: number }) {
  return (
    <span aria-hidden className="mx-1 inline-grid size-5 translate-y-[-1px] place-items-center rounded-full bg-primary align-middle font-serif text-[11px] leading-none text-primary-foreground">
      {n}
    </span>
  );
}

/** A picture of the editor, built from theme tokens so it follows light and dark. Static: the live demo above covers instant checks. */
export function AnnotatedEditor() {
  return (
    <figure className="grid gap-8 lg:grid-cols-[1fr_17rem] lg:gap-10">
      <div role="img" aria-label="The editor, with numbered marks pointing at grammar suggestions, a rewrite preview, a style-guide rule, readability, autosave and export." className="min-w-0 self-start rounded-md border bg-card">
        <div className="flex items-center gap-3 border-b px-4 py-2.5 text-[13px] text-muted-foreground sm:px-5">
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">Launch announcement</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Check className="size-3.5" aria-hidden /> Saved · just now
            <Pin n={5} />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1">
            <Download className="size-3.5" aria-hidden /> Export
            <Pin n={6} />
          </span>
        </div>

        <div className="space-y-6 px-4 py-6 font-serif text-[18px] leading-[1.75] sm:px-6">
          <div>
            <p>
              We will make a decision about the launch <span className="sg sg-clarity">in order to</span> ship on time.
              <Pin n={1} />
            </p>
            <div className="mt-3 w-full max-w-sm rounded-lg border bg-popover p-3 font-sans text-sm shadow-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-sg-clarity" />
                <span className="font-medium">Wordy phrase</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tracking-wide uppercase">This paragraph</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-muted-foreground line-through decoration-sg-correctness/60">in order to</span>
                <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">to</span>
              </div>
            </div>
          </div>

          <div>
            <p>
              <span className="rounded-sm bg-primary/15 px-0.5">The data is stored in Postgres and the team is very excited about it.</span>
              <Pin n={2} />
            </p>
            <div className="mt-3 w-full max-w-md rounded-lg border bg-popover p-3 font-sans text-sm shadow-sm">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {["Shorter", "Simpler", "Formal", "Friendly"].map((c) => (
                  <span key={c} className={c === "Shorter" ? "rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground" : "rounded-md border px-2 py-1 text-muted-foreground"}>
                    {c}
                  </span>
                ))}
              </div>
              <p className="mt-3 font-serif text-[15px] leading-relaxed text-muted-foreground line-through decoration-1">The data is stored in Postgres and the team is very excited about it.</p>
              <p className="mt-1 font-serif text-[15px] leading-relaxed">The team is excited that the data lives in PostgreSQL.</p>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground">Accept</span>
                <span className="rounded-md px-2.5 py-1 text-muted-foreground">Discard</span>
              </div>
            </div>
            <p className="mt-4 text-[15px]">
              Our database choice: <span className="sg sg-style">Postgres</span>
              <Pin n={3} />
              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 align-middle font-sans text-xs text-muted-foreground">Style guide · PostgreSQL</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2.5 text-xs text-muted-foreground tabular-nums sm:px-5">
          <span>Grade 8</span>
          <span>Reading ease 64</span>
          <span>1 min read</span>
          <span>2 long sentences</span>
          <Pin n={4} />
          <span className="ml-auto inline-flex items-center gap-1">
            <Zap className="size-3.5 text-primary" aria-hidden /> 4 ms
          </span>
        </div>
      </div>

      <figcaption>
        <ol className="space-y-5">
          {NOTES.map((n, i) => (
            <li key={n.title} className="grid grid-cols-[1.75rem_1fr] gap-x-2">
              <span aria-hidden className="grid size-5 translate-y-0.5 place-items-center rounded-full bg-primary font-serif text-[11px] leading-none text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <h3 className="text-[15px] font-medium">{n.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{n.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
