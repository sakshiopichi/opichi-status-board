// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
const ALLOWED_HOSTS = [
  'status.anthropic.com',
  'www.cloudflarestatus.com',
  'status.openai.com',
  'status.cloud.google.com',
  'www.githubstatus.com',
];

// Hosts that have no JSON status API — we do a HEAD ping and synthesize a response
const PING_HOSTS = [
  'railway.app',
];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) return Response.json({ error: 'Missing ?url= param' }, { status: 400 });

  let parsed;
  try { parsed = new URL(target); } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Ping mode: HEAD request → synthetic status JSON
  if (PING_HOSTS.includes(parsed.hostname)) {
    try {
      const res = await fetch(target, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': 'StatusDashboard/1.0' },
        next: { revalidate: 0 },
      });
      if (res.ok || res.status === 301 || res.status === 302) {
        return Response.json({
          status: { indicator: 'none', description: 'Operational' },
          incidents: [],
          components: [],
        }, { headers: { 'Cache-Control': 'no-store' } });
      }
      return Response.json({
        status: { indicator: 'major', description: `HTTP ${res.status}` },
        incidents: [],
        components: [],
      }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      return Response.json({
        status: { indicator: 'major', description: 'Unreachable' },
        incidents: [],
        components: [],
      }, { headers: { 'Cache-Control': 'no-store' } });
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
