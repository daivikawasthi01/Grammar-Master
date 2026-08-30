"use client";

import React from 'react';
import Link from 'next/link';

const WhyGrammarly: React.FC = () => {
    return (
        <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col antialiased relative selection:bg-primary-container selection:text-on-primary-container">
            {/* Background Glow */}
            <div className="aurora-bg">
                <div className="aurora-blob-1" />
                <div className="aurora-blob-2" />
            </div>

            {/* Header Navigation */}
            <header className="flex justify-between items-center px-8 w-full fixed top-0 z-50 h-20 bg-surface/50 border-b border-white/5 backdrop-blur-xl">
                <Link href="/" className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        auto_awesome
                    </span>
                    <span className="font-bold text-xl text-on-surface tracking-wide">writ.ai</span>
                </Link>

                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-on-surface-variant hover:text-on-surface text-sm font-medium px-4 py-2">
                        Sign In
                    </Link>
                    <Link href="/register" className="bg-primary text-on-primary font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-primary-fixed transition-transform">
                        Get Started Free
                    </Link>
                </div>
            </header>

            <main className="flex-grow pt-36 pb-20 px-6 max-w-6xl mx-auto w-full relative z-10">
                <section className="text-center max-w-3xl mx-auto mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-mono">
                        Cognitive AI Architecture
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-on-surface tracking-tight">
                        Why Choose writ.ai?
                    </h1>
                    <p className="text-on-surface-variant text-lg font-light leading-relaxed">
                        Unlike basic spell-checkers or generic AI chatbots, writ.ai provides real-time cognitive clarity by evaluating correctness, conciseness, and tone metrics simultaneously as you type.
                    </p>
                    <div className="flex justify-center gap-4 pt-4">
                        <Link
                            href="/register"
                            className="bg-gradient-to-r from-inverse-primary to-primary-container text-white font-semibold text-sm px-8 py-3.5 rounded-full shadow-[0_0_25px_rgba(160,120,255,0.4)] border border-white/10 pulse-glow"
                        >
                            Experience writ.ai Today
                        </Link>
                    </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    <div className="glass-edge p-8 rounded-3xl">
                        <span className="material-symbols-outlined text-primary text-[32px] mb-4">bolt</span>
                        <h3 className="text-xl font-bold text-on-surface mb-2">Sub-100ms Latency</h3>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                            Deterministic rules run locally in your browser for instant feedback without typing lag.
                        </p>
                    </div>
                    <div className="glass-edge p-8 rounded-3xl">
                        <span className="material-symbols-outlined text-secondary text-[32px] mb-4">psychology</span>
                        <h3 className="text-xl font-bold text-on-surface mb-2">Groq Llama 3 AI Engine</h3>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                            Deep contextual understanding for executive tone shifts, conciseness rewrites, and stylistic suggestions.
                        </p>
                    </div>
                    <div className="glass-edge p-8 rounded-3xl">
                        <span className="material-symbols-outlined text-tertiary text-[32px] mb-4">view_quilt</span>
                        <h3 className="text-xl font-bold text-on-surface mb-2">Ethereal 2-Column Canvas</h3>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                            Designed specifically for cognitive focus with floating Copilot drawer and live Inspector sidebar.
                        </p>
                    </div>
                </section>
            </main>

            <footer className="border-t border-white/5 py-8 text-center text-on-surface-variant text-xs">
                <p>© 2026 writ.ai. Designed for cognitive clarity and peak writing performance.</p>
            </footer>
        </div>
    );
};

export default WhyGrammarly;