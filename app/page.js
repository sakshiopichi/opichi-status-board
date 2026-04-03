// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, LogOut, User, CheckCircle2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { SERVICES, getServiceStatus, getIncidents } from '@/lib/services';
import { CompactServiceCard, IssueCard } from '@/components/ServiceCard';
import FetchLog from '@/components/FetchLog';
import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL = 30;
function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [tab, setTab]                 = useState('dashboard');
  const [svcData, setSvcData]         = useState({});
  const [fetching, setFetching]       = useState(new Set());
  const [logs, setLogs]               = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [countdown, setCountdown]     = useState(REFRESH_INTERVAL);
  const timerRef                      = useRef(null);
  const refreshingRef                 = useRef(false);

  useEffect(() => {
    if (!isPending && !session) router.push('/login');
  }, [session, isPending, router]);

  const addLog = useCallback((type, msg) => {
    setLogs(prev => [...prev.slice(-199), { time: now(), type, msg }]);
  }, []);

  const fetchOne = useCallback(async (svc) => {
    setFetching(prev => new Set(prev).add(svc.id));
    const t0 = Date.now();
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(svc.url)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setSvcData(prev => ({ ...prev, [svc.id]: { data, error: null } }));
      const { key } = getServiceStatus(svc, data);
      addLog('ok', `[${svc.id}] ✓ ${res.status} — ${Date.now() - t0}ms — ${key}`);
    } catch (e) {
      setSvcData(prev => ({ ...prev, [svc.id]: { data: null, error: e.message } }));
      addLog('err', `[${svc.id}] ✗ ${e.message}`);
    } finally {
      setFetching(prev => { const s = new Set(prev); s.delete(svc.id); return s; });
    }
  }, [addLog]);

  const refreshAll = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    clearInterval(timerRef.current);
    setCountdown(REFRESH_INTERVAL);
    addLog('info', '── Refresh cycle started ──');
    await Promise.allSettled(SERVICES.map(fetchOne));
    setLastUpdated(now());
    addLog('info', `── Cycle complete — next in ${REFRESH_INTERVAL}s ──`);
    refreshingRef.current = false;
    let secs = REFRESH_INTERVAL;
    timerRef.current = setInterval(() => {
      secs--;
      setCountdown(secs);
      if (secs <= 0) { clearInterval(timerRef.current); refreshAll(); }
    }, 1000);
  }, [fetchOne, addLog]);

  useEffect(() => {
    if (session) refreshAll();
    return () => clearInterval(timerRef.current);
  }, [session]);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  // Partition services into operational and issue groups
  const operationalServices = [];
  const issueServices = [];

  for (const svc of SERVICES) {
    const d = svcData[svc.id];
    const { key, label } = getServiceStatus(svc, d?.data);
    const statusKey = d?.error ? 'err' : key;
    const incidents = d?.data ? getIncidents(svc, d.data) : [];
    const entry = { svc, statusKey, statusLabel: label, isFetching: fetching.has(svc.id), error: d?.error, incidents };

    if (!d) {
      // Still loading — show in operational column as loading state
      operationalServices.push(entry);
    } else if (statusKey === 'ok') {
      operationalServices.push(entry);
    } else {
      issueServices.push(entry);
    }
  }

  const hasIssues = issueServices.length > 0;

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-green-300 border-t-green-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-black/[0.08] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <img src="/opichi-logo.png" alt="Opichi" width={32} height={32} className="object-contain" />
            <span className="font-semibold text-sm">Opichi Status Board</span>
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {['dashboard', 'log'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx('px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                  tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                {t === 'log' ? 'Fetch Log' : 'Dashboard'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 tabular-nums hidden sm:block">
              Refresh in <span className="font-semibold text-gray-600">{countdown}s</span>
            </span>
            <button onClick={refreshAll}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-black/[0.12] rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-all">
              <RefreshCw size={12} />
              <span className="hidden sm:inline">Refresh now</span>
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-black/[0.08]">
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                <User size={13} className="text-green-700" />
              </div>
              <span className="text-xs font-medium text-gray-700 hidden md:block max-w-[120px] truncate">
                {session.user?.name || session.user?.email}
              </span>
              <button onClick={handleSignOut} title="Sign out"
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 border border-transparent hover:border-red-200 hover:bg-red-50 rounded-lg px-2 py-1.5 transition-all">
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 w-full">
        {tab === 'dashboard' && (
          <>
            {/* Page title + last updated */}
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-1">
                <span className={clsx('w-2 h-2 rounded-full', hasIssues ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ animation: 'pulse 2s infinite' }} />
                <h1 className="text-2xl font-semibold tracking-tight">Services Status</h1>
              </div>
              <p className="text-sm text-gray-400 ml-4">
                {lastUpdated ? `Last updated ${lastUpdated}` : 'Initializing…'}
              </p>
            </div>

            {/* All-clear banner */}
            {!hasIssues && lastUpdated && (
              <div className="mb-6 rounded-2xl px-5 py-4 flex items-center gap-3 bg-green-50 border border-green-200">
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">All systems operational</p>
                  <p className="text-xs text-green-600 mt-0.5">No incidents detected. Dashboard auto-refreshes every 30 seconds.</p>
                </div>
              </div>
            )}

            {hasIssues ? (
              /* Two-column split: operational left, issues right */
              <div className="flex gap-6 items-start">

                {/* Left — Operational */}
                <div className="w-80 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Operational
                    </h2>
                    <span className="ml-auto text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {operationalServices.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {operationalServices.map(({ svc, statusKey, statusLabel, isFetching, error }) => (
                      <CompactServiceCard key={svc.id}
                        svc={svc} statusKey={statusKey} statusLabel={statusLabel}
                        isFetching={isFetching} error={error}
                      />
                    ))}
                    {operationalServices.length === 0 && (
                      <p className="text-xs text-gray-400 py-2">No operational services.</p>
                    )}
                  </div>
                </div>

                {/* Right — Issues */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Active Issues
                    </h2>
                    <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {issueServices.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {issueServices.map(({ svc, statusKey, statusLabel, isFetching, error, incidents }) => (
                      <IssueCard key={svc.id}
                        svc={svc} statusKey={statusKey} statusLabel={statusLabel}
                        isFetching={isFetching} error={error} incidents={incidents}
                      />
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              /* All-clear: single grid of compact cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {operationalServices.map(({ svc, statusKey, statusLabel, isFetching, error }) => (
                  <CompactServiceCard key={svc.id}
                    svc={svc} statusKey={statusKey} statusLabel={statusLabel}
                    isFetching={isFetching} error={error}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'log' && (
          <div className="mt-2">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1">Fetch Log</h2>
              <p className="text-sm text-gray-400">Live record of every API call made to the status endpoints.</p>
            </div>
            <FetchLog logs={logs} onClear={() => setLogs([])} />
          </div>
        )}
      </main>
    </div>
  );
}
