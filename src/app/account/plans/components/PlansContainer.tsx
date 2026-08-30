import React from 'react';
import { PlansListType } from '../list/PlansList';

interface PlansContainerProps extends PlansListType {
    planSelected: string;
}

const PlansContainer: React.FC<PlansContainerProps> = ({
    header,
    planName,
    plan,
    desc,
    btnName,
    planFunctions,
    planSelected
}) => {
    const isCurrentPlan = planSelected === plan;

    return (
        <div className={`glass-edge p-8 rounded-3xl flex flex-col justify-between transition-all duration-300 relative ${
            isCurrentPlan ? 'bg-primary/10 border-primary/40 shadow-2xl shadow-primary/10' : 'bg-surface-container-lowest/40 border-white/10 hover:border-white/20'
        }`}>
            {isCurrentPlan && (
                <span className="absolute -top-3 right-6 bg-primary text-on-primary-container px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider shadow-md">
                    Current Active Plan
                </span>
            )}

            <div>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary mb-1">
                    {header}
                </p>
                <h3 className="text-2xl font-extrabold text-on-surface mb-2">
                    {planName}
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
                    {desc}
                </p>

                <div className="space-y-3 mb-8">
                    {planFunctions.map((func, idx) => (
                        <div key={func + idx} className="flex items-start gap-2.5 text-xs text-on-surface">
                            <span className="material-symbols-outlined text-emerald-400 text-[18px] shrink-0 mt-0.5">
                                check_circle
                            </span>
                            <span className="leading-snug">{func}</span>
                        </div>
                    ))}
                </div>
            </div>

            <button
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                    isCurrentPlan
                        ? 'bg-primary text-on-primary shadow-[0_0_20px_rgba(208,188,255,0.3)] hover:opacity-90'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface border border-white/10'
                }`}
            >
                {isCurrentPlan ? 'Active Subscription' : btnName}
            </button>
        </div>
    );
};

export default PlansContainer;
