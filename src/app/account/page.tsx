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
  const { isLogged, error: authError, isLoading: authLoading } = useAuth();
  const { data, errorPoll, isLoading: dataLoading, mutate } = usePolling();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const HandleDeleteDocument = async (_id: string, documentId: string) => {
    try {
      await axios.post('/api/delete-document', { documentId });
      if (mutate) {
        await mutate();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File exceeds the 5MB size limit.');
      return;
    }

    const nameLower = file.name.toLowerCase();
    if (nameLower.endsWith('.doc')) {
      setUploadError('Legacy .doc format is not supported. Please upload .docx, .txt, or .md.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.documentId) {
        window.location.href = `/account/docs/${response.data.documentId}/${response.data._id || data?._id}`;
      } else {
        setUploadError('Upload succeeded but no document ID returned');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (authLoading || dataLoading) {
    return <Loading />;
  }

  const userDocuments = data?.documents || [];
  const filteredDocs = userDocuments.filter((doc) =>
    (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userEmail = data?.email || '';
  const userName = data?.name || (userEmail ? userEmail.split('@')[0] : 'Writer');

  return (
    <div className="bg-surface text-on-surface min-h-screen flex relative overflow-x-hidden selection:bg-primary/30 selection:text-primary-fixed">
      {/* Aurora Background */}
      <div className="aurora-bg">
        <div className="aurora-blob-1" />
        <div className="aurora-blob-2" />
      </div>

      {/* Sidebar */}
      <Sidebar email={userEmail} />

      {/* Main Content Area */}
      <main className="flex-1 w-full md:ml-72 flex flex-col min-h-screen relative z-10">
        {/* Hidden File Picker */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".docx,.txt,.md"
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
              placeholder="Search documents or workspaces..."
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-low/80 border border-white/10 text-on-surface hover:bg-white/10 transition-all text-xs font-medium glass-edge disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>

            <button
              onClick={() => HandleAddDocument(data?._id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-inverse-primary to-primary-container text-white hover:opacity-90 transition-all text-xs font-bold border border-white/10 shadow-[0_0_15px_rgba(160,120,255,0.3)] pulse-glow"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Document
            </button>
          </div>
        </header>

        {/* Notification / Error Banner */}
        {uploadError && (
          <div className="mx-8 mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError('')} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        {errorPoll && (
          <div className="mx-8 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
            {errorPoll}
          </div>
        )}

        {/* Dashboard Workspace */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-10">
          {/* Welcome Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-on-surface font-headline flex items-center gap-3">
                Welcome back, {userName}
              </h1>
              <p className="text-on-surface-variant text-sm mt-1">
                Pick up where you left off or start drafting with Grammar Master AI assistance.
              </p>
            </div>
          </div>

          {/* Documents Grid */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface tracking-tight font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                Recent Documents
              </h2>
              <span className="text-xs text-on-surface-variant font-mono bg-white/[0.03] px-3 py-1 rounded-full border border-white/5">
                {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
              </span>
            </div>

            {filteredDocs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocs.map((doc: any) => (
                  <Doc
                    key={doc._id}
                    title={doc.title || 'Untitled Document'}
                    documentId={doc._id}
                    _id={data?._id || ''}
                    status={doc.status || 'created'}
                    HandleDeleteDocument={HandleDeleteDocument}
                    RestoreElement={null}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/5 bg-surface-container-low/40 p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-3xl">edit_document</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-on-surface">No documents found</h3>
                  <p className="text-sm text-on-surface-variant max-w-sm">
                    {searchQuery
                      ? `No documents match "${searchQuery}". Try a different keyword.`
                      : 'Create your first document or upload a Word/Markdown file to get started.'}
                  </p>
                </div>
                <button
                  onClick={() => HandleAddDocument(data?._id)}
                  className="mt-2 px-6 py-2.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  Create Document
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}