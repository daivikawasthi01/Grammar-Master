"use client";

import React, { useState, useEffect } from "react";

interface StyleGuideItem {
  _id: string;
  name: string;
  rulesCount: number;
  rules?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface StyleGuideManagerProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const StyleGuideManager: React.FC<StyleGuideManagerProps> = ({ onClose, isModal = false }) => {
  const [guides, setGuides] = useState<StyleGuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit State
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Expanded cards to view rules
  const [expandedGuideIds, setExpandedGuideIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedGuideIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/style-guide");
      if (res.ok) {
        const data = await res.json();
        if (data.styleGuides) {
          setGuides(data.styleGuides);
        }
      }
    } catch (e) {
      console.error("Failed to load style guides:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setMessage({ type: "error", text: "Please enter at least one rule or glossary term." });
      return;
    }

    try {
      setIsUploading(true);
      setMessage(null);

      const res = await fetch("/api/style-guide/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "My Custom Style Guide",
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: `Successfully created "${data.styleGuide.name}" with ${data.styleGuide.rulesCount} rules!`,
        });
        setName("");
        setContent("");
        setShowUploadForm(false);
        fetchGuides();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to upload style guide." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "An unexpected error occurred." });
    } finally {
      setIsUploading(false);
    }
  };

  const startEdit = (guide: StyleGuideItem) => {
    setEditingGuideId(guide._id);
    setEditName(guide.name);
    setEditContent((guide.rules || []).join("\n"));
  };

