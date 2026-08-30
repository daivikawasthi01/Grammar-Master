"use client";

import React, { useState } from 'react';
import useAuth from '@/app/hooks/useAuth';
import usePolling from '@/app/hooks/usePolling';
import Loading from '@/app/components/Loading';
import Sidebar from '../components/Sidebar';
import Doc from '../components/Doc';
import { HandleDeleteTrashDocument } from '@/app/helpers/DeleteTrashDocument';
import { HandleRestoreTrashDocument } from '@/app/helpers/RestoreTrashDocument';

export interface RestoreElementProps {
  _id: string;
  documentId: string;
}

const Trash: React.FC = () => {
  const { isLogged, isLoading } = useAuth();
  const { data } = usePolling();
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return <Loading />;
  }

  const email = data?.email || "user@writ.ai";
  const trashItems = data?.trashs || [];
  const filteredTrash = trashItems.filter((doc: any) =>
    (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const RestoreElement: React.FC<RestoreElementProps> = ({ _id, documentId }) => (
    <button
      onClick={() => HandleRestoreTrashDocument(_id, documentId)}
      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center gap-1 text-xs"
      title="Restore Document"
    >
      <span className="material-symbols-outlined text-[16px]">restore</span>
      <span>Restore</span>
    </button>
  );

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex antialiased relative selection:bg-primary-container selection:text-on-primary-container">
      {/* Background Glow */}
      <div className="aurora-bg">
        <div className="aurora-blob-1" />
        <div className="aurora-blob-2" />
      </div>

      <Sidebar email={email} />

      <main className="flex-1 p-8 md:p-12 max-w-6xl mx-auto overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 flex items-center gap-3">
              <span className="material-symbols-outlined text-error text-[28px]">delete</span>
              Trash & Archives
            </h1>
            <p className="text-on-surface-variant text-sm font-light">
              Deleted documents are stored here. Restore any item or permanently purge it.
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search trash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-low/80 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {filteredTrash.length === 0 ? (
          <div className="glass-edge bg-surface-container-lowest/40 border border-white/10 rounded-3xl p-12 text-center my-12 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant/50 mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px]">delete_sweep</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-1">Trash is Empty</h3>
            <p className="text-xs text-on-surface-variant/70">
              No deleted documents found in your archive.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrash.map((doc: any) => (
              <Doc
                key={doc._id}
                RestoreElement={RestoreElement}
                HandleDeleteDocument={HandleDeleteTrashDocument}
                status={doc.status}
                title={doc.title}
                _id={data?._id || 'demo123'}
                documentId={doc._id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Trash;