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
    // Railway's status page API was removed. We ping the main service directly.
    url: 'https://railway.app',
    color: '#185FA5',
    bg: '#E6F1FB',
    initials: 'RW',
    isPing: true,
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

  if (svc.isPing) {
    // Ping services: data is synthetic { status: { indicator } } — if missing, uncertain
    if (!data?.status?.indicator) return { key: 'warn', label: 'Status Uncertain' };
    const ind = data.status.indicator;
    return { key: indKey(ind), label: indLabel(ind) };
  }

  // Atlassian-format: must have data.status.indicator to be trusted
  if (!data?.status?.indicator) return { key: 'warn', label: 'Status Uncertain' };
  const ind = data.status.indicator;
  return { key: indKey(ind), label: data?.status?.description || indLabel(ind) };
}

export function getIncidents(svc, data) {
  if (!data) return [];

  if (svc.isAWS) {
    return (data || []).filter(e => e.status === '3').map(e => {
      const service = (e.service || '').replace(/-/g, ' ');
      return {
        svcName: svc.name, svcId: svc.id,
        name: service || 'AWS Service Event',
        impact: 'major', status: 'active',
        update: e.region_name ? `Region: ${e.region_name}` : '',
        time: '',
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
