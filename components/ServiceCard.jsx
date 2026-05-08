// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';
import { useState } from 'react';
import clsx from 'clsx';
import { AlertCircle, AlertTriangle, Wrench, ChevronDown, X } from 'lucide-react';
import ServiceIcon from '@/components/ServiceIcon';
import { getAbstract } from '@/lib/services';

const STATUS_STYLES = {
  ok:    { badge: 'bg-green-100 text-green-800',   dot: 'bg-green-500',  border: 'border-black/10' },
  deg:   { badge: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500',  border: 'border-amber-300' },
  part:  { badge: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-400',  border: 'border-amber-300' },
  maj:   { badge: 'bg-red-100 text-red-800',       dot: 'bg-red-500',    border: 'border-red-400' },
  maint: { badge: 'bg-gray-100 text-gray-500',     dot: 'bg-gray-400',   border: 'border-black/10' },
  // load = not yet fetched — visually distinct from confirmed operational
  load:  { badge: 'bg-gray-100 text-gray-400',     dot: 'bg-gray-300 animate-pulse', border: 'border-black/[0.06]' },
  // warn = data received but unreadable — treat as a problem
  warn:  { badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400',  border: 'border-amber-300' },
  err:   { badge: 'bg-red-100 text-red-800',       dot: 'bg-red-400',    border: 'border-red-400' },
};

// Tier classification
function getTier(statusKey) {
  if (statusKey === 'maj' || statusKey === 'err') return 'critical';
  if (statusKey === 'part' || statusKey === 'deg') return 'warning';
  return 'maint';
}

const IMPACT_CONFIG = {
  critical:    { badge: 'bg-red-100 text-red-700',     icon: AlertCircle,   label: 'CRITICAL' },
  major:       { badge: 'bg-red-100 text-red-700',     icon: AlertCircle,   label: 'MAJOR' },
  minor:       { badge: 'bg-amber-100 text-amber-700', icon: AlertTriangle, label: 'MINOR' },
  maintenance: { badge: 'bg-gray-100 text-gray-500',   icon: Wrench,        label: 'MAINTENANCE' },
};

function getImpactCfg(impact) {
  return IMPACT_CONFIG[(impact || '').toLowerCase()] || IMPACT_CONFIG.minor;
}

// Compact card for operational services (left column)
export function CompactServiceCard({ svc, statusKey, statusLabel, isFetching, error, components = [], incidents = [], onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_STYLES[error ? 'err' : statusKey] || STATUS_STYLES.load;
  const hasComponents = components.length > 0;
  // Partial impact: AWS/GCP/Railway stays in Operational with amber indicator + expandable affected list
  const hasPartialImpact = !hasComponents && statusKey === 'deg' && incidents.length > 0;
  const isExpandable = hasComponents || hasPartialImpact;

  const partialItems = hasPartialImpact
    ? incidents.flatMap(inc =>
        inc.affectedServices?.length > 0
          ? inc.affectedServices
          : [inc.name]
      ).filter(Boolean)
    : [];

  return (
    <div className={clsx('card-wobble relative bg-white rounded-xl border transition-all duration-300', style.border)}>
      {/* Main row */}
      <div
        className={clsx('px-3 py-3 flex items-center gap-3', isExpandable && 'cursor-pointer hover:bg-gray-50/60 transition-colors rounded-xl')}
        onClick={isExpandable ? () => setExpanded(v => !v) : undefined}
      >
        {isFetching && (
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full border border-gray-200 border-t-gray-400 animate-spin" style={{ animationDuration: '0.7s' }} />
        )}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: svc.bg }}>
          <ServiceIcon svcId={svc.id} icon={svc.icon} initials={svc.initials} color={svc.color} size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{svc.name}</p>
          <p className="text-[11px] text-gray-400 truncate">{svc.desc}</p>
        </div>
        <div className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold flex-shrink-0 whitespace-nowrap', style.badge)}>
          <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', style.dot)} />
          {error ? 'Unavailable' : statusLabel}
        </div>
        {onRemove && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors ml-0.5"
            title="Remove service"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Expanded: component health (Atlassian services) */}
      {expanded && hasComponents && (
        <div className="border-t border-black/[0.06] px-3 pt-1.5 pb-2 space-y-0.5">
          {components.map((c, i) => {
            const cStyle = STATUS_STYLES[c.statusKey] || STATUS_STYLES.load;
            return (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cStyle.dot)} />
                <span className="text-xs text-gray-600 flex-1 truncate">{c.name}</span>
                {c.statusKey !== 'ok' && (
                  <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded', cStyle.badge)}>{c.statusLabel}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded: partial impact (AWS/GCP/Railway — lists affected services or incident name) */}
      {expanded && hasPartialImpact && (
        <div className="border-t border-amber-200/60 px-3 pt-1.5 pb-2 space-y-0.5">
          {partialItems.map((name, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-amber-400 mt-1" />
              <span className="text-xs text-amber-900 flex-1 break-words">{name}</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0 mt-0.5">Affected</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IncidentList({ incidents, error, tier }) {
  const dividerColor = tier === 'critical' ? 'divide-red-200/40' : tier === 'warning' ? 'divide-amber-200/40' : 'divide-black/[0.04]';
  const borderColor  = tier === 'critical' ? 'border-red-200/40' : tier === 'warning' ? 'border-amber-200/40' : 'border-black/[0.06]';
  return (
    <div className={clsx('divide-y', dividerColor, 'border-t', borderColor)}>
      {incidents && incidents.length > 0 ? incidents.map((inc, i) => {
        const cfg = getImpactCfg(inc.impact);
        const Icon = cfg.icon;
        return (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start gap-2 mb-2">
              <Icon size={14} className={clsx('mt-0.5 flex-shrink-0', tier === 'critical' ? 'text-red-400' : tier === 'warning' ? 'text-amber-400' : 'text-gray-400')} />
              <p className={clsx('text-sm font-semibold leading-snug break-words', tier === 'critical' ? 'text-red-900' : 'text-gray-800')}>{inc.name}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded', cfg.badge)}>{cfg.label}</span>
              <span className={clsx('text-xs', tier === 'critical' ? 'text-red-700/70' : 'text-gray-500')}>
                Status: <span className="font-semibold capitalize">{inc.status}</span>
              </span>
              {inc.time && <span className={clsx('text-xs', tier === 'critical' ? 'text-red-600/60' : 'text-gray-400')}>· {inc.time}</span>}
            </div>
            {inc.update && (
              <p className={clsx('text-xs leading-relaxed rounded-lg px-3 py-2.5 border break-words',
                tier === 'critical' ? 'text-red-800 bg-red-50/60 border-red-200/40' :
                tier === 'warning'  ? 'text-amber-800 bg-amber-50/60 border-amber-200/40' :
                'text-gray-600 bg-gray-50 border-black/[0.06]'
              )}>
                {inc.update}
              </p>
            )}
          </div>
        );
      }) : (
        <div className="px-4 py-3">
          <p className={clsx('text-xs', tier === 'critical' ? 'text-red-700/60' : 'text-gray-400')}>{error || 'Service is experiencing issues.'}</p>
        </div>
      )}
    </div>
  );
}


// Tier-styled issue card — shows abstract by default, full details on demand
export function IssueCard({ svc, statusKey, statusLabel, isFetching, error, incidents }) {
  const [showDetails, setShowDetails] = useState(false);
  const key   = error ? 'err' : statusKey;
  const style = STATUS_STYLES[key] || STATUS_STYLES.load;
  const tier  = getTier(key);
  const abstract = getAbstract(svc, incidents, error);

  const containerClass = clsx(
    'relative w-full transition-all duration-300 border overflow-hidden',
    tier === 'critical'
      ? 'rounded-2xl bg-red-50 border-red-300 shadow-md shadow-red-100'
      : tier === 'warning'
      ? 'rounded-2xl bg-amber-50/50 border-amber-300'
      : 'rounded-xl bg-white border-black/[0.08] opacity-75'
  );

  const borderColor = tier === 'critical' ? 'border-red-200/40' : tier === 'warning' ? 'border-amber-200/40' : 'border-black/[0.06]';

  return (
    <div className={containerClass}>
      {/* Row 1 — service identity + status badge */}
      <div className={clsx(
        'w-full flex items-center gap-3 px-4 border-b',
        tier === 'critical' ? 'pt-4 pb-3' : 'pt-3 pb-2.5',
        borderColor
      )}>
        {isFetching && (
          <span className={clsx('absolute top-3 right-3 w-2 h-2 rounded-full animate-spin',
            tier === 'critical' ? 'border border-red-200 border-t-red-400' : 'border border-gray-200 border-t-gray-400'
          )} style={{ animationDuration: '0.7s' }} />
        )}
        {/* Icon */}
        <div className={clsx('rounded-lg flex items-center justify-center flex-shrink-0',
          tier === 'critical' ? 'w-10 h-10' : 'w-8 h-8'
        )} style={{ background: svc.bg }}>
          <ServiceIcon svcId={svc.id} icon={svc.icon} initials={svc.initials} color={svc.color}
            size={tier === 'critical' ? 20 : 16} />
        </div>
        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <p className={clsx('font-semibold leading-tight truncate',
            tier === 'critical' ? 'text-base text-red-900' : 'text-sm text-gray-800'
          )}>{svc.name}</p>
          <p className={clsx('truncate mt-0.5',
            tier === 'critical' ? 'text-xs text-red-700/60' : 'text-[11px] text-gray-400'
          )}>{svc.desc}</p>
        </div>
        {/* Status badge */}
        <div className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold flex-shrink-0',
          tier === 'critical' ? 'text-xs bg-red-100 text-red-700' :
          tier === 'warning'  ? 'text-[10px] bg-amber-100 text-amber-700' :
          'text-[10px] bg-gray-100 text-gray-500'
        )}>
          <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', style.dot)} />
          <span className="whitespace-nowrap">{error ? 'Unavailable' : statusLabel}</span>
        </div>
      </div>

      {/* Row 2 — abstract + Details toggle */}
      <div className={clsx(
        'w-full flex items-start gap-3 px-4 py-3',
        showDetails && clsx('border-b', borderColor)
      )}>
        <p className={clsx(
          'text-sm leading-relaxed flex-1 break-words',
          tier === 'critical' ? 'text-red-800' : tier === 'warning' ? 'text-amber-900' : 'text-gray-600'
        )}>
          {abstract}
        </p>
        <button
          onClick={() => setShowDetails(v => !v)}
          className={clsx(
            'text-[10px] font-medium flex items-center gap-0.5 flex-shrink-0 px-2 py-1 rounded-lg border transition-colors mt-0.5',
            tier === 'critical'
              ? 'text-red-600 border-red-200 hover:bg-red-100/60'
              : tier === 'warning'
              ? 'text-amber-600 border-amber-200 hover:bg-amber-100/60'
              : 'text-gray-400 border-black/[0.08] hover:bg-gray-50'
          )}
        >
          {showDetails ? 'Hide' : 'Details'}
          <ChevronDown size={10} className={clsx('transition-transform duration-200 ml-0.5', showDetails && 'rotate-180')} />
        </button>
      </div>

      {/* Row 3 — full incident list, hidden until Details clicked */}
      {showDetails && <IncidentList incidents={incidents} error={error} tier={tier} />}
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
