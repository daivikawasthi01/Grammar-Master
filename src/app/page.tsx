"use client";

import Link from "next/link";
import { useEffect } from "react";
import useAuth from "./hooks/useAuth";
import Loading from "./components/Loading";

export default function Home() {
  const { isLogged, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isLogged) {
      window.location.href = "/account";
    }
  }, [isLogged, isLoading]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col antialiased selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden relative">
      {/* Background Glow Layer */}
      <div className="aurora-bg">
        <div className="aurora-blob-1" />
        <div className="aurora-blob-2" />
      </div>

      {/* Top Header Navigation */}
      <header className="flex justify-between items-center px-8 w-full fixed top-0 z-50 h-20 bg-surface/50 border-b border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
          <span className="font-bold text-xl text-on-surface tracking-wide">writ.ai</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-on-surface-variant font-body-md text-sm">
          <a className="hover:text-primary transition-colors" href="#features">
            Features
          </a>
          <a className="hover:text-primary transition-colors" href="#demo">
            Workspace Demo
          </a>
          <Link className="hover:text-primary transition-colors" href="/login">
            Sign In
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-on-surface-variant hover:text-on-surface text-sm font-medium px-4 py-2 rounded-full transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="bg-primary text-on-primary font-body-md font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-primary-fixed transition-transform hover:scale-105 shadow-[0_0_20px_rgba(208,188,255,0.3)]"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow pt-40 pb-20 px-6 max-w-6xl mx-auto w-full relative z-10">
        <section className="flex flex-col items-center text-center space-y-8 mb-20 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Ethereal Cognitive Workspace v2.0
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-on-surface max-w-4xl tracking-tight leading-tight">
            Write Flawlessly at the <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-primary via-tertiary to-secondary bg-clip-text text-transparent">
              Speed of Thought
            </span>
          </h1>

          <p className="text-on-surface-variant text-lg max-w-2xl font-light leading-relaxed">
            The ultimate AI-augmented writing environment designed for cognitive clarity. Overcome blank page syndrome, refine your tone instantly, and edit with total confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              href="/register"
              className="bg-gradient-to-r from-inverse-primary to-primary-container text-white font-semibold text-base px-8 py-4 rounded-full hover:scale-105 transition-all shadow-[0_0_25px_rgba(160,120,255,0.4)] border border-white/10 pulse-glow"
            >
              Start Writing Free
            </Link>
            <Link
              href="/login"
              className="bg-surface-container text-on-surface font-medium text-base px-8 py-4 rounded-full hover:bg-surface-container-high transition-colors border border-white/10 glass-edge"
            >
              Sign In to Account
            </Link>
          </div>
        </section>

        {/* Visual App Workspace Mockup */}
        <section id="demo" className="relative w-full rounded-3xl glass-edge overflow-hidden mb-24 z-10 p-2 shadow-2xl">
          <div className="bg-surface-container-lowest/50 rounded-2xl p-6 border border-white/5">
            {/* Header bar */}
            <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-error/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                <span className="text-xs text-on-surface-variant/70 ml-2 font-mono">writ.ai — Quarterly_AI_Strategy.docx</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  Overall Score: 94%
                </span>
              </div>
            </div>

            {/* Content mockup body */}
            <div className="grid grid-cols-3 gap-6 pt-6 min-h-[300px]">
              <div className="col-span-2 space-y-4 pr-4 border-r border-white/5">
                <h3 className="text-xl font-bold text-on-surface">Executive Summary: Cognitive Workspaces</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  In modern software engineering and content generation, friction during draft creation limits creativity. writ.ai introduces an <span className="bg-primary/20 text-primary px-1 rounded font-medium">ethereal glassmorphism workspace</span> that automatically evaluates correctness, tone, and conciseness in real-time.
                </p>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  <span>AI Suggestion: Rephrased active voice sentence with +18% clarity score.</span>
                </div>
              </div>

              {/* Inspector mockup sidebar */}
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-on-surface-variant/80 font-semibold">
                  Inspector
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-2">
                  <div className="flex justify-between text-on-surface">
                    <span className="text-error font-medium">Correctness</span>
                    <span>0 issues</span>
                  </div>
                  <div className="flex justify-between text-on-surface">
                    <span className="text-secondary font-medium">Clarity</span>
                    <span>2 suggestions</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                  <div className="text-on-surface-variant mb-1">Detected Tone</div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-bold">Executive</span>
                    <span className="bg-secondary/20 text-secondary px-2 py-0.5 rounded text-[10px] font-bold">Confident</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-edge p-8 rounded-3xl flex flex-col items-center text-center group hover:border-primary/30 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary border border-primary/20">
              <span className="material-symbols-outlined text-[28px]">speed</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-3">Real-Time Analysis</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Instant feedback on clarity, tone, readability, and grammar as you type, integrated right into your draft.
            </p>
          </div>

          <div className="glass-edge p-8 rounded-3xl flex flex-col items-center text-center group hover:border-primary/30 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6 text-secondary border border-secondary/20">
              <span className="material-symbols-outlined text-[28px]">psychology</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-3">Hybrid AI Engine</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Combines fast deterministic rules for precision with deep Groq AI models for tone and stylistic rewrites.
            </p>
          </div>

          <div className="glass-edge p-8 rounded-3xl flex flex-col items-center text-center group hover:border-primary/30 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-tertiary/10 flex items-center justify-center mb-6 text-tertiary border border-tertiary/20">
              <span className="material-symbols-outlined text-[28px]">description</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-3">Native File Importer</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Upload Word (.docx) and text files directly. Edit seamlessly with preserved document state and cloud autosave.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-on-surface-variant text-xs">
        <p>© 2026 writ.ai. Designed for cognitive clarity and peak writing performance.</p>
      </footer>
    </div>
  );
}
