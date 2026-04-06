// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';
import clsx from 'clsx';
import { AlertCircle, AlertTriangle, Wrench } from 'lucide-react';
import ServiceIcon from '@/components/ServiceIcon';

const STATUS_STYLES = {
  ok:    { badge: 'bg-green-100 text-green-800', dot: 'bg-green-500',  border: 'border-black/10' },
  deg:   { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500',  border: 'border-amber-300' },
  part:  { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-400',  border: 'border-amber-300' },
  maj:   { badge: 'bg-red-100 text-red-800',     dot: 'bg-red-500',    border: 'border-red-300' },
  maint: { badge: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500',   border: 'border-blue-300' },
  load:  { badge: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-300',   border: 'border-black/10' },
  err:   { badge: 'bg-red-100 text-red-800',     dot: 'bg-red-400',    border: 'border-red-200' },
};

const IMPACT_CONFIG = {
  critical:    { bar: 'bg-red-400',   badge: 'bg-red-100 text-red-700',     icon: AlertCircle,   label: 'CRITICAL' },
  major:       { bar: 'bg-red-400',   badge: 'bg-red-100 text-red-700',     icon: AlertCircle,   label: 'MAJOR' },
  minor:       { bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', icon: AlertTriangle, label: 'MINOR' },
  maintenance: { bar: 'bg-blue-400',  badge: 'bg-blue-100 text-blue-700',   icon: Wrench,        label: 'MAINTENANCE' },
};

function getImpactCfg(impact) {
  return IMPACT_CONFIG[(impact || '').toLowerCase()] || IMPACT_CONFIG.minor;
}

// Compact card for operational services (left column)
export function CompactServiceCard({ svc, statusKey, statusLabel, isFetching, error }) {
  const style = STATUS_STYLES[error ? 'err' : statusKey] || STATUS_STYLES.load;
  return (
    <div className={clsx('card-wobble relative bg-white rounded-xl px-4 py-3 flex items-center gap-3 border transition-all duration-300', style.border)}>
      {isFetching && (
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full border border-gray-200 border-t-gray-400 animate-spin" style={{ animationDuration: '0.7s' }} />
      )}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: svc.bg }}>
        <ServiceIcon svcId={svc.id} icon={svc.icon} initials={svc.initials} color={svc.color} size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{svc.name}</p>
        <p className="text-[11px] text-gray-400">{svc.desc}</p>
      </div>
      <div className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold flex-shrink-0', style.badge)}>
        <span className={clsx('w-1.5 h-1.5 rounded-full', style.dot)} />
        {error ? 'Unavailable' : statusLabel}
      </div>
    </div>
  );
}

// Expanded card for services with incidents (right column)
export function IssueCard({ svc, statusKey, statusLabel, isFetching, error, incidents }) {
  const style = STATUS_STYLES[error ? 'err' : statusKey] || STATUS_STYLES.load;
  return (
    <div className={clsx('card-wobble relative bg-white rounded-2xl border overflow-hidden transition-all duration-300', style.border)}>
      {isFetching && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full border border-gray-200 border-t-gray-400 animate-spin" style={{ animationDuration: '0.7s' }} />
      )}
      {/* Service header */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-black/[0.06]">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: svc.bg }}>
          <ServiceIcon svcId={svc.id} icon={svc.icon} initials={svc.initials} color={svc.color} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{svc.name}</p>
          <p className="text-[11px] text-gray-400">{svc.desc}</p>
        </div>
        <div className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0', style.badge)}>
          <span className={clsx('w-1.5 h-1.5 rounded-full', style.dot)} />
          {error ? 'Unavailable' : statusLabel}
        </div>
      </div>

      {/* Incidents */}
      <div className="divide-y divide-black/[0.04]">
        {incidents && incidents.length > 0 ? incidents.map((inc, i) => {
          const cfg = getImpactCfg(inc.impact);
          const Icon = cfg.icon;
          return (
            <div key={i} className="px-5 py-4">
              <div className="flex items-start gap-2 mb-2">
                <Icon size={14} className="mt-0.5 flex-shrink-0 text-gray-500" />
                <p className="text-sm font-semibold text-gray-800 leading-snug">{inc.name}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded', cfg.badge)}>{cfg.label}</span>
                <span className="text-xs text-gray-500">
                  Status: <span className="font-semibold capitalize">{inc.status}</span>
                </span>
                {inc.time && <span className="text-xs text-gray-400">· {inc.time}</span>}
              </div>
              {inc.update && (
                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5 border border-black/[0.06]">
                  {inc.update}
                </p>
              )}
            </div>
          );
        }) : (
          <div className="px-5 py-4">
            <p className="text-xs text-gray-400">{error || 'Service is experiencing issues.'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Default export kept for any existing usage
export default function ServiceCard({ svc, statusKey, statusLabel, isFetching, error }) {
  const style = STATUS_STYLES[error ? 'err' : statusKey] || STATUS_STYLES.load;
  return (
    <div className={clsx('card-wobble relative bg-white rounded-2xl p-5 flex flex-col gap-4 border transition-all duration-300', style.border)}>
      {isFetching && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full border border-gray-200 border-t-gray-400 animate-spin" style={{ animationDuration: '0.7s' }} />
      )}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: svc.bg }}>
          <ServiceIcon svcId={svc.id} icon={svc.icon} initials={svc.initials} color={svc.color} size={18} />
        </div>
        <div>
          <p className="text-sm font-medium leading-tight">{svc.name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{svc.desc}</p>
        </div>
      </div>
      <div className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold w-fit', style.badge)}>
        <span className={clsx('w-1.5 h-1.5 rounded-full', style.dot)} />
        {error ? 'Unavailable' : statusLabel}
      </div>
    </div>
  );
}
