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
  if (!data) return { key: 'load', label: 'Loading…' };
  if (svc.isGCP) {
    const active = (data || []).filter(i => !i.end);
    return active.length
      ? { key: 'maj', label: `${active.length} Incident${active.length > 1 ? 's' : ''}` }
      : { key: 'ok', label: 'Operational' };
  }
  if (svc.isAWS) {
    // AWS currentevents: array of active events; status "3" = problem, "4" = scheduled
    const active = (data || []).filter(e => e.status === '3');
    return active.length
      ? { key: 'maj', label: `${active.length} Active Event${active.length > 1 ? 's' : ''}` }
      : { key: 'ok', label: 'Operational' };
  }
  const ind = data?.status?.indicator || 'none';
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

  // No formal incidents — surface degraded components
  // Filter out group-level parent components (they duplicate their children)
  const degraded = (data?.components || []).filter(c =>
    c.status && c.status !== 'operational' && c.group !== true
  );

  if (degraded.length === 0) return [];

  // Group by status type
  const byStatus = {};
  for (const comp of degraded) {
    const s = comp.status;
    if (!byStatus[s]) byStatus[s] = [];
    byStatus[s].push(comp.name);
  }

  const impactForStatus = {
    partial_outage: 'minor',
    degraded_performance: 'minor',
    major_outage: 'major',
    under_maintenance: 'maintenance',
  };

  return Object.entries(byStatus).map(([status, names]) => {
    const sample = names.slice(0, 4).join(', ');
    const overflow = names.length > 4 ? ` and ${names.length - 4} more` : '';
    return {
      svcName: svc.name, svcId: svc.id,
      name: `${names.length} location${names.length > 1 ? 's' : ''} ${status.replace(/_/g, ' ')}`,
      impact: impactForStatus[status] || 'minor',
      status: status.replace(/_/g, ' '),
      update: sample + overflow,
      time: '',
    };
  });
}
