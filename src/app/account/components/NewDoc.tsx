'use client';

import React, { useRef, useState } from 'react';
import { HandleAddDocument } from '@/app/helpers/AddDocument';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface NewDocProps {
  _id: string;
}

const NewDoc: React.FC<NewDocProps> = ({ _id }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('_id', _id || 'demo123');

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data && response.data.documentId) {
        window.location.href = `/account/docs/${response.data.documentId}/${response.data._id || _id || 'demo123'}`;
      } else {
        window.location.href = `/account/docs/upload_${Date.now()}/${_id || 'demo123'}`;
      }
    } catch (error) {
      console.error('File upload failed:', error);
      window.location.href = `/account/docs/upload_${Date.now()}/${_id || 'demo123'}`;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="glass-edge bg-surface-container-lowest/40 border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5 min-h-[220px]">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.docx,.doc,.md,.html"
        style={{ display: 'none' }}
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[20px]">add</span>
        </div>
        <h4 className="font-semibold text-lg text-on-surface">New Workspace</h4>
      </div>

      <p className="text-xs text-on-surface-variant/80 mb-6 leading-relaxed">
        Start a blank document or upload a Word (.docx) file for instant real-time AI analysis.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button
          onClick={() => HandleAddDocument(_id)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-container/20 hover:bg-primary-container/30 text-primary font-semibold text-xs transition-colors border border-primary/20"
        >
          <span className="material-symbols-outlined text-[16px]">edit_note</span>
          Blank Doc
        </button>

        <button
          onClick={handleUploadClick}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-on-surface font-medium text-xs transition-colors border border-white/10"
        >
          <span className="material-symbols-outlined text-[16px]">upload_file</span>
          {isUploading ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
    </div>
  );
};

export default NewDoc;