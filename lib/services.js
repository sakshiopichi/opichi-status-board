// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
export const SERVICES = [
  {
    id: 'anthropic',
    name: 'Claude / Anthropic',
    desc: 'Claude Code & API',
    url: 'https://status.anthropic.com/api/v2/summary.json',
    color: '#534AB7',
    bg: '#EEEDFE',
    initials: 'AN',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    desc: 'Network & Workers',
    url: 'https://www.cloudflarestatus.com/api/v2/summary.json',
    color: '#BA7517',
    bg: '#FAEEDA',
    initials: 'CF',
  },
  {
    id: 'railway',
    name: 'Railway',
    desc: 'Deployment Platform',
    // Railway uses a custom SPA — proxy scrapes data-severity from their SSR HTML
    url: 'https://status.railway.com',
    color: '#185FA5',
    bg: '#E6F1FB',
    initials: 'RW',
    isRailway: true,
  },
  {
    id: 'openai',
    name: 'OpenAI / Codex',
    desc: 'Codex & GPT APIs',
    url: 'https://status.openai.com/api/v2/summary.json',
    color: '#0F6E56',
    bg: '#E1F5EE',
    initials: 'OA',
  },
  {
    id: 'gcp',
    name: 'Google Cloud',
    desc: 'GCP Infrastructure',
    url: 'https://status.cloud.google.com/incidents.json',
    color: '#993C1D',
    bg: '#FAECE7',
    initials: 'GC',
    isGCP: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    desc: 'Repos, Actions & Pages',
    url: 'https://www.githubstatus.com/api/v2/summary.json',
    color: '#2C2C2A',
    bg: '#F1EFE8',
    initials: 'GH',
  },
];

const IND_MAP = {
  none: 'ok', operational: 'ok',
  minor: 'deg', degraded_performance: 'deg', degraded: 'deg',
  partial_outage: 'part', partial: 'part',
  major_outage: 'maj', major: 'maj',
  under_maintenance: 'maint', maintenance: 'maint',
};

export function indKey(s) {
  return IND_MAP[(s || '').toLowerCase()] || 'load';
}

export function indLabel(s) {
  return ({ ok:'Operational', deg:'Degraded', part:'Partial Outage',
    maj:'Major Outage', maint:'Maintenance', load: s || 'Unknown' })[indKey(s)] || s || 'Unknown';
}

export function timeAgo(iso) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function getServiceStatus(svc, data) {
  if (!data) return { key: 'load', label: 'Checking…' };

  if (svc.isGCP) {
    // GCP returns an array — if it's not an array, data is unreadable
    if (!Array.isArray(data)) return { key: 'warn', label: 'Status Uncertain' };
    const active = data.filter(i => !i.end);
    return active.length
      ? { key: 'maj', label: `${active.length} Incident${active.length > 1 ? 's' : ''}` }
      : { key: 'ok', label: 'Operational' };
  }

  if (svc.isAWS) {
    // AWS returns an array — if it's not an array, data is unreadable
    if (!Array.isArray(data)) return { key: 'warn', label: 'Status Uncertain' };
    const active = data.filter(e => e.status === '3');
    return active.length
      ? { key: 'maj', label: `${active.length} Active Event${active.length > 1 ? 's' : ''}` }
      : { key: 'ok', label: 'Operational' };
  }

  if (svc.isRailway) {
    if (!data?.activeIncidents) return { key: 'warn', label: 'Status Uncertain' };
    const active = data.activeIncidents;
    if (!active.length) return { key: 'ok', label: 'Operational' };
    const IMPACT_ORDER = ['MAJOR_OUTAGE', 'PARTIAL_OUTAGE', 'DEGRADED_PERFORMANCE', 'MAINTENANCE'];
    const IMPACT_KEY   = { MAJOR_OUTAGE: 'maj', PARTIAL_OUTAGE: 'part', DEGRADED_PERFORMANCE: 'deg', MAINTENANCE: 'maint' };
    const IMPACT_LABEL = { maj: 'Major Outage', part: 'Partial Outage', deg: 'Service Disruption', maint: 'Maintenance' };
    let worst = 'DEGRADED_PERFORMANCE';
    for (const inc of active) {
      for (const comp of (inc.components || [])) {
        if (IMPACT_ORDER.indexOf(comp.impact) < IMPACT_ORDER.indexOf(worst)) worst = comp.impact;
      }
    }
    const key = IMPACT_KEY[worst] || 'deg';
    return { key, label: IMPACT_LABEL[key] || 'Service Disruption' };
  }

  // Atlassian-format: must have data.status.indicator
  if (!data?.status?.indicator) return { key: 'warn', label: 'Status Uncertain' };
  const ind = data.status.indicator;
  const key = indKey(ind);
  const rawLabel = data?.status?.description || indLabel(ind);
  // Normalise "All Systems Operational" (and similar API descriptions) to plain "Operational"
  const label = key === 'ok' ? 'Operational' : rawLabel;
  return { key, label };
}

