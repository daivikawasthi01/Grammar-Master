"use client";

import React from 'react';
import Link from 'next/link';
import { PlansList } from '../account/plans/list/PlansList';
import PlansContainer from '../account/plans/components/PlansContainer';

const ComparePlans: React.FC = () => {
    return (
        <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col antialiased relative selection:bg-primary-container selection:text-on-primary-container">
            {/* Background Glow */}
            <div className="aurora-bg">
                <div className="aurora-blob-1" />
                <div className="aurora-blob-2" />
            </div>

            {/* Top Navigation */}
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
                <section className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-mono">
                        Plans & Pricing Matrix
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-on-surface tracking-tight">
                        Elevate Your Writing
                    </h1>
                    <p className="text-on-surface-variant text-base font-light leading-relaxed">
                        Go beyond grammar. Choose a plan to ensure everything you write is clear, engaging, and polished with real-time AI metrics.
                    </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PlansList.map(plan => (
                        <PlansContainer
                            key={plan.planName}
                            plan={plan.plan}
                            planSelected='none'
                            header={plan.header}
                            planName={plan.planName}
                            desc={plan.desc}
                            btnName={plan.btnName}
                            planFunctions={plan.planFunctions}
                        />
                    ))}
                </div>
            </main>

            <footer className="border-t border-white/5 py-8 text-center text-on-surface-variant text-xs">
                <p>© 2026 writ.ai. Designed for cognitive clarity and peak writing performance.</p>
            </footer>
        </div>
    );
};

export default ComparePlans;
