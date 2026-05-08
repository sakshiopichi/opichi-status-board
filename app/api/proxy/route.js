// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
const ALLOWED_HOSTS = [
  // Built-in services
  'status.anthropic.com',
  'www.cloudflarestatus.com',
  'status.openai.com',
  'status.cloud.google.com',
  'www.githubstatus.com',
  // Catalog services (all verified to return Atlassian-format JSON)
  'www.vercel-status.com',
  'status.supabase.com',
  'www.netlifystatus.com',
  'status.render.com',
  'status.digitalocean.com',
  'status.sentry.io',
  'status.circleci.com',
  'status.datadoghq.com',
  'linearstatus.com',
  'status.mongodb.com',
  'status.twilio.com',
  'status.sendgrid.com',
];

// Railway has a JSON API at /api/status — use that instead of scraping HTML.
const RAILWAY_HOSTS = new Set(['status.railway.com']);

// AWS status API returns UTF-16 LE encoded JSON — needs special decoding
const AWS_HOSTS = new Set(['health.aws.amazon.com']);


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) return Response.json({ error: 'Missing ?url= param' }, { status: 400 });

  let parsed;
  try { parsed = new URL(target); } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // AWS mode: response is UTF-16 BE encoded with FE FF BOM — decode before parsing
  if (AWS_HOSTS.has(parsed.hostname)) {
    try {
      const upstream = await fetch(target, {
        headers: { 'User-Agent': 'StatusDashboard/1.0' },
        next: { revalidate: 0 },
      });
      const buf = await upstream.arrayBuffer();
      const view = new Uint8Array(buf);
      // Detect BOM: FE FF = UTF-16 BE, FF FE = UTF-16 LE
      let encoding = 'utf-16be';
      let slice = buf;
      if (view[0] === 0xFE && view[1] === 0xFF) { encoding = 'utf-16be'; slice = buf.slice(2); }
      else if (view[0] === 0xFF && view[1] === 0xFE) { encoding = 'utf-16le'; slice = buf.slice(2); }
      const text = new TextDecoder(encoding).decode(slice);
      return Response.json(JSON.parse(text), { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 502 });
    }
  }

  // Railway mode: fetch their JSON API (activeIncidents + component status)
  if (RAILWAY_HOSTS.has(parsed.hostname)) {
    try {
      const res = await fetch(`https://${parsed.hostname}/api/status`, {
        headers: { 'User-Agent': 'StatusDashboard/1.0', Accept: 'application/json' },
        next: { revalidate: 0 },
      });
      const data = await res.json();
      return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 502 });
    }
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return Response.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(target, {
      headers: { 'User-Agent': 'StatusDashboard/1.0', Accept: 'application/json' },
      next: { revalidate: 0 },
    });
    const data = await upstream.json();
    return Response.json(data, {
      status: upstream.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}
