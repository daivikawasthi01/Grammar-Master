"use client";

import React from 'react';
import useAuth from '@/app/hooks/useAuth';
import usePolling from '@/app/hooks/usePolling';
import Loading from '@/app/components/Loading';
import Sidebar from '../components/Sidebar';
import { PlansList } from './list/PlansList';
import PlansContainer from './components/PlansContainer';

const Plans: React.FC = () => {
    const { isLogged, isLoading } = useAuth();
    const { data } = usePolling();

    if (isLoading) {
        return <Loading />;
    }

    const email = data?.email || "user@writ.ai";
    const currentPlan = data?.plan || "free";

    return (
        <div className="bg-surface text-on-surface font-body-md min-h-screen flex antialiased relative selection:bg-primary-container selection:text-on-primary-container">
            {/* Background Glow */}
            <div className="aurora-bg">
                <div className="aurora-blob-1" />
                <div className="aurora-blob-2" />
            </div>

            <Sidebar email={email} />

            <main className="flex-1 p-8 md:p-12 max-w-6xl mx-auto overflow-y-auto">
                <div className="mb-10 pb-6 border-b border-white/10">
                    <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">
                        Subscription Plans
                    </h1>
                    <p className="text-on-surface-variant text-sm font-light max-w-2xl">
                        Unlock advanced cognitive writing features, unlimited Groq AI tone shifts, multi-category suggestions, and priority processing.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PlansList.map((plan) => (
                        <PlansContainer
                            key={plan.plan}
                            plan={plan.plan}
                            planSelected={currentPlan}
                            header={plan.header}
                            planName={plan.planName}
                            desc={plan.desc}
                            btnName={plan.btnName}
                            planFunctions={plan.planFunctions}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Plans;