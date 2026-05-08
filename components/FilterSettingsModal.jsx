// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';

import { useState } from 'react';
import { X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import ServiceIcon from '@/components/ServiceIcon';
import { getComponents } from '@/lib/services';

// filterPrefs shape: { components: { [svcId]: string[] } }
// An entry with an empty/absent array means "show all" for that service.
export default function FilterSettingsModal({ allServices, svcData, filterPrefs, onSave, onClose }) {
  // Local copy of the components allowlist for editing
  const [localFilter, setLocalFilter] = useState(() => ({ ...(filterPrefs?.components || {}) }));
  const [openSvc, setOpenSvc] = useState(null);
  const [saving, setSaving] = useState(false);

  function availableFor(svc) {
    return getComponents(svc, svcData[svc.id]?.data);
  }

  function toggleComponent(svcId, compName, availComps) {
    setLocalFilter(prev => {
      const current = prev[svcId] ?? availComps.map(c => c.name); // null = all selected
      const has = current.includes(compName);
      const next = has ? current.filter(n => n !== compName) : [...current, compName];
      // If everything is selected, store null (= show all, no filter stored)
      return { ...prev, [svcId]: next.length === availComps.length ? null : next };
    });
  }

  function toggleAll(svcId, availComps) {
    setLocalFilter(prev => {
      const current = prev[svcId];
      // null or all selected → deselect all; otherwise → select all
      const allSelected = !current || current.length === availComps.length;
      return { ...prev, [svcId]: allSelected ? [] : null };
    });
  }

  async function handleSave() {
    setSaving(true);
    // Strip entries that are null (all selected) or full length — they mean "no filter"
    const cleaned = Object.fromEntries(
      Object.entries(localFilter).filter(([, v]) => v !== null && v.length > 0)
    );
    await onSave({ components: cleaned });
    setSaving(false);
  }

  const servicesWithComponents = allServices.filter(svc => availableFor(svc).length > 0);
  const hasActiveFilters = Object.values(localFilter).some(v => v !== null && v.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[82vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.08] flex-shrink-0">
          <SlidersHorizontal size={15} className="text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold">Component Filters</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choose which components appear in each service dropdown</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {servicesWithComponents.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">
              No component data loaded yet.<br />Refresh the dashboard first.
            </p>
          ) : servicesWithComponents.map(svc => {
            const availComps = availableFor(svc);
            const selected = localFilter[svc.id]; // null = all, [] = none, [...] = subset
            const selectedCount = selected === null || selected === undefined
              ? availComps.length
              : selected.length;
            const isFiltered = selected !== null && selected !== undefined && selected.length < availComps.length;
            const isOpen = openSvc === svc.id;

            return (
              <div key={svc.id} className="border border-black/[0.08] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenSvc(isOpen ? null : svc.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: svc.bg }}>
                    <ServiceIcon svcId={svc.id} icon={svc.icon} initials={svc.initials} color={svc.color} size={13} />
                  </div>
                  <p className="flex-1 text-xs font-medium truncate">{svc.name}</p>
                  <span className={clsx(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 mr-0.5',
                    isFiltered ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                  )}>
                    {selectedCount}/{availComps.length}
                  </span>
                  <ChevronDown size={12} className={clsx('text-gray-400 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                  <div className="border-t border-black/[0.06] px-3 pb-2.5 pt-2">
                    <button
                      onClick={() => toggleAll(svc.id, availComps)}
                      className="text-[10px] font-medium text-green-700 hover:text-green-900 mb-2 block"
                    >
                      {selected === null || selected === undefined || selected.length === availComps.length
                        ? 'Deselect all'
                        : 'Select all'}
                    </button>
                    <div className="space-y-1.5">
                      {availComps.map((c, idx) => {
                        const checked = selected === null || selected === undefined
                          ? true
                          : selected.includes(c.name);
                        return (
                          <label key={`${c.name}-${idx}`} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleComponent(svc.id, c.name, availComps)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500 focus:ring-offset-0 flex-shrink-0"
                            />
                            <span className={clsx('text-xs', checked ? 'text-gray-700' : 'text-gray-400')}>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-black/[0.08] flex-shrink-0">
          <button
            onClick={() => setLocalFilter({})}
            disabled={!hasActiveFilters}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear all filters
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg border border-black/[0.12] text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
