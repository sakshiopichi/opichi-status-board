// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, LogOut, User, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import clsx from 'clsx';
import { SERVICES, getServiceStatus, getIncidents } from '@/lib/services';
import { CATALOG } from '@/lib/catalog';
import { CompactServiceCard, IssueCard } from '@/components/ServiceCard';
import AddServiceModal from '@/components/AddServiceModal';
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

  const [tab, setTab]                   = useState('dashboard');
  const [svcData, setSvcData]           = useState({});
  const [fetching, setFetching]         = useState(new Set());
  const [logs, setLogs]                 = useState([]);
  const [lastUpdated, setLastUpdated]   = useState('');
  const [countdown, setCountdown]       = useState(REFRESH_INTERVAL);
  const [showAddModal, setShowAddModal] = useState(false);

  // customSvcRecords: [{ id, catalogId }] — raw from DB
  const [customSvcRecords, setCustomSvcRecords] = useState([]);

  const timerRef      = useRef(null);
  const refreshingRef = useRef(false);
  // Holds the current merged services list so refreshAll always reads the latest
  const allServicesRef = useRef([...SERVICES]);

  useEffect(() => {
    if (!isPending && !session) router.push('/login');
  }, [session, isPending, router]);

  // Derived: catalog entries for the user's saved services
  const customSvcs = customSvcRecords
    .map(r => {
      const cat = CATALOG.find(c => c.id === r.catalogId);
      return cat ? { ...cat, _recordId: r.id } : null;
    })
    .filter(Boolean);

  // addedMap for the modal: { [catalogId]: recordId }
  const addedMap = Object.fromEntries(customSvcRecords.map(r => [r.catalogId, r.id]));

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
    await Promise.allSettled(allServicesRef.current.map(fetchOne));
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

  const loadCustomServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services');
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  }, []);

  useEffect(() => {
    if (!session) return;
    async function init() {
      const records = await loadCustomServices();
      setCustomSvcRecords(records);
      // Sync ref before refreshAll so all services are fetched in the first cycle
      const catalogSvcs = records
        .map(r => CATALOG.find(c => c.id === r.catalogId))
        .filter(Boolean);
      allServicesRef.current = [...SERVICES, ...catalogSvcs];
      refreshAll();
    }
    init();
    return () => clearInterval(timerRef.current);
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep ref in sync when custom services change
  useEffect(() => {
    const catalogSvcs = customSvcRecords
      .map(r => CATALOG.find(c => c.id === r.catalogId))
      .filter(Boolean);
    allServicesRef.current = [...SERVICES, ...catalogSvcs];
  }, [customSvcRecords]);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  async function handleAddService(catalogId) {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalogId }),
    });
    if (!res.ok) return;
    const record = await res.json();
    setCustomSvcRecords(prev => [...prev, record]);
    // Immediately fetch status for the newly added service
    const cat = CATALOG.find(c => c.id === catalogId);
    if (cat) fetchOne(cat);
  }

  async function handleRemoveService(catalogId, recordId) {
    const res = await fetch(`/api/services/${recordId}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) return;
    setCustomSvcRecords(prev => prev.filter(r => r.id !== recordId));
    setSvcData(prev => {
      const next = { ...prev };
      delete next[catalogId];
      return next;
    });
  }

  // Severity order — lower number = more severe
  const SEVERITY = { maj: 0, err: 1, part: 2, deg: 3, maint: 4, load: 5, ok: 6 };
  const INCIDENT_SEVERITY = { critical: 0, major: 1, minor: 2, maintenance: 3 };

  // Partition all services into operational and issue groups
  const allServices = [...SERVICES, ...customSvcs];
  const operationalServices = [];
  const issueServices = [];

  for (const svc of allServices) {
    const d = svcData[svc.id];
    const { key, label } = getServiceStatus(svc, d?.data);
    const statusKey = d?.error ? 'err' : key;
    // Sort incidents within each service by severity
    const rawIncidents = d?.data ? getIncidents(svc, d.data) : [];
    const incidents = [...rawIncidents].sort((a, b) =>
      (INCIDENT_SEVERITY[(a.impact || '').toLowerCase()] ?? 99) -
      (INCIDENT_SEVERITY[(b.impact || '').toLowerCase()] ?? 99)
    );
    const entry = { svc, statusKey, statusLabel: label, isFetching: fetching.has(svc.id), error: d?.error, incidents };

    if (!d) {
      operationalServices.push(entry);
    } else if (statusKey === 'ok') {
      operationalServices.push(entry);
    } else {
      issueServices.push(entry);
    }
  }

  // Sort services by severity — most severe service first
  issueServices.sort((a, b) =>
    (SEVERITY[a.statusKey] ?? 99) - (SEVERITY[b.statusKey] ?? 99)
  );

  const hasIssues = issueServices.length > 0;

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-green-300 border-t-green-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="bg-white border-b border-black/[0.08] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
          {/* Main row */}
          <div className="h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-shrink-0">
              <img src="/opichi-logo.png" alt="Opichi" width={32} height={32} className="object-contain" />
              <span className="font-semibold text-sm">Opichi Status Board</span>
            </div>

            {/* Tabs — desktop only; mobile tabs appear in the row below */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {['dashboard', 'log'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={clsx('px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                    tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                  {t === 'log' ? 'Fetch Log' : 'Dashboard'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs text-gray-400 tabular-nums hidden sm:block">
                Refresh in <span className="font-semibold text-gray-600">{countdown}s</span>
              </span>
              <button onClick={refreshAll}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-black/[0.12] rounded-lg px-2.5 sm:px-3 py-1.5 hover:bg-gray-50 transition-all">
                <RefreshCw size={12} />
                <span className="hidden sm:inline">Refresh now</span>
              </button>
              <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-black/[0.08]">
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

          {/* Mobile-only tabs row */}
          <div className="flex sm:hidden pb-2">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-full">
              {['dashboard', 'log'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={clsx('flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                    tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                  {t === 'log' ? 'Fetch Log' : 'Dashboard'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        {tab === 'dashboard' && (
          <>
            {/* Page title + last updated + Add service */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className={clsx('w-2 h-2 rounded-full', hasIssues ? 'bg-amber-500' : 'bg-emerald-500')}
                    style={{ animation: 'pulse 2s infinite' }} />
                  <h1 className="text-2xl font-semibold tracking-tight">Services Status</h1>
                </div>
                <p className="text-sm text-gray-400 ml-4">
                  {lastUpdated ? `Last updated ${lastUpdated}` : 'Initializing…'}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl px-4 py-2 transition-all flex-shrink-0 mt-1">
                <Plus size={14} />
                Add service
              </button>
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
              <div className="flex flex-col gap-6 items-start xl:flex-row">
                <div className="w-full xl:w-80 xl:flex-shrink-0 order-2 xl:order-1">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Operational</h2>
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

                <div className="w-full min-w-0 xl:flex-1 order-1 xl:order-2">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Issues</h2>
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

      {showAddModal && (
        <AddServiceModal
          addedMap={addedMap}
          onAdd={handleAddService}
          onRemove={handleRemoveService}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
