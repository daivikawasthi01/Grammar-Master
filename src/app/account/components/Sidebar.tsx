"use client";

import React from "react";
import Link from "next/link";
import { HandleLogout } from "@/app/helpers/logout";

interface SidebarProps {
  email: string;
}

const Sidebar: React.FC<SidebarProps> = ({ email }) => {
  return (
    <nav className="hidden md:flex fixed left-0 top-0 h-full w-72 glass-edge flex-col py-8 z-40 border-r border-white/5 bg-surface/30 text-on-surface">
      {/* Header Logo */}
      <div className="px-8 mb-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-container-high/50 glass-edge p-1 shadow-lg shadow-primary/5">
          <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </div>
        <div>
          <h1 className="font-bold text-xl text-on-surface tracking-tight">writ.ai</h1>
          <p className="text-xs text-on-surface-variant/70">Cognitive Workspace</p>
        </div>
      </div>

      {/* Nav Options */}
      <div className="flex-1 px-4 space-y-2">
        <Link
          href="/account"
          className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-on-surface bg-primary/10 border border-primary/20 transition-all font-medium text-sm shadow-sm"
        >
          <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            description
          </span>
          <span>My Documents</span>
        </Link>

        <Link
          href="/account/trash"
          className="flex items-center justify-between px-4 py-3 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all text-sm group"
        >
          <div className="flex items-center gap-3.5">
            <span className="material-symbols-outlined group-hover:text-primary transition-colors text-[20px]">
              delete
            </span>
            <span>Trash & Archives</span>
          </div>
          <span className="bg-surface-container-highest text-on-surface text-xs font-semibold px-2 py-0.5 rounded-full">
            3
          </span>
        </Link>

        {/* AI Usage Indicator */}
        <div className="px-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/5 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3.5 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
              <span>AI Usage</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden mt-1">
            <div className="h-full bg-gradient-to-r from-inverse-primary to-primary rounded-full w-[42%] shadow-[0_0_10px_rgba(208,188,255,0.5)]"></div>
          </div>
          <p className="text-[11px] text-on-surface-variant/70 mt-2 text-right font-medium">42 / 100 Credits</p>
        </div>

        <Link
          href="/account/settings"
          className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all text-sm group"
        >
          <span className="material-symbols-outlined group-hover:text-primary transition-colors text-[20px]">
            settings
          </span>
          <span>Settings</span>
        </Link>
      </div>

      {/* Profile & Logout */}
      <div className="px-4 mt-auto">
        <div className="flex items-center justify-between p-3 rounded-xl glass-edge bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              account_circle
            </span>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-on-surface truncate">{email || "User"}</span>
              <span className="text-[10px] text-on-surface-variant/70">Pro Workspace Plan</span>
            </div>
          </div>
          <button
            onClick={() => HandleLogout()}
            title="Sign Out"
            className="text-on-surface-variant hover:text-error transition-colors p-1"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;