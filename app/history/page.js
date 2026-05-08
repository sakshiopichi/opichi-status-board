// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { CheckCircle2, AlertTriangle, AlertCircle, Wrench, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

const IMPACT_STYLES = {
  critical:    { badge: 'bg-red-100 text-red-700',     icon: AlertCircle,   label: 'CRITICAL' },
  major:       { badge: 'bg-red-100 text-red-700',     icon: AlertCircle,   label: 'MAJOR' },
  minor:       { badge: 'bg-amber-100 text-amber-700', icon: AlertTriangle, label: 'MINOR' },
  maintenance: { badge: 'bg-blue-100 text-blue-700',   icon: Wrench,        label: 'MAINTENANCE' },
};

function getImpactStyle(impact) {
  return IMPACT_STYLES[(impact || '').toLowerCase()] || IMPACT_STYLES.minor;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function duration(firstSeen, resolvedAt) {
  if (!resolvedAt) return null;
  const ms = new Date(resolvedAt) - new Date(firstSeen);
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session) router.push('/login');
  }, [session, isPending, router]);

  useEffect(() => {
    if (!session) return;
    fetch('/api/incidents')
      .then(r => r.json())
      .then(data => { setIncidents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-green-300 border-t-green-700 animate-spin" />
      </div>
    );
  }

  const active = incidents.filter(i => i.status === 'active');
  const resolved = incidents.filter(i => i.status === 'resolved');

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="bg-white border-b border-black/[0.08] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3 w-full">
          <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <img src="/opichi-logo.png" alt="Opichi" width={28} height={28} className="object-contain" />
          <span className="font-semibold text-sm">Incident History</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-green-300 border-t-green-700 animate-spin" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 size={32} className="text-green-400 mb-3" />
            <p className="text-sm font-medium text-gray-600">No incidents logged yet</p>
            <p className="text-xs text-gray-400 mt-1">Incidents will appear here as the dashboard detects them.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active incidents */}
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Active ({active.length})
                </h2>
                <div className="space-y-2">
                  {active.map(inc => {
                    const cfg = getImpactStyle(inc.impact);
                    const Icon = cfg.icon;
                    const isCritical = inc.impact === 'critical' || inc.impact === 'major';
                    return (
                      <div key={inc.id} className={clsx(
                        'border rounded-xl px-4 py-3 flex items-start gap-3',
                        isCritical
                          ? 'bg-red-50 border-red-300 shadow-sm shadow-red-100'
                          : 'bg-amber-50/50 border-amber-300'
                      )}>
                        <Icon size={14} className={clsx('mt-0.5 flex-shrink-0', isCritical ? 'text-red-400' : 'text-amber-500')} />
                        <div className="flex-1 min-w-0">
                          <p className={clsx('text-sm font-semibold break-words', isCritical ? 'text-red-900' : 'text-gray-800')}>{inc.incidentName}</p>
                          <p className={clsx('text-xs mt-0.5', isCritical ? 'text-red-600/70' : 'text-gray-400')}>{inc.serviceName} · Started {formatDate(inc.firstSeen)}</p>
                        </div>
                        <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0', cfg.badge)}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Resolved incidents */}
            {resolved.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-green-500" />
                  Resolved ({resolved.length})
                </h2>
                <div className="space-y-2">
                  {resolved.map(inc => {
                    const cfg = getImpactStyle(inc.impact);
                    const Icon = cfg.icon;
                    const dur = duration(inc.firstSeen, inc.resolvedAt);
                    return (
                      <div key={inc.id} className="bg-white border border-black/[0.08] rounded-xl px-4 py-3 flex items-start gap-3 opacity-75">
                        <Icon size={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{inc.incidentName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {inc.serviceName} · {formatDate(inc.firstSeen)}
                            {dur && <span className="ml-1">· {dur}</span>}
                          </p>
                        </div>
                        <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0', cfg.badge)}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
