// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
// Curated list of common developer services users can add to their personal dashboard.
// All entries use the standard Atlassian statuspage JSON API format.
// URLs verified to return valid JSON — services without a working public API are excluded.
import {
  siVercel,
  siSupabase,
  siNetlify,
  siRender,
  siDigitalocean,
  siSentry,
  siCircleci,
  siDatadog,
  siLinear,
  siMongodb,
} from 'simple-icons';

export const CATALOG = [
  {
    id: 'vercel',
    name: 'Vercel',
    desc: 'Deployment & Edge Network',
    url: 'https://www.vercel-status.com/api/v2/summary.json',
    color: '#000000',
    bg: '#F2F2F2',
    initials: 'VE',
    icon: siVercel,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    desc: 'Database, Auth & Storage',
    url: 'https://status.supabase.com/api/v2/summary.json',
    color: '#2F9E6F',
    bg: '#E8F7F1',
    initials: 'SB',
    icon: siSupabase,
  },
  {
    id: 'netlify',
    name: 'Netlify',
    desc: 'Web Hosting & CI/CD',
    url: 'https://www.netlifystatus.com/api/v2/summary.json',
    color: '#00AD9F',
    bg: '#E5F6F5',
    initials: 'NL',
    icon: siNetlify,
  },
  {
    id: 'render',
    name: 'Render',
    desc: 'Cloud Hosting Platform',
    url: 'https://status.render.com/api/v2/summary.json',
    color: '#0D70AF',
    bg: '#E5F1FA',
    initials: 'RE',
    icon: siRender,
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    desc: 'Cloud Infrastructure',
    url: 'https://status.digitalocean.com/api/v2/summary.json',
    color: '#0080FF',
    bg: '#E5F2FF',
    initials: 'DO',
    icon: siDigitalocean,
  },
  {
    id: 'sentry',
    name: 'Sentry',
    desc: 'Error Monitoring',
    url: 'https://status.sentry.io/api/v2/summary.json',
    color: '#362D59',
    bg: '#EDEAF5',
    initials: 'SN',
    icon: siSentry,
  },
  {
    id: 'circleci',
    name: 'CircleCI',
    desc: 'CI/CD Pipelines',
    url: 'https://status.circleci.com/api/v2/summary.json',
    color: '#343434',
    bg: '#F0F0F0',
    initials: 'CI',
    icon: siCircleci,
  },
  {
    id: 'datadog',
    name: 'Datadog',
    desc: 'Monitoring & Analytics',
    url: 'https://status.datadoghq.com/api/v2/summary.json',
    color: '#632CA6',
    bg: '#EEE9F7',
    initials: 'DD',
    icon: siDatadog,
  },
  {
    id: 'linear',
    name: 'Linear',
    desc: 'Issue Tracking',
    url: 'https://linearstatus.com/api/v2/summary.json',
    color: '#5E6AD2',
    bg: '#EDEFFC',
    initials: 'LN',
    icon: siLinear,
  },
  {
    id: 'mongodb',
    name: 'MongoDB Atlas',
    desc: 'Database Platform',
    url: 'https://status.mongodb.com/api/v2/summary.json',
    color: '#13AA52',
    bg: '#E5F7EE',
    initials: 'MG',
    icon: siMongodb,
  },
  {
    id: 'twilio',
    name: 'Twilio',
    desc: 'Communications APIs',
    url: 'https://status.twilio.com/api/v2/summary.json',
    color: '#E00828',
    bg: '#FDECEF',
    initials: 'TW',
    // No simple-icons entry — initials rendered as fallback
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    desc: 'Email Delivery',
    url: 'https://status.sendgrid.com/api/v2/summary.json',
    color: '#1A82E2',
    bg: '#E6F2FD',
    initials: 'SG',
    // No simple-icons entry — initials rendered as fallback
  },
  {
    id: 'aws',
    name: 'AWS',
    desc: 'Amazon Web Services',
    url: 'https://health.aws.amazon.com/public/currentevents',
    color: '#FF9900',
    bg: '#FFF4E0',
    initials: 'AW',
    isAWS: true,
    // No simple-icons entry — initials rendered as fallback
  },
];

// IDs of built-in services (always shown, not in catalog)
const BUILTIN_IDS = new Set(['anthropic', 'cloudflare', 'railway', 'openai', 'gcp', 'github']);

// Returns catalog entries the user doesn't already have as built-ins
export function getAvailableCatalog() {
  return CATALOG.filter(c => !BUILTIN_IDS.has(c.id));
}
