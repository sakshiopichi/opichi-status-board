'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, AlertTriangle, AlertCircle, Wrench } from 'lucide-react';
import clsx from 'clsx';

const IMPACT_CONFIG = {
  critical:    { cls: 'bg-red-50 border-l-red-400',     badge: 'bg-red-100 text-red-700',    icon: AlertCircle,   label: 'CRITICAL' },
  major:       { cls: 'bg-red-50 border-l-red-400',     badge: 'bg-red-100 text-red-700',    icon: AlertCircle,   label: 'MAJOR' },
  minor:       { cls: 'bg-amber-50 border-l-amber-400', badge: 'bg-amber-100 text-amber-700',icon: AlertTriangle, label: 'MINOR' },
  maintenance: { cls: 'bg-blue-50 border-l-blue-400',   badge: 'bg-blue-100 text-blue-700',  icon: Wrench,        label: 'MAINTENANCE' },
};

function getCfg(impact) {
  return IMPACT_CONFIG[(impact||'').toLowerCase()] || IMPACT_CONFIG.minor;
}

export default function IssuesDropdown({ incidents }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hasCrit = incidents.some(i => ['critical','major'].includes((i.impact||'').toLowerCase()));

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (!incidents.length) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className={clsx('inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all',
          hasCrit ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                  : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100')}>
        <span className={clsx('w-1.5 h-1.5 rounded-full', hasCrit ? 'bg-red-500' : 'bg-amber-500')}
          style={{animation:'pulse 2s infinite'}} />
        {incidents.length} issue{incidents.length > 1 ? 's' : ''} detected
        <ChevronDown size={12} className={clsx('transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[420px] bg-white border border-black/10 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active incidents</p>
            <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
              hasCrit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
              {incidents.length}
            </span>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-black/[0.04]">
            {incidents.map((inc, i) => {
              const cfg = getCfg(inc.impact);
              const Icon = cfg.icon;
              return (
                <div key={i} className={clsx('px-4 py-3.5 border-l-4', cfg.cls)}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{inc.svcName}</p>
                  <div className="flex items-start gap-2 mb-2">
                    <Icon size={14} className="mt-0.5 flex-shrink-0 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{inc.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded', cfg.badge)}>{cfg.label}</span>
                    <span className="text-xs text-gray-500">Status: <span className="font-semibold capitalize">{inc.status}</span></span>
                    {inc.time && <span className="text-xs text-gray-400">· {inc.time}</span>}
                  </div>
                  {inc.update && (
                    <p className="text-xs text-gray-600 leading-relaxed bg-white/70 rounded-lg px-3 py-2 border border-black/[0.06]">
                      {inc.update}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
