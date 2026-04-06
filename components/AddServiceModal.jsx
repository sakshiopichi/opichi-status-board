// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { getAvailableCatalog } from '@/lib/catalog';
import ServiceIcon from '@/components/ServiceIcon';

const CATALOG = getAvailableCatalog();

// addedMap: { [catalogId]: recordId }
export default function AddServiceModal({ addedMap, onAdd, onRemove, onClose }) {
  const [busy, setBusy] = useState({}); // { [catalogId]: true }

  async function handleAdd(entry) {
    setBusy(b => ({ ...b, [entry.id]: true }));
    try { await onAdd(entry.id); } finally {
      setBusy(b => ({ ...b, [entry.id]: false }));
    }
  }

  async function handleRemove(entry) {
    const recordId = addedMap[entry.id];
    if (!recordId) return;
    setBusy(b => ({ ...b, [entry.id]: true }));
    try { await onRemove(entry.id, recordId); } finally {
      setBusy(b => ({ ...b, [entry.id]: false }));
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] flex-shrink-0">
          <div>
            <h2 className="font-semibold text-base">Add Services</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pick services to monitor on your dashboard</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Catalog grid */}
        <div className="overflow-y-auto p-6 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATALOG.map(entry => {
              const isAdded = !!addedMap[entry.id];
              const isBusy  = !!busy[entry.id];
              return (
                <div key={entry.id}
                  className="flex items-center gap-3 bg-gray-50 border border-black/[0.08] rounded-xl px-4 py-3 transition-all">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: entry.bg }}>
                    <ServiceIcon icon={entry.icon} initials={entry.initials} color={entry.color} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{entry.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{entry.desc}</p>
                  </div>
                  {isAdded ? (
                    <button
                      onClick={() => handleRemove(entry)}
                      disabled={isBusy}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 border border-transparent hover:border-red-200 hover:bg-red-50 rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      <span>Remove</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAdd(entry)}
                      disabled={isBusy}
                      className="flex items-center gap-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      <span>Add</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-black/[0.06] flex-shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-black/[0.12] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
