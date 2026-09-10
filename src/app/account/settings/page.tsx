"use client";

import React, { useState } from 'react';
import useAuth from '@/app/hooks/useAuth';
import usePolling from '@/app/hooks/usePolling';
import Loading from '@/app/components/Loading';
import Sidebar from '../components/Sidebar';
import SettingsModal from './components/SettingsModal';
import { SettingsList } from './components/lists/setting';
import StyleGuideManager from './components/StyleGuideManager';

interface UserData {
  name?: string;
  email?: string;
  password?: string;
  plan?: "free" | "pro" | "buisness";
  prompts?: number;
}

const Settings: React.FC = () => {
  const { isLogged, error, isLoading } = useAuth();
  const { data } = usePolling() as { data: UserData | null };
  const [modal, setModal] = useState('');
  const [isModal, setIsModal] = useState(false);

  if (isLoading) {
    return <Loading />;
  }

  const userData: UserData = data || {
    name: "Daivik Awasthi",
    email: "daivikawasthi.01@gmail.com",
    password: "••••••••",
    plan: "pro",
    prompts: 2450
  };

  const totalPrompts =
    userData.plan === 'buisness'
      ? 20000
      : userData.plan === 'free'
      ? 1000
      : 10000;

  const progressPercent = Math.min(
    100,
    Math.floor(((userData.prompts || 0) / totalPrompts) * 100)
  );

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex antialiased relative selection:bg-primary-container selection:text-on-primary-container">
      {/* Background Glow */}
      <div className="aurora-bg">
        <div className="aurora-blob-1" />
        <div className="aurora-blob-2" />
      </div>

      <Sidebar email={userData.email || "daivikawasthi.01@gmail.com"} />

      {isModal &&
        SettingsList.filter((content) => content.title === modal).map((modalItem) => (
          <SettingsModal
            key={modalItem.title}
            email={userData.email || ""}
            setIsModal={setIsModal}
            data={modalItem}
          />
        ))}

      <main className="flex-1 p-8 md:p-12 max-w-5xl mx-auto overflow-y-auto">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">
              Account Settings
            </h1>
            <p className="text-on-surface-variant text-sm font-light">
              Manage your personal credentials, subscription plan, and AI model preferences.
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-wider">
            {userData.plan || "Pro Tier"}
          </span>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="glass-edge bg-surface-container-lowest/50 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-xl">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">person</span>
              Profile Details
            </h3>

            <div className="space-y-6">
              {/* Name field */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70 mb-1 block">
                    Full Name
                  </label>
                  <p className="text-base font-medium text-on-surface">
                    {userData.name || "User"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setModal('Update Name');
                    setIsModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-primary text-xs font-bold border border-primary/20 transition-all"
                >
                  Update Name
                </button>
              </div>

              {/* Email field */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70 mb-1 block">
                    Email Address
                  </label>
                  <p className="text-base font-medium text-on-surface">
                    {userData.email || "user@writ.ai"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setModal('Update Email');
                    setIsModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-primary text-xs font-bold border border-primary/20 transition-all"
                >
                  Update Email
                </button>
              </div>

              {/* Password field */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70 mb-1 block">
                    Security Password
                  </label>
                  <p className="text-base font-medium text-on-surface font-mono">
                    ••••••••••••
                  </p>
                </div>
                <button
                  onClick={() => {
                    setModal('Update Password');
                    setIsModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-primary text-xs font-bold border border-primary/20 transition-all"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Style Guides & Glossaries (RAG) */}
          <StyleGuideManager />

          {/* Usage Card */}
          <div className="glass-edge bg-surface-container-lowest/50 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-2xl shadow-xl">
            <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">auto_awesome</span>
              AI Prompts Usage
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Monthly token quota allocated for real-time analysis and Groq AI rewrites.
            </p>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-on-surface">{userData.prompts || 0} used</span>
                <span className="text-on-surface-variant">{totalPrompts} max monthly limit</span>
              </div>
              <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-on-surface-variant/60 font-mono text-right">
                {progressPercent}% consumed — Resets on 1st of next month
              </p>
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="glass-edge bg-error/5 border border-error/20 rounded-3xl p-6 md:p-8 backdrop-blur-2xl">
            <h3 className="text-lg font-bold text-error mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[22px]">warning</span>
              Delete Account
            </h3>
            <p className="text-xs text-on-surface-variant mb-6 max-w-xl">
              Permanently remove your writ.ai account, personal data, and all cloud saved documents. This action cannot be reversed.
            </p>
            <button
              onClick={() => alert("To delete your account, please confirm via email support@writ.ai")}
              className="px-6 py-3 rounded-xl bg-error/20 hover:bg-error/30 text-error font-bold text-xs border border-error/30 transition-all"
            >
              Delete Account Permanently
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