  const cancelEdit = () => {
    setEditingGuideId(null);
    setEditName("");
    setEditContent("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      setMessage({ type: "error", text: "Guide name cannot be empty." });
      return;
    }

    try {
      setIsSavingEdit(true);
      setMessage(null);

      const res = await fetch("/api/style-guide", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          content: editContent.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: "success", text: "Style guide updated successfully!" });
        cancelEdit();
        fetchGuides();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update style guide." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to update style guide." });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this style guide and its vector embeddings?")) {
      return;
    }

    try {
      const res = await fetch(`/api/style-guide?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Style guide deleted successfully." });
        fetchGuides();
      }
    } catch (e) {
      console.error("Failed to delete style guide:", e);
    }
  };

  const loadPresetTemplate = () => {
    setName("Engineering & Tech Brand Glossary");
    setContent(
`- Use 'eBPF', never 'Ebpf' or 'ebpf'.
- Always write 'PostgreSQL' instead of 'Postgres'.
- Write 'microservices' as a single word, never 'micro-services'.
- Capitalize 'Q3' in all business communications, never 'q3'.
- Always refer to our application as 'Grammar Master'.`
    );
  };

  const estimatedRules = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && !l.startsWith("#")).length;

  return (
    <div
      className={`glass-edge bg-[#13111c] border border-white/20 rounded-3xl p-6 md:p-8 backdrop-blur-3xl shadow-2xl space-y-6 text-on-surface ${
        isModal ? "max-h-[85vh] overflow-y-auto" : ""
      }`}
    >
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1 pr-4 sm:pr-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[24px]">menu_book</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Custom Style Guides & Glossaries (RAG)
              </h3>
              <p className="text-xs text-white/70 mt-0.5">
                Manage your specific rules, naming conventions, and terminology.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!showUploadForm) {
                setName("");
                setContent("");
                cancelEdit();
              }
              setShowUploadForm(!showUploadForm);
              setMessage(null);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
              showUploadForm
                ? "bg-surface-container-high text-white hover:bg-surface-container-highest border border-white/10"
                : "bg-primary text-on-primary hover:scale-105 shadow-[0_0_20px_rgba(208,188,255,0.4)]"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {showUploadForm ? "close" : "add_circle"}
            </span>
            {showUploadForm ? "Close Form" : "+ Create New Guide"}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-1"
              title="Close modal"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification / Feedback Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-lg ${
            message.type === "success"
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
              : "bg-error/15 border border-error/30 text-error"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px]">
              {message.type === "success" ? "check_circle" : "error"}
            </span>
            <span className="font-medium">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="p-1 hover:opacity-70 text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <form
          onSubmit={handleUpload}
          className="bg-surface-container-high/80 rounded-2xl p-6 border border-primary/30 shadow-xl space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">post_add</span>
              Define Your Custom Style Guide
            </span>
            <button
              type="button"
              onClick={loadPresetTemplate}
              className="text-xs font-semibold text-secondary hover:text-secondary-fixed hover:underline flex items-center gap-1.5 bg-secondary/15 px-3 py-1 rounded-lg border border-secondary/30 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
              Load Sample Template
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/90 mb-1.5">
              Name Your Style Guide
            </label>
            <input
              type="text"
              autoComplete="off"
              spellCheck="false"
              placeholder="e.g., My Company Brand Guidelines, Engineering Terminology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0d0c13] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary transition-colors placeholder:text-white/30"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-white/90">
                Rules & Terminology (one rule/bullet per line)
              </label>
              {estimatedRules > 0 && (
                <span className="text-xs font-mono font-semibold text-secondary bg-secondary/15 px-2 py-0.5 rounded-md border border-secondary/30">
                  {estimatedRules} atomic rules detected
                </span>
              )}
            </div>
            <textarea
              rows={5}
              autoComplete="off"
              spellCheck="false"
              placeholder="e.g.&#10;- Use 'eBPF', never 'Ebpf' or 'ebpf'.&#10;- Always write 'PostgreSQL' instead of 'Postgres'.&#10;- Write 'microservices' as a single word."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-[#0d0c13] border border-white/15 rounded-xl p-4 text-xs text-white font-mono focus:outline-none focus:border-primary transition-colors leading-relaxed placeholder:text-white/30"
            />

            {/* High-Contrast Tip & Format Guide */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs mt-3">
              <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                lightbulb
              </span>
              <div className="space-y-1">
                <span className="font-bold text-white">Writing Effective Rules:</span>
                <p className="text-white/70 leading-relaxed">
                  Keep each rule atomic and self-contained (one bullet or line per entity/term). This ensures the RAG vector index retrieves only the exact rule needed for each sentence.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !content.trim()}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:scale-105 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(208,188,255,0.4)]"
            >
              {isUploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  <span>Embedding & Indexing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  <span>Save & Index Rules</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* List of active style guides */}
      <div className="space-y-4 pt-1">
        {loading ? (
          <div className="text-center py-8 text-xs text-white/70 animate-pulse flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading active style guides...
          </div>
        ) : guides.length === 0 ? (
          <div className="text-center py-10 px-6 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-primary">
              <span className="material-symbols-outlined text-[32px]">library_books</span>
            </div>
            <div>
              <p className="text-base font-bold text-white">No Style Guides Uploaded Yet</p>
              <p className="text-xs text-white/70 mt-1 max-w-md mx-auto leading-relaxed">
                Add your company terminology, product names, or formatting rules to automatically enforce them when editing documents.
              </p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setName("");
                  setContent("");
                  setShowUploadForm(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:scale-105 transition-all shadow-[0_0_20px_rgba(208,188,255,0.3)] inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                + Create Style Guide
              </button>
              <button
                type="button"
                onClick={() => {
                  loadPresetTemplate();
                  setShowUploadForm(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-secondary text-xs font-semibold border border-secondary/30 transition-all inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                Try Sample Template
              </button>
            </div>
          </div>
        ) : (
          guides.map((guide) => (
            <div
              key={guide._id}
              className="rounded-2xl bg-surface-container-high/40 border border-white/10 overflow-hidden shadow-sm transition-all"
            >
              {/* Card Header */}
              <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-high/20">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[22px]">description</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {guide.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/60 mt-1">
                      <span className="text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {guide.rulesCount} rules indexed
                      </span>
                      <span>•</span>
                      <span className="text-white/60">Active in Vector RAG</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* View Rules button */}
                  {guide.rules && guide.rules.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(guide._id)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium border border-white/10 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {expandedGuideIds[guide._id] ? "expand_less" : "expand_more"}
                      </span>
                      <span>{expandedGuideIds[guide._id] ? "Hide Rules" : "View Rules"}</span>
                    </button>
                  )}

                  {/* Rename / Edit button */}
                  <button
                    type="button"
                    onClick={() => startEdit(guide)}
                    title="Rename or Edit Rules"
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-primary text-xs font-medium border border-primary/20 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    <span>Edit</span>
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(guide._id)}
                    title="Delete Style Guide"
                    className="p-2 rounded-xl text-white/60 hover:text-error hover:bg-error/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Edit Mode Inline Form */}
              {editingGuideId === guide._id && (
                <div className="p-5 border-t border-white/10 bg-[#0d0c13]/90 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Editing Style Guide
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/90 mb-1">
                      Guide Title
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-[#161421] border border-white/20 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/90 mb-1">
                      Rules (one per line)
                    </label>
                    <textarea
                      rows={5}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-[#161421] border border-white/20 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-primary transition-colors leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingEdit || !editName.trim()}
                      onClick={() => handleSaveEdit(guide._id)}
                      className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:scale-105 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      {isSavingEdit ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded Rules Inspection List */}
              {expandedGuideIds[guide._id] && guide.rules && guide.rules.length > 0 && (
                <div className="p-4 md:p-5 border-t border-white/10 bg-[#0d0c13]/60 space-y-2 animate-in fade-in duration-150">
                  <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-2">
                    Indexed Rules & Terms ({guide.rules.length}):
                  </span>
                  <div className="space-y-1.5">
                    {guide.rules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/90 font-mono"
                      >
                        <span className="text-secondary font-bold shrink-0">{idx + 1}.</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Close bar if modal */}
      {isModal && onClose && (
        <div className="border-t border-white/10 pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
          >
            Done & Back to Document
          </button>
        </div>
      )}
    </div>
  );
};

export default StyleGuideManager;
