"use client";

import React from 'react';
import useAuth from '@/app/hooks/useAuth';
import usePolling from '@/app/hooks/usePolling';
import Loading from '@/app/components/Loading';
import Sidebar from '../components/Sidebar';
import { AppsList } from './lists/apps';

const Apps = () => {
    const { isLogged, isLoading } = useAuth();
    const { data } = usePolling();

    if (isLoading) {
        return <Loading />;
    }

    const email = data?.email || "user@writ.ai";

    return (
        <div className="bg-surface text-on-surface font-body-md min-h-screen flex antialiased relative selection:bg-primary-container selection:text-on-primary-container">
            {/* Background Glow */}
            <div className="aurora-bg">
                <div className="aurora-blob-1" />
                <div className="aurora-blob-2" />
            </div>

            <Sidebar email={email} />

            <main className="flex-1 p-8 md:p-12 max-w-5xl mx-auto overflow-y-auto">
                <div className="mb-10 pb-6 border-b border-white/10">
                    <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[28px]">extension</span>
                        Integrations & Desktop Apps
                    </h1>
                    <p className="text-on-surface-variant text-sm font-light">
                        Connect writ.ai to your desktop environment, browser, and writing workflow.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {AppsList.map((app, index) => (
                        <div
                            key={index}
                            className="glass-edge bg-surface-container-lowest/50 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-primary/30 transition-all shadow-lg"
                        >
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                                    <span className="material-symbols-outlined text-[24px]">devices</span>
                                </div>
                                <h3 className="text-lg font-bold text-on-surface mb-2">
                                    {app.title}
                                </h3>
                                <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                                    {app.desc}
                                </p>
                            </div>

                            <button
                                disabled
                                className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-on-surface-variant/70 text-xs font-mono font-bold tracking-wider cursor-not-allowed uppercase"
                            >
                                Coming Soon
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Apps;