// Returns core components for Atlassian-format services:
// - If the service uses component groups (e.g. OpenAI: APIs, ChatGPT, Codex),
//   returns only the group-level entries — not their children.
// - If the service has no groups (flat structure), returns all top-level components.
// GCP, AWS, and ping services don't have this structure — returns [].
// Derives a single human-readable abstract line from a service's incident list.
// Strips internal incident ID prefixes and truncates to keep it short.
// The abstract is the only thing shown on an issue card by default.
export function getAbstract(svc, incidents, error) {
  if (error) return `${svc.name} is unavailable`;
  if (!incidents || incidents.length === 0) return 'Service is experiencing issues';

  const worst = incidents[0]; // already sorted by severity
  const suffix = incidents.length > 1 ? ` · ${incidents.length} issues` : '';
  const maxLen = 80;

  // AWS: surface the actual impacted service names + region instead of the slug
  if (worst.affectedServices?.length > 0) {
    const services = worst.affectedServices.slice(0, 4).join(', ');
    const region = worst.region ? ` · ${worst.region}` : '';
    const text = services + region;
    return (text.length + suffix.length > maxLen
      ? text.slice(0, maxLen - suffix.length - 1) + '…'
      : text) + suffix;
  }

  // Strip internal prefixes: "Incident #4821 — ", "Incident - ", "[RESOLVED] ", etc.
  const cleaned = worst.name
    .replace(/^\[?resolved\]?\s*/i, '')
    .replace(/^incident\s*[#]?[\w-]*\s*[—–\-:]\s*/i, '')
    .trim() || worst.name;

  const text = cleaned.length + suffix.length > maxLen
    ? cleaned.slice(0, maxLen - suffix.length - 1) + '…'
    : cleaned;

  return text + suffix;
}

// Returns core components for Atlassian-format services.
// Shows only top-level entries (no group_id) — these are product groups like
// "APIs", "ChatGPT", "Codex" for OpenAI, not their 10+ sub-components.
// GCP, AWS, and ping services don't have this structure — returns [].
export function getComponents(svc, data) {
  if (!data) return [];
  if (svc.isGCP || svc.isAWS || svc.isRailway) return [];
  const components = data?.components || [];
  return components
    .filter(c => !c.group_id && c.name)
    .map(c => ({
      name: c.name,
      statusKey: indKey(c.status),
      statusLabel: indLabel(c.status),
    }));
}

export function getIncidents(svc, data) {
  if (!data) return [];

  if (svc.isRailway) {
    const IMPACT_ORDER = ['MAJOR_OUTAGE', 'PARTIAL_OUTAGE', 'DEGRADED_PERFORMANCE', 'MAINTENANCE'];
    const IMPACT_MAP   = { MAJOR_OUTAGE: 'major', PARTIAL_OUTAGE: 'minor', DEGRADED_PERFORMANCE: 'minor', MAINTENANCE: 'maintenance' };
    const STATUS_MAP   = { INVESTIGATING: 'investigating', IDENTIFIED: 'identified', MONITORING: 'monitoring', RESOLVED: 'resolved' };
    return (data.activeIncidents || []).map(inc => {
      const impacts = (inc.components || []).map(c => c.impact);
      const worst = impacts.reduce(
        (w, imp) => IMPACT_ORDER.indexOf(imp) < IMPACT_ORDER.indexOf(w) ? imp : w,
        'DEGRADED_PERFORMANCE'
      );
      const latest = inc.updates?.[0];
      return {
        svcName: svc.name, svcId: svc.id,
        name: inc.title,
        impact: IMPACT_MAP[worst] || 'minor',
        status: STATUS_MAP[inc.status] || (inc.status || '').toLowerCase() || 'investigating',
        update: latest?.message || '',
        time: inc.createdAt ? timeAgo(inc.createdAt) : '',
      };
    });
  }

  if (svc.isAWS) {
    return (data || []).filter(e => e.status === '3').map(e => {
      // Extract services that are actively impacted (current > 0)
      const impacted = e.impacted_services
        ? Object.values(e.impacted_services)
            .filter(s => parseInt(s.current) > 0)
            .map(s => s.service_name.replace(/^(Amazon|AWS)\s+/, ''))
        : [];

      const updateParts = [];
      if (impacted.length > 0) updateParts.push(`Affected: ${impacted.join(', ')}`);
      if (e.region_name) updateParts.push(`Region: ${e.region_name}`);
      const latestMessage = e.event_log?.[0]?.message || '';
      if (latestMessage) updateParts.push(latestMessage);

      return {
        svcName: svc.name, svcId: svc.id,
        name: e.summary || e.service_name || 'AWS Service Event',
        impact: 'major', status: 'active',
        update: updateParts.join(' · '),
        time: '',
        affectedServices: impacted,
        region: e.region_name || '',
      };
    });
  }

  if (svc.isGCP) {
    return (data || []).filter(i => !i.end).map(i => ({
      svcName: svc.name, svcId: svc.id,
      name: i.service_name || 'Incident',
      impact: 'major', status: 'active',
      update: i.external_desc || '', time: '',
    }));
  }

  // Formal active incidents
  const activeIncidents = (data?.incidents || []).filter(i => i.status !== 'resolved');
  if (activeIncidents.length > 0) {
    return activeIncidents.map(i => {
      const latest = i.incident_updates?.[0];
      return {
        svcName: svc.name, svcId: svc.id, name: i.name,
        impact: i.impact || 'minor', status: i.status || 'investigating',
        update: latest?.body || '',
        time: latest?.created_at ? timeAgo(latest.created_at) : '',
      };
    });
  }

  // No formal incidents — surface degraded components as a single summary.
  // Filter out group-level parent components (they duplicate their children)
  // and pure maintenance components (noise — scheduled, not unexpected).
  const degraded = (data?.components || []).filter(c =>
    c.status &&
    c.status !== 'operational' &&
    c.status !== 'under_maintenance' &&
    c.group !== true
  );

  if (degraded.length === 0) return [];

  // Determine worst impact across all degraded components
  const hasMajor = degraded.some(c => c.status === 'major_outage');
  const worstImpact = hasMajor ? 'major' : 'minor';

  // Single summary line — no need to list every location
  const sample = degraded.slice(0, 3).map(c => c.name).join(', ');
  const overflow = degraded.length > 3 ? ` +${degraded.length - 3} more` : '';

  return [{
    svcName: svc.name, svcId: svc.id,
    name: `${degraded.length} component${degraded.length > 1 ? 's' : ''} affected`,
    impact: worstImpact,
    status: 'degraded',
    update: sample + overflow,
    time: '',
  }];
}
