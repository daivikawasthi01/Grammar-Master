"use client";

import React, { useState, useRef } from 'react';
import NewDoc from './components/NewDoc';
import useAuth from '@/app/hooks/useAuth';
import usePolling from '@/app/hooks/usePolling';
import Loading from '@/app/components/Loading';
import Sidebar from './components/Sidebar';
import Doc from './components/Doc';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { HandleAddDocument } from '@/app/helpers/AddDocument';

export default function AccountPage() {
  const { isLogged, error, isLoading } = useAuth();
  const { data, errorPoll, mutate } = usePolling();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const HandleDeleteDocument = async (_id: string, documentId: string) => {
    try {
      await axios.post('/api/delete-document', { _id, documentId });
      if (mutate) {
        await mutate();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('_id', safeData._id || 'demo123');

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.documentId) {
        window.location.href = `/account/docs/${response.data.documentId}/${response.data._id || safeData._id || 'demo123'}`;
      } else {
        window.location.href = `/account/docs/upload_${Date.now()}/${safeData._id || 'demo123'}`;
      }
    } catch (error) {
      console.error('Upload error:', error);
      window.location.href = `/account/docs/upload_${Date.now()}/${safeData._id || 'demo123'}`;
    } finally {
      setIsUploading(false);
    }
  };

  const safeData = data || {
    _id: "demo123",
    email: "demo@writ.ai",
    documents: [
      {
        _id: "demo_doc_1",
        title: "Quarterly_AI_Strategy.docx",
        text: "Executive Summary...",
        status: "created"
      }
    ]
  };

  const filteredDocs =
    (safeData.documents || []).filter((doc) =>
      (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  const userName = safeData.email ? safeData.email.split('@')[0] : 'Writer';

  return (
    <div className="bg-surface text-on-surface min-h-screen flex relative overflow-x-hidden selection:bg-primary/30 selection:text-primary-fixed">
      {/* Aurora Background */}
      <div className="aurora-bg">
        <div className="aurora-blob-1" />
        <div className="aurora-blob-2" />
      </div>

      {/* Sidebar */}
      <Sidebar email={safeData.email || 'demo@writ.ai'} />

      {/* Main Content Area */}
      <main className="flex-1 w-full md:ml-72 flex flex-col min-h-screen relative z-10">
        {/* Hidden File Picker */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".txt,.docx,.doc,.md,.html"
          style={{ display: 'none' }}
        />

        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-surface/60 backdrop-blur-2xl border-b border-white/5 px-8 py-4 flex items-center justify-between gap-6">
          {/* Search */}
          <div className="flex-1 max-w-2xl relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 group-focus-within:text-primary transition-colors text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search workspaces, documents, or AI insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low/50 border border-white/5 rounded-full py-2.5 pl-12 pr-6 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all backdrop-blur-md"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-low/80 border border-white/10 text-on-surface hover:bg-white/10 transition-all text-xs font-medium glass-edge"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>

            <button
              onClick={() => HandleAddDocument(safeData._id || 'demo123')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-inverse-primary to-primary-container text-white hover:opacity-90 transition-all text-xs font-bold border border-white/10 shadow-[0_0_15px_rgba(160,120,255,0.3)] pulse-glow"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Document
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="p-8 max-w-6xl mx-auto w-full space-y-10 pb-32">
          {/* Welcome Greeting */}
          <div>
            <h2 className="text-3xl font-bold text-on-surface mb-2 tracking-tight">
              Good Evening, {userName}
            </h2>
            <p className="text-on-surface-variant text-sm max-w-xl leading-relaxed">
              Here is an overview of your recent cognitive workspaces. Your AI assistant has pre-analyzed your latest drafts.
            </p>
          </div>

          {/* Drag & Drop Upload Banner */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-3xl border border-white/10 bg-surface-container-lowest/30 hover:bg-surface-container-low/50 hover:border-primary/20 transition-all duration-300 p-10 flex flex-col items-center justify-center text-center cursor-pointer group glass-edge relative overflow-hidden shadow-xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-container-highest/50 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 border border-white/5 backdrop-blur-md">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant group-hover:text-primary transition-colors">
                post_add
              </span>
            </div>
            <h3 className="text-xl font-bold text-on-surface mb-1">
              Drop files to begin analysis
            </h3>
            <p className="text-on-surface-variant text-xs font-medium">
              Support for .docx, .txt, .md, and .html formats.
            </p>
          </div>

          {/* Documents Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-on-surface tracking-tight">
                Recent Workspaces
              </h3>
              <div className="flex gap-2">
                <button className="p-2 rounded-xl bg-surface-container border border-white/5 text-primary">
                  <span className="material-symbols-outlined text-[18px]">grid_view</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <NewDoc _id={data._id} />

              {filteredDocs.map((doc) => (
                <Doc
                  key={doc._id}
                  title={doc.title}
                  status={doc.status}
                  _id={data._id}
                  documentId={doc._id}
                  HandleDeleteDocument={HandleDeleteDocument}
                  RestoreElement={null}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}