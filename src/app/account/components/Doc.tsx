"use client";

import React from "react";
import Link from "next/link";

interface DocProps {
  title: string;
  status: string;
  _id: string;
  documentId: string;
  HandleDeleteDocument: (_id: string, documentId: string) => void;
  RestoreElement: any;
}

const Doc: React.FC<DocProps> = ({
  title,
  status,
  _id,
  documentId,
  HandleDeleteDocument,
  RestoreElement,
}) => {
  return (
    <div className="glass-edge bg-surface-container-lowest/40 border border-white/5 rounded-3xl p-6 flex flex-col hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5 relative overflow-hidden group">
      {/* Aurora glow effect */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors pointer-events-none" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-3 rounded-2xl bg-surface-container border border-white/5 text-primary shadow-inner">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </div>
        <span className="text-xs font-body-md text-on-surface-variant/70">Recent</span>
      </div>

      <Link href={`/account/docs/${documentId}/${_id}`} className="block relative z-10 group/link">
        <h4 className="font-headline-md text-lg text-on-surface mb-2 font-semibold line-clamp-1 group-hover/link:text-primary transition-colors">
          {title || "Untitled Document"}
        </h4>
      </Link>

      <div className="flex flex-wrap gap-2 mb-6 mt-auto pt-2 relative z-10">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-on-surface-variant bg-surface-container-high/50 px-2.5 py-1 rounded-lg border border-white/5">
          <span className="material-symbols-outlined text-[14px]">format_align_left</span> 1.2k words
        </span>
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg border border-secondary/10">
          <span className="material-symbols-outlined text-[14px]">visibility</span> Easy Read
        </span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-mono text-on-surface-variant/70 uppercase tracking-wider font-semibold">
            Health Score
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(208,188,255,0.8)] animate-pulse" />
            <span className="text-lg font-bold text-on-surface">94%</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {RestoreElement ? (
            <RestoreElement _id={_id} documentId={documentId} />
          ) : (
            <button
              onClick={() => HandleDeleteDocument(_id, documentId)}
              className="p-2 rounded-full hover:bg-error/20 text-on-surface-variant hover:text-error transition-colors"
              title="Delete Document"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          )}

          <Link
            href={`/account/docs/${documentId}/${_id}`}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-primary hover:text-surface transition-colors border border-white/5"
            title="Open Document Workspace"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Doc;